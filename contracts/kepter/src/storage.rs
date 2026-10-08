use soroban_sdk::{contracttype, Address, Env};

use crate::errors::Error;
use crate::types::{Card, Merchant};

/// USDC on Stellar has 7 decimal places.
pub const UNIT: i128 = 10_000_000;
pub const MIN_AMOUNT: i128 = UNIT;
pub const MAX_CARD_BALANCE: i128 = 1_000 * UNIT;
pub const MAX_FUNDERS: u32 = 20;
pub const MIN_CARD_LIFE: u64 = 7 * DAY_SECONDS;
pub const MAX_CARD_LIFE: u64 = 180 * DAY_SECONDS;
pub const MAX_QR_WINDOW: u64 = 15 * 60;
pub const MAX_NAME_LEN: u32 = 48;
pub const BPS_DENOMINATOR: u32 = 10_000;

const DAY_SECONDS: u64 = 24 * 60 * 60;
const DAY_IN_LEDGERS: u32 = 17_280;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Usdc,
    NextCardId,
    TotalOwed,
    Merchant(Address),
    Card(u64),
    MerchantCard(Address, u32),
    Funder(u64, u32),
    Paid(u64, Address),
    Owed(u64, Address),
}

pub fn extend_instance(env: &Env) {
    let max = env.storage().max_ttl();
    env.storage()
        .instance()
        .extend_ttl(max.saturating_sub(DAY_IN_LEDGERS), max);
}

fn extend(env: &Env, key: &DataKey) {
    let max = env.storage().max_ttl();
    env.storage()
        .persistent()
        .extend_ttl(key, max.saturating_sub(DAY_IN_LEDGERS), max);
}

fn set<V: soroban_sdk::IntoVal<Env, soroban_sdk::Val>>(env: &Env, key: &DataKey, value: &V) {
    env.storage().persistent().set(key, value);
    extend(env, key);
}

pub fn usdc(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Usdc).unwrap()
}

pub fn set_usdc(env: &Env, usdc: &Address) {
    env.storage().instance().set(&DataKey::Usdc, usdc);
}

pub fn next_card_id(env: &Env) -> u64 {
    let id: u64 = env
        .storage()
        .instance()
        .get(&DataKey::NextCardId)
        .unwrap_or(1);
    env.storage()
        .instance()
        .set(&DataKey::NextCardId, &(id + 1));
    id
}

pub fn total_owed(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::TotalOwed)
        .unwrap_or(0)
}

pub fn add_total_owed(env: &Env, delta: i128) -> Result<(), Error> {
    let total = total_owed(env).checked_add(delta).ok_or(Error::Overflow)?;
    env.storage().instance().set(&DataKey::TotalOwed, &total);
    Ok(())
}

pub fn has_merchant(env: &Env, merchant: &Address) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Merchant(merchant.clone()))
}

pub fn merchant(env: &Env, merchant: &Address) -> Result<Merchant, Error> {
    let key = DataKey::Merchant(merchant.clone());
    let value = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::MerchantNotFound)?;
    extend(env, &key);
    Ok(value)
}

pub fn set_merchant(env: &Env, address: &Address, merchant: &Merchant) {
    set(env, &DataKey::Merchant(address.clone()), merchant);
}

pub fn card(env: &Env, card_id: u64) -> Result<Card, Error> {
    let key = DataKey::Card(card_id);
    let value = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::CardNotFound)?;
    extend(env, &key);
    Ok(value)
}

pub fn set_card(env: &Env, card_id: u64, card: &Card) {
    set(env, &DataKey::Card(card_id), card);
}

pub fn merchant_card(env: &Env, merchant: &Address, index: u32) -> Option<u64> {
    env.storage()
        .persistent()
        .get(&DataKey::MerchantCard(merchant.clone(), index))
}

pub fn set_merchant_card(env: &Env, merchant: &Address, index: u32, card_id: u64) {
    set(
        env,
        &DataKey::MerchantCard(merchant.clone(), index),
        &card_id,
    );
}

pub fn funder(env: &Env, card_id: u64, index: u32) -> Option<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::Funder(card_id, index))
}

pub fn set_funder(env: &Env, card_id: u64, index: u32, account: &Address) {
    set(env, &DataKey::Funder(card_id, index), account);
}

pub fn paid(env: &Env, card_id: u64, account: &Address) -> Option<i128> {
    env.storage()
        .persistent()
        .get(&DataKey::Paid(card_id, account.clone()))
}

pub fn set_paid(env: &Env, card_id: u64, account: &Address, amount: i128) {
    set(env, &DataKey::Paid(card_id, account.clone()), &amount);
}

pub fn owed(env: &Env, card_id: u64, account: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Owed(card_id, account.clone()))
        .unwrap_or(0)
}

pub fn set_owed(env: &Env, card_id: u64, account: &Address, amount: i128) {
    let key = DataKey::Owed(card_id, account.clone());
    if amount == 0 {
        env.storage().persistent().remove(&key);
    } else {
        set(env, &key, &amount);
    }
}
