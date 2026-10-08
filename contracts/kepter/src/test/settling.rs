use soroban_sdk::Vec;

use super::*;
use crate::{settle, Error, Settlement};

fn expire(s: &Setup) {
    s.set_time(START + 30 * DAY);
}

#[test]
fn buyer_protected_returns_everything_to_the_buyer() {
    let s = Setup::new(BUYER_PROTECTED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    s.redeem(&key, card_id, usdc(5));
    expire(&s);

    let result = s.kepter.settle(&card_id);
    assert_eq!(
        result,
        Settlement {
            to_shop: 0,
            to_funders: usdc(15)
        }
    );
    assert_eq!(s.token.balance(&s.buyer), usdc(10_000 - 5));
    assert_eq!(s.token.balance(&s.shop), usdc(5));
    assert!(s.kepter.get_card(&card_id).settled);
    s.assert_backed();
}

#[test]
fn shared_splits_with_the_shop_and_funders_in_proportion() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(20), &signing_key(1));
    let cousin_a = s.funded_account();
    let cousin_b = s.funded_account();
    s.kepter.top_up(&cousin_a, &card_id, &usdc(10));
    s.kepter.top_up(&cousin_b, &card_id, &usdc(10));
    expire(&s);

    let result = s.kepter.settle(&card_id);
    assert_eq!(result.to_shop, usdc(20));
    assert_eq!(result.to_funders, usdc(20));
    assert_eq!(s.token.balance(&s.shop), usdc(20));
    assert_eq!(s.token.balance(&s.buyer), usdc(10_000 - 20 + 10));
    assert_eq!(s.token.balance(&cousin_a), usdc(10_000 - 10 + 5));
    assert_eq!(s.token.balance(&cousin_b), usdc(10_000 - 10 + 5));
    s.assert_backed();
}

#[test]
fn shop_keeps_it_pays_the_shop_everything() {
    let s = Setup::new(SHOP_KEEPS);
    let card_id = s.buy(usdc(20), &signing_key(1));
    expire(&s);
    let result = s.kepter.settle(&card_id);
    assert_eq!(result.to_shop, usdc(20));
    assert_eq!(result.to_funders, 0);
    assert_eq!(s.token.balance(&s.shop), usdc(20));
    s.assert_backed();
}

#[test]
fn funders_get_everything_if_the_shop_closes_before_expiry() {
    let s = Setup::new(SHOP_KEEPS);
    let card_id = s.buy(usdc(20), &signing_key(1));
    let friend = s.funded_account();
    s.kepter.top_up(&friend, &card_id, &usdc(20));
    s.set_time(START + DAY);
    s.kepter.close_store(&s.shop);

    // A closed shop's cards can be settled straight away.
    let result = s.kepter.settle(&card_id);
    assert_eq!(result.to_shop, 0);
    assert_eq!(result.to_funders, usdc(40));
    assert_eq!(s.token.balance(&s.buyer), usdc(10_000));
    assert_eq!(s.token.balance(&friend), usdc(10_000));
    s.assert_backed();
}

#[test]
fn the_rule_still_applies_if_the_card_expired_before_the_shop_closed() {
    let s = Setup::new(SHOP_KEEPS);
    let card_id = s.buy(usdc(20), &signing_key(1));
    expire(&s);
    s.kepter.close_store(&s.shop);
    let result = s.kepter.settle(&card_id);
    assert_eq!(result.to_shop, usdc(20));
    s.assert_backed();
}

#[test]
fn shares_always_add_up_to_the_balance() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(1) + 1, &signing_key(1));
    let a = s.funded_account();
    let b = s.funded_account();
    s.kepter.top_up(&a, &card_id, &(usdc(1) + 3));
    s.kepter.top_up(&b, &card_id, &(usdc(1) + 7));
    let balance = s.kepter.get_card(&card_id).balance;
    expire(&s);

    let contract_before = s.token.balance(&s.kepter.address);
    let result = s.kepter.settle(&card_id);
    assert_eq!(result.to_shop + result.to_funders, balance);
    assert_eq!(
        contract_before - s.token.balance(&s.kepter.address),
        balance
    );
    assert_eq!(s.token.balance(&s.kepter.address), 0);
    s.assert_backed();
}

#[test]
fn rounding_remainder_goes_to_the_first_funder() {
    let env = Env::default();
    let mut paid = Vec::new(&env);
    paid.push_back(1);
    paid.push_back(1);
    paid.push_back(1);
    let shares = settle::funder_shares(&env, 10, &paid).unwrap();
    assert_eq!(shares.get(0), Some(4));
    assert_eq!(shares.get(1), Some(3));
    assert_eq!(shares.get(2), Some(3));
}

#[test]
fn shop_share_rounds_down() {
    assert_eq!(settle::shop_share(101, SHARED, false), Ok(50));
    assert_eq!(settle::shop_share(101, SHOP_KEEPS, false), Ok(101));
    assert_eq!(settle::shop_share(101, SHOP_KEEPS, true), Ok(0));
    assert_eq!(settle::shop_share(101, BUYER_PROTECTED, false), Ok(0));
}

#[test]
fn settling_early_or_twice_fails() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(20), &signing_key(1));
    assert_eq!(s.kepter.try_settle(&card_id), Err(Ok(Error::NotSettleable)));
    expire(&s);
    s.kepter.settle(&card_id);
    assert_eq!(s.kepter.try_settle(&card_id), Err(Ok(Error::CardSettled)));
}

#[test]
fn a_fully_spent_card_has_nothing_to_settle() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    s.redeem(&key, card_id, usdc(20));
    expire(&s);
    assert_eq!(
        s.kepter.try_settle(&card_id),
        Err(Ok(Error::NothingToSettle))
    );
}

#[test]
fn a_frozen_funder_does_not_block_the_others() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(20), &signing_key(1));
    let frozen = s.funded_account();
    s.kepter.top_up(&frozen, &card_id, &usdc(20));
    s.admin.set_authorized(&frozen, &false);
    expire(&s);

    let result = s.kepter.settle(&card_id);
    assert_eq!(result.to_shop, usdc(20));
    assert_eq!(s.token.balance(&s.shop), usdc(20));
    assert_eq!(s.token.balance(&s.buyer), usdc(10_000 - 20 + 10));
    assert_eq!(s.kepter.get_owed(&card_id, &frozen), usdc(10));
    assert_eq!(s.kepter.total_owed(), usdc(10));
    s.assert_backed();

    assert!(s.kepter.try_claim_owed(&card_id, &frozen).is_err());
    s.admin.set_authorized(&frozen, &true);
    assert_eq!(s.kepter.claim_owed(&card_id, &frozen), usdc(10));
    assert_eq!(s.token.balance(&frozen), usdc(10_000 - 20 + 10));
    assert_eq!(s.kepter.get_owed(&card_id, &frozen), 0);
    assert_eq!(
        s.kepter.try_claim_owed(&card_id, &frozen),
        Err(Ok(Error::NothingOwed))
    );
    s.assert_backed();
}
