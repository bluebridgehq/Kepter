use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, String};

use super::*;
use crate::Error;

#[test]
fn opening_a_shop_stores_its_rule() {
    let s = Setup::new(SHARED);
    let shop = s.kepter.get_merchant(&s.shop);
    assert_eq!(shop.name, String::from_str(&s.env, "Tola's Kitchen"));
    assert_eq!(shop.expiry_keep_bps, SHARED);
    assert_eq!(shop.closed_at, None);
    assert_eq!(shop.card_count, 0);
    assert_eq!(shop.created_at, START);
    assert_eq!(s.kepter.usdc(), s.usdc);
}

#[test]
fn opening_a_shop_twice_fails() {
    let s = Setup::new(SHARED);
    let result =
        s.kepter
            .try_register_merchant(&s.shop, &String::from_str(&s.env, "Again"), &SHARED);
    assert_eq!(result, Err(Ok(Error::AlreadyRegistered)));
}

#[test]
fn rule_above_one_hundred_percent_fails() {
    let s = Setup::new(SHARED);
    let other = Address::generate(&s.env);
    let result = s
        .kepter
        .try_register_merchant(&other, &String::from_str(&s.env, "Shop"), &10_001);
    assert_eq!(result, Err(Ok(Error::InvalidRule)));
}

#[test]
fn shop_name_must_be_present_and_short() {
    let s = Setup::new(SHARED);
    let other = Address::generate(&s.env);
    let empty = s
        .kepter
        .try_register_merchant(&other, &String::from_str(&s.env, ""), &SHARED);
    assert_eq!(empty, Err(Ok(Error::InvalidName)));
    let long = String::from_str(
        &s.env,
        "A name that is far too long for a shop on Kepter cards",
    );
    let result = s.kepter.try_register_merchant(&other, &long, &SHARED);
    assert_eq!(result, Err(Ok(Error::InvalidName)));
}

#[test]
fn changing_the_rule_only_affects_new_cards() {
    let s = Setup::new(BUYER_PROTECTED);
    let first = s.buy(usdc(10), &signing_key(1));
    s.kepter.set_expiry_rule(&s.shop, &SHOP_KEEPS);
    let second = s.buy(usdc(10), &signing_key(2));

    assert_eq!(s.kepter.get_card(&first).expiry_keep_bps, BUYER_PROTECTED);
    assert_eq!(s.kepter.get_card(&second).expiry_keep_bps, SHOP_KEEPS);
    assert_eq!(s.kepter.get_merchant(&s.shop).expiry_keep_bps, SHOP_KEEPS);
}

#[test]
fn closing_a_shop_records_the_time_and_stops_changes() {
    let s = Setup::new(SHARED);
    s.set_time(START + DAY);
    s.kepter.close_store(&s.shop);
    assert_eq!(s.kepter.get_merchant(&s.shop).closed_at, Some(START + DAY));
    assert_eq!(
        s.kepter.try_close_store(&s.shop),
        Err(Ok(Error::StoreClosed))
    );
    assert_eq!(
        s.kepter.try_set_expiry_rule(&s.shop, &SHOP_KEEPS),
        Err(Ok(Error::StoreClosed))
    );
}
