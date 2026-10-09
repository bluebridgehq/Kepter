#![no_std]

mod errors;
mod events;
mod redeem;
mod settle;
mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, token, Address, BytesN, Env, String, Vec};

pub use errors::Error;
pub use redeem::{message as redeem_message, DOMAIN_TAG};
pub use types::{Card, FunderInfo, Merchant, Settlement};

use events::{
    CardBought, CardRedeemed, CardSettled, CardToppedUp, ExpiryRuleChanged, OwedClaimed,
    StoreClosed, StoreOpened, StoreUpdated,
};
use storage::{
    BPS_DENOMINATOR, MAX_CARD_BALANCE, MAX_CARD_LIFE, MAX_CATEGORIES, MAX_CITY_LEN,
    MAX_CONTACT_LEN, MAX_FUNDERS, MAX_NAME_LEN, MAX_QR_WINDOW, MIN_AMOUNT, MIN_CARD_LIFE,
};

#[contract]
pub struct Kepter;

#[contractimpl]
impl Kepter {
    pub fn __constructor(env: Env, usdc: Address) {
        storage::set_usdc(&env, &usdc);
        storage::extend_instance(&env);
    }

    /// Opens a shop, adds it to the shop list and creates its USDC trustline so it can be paid.
    pub fn register_merchant(
        env: Env,
        merchant: Address,
        name: String,
        expiry_keep_bps: u32,
        category: u32,
        city: String,
        contact: String,
    ) -> Result<(), Error> {
        merchant.require_auth();
        storage::extend_instance(&env);
        if storage::has_merchant(&env, &merchant) {
            return Err(Error::AlreadyRegistered);
        }
        check_details(&name, category, &city, &contact)?;
        check_rule(expiry_keep_bps)?;

        token::StellarAssetClient::new(&env, &storage::usdc(&env)).trust(&merchant);

        let shop = Merchant {
            name: name.clone(),
            category,
            city: city.clone(),
            contact,
            expiry_keep_bps,
            closed_at: None,
            card_count: 0,
            open_cards: 0,
            outstanding: 0,
            created_at: env.ledger().timestamp(),
        };
        storage::set_merchant(&env, &merchant, &shop);
        storage::push_shop(&env, &merchant);
        StoreOpened {
            merchant,
            name,
            expiry_keep_bps,
            category,
            city,
        }
        .publish(&env);
        Ok(())
    }

    /// Changes the shop's name, category, city and contact.
    pub fn update_shop(
        env: Env,
        merchant: Address,
        name: String,
        category: u32,
        city: String,
        contact: String,
    ) -> Result<(), Error> {
        merchant.require_auth();
        storage::extend_instance(&env);
        check_details(&name, category, &city, &contact)?;
        let mut shop = open_merchant(&env, &merchant)?;
        shop.name = name.clone();
        shop.category = category;
        shop.city = city.clone();
        shop.contact = contact.clone();
        storage::set_merchant(&env, &merchant, &shop);
        StoreUpdated {
            merchant,
            name,
            category,
            city,
            contact,
        }
        .publish(&env);
        Ok(())
    }

    /// Changes the unused balance rule for cards bought from now on.
    pub fn set_expiry_rule(env: Env, merchant: Address, expiry_keep_bps: u32) -> Result<(), Error> {
        merchant.require_auth();
        storage::extend_instance(&env);
        check_rule(expiry_keep_bps)?;
        let mut shop = open_merchant(&env, &merchant)?;
        shop.expiry_keep_bps = expiry_keep_bps;
        storage::set_merchant(&env, &merchant, &shop);
        ExpiryRuleChanged {
            merchant,
            expiry_keep_bps,
        }
        .publish(&env);
        Ok(())
    }

    /// Closes a shop for good. Its cards can then be settled straight away.
    pub fn close_store(env: Env, merchant: Address) -> Result<(), Error> {
        merchant.require_auth();
        storage::extend_instance(&env);
        let mut shop = open_merchant(&env, &merchant)?;
        shop.closed_at = Some(env.ledger().timestamp());
        storage::set_merchant(&env, &merchant, &shop);
        StoreClosed { merchant }.publish(&env);
        Ok(())
    }

    pub fn buy(
        env: Env,
        buyer: Address,
        merchant: Address,
        amount: i128,
        card_key: BytesN<32>,
        expires_at: u64,
    ) -> Result<u64, Error> {
        buyer.require_auth();
        storage::extend_instance(&env);
        let mut shop = open_merchant(&env, &merchant)?;
        if !(MIN_AMOUNT..=MAX_CARD_BALANCE).contains(&amount) {
            return Err(Error::InvalidAmount);
        }
        let now = env.ledger().timestamp();
        if expires_at < now + MIN_CARD_LIFE || expires_at > now + MAX_CARD_LIFE {
            return Err(Error::InvalidExpiry);
        }

        let card_id = storage::next_card_id(&env);
        let card = Card {
            merchant: merchant.clone(),
            key: card_key,
            total_paid: amount,
            balance: amount,
            funder_count: 1,
            expiry_keep_bps: shop.expiry_keep_bps,
            created_at: now,
            expires_at,
            nonce: 0,
            settled: false,
        };
        storage::set_card(&env, card_id, &card);
        storage::set_funder(&env, card_id, 0, &buyer);
        storage::set_paid(&env, card_id, &buyer, amount);
        storage::set_merchant_card(&env, &merchant, shop.card_count, card_id);

        shop.card_count += 1;
        shop.open_cards += 1;
        shop.outstanding = add(shop.outstanding, amount)?;
        storage::set_merchant(&env, &merchant, &shop);
        storage::add_total_owed(&env, amount)?;

        usdc_client(&env).transfer(&buyer, env.current_contract_address(), &amount);

        CardBought {
            card_id,
            merchant,
            buyer,
            amount,
            expires_at,
        }
        .publish(&env);
        Ok(card_id)
    }

    /// Adds money to a card: friends chipping in, or a shop giving store credit.
    pub fn top_up(env: Env, funder: Address, card_id: u64, amount: i128) -> Result<(), Error> {
        funder.require_auth();
        storage::extend_instance(&env);
        let mut card = active_card(&env, card_id)?;
        let mut shop = open_merchant(&env, &card.merchant)?;
        if amount < MIN_AMOUNT {
            return Err(Error::InvalidAmount);
        }
        if add(card.balance, amount)? > MAX_CARD_BALANCE {
            return Err(Error::CardLimitReached);
        }

        let previous = storage::paid(&env, card_id, &funder);
        if previous.is_none() {
            if card.funder_count >= MAX_FUNDERS {
                return Err(Error::TooManyFunders);
            }
            storage::set_funder(&env, card_id, card.funder_count, &funder);
            card.funder_count += 1;
        }
        storage::set_paid(&env, card_id, &funder, add(previous.unwrap_or(0), amount)?);

        if card.balance == 0 {
            shop.open_cards += 1;
        }
        card.balance = add(card.balance, amount)?;
        card.total_paid = add(card.total_paid, amount)?;
        storage::set_card(&env, card_id, &card);
        shop.outstanding = add(shop.outstanding, amount)?;
        storage::set_merchant(&env, &card.merchant, &shop);
        storage::add_total_owed(&env, amount)?;

        usdc_client(&env).transfer(&funder, env.current_contract_address(), &amount);

        CardToppedUp {
            card_id,
            funder,
            amount,
        }
        .publish(&env);
        Ok(())
    }

    /// Spends `amount` from a card. The card key signs the amount on the
    /// recipient's phone, and the shop submits it after scanning the QR code.
    pub fn redeem(
        env: Env,
        card_id: u64,
        amount: i128,
        valid_until: u64,
        signature: BytesN<64>,
    ) -> Result<(), Error> {
        storage::extend_instance(&env);
        let mut card = active_card(&env, card_id)?;
        card.merchant.require_auth();
        let mut shop = open_merchant(&env, &card.merchant)?;

        let now = env.ledger().timestamp();
        if valid_until < now {
            return Err(Error::QrExpired);
        }
        if valid_until > now + MAX_QR_WINDOW {
            return Err(Error::QrTooLong);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if amount > card.balance {
            return Err(Error::InsufficientBalance);
        }
        redeem::verify(
            &env,
            &card.key,
            card_id,
            amount,
            card.nonce,
            valid_until,
            &signature,
        );

        card.balance -= amount;
        card.nonce += 1;
        storage::set_card(&env, card_id, &card);
        shop.outstanding = sub(shop.outstanding, amount)?;
        if card.balance == 0 {
            shop.open_cards -= 1;
        }
        storage::set_merchant(&env, &card.merchant, &shop);
        storage::add_total_owed(&env, -amount)?;

        usdc_client(&env).transfer(&env.current_contract_address(), &card.merchant, &amount);

        CardRedeemed {
            card_id,
            merchant: card.merchant,
            amount,
            balance: card.balance,
        }
        .publish(&env);
        Ok(())
    }

    /// Pays out what is left on an expired card, or on any card of a closed
    /// shop. Anyone can call it, and nobody but the shop and funders gains.
    pub fn settle(env: Env, card_id: u64) -> Result<Settlement, Error> {
        storage::extend_instance(&env);
        let mut card = storage::card(&env, card_id)?;
        if card.settled {
            return Err(Error::CardSettled);
        }
        let mut shop = storage::merchant(&env, &card.merchant)?;
        let now = env.ledger().timestamp();
        let expired = now >= card.expires_at;
        let closed_before_expiry = matches!(shop.closed_at, Some(at) if at < card.expires_at);
        if !expired && shop.closed_at.is_none() {
            return Err(Error::NotSettleable);
        }
        if card.balance == 0 {
            return Err(Error::NothingToSettle);
        }

        let balance = card.balance;
        let to_shop = settle::shop_share(balance, card.expiry_keep_bps, closed_before_expiry)?;
        let to_funders = sub(balance, to_shop)?;

        let mut funders: Vec<Address> = Vec::new(&env);
        let mut paid: Vec<i128> = Vec::new(&env);
        for i in 0..card.funder_count {
            let account = storage::funder(&env, card_id, i).ok_or(Error::FunderNotFound)?;
            paid.push_back(storage::paid(&env, card_id, &account).unwrap_or(0));
            funders.push_back(account);
        }
        let shares = settle::funder_shares(&env, to_funders, &paid)?;

        card.balance = 0;
        card.settled = true;
        storage::set_card(&env, card_id, &card);
        shop.outstanding = sub(shop.outstanding, balance)?;
        shop.open_cards -= 1;
        storage::set_merchant(&env, &card.merchant, &shop);

        settle::pay_or_owe(&env, card_id, &card.merchant, to_shop)?;
        for (account, share) in funders.iter().zip(shares.iter()) {
            settle::pay_or_owe(&env, card_id, &account, share)?;
        }

        CardSettled {
            card_id,
            to_shop,
            to_funders,
        }
        .publish(&env);
        Ok(Settlement {
            to_shop,
            to_funders,
        })
    }

    /// Sends an amount that could not be paid during settlement.
    pub fn claim_owed(env: Env, card_id: u64, account: Address) -> Result<i128, Error> {
        storage::extend_instance(&env);
        let amount = storage::owed(&env, card_id, &account);
        if amount == 0 {
            return Err(Error::NothingOwed);
        }
        storage::set_owed(&env, card_id, &account, 0);
        storage::add_total_owed(&env, -amount)?;

        usdc_client(&env).transfer(&env.current_contract_address(), &account, &amount);

        OwedClaimed {
            card_id,
            account,
            amount,
        }
        .publish(&env);
        Ok(amount)
    }

    pub fn get_merchant(env: Env, merchant: Address) -> Result<Merchant, Error> {
        storage::merchant(&env, &merchant)
    }

    /// How many shops have ever opened, closed ones included.
    pub fn shop_count(env: Env) -> u32 {
        storage::shop_count(&env)
    }

    /// The shop at a position in the list, starting from 0 in opening order.
    pub fn get_shop(env: Env, index: u32) -> Result<Address, Error> {
        storage::shop(&env, index).ok_or(Error::MerchantNotFound)
    }

    pub fn get_card(env: Env, card_id: u64) -> Result<Card, Error> {
        storage::card(&env, card_id)
    }

    pub fn get_merchant_card(env: Env, merchant: Address, index: u32) -> Result<u64, Error> {
        storage::merchant_card(&env, &merchant, index).ok_or(Error::CardNotFound)
    }

    pub fn get_funder(env: Env, card_id: u64, index: u32) -> Result<FunderInfo, Error> {
        let account = storage::funder(&env, card_id, index).ok_or(Error::FunderNotFound)?;
        let paid = storage::paid(&env, card_id, &account).unwrap_or(0);
        Ok(FunderInfo { account, paid })
    }

    pub fn get_owed(env: Env, card_id: u64, account: Address) -> i128 {
        storage::owed(&env, card_id, &account)
    }

    /// Everything the contract owes: open card balances plus unclaimed amounts.
    /// It should always equal the contract's USDC balance.
    pub fn total_owed(env: Env) -> i128 {
        storage::total_owed(&env)
    }

    pub fn usdc(env: Env) -> Address {
        storage::usdc(&env)
    }
}

fn usdc_client(env: &Env) -> token::TokenClient<'_> {
    token::TokenClient::new(env, &storage::usdc(env))
}

fn check_rule(expiry_keep_bps: u32) -> Result<(), Error> {
    if expiry_keep_bps > BPS_DENOMINATOR {
        return Err(Error::InvalidRule);
    }
    Ok(())
}

fn check_details(
    name: &String,
    category: u32,
    city: &String,
    contact: &String,
) -> Result<(), Error> {
    if name.len() > MAX_NAME_LEN || is_blank(name) {
        return Err(Error::InvalidName);
    }
    if category >= MAX_CATEGORIES {
        return Err(Error::InvalidCategory);
    }
    if city.len() > MAX_CITY_LEN || is_blank(city) {
        return Err(Error::InvalidCity);
    }
    if contact.len() > MAX_CONTACT_LEN {
        return Err(Error::InvalidContact);
    }
    Ok(())
}

fn open_merchant(env: &Env, merchant: &Address) -> Result<Merchant, Error> {
    let shop = storage::merchant(env, merchant)?;
    if shop.closed_at.is_some() {
        return Err(Error::StoreClosed);
    }
    Ok(shop)
}

/// A card that can still be spent or topped up.
fn active_card(env: &Env, card_id: u64) -> Result<Card, Error> {
    let card = storage::card(env, card_id)?;
    if card.settled {
        return Err(Error::CardSettled);
    }
    if env.ledger().timestamp() >= card.expires_at {
        return Err(Error::CardExpired);
    }
    Ok(card)
}

fn add(a: i128, b: i128) -> Result<i128, Error> {
    a.checked_add(b).ok_or(Error::Overflow)
}

fn sub(a: i128, b: i128) -> Result<i128, Error> {
    a.checked_sub(b).ok_or(Error::Overflow)
}

fn is_blank(s: &String) -> bool {
    let len = s.len() as usize;
    if len == 0 {
        return true;
    }

    if len > MAX_NAME_LEN as usize {
        return false;
    }

    let mut buf = [0u8; MAX_NAME_LEN as usize];
    s.copy_into_slice(&mut buf[..len]);

    buf[..len]
        .iter()
        .all(|&b| b == b' ' || b == b'\t' || b == b'\n')
}
