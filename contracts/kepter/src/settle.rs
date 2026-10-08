use soroban_sdk::{token, Address, Env, Vec};

use crate::errors::Error;
use crate::events::AmountOwed;
use crate::storage::{self, BPS_DENOMINATOR};

/// The shop's share of a remaining balance. Zero when the shop closed before
/// the card expired, so funders always get everything back in that case.
pub fn shop_share(balance: i128, keep_bps: u32, closed_before_expiry: bool) -> Result<i128, Error> {
    if closed_before_expiry {
        return Ok(0);
    }
    balance
        .checked_mul(keep_bps as i128)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR as i128))
        .ok_or(Error::Overflow)
}

/// Splits `pool` across funders in proportion to what each paid. Shares are
/// rounded down and the remainder goes to the first funder, so the shares
/// always add up to `pool` exactly.
pub fn funder_shares(env: &Env, pool: i128, paid: &Vec<i128>) -> Result<Vec<i128>, Error> {
    let mut total_paid: i128 = 0;
    for p in paid.iter() {
        total_paid = total_paid.checked_add(p).ok_or(Error::Overflow)?;
    }
    let mut shares = Vec::new(env);
    if total_paid == 0 {
        return Ok(shares);
    }
    let mut assigned: i128 = 0;
    for p in paid.iter() {
        let share = pool
            .checked_mul(p)
            .and_then(|v| v.checked_div(total_paid))
            .ok_or(Error::Overflow)?;
        assigned = assigned.checked_add(share).ok_or(Error::Overflow)?;
        shares.push_back(share);
    }
    let remainder = pool.checked_sub(assigned).ok_or(Error::Overflow)?;
    if let Some(first) = shares.get(0) {
        shares.set(0, first.checked_add(remainder).ok_or(Error::Overflow)?);
    }
    Ok(shares)
}

/// Sends `amount` from the contract, or saves it as owed if the receiving
/// account cannot take USDC right now. One bad account never blocks the rest.
pub fn pay_or_owe(env: &Env, card_id: u64, to: &Address, amount: i128) -> Result<(), Error> {
    if amount == 0 {
        return Ok(());
    }
    let usdc = token::TokenClient::new(env, &storage::usdc(env));
    let sent = matches!(
        usdc.try_transfer(&env.current_contract_address(), to, &amount),
        Ok(Ok(()))
    );
    if sent {
        storage::add_total_owed(env, -amount)?;
    } else {
        let owed = storage::owed(env, card_id, to)
            .checked_add(amount)
            .ok_or(Error::Overflow)?;
        storage::set_owed(env, card_id, to, owed);
        AmountOwed {
            card_id,
            account: to.clone(),
            amount,
        }
        .publish(env);
    }
    Ok(())
}
