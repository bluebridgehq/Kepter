use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, String};

use super::*;
use crate::Error;

fn text(s: &Setup, value: &str) -> String {
    String::from_str(&s.env, value)
}

fn try_open(
    s: &Setup,
    shop: &Address,
    name: &str,
    rule: u32,
    category: u32,
    city: &str,
    contact: &str,
) -> Result<(), Error> {
    match s.kepter.try_register_merchant(
        shop,
        &text(s, name),
        &rule,
        &category,
        &text(s, city),
        &text(s, contact),
    ) {
        Ok(_) => Ok(()),
        Err(Ok(e)) => Err(e),
        Err(Err(e)) => panic!("unexpected host error {e:?}"),
    }
}

fn try_update(
    s: &Setup,
    name: &str,
    category: u32,
    city: &str,
    contact: &str,
) -> Result<(), Error> {
    match s.kepter.try_update_shop(
        &s.shop,
        &text(s, name),
        &category,
        &text(s, city),
        &text(s, contact),
    ) {
        Ok(_) => Ok(()),
        Err(Ok(e)) => Err(e),
        Err(Err(e)) => panic!("unexpected host error {e:?}"),
    }
}

#[test]
fn opening_a_shop_stores_its_rule_and_details() {
    let s = Setup::new(SHARED);
    let shop = s.kepter.get_merchant(&s.shop);
    assert_eq!(shop.name, text(&s, "Tola's Kitchen"));
    assert_eq!(shop.category, FOOD);
    assert_eq!(shop.city, text(&s, "Yaba, Lagos"));
    assert_eq!(shop.contact, text(&s, "+2348012345678"));
    assert_eq!(shop.expiry_keep_bps, SHARED);
    assert_eq!(shop.closed_at, None);
    assert_eq!(shop.card_count, 0);
    assert_eq!(shop.created_at, START);
    assert_eq!(s.kepter.usdc(), s.usdc);
}

#[test]
fn opening_a_shop_twice_fails() {
    let s = Setup::new(SHARED);
    let result = try_open(&s, &s.shop, "Again", SHARED, FOOD, "Ikeja", "");
    assert_eq!(result, Err(Error::AlreadyRegistered));
    assert_eq!(s.kepter.shop_count(), 1);
}

#[test]
fn shops_are_listed_in_opening_order() {
    let s = Setup::new(SHARED);
    let second = Address::generate(&s.env);
    let third = Address::generate(&s.env);
    try_open(&s, &second, "Ada Shoes", SHARED, 4, "Accra", "").unwrap();
    try_open(&s, &third, "Cuts by Femi", SHARED, 5, "Surulere, Lagos", "").unwrap();

    assert_eq!(s.kepter.shop_count(), 3);
    assert_eq!(s.kepter.get_shop(&0), s.shop);
    assert_eq!(s.kepter.get_shop(&1), second);
    assert_eq!(s.kepter.get_shop(&2), third);
    assert_eq!(s.kepter.try_get_shop(&3), Err(Ok(Error::MerchantNotFound)));
}

#[test]
fn closed_shops_stay_in_the_list() {
    let s = Setup::new(SHARED);
    s.kepter.close_store(&s.shop);
    assert_eq!(s.kepter.shop_count(), 1);
    assert_eq!(s.kepter.get_shop(&0), s.shop);
}

#[test]
fn rule_above_one_hundred_percent_fails() {
    let s = Setup::new(SHARED);
    let other = Address::generate(&s.env);
    let result = try_open(&s, &other, "Shop", 10_001, FOOD, "Ibadan", "");
    assert_eq!(result, Err(Error::InvalidRule));
}

#[test]
fn shop_name_must_be_present_and_short() {
    let s = Setup::new(SHARED);
    let other = Address::generate(&s.env);
    let long = "A name that is far too long for a shop on Kepter cards";
    assert_eq!(
        try_open(&s, &other, "", SHARED, FOOD, "Ibadan", ""),
        Err(Error::InvalidName)
    );
    assert_eq!(
        try_open(&s, &other, "   ", SHARED, FOOD, "Ibadan", ""),
        Err(Error::InvalidName)
    );
    assert_eq!(
        try_open(&s, &other, " \t \n ", SHARED, FOOD, "Ibadan", ""),
        Err(Error::InvalidName)
    );
    assert_eq!(
        try_open(&s, &other, long, SHARED, FOOD, "Ibadan", ""),
        Err(Error::InvalidName)
    );
}

#[test]
fn category_must_be_below_the_limit() {
    let s = Setup::new(SHARED);
    let other = Address::generate(&s.env);
    assert_eq!(
        try_open(&s, &other, "Shop", SHARED, 32, "Ibadan", ""),
        Err(Error::InvalidCategory)
    );
    assert_eq!(
        try_open(&s, &other, "Shop", SHARED, 31, "Ibadan", ""),
        Ok(())
    );
}

#[test]
fn city_must_be_present_and_short() {
    let s = Setup::new(SHARED);
    let other = Address::generate(&s.env);
    let long = "A city name that is much too long to fit on a shop page";
    assert_eq!(
        try_open(&s, &other, "Shop", SHARED, FOOD, "", ""),
        Err(Error::InvalidCity)
    );
    assert_eq!(
        try_open(&s, &other, "Shop", SHARED, FOOD, "   ", ""),
        Err(Error::InvalidCity)
    );
    assert_eq!(
        try_open(&s, &other, "Shop", SHARED, FOOD, "\t\t", ""),
        Err(Error::InvalidCity)
    );
    assert_eq!(
        try_open(&s, &other, "Shop", SHARED, FOOD, long, ""),
        Err(Error::InvalidCity)
    );
}

#[test]
fn contact_is_optional_but_short() {
    let s = Setup::new(SHARED);
    let other = Address::generate(&s.env);
    let long = "https://example.com/a/very/long/link/that/goes/on/and/on/past/eighty/bytes/of/text";
    assert_eq!(
        try_open(&s, &other, "Shop", SHARED, FOOD, "Ibadan", long),
        Err(Error::InvalidContact)
    );
    assert_eq!(
        try_open(&s, &other, "Shop", SHARED, FOOD, "Ibadan", ""),
        Ok(())
    );
}

#[test]
fn a_shop_can_change_its_details() {
    let s = Setup::new(SHARED);
    try_update(
        &s,
        "Tola's Kitchen and Bar",
        8,
        "Lekki, Lagos",
        "https://tolas.example",
    )
    .unwrap();
    let shop = s.kepter.get_merchant(&s.shop);
    assert_eq!(shop.name, text(&s, "Tola's Kitchen and Bar"));
    assert_eq!(shop.category, 8);
    assert_eq!(shop.city, text(&s, "Lekki, Lagos"));
    assert_eq!(shop.contact, text(&s, "https://tolas.example"));
    assert_eq!(shop.expiry_keep_bps, SHARED);
    assert_eq!(s.kepter.shop_count(), 1);
}

#[test]
fn changing_details_checks_them() {
    let s = Setup::new(SHARED);
    assert_eq!(
        try_update(&s, "", FOOD, "Ibadan", ""),
        Err(Error::InvalidName)
    );
    assert_eq!(
        try_update(&s, "   ", FOOD, "Ibadan", ""),
        Err(Error::InvalidName)
    );
    assert_eq!(
        try_update(&s, "Shop", 40, "Ibadan", ""),
        Err(Error::InvalidCategory)
    );
    assert_eq!(
        try_update(&s, "Shop", FOOD, "", ""),
        Err(Error::InvalidCity)
    );
    assert_eq!(
        try_update(&s, "Shop", FOOD, "   ", ""),
        Err(Error::InvalidCity)
    );
    assert_eq!(
        try_update(&s, "Shop", FOOD, "\t\t", ""),
        Err(Error::InvalidCity)
    );
}

#[test]
fn unknown_shop_cannot_change_details() {
    let s = Setup::new(SHARED);
    let other = Address::generate(&s.env);
    let result = s.kepter.try_update_shop(
        &other,
        &text(&s, "Shop"),
        &FOOD,
        &text(&s, "Ibadan"),
        &text(&s, ""),
    );
    assert_eq!(result, Err(Ok(Error::MerchantNotFound)));
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
    assert_eq!(
        try_update(&s, "Shop", FOOD, "Ibadan", ""),
        Err(Error::StoreClosed)
    );
}
