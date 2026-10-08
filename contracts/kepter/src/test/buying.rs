use soroban_sdk::testutils::Address as _;
use soroban_sdk::Address;

use super::*;
use crate::Error;

#[test]
fn buying_moves_usdc_and_stores_the_card() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(25), &key);

    assert_eq!(card_id, 1);
    assert_eq!(s.token.balance(&s.kepter.address), usdc(25));
    assert_eq!(s.token.balance(&s.buyer), usdc(10_000 - 25));

    let card = s.kepter.get_card(&card_id);
    assert_eq!(card.merchant, s.shop);
    assert_eq!(card.key, card_key(&s.env, &key));
    assert_eq!(card.balance, usdc(25));
    assert_eq!(card.total_paid, usdc(25));
    assert_eq!(card.funder_count, 1);
    assert_eq!(card.expiry_keep_bps, SHARED);
    assert_eq!(card.expires_at, START + 30 * DAY);
    assert_eq!(card.nonce, 0);
    assert!(!card.settled);

    let funder = s.kepter.get_funder(&card_id, &0);
    assert_eq!(funder.account, s.buyer);
    assert_eq!(funder.paid, usdc(25));
    assert_eq!(s.kepter.get_merchant_card(&s.shop, &0), card_id);

    let shop = s.kepter.get_merchant(&s.shop);
    assert_eq!(shop.card_count, 1);
    assert_eq!(shop.open_cards, 1);
    assert_eq!(shop.outstanding, usdc(25));
    s.assert_backed();
}

#[test]
fn card_ids_increase() {
    let s = Setup::new(SHARED);
    assert_eq!(s.buy(usdc(5), &signing_key(1)), 1);
    assert_eq!(s.buy(usdc(5), &signing_key(2)), 2);
    assert_eq!(s.kepter.get_merchant_card(&s.shop, &1), 2);
}

#[test]
fn buying_checks_amount_limits() {
    let s = Setup::new(SHARED);
    let key = card_key(&s.env, &signing_key(1));
    let expires = START + 30 * DAY;
    let too_small = s
        .kepter
        .try_buy(&s.buyer, &s.shop, &(usdc(1) - 1), &key, &expires);
    assert_eq!(too_small, Err(Ok(Error::InvalidAmount)));
    let too_large = s
        .kepter
        .try_buy(&s.buyer, &s.shop, &(usdc(1_000) + 1), &key, &expires);
    assert_eq!(too_large, Err(Ok(Error::InvalidAmount)));
    assert!(s
        .kepter
        .try_buy(&s.buyer, &s.shop, &usdc(1_000), &key, &expires)
        .is_ok());
}

#[test]
fn buying_checks_expiry_limits() {
    let s = Setup::new(SHARED);
    let key = card_key(&s.env, &signing_key(1));
    let too_soon = s
        .kepter
        .try_buy(&s.buyer, &s.shop, &usdc(5), &key, &(START + 7 * DAY - 1));
    assert_eq!(too_soon, Err(Ok(Error::InvalidExpiry)));
    let too_late = s
        .kepter
        .try_buy(&s.buyer, &s.shop, &usdc(5), &key, &(START + 180 * DAY + 1));
    assert_eq!(too_late, Err(Ok(Error::InvalidExpiry)));
    assert!(s
        .kepter
        .try_buy(&s.buyer, &s.shop, &usdc(5), &key, &(START + 180 * DAY))
        .is_ok());
}

#[test]
fn buying_from_a_missing_or_closed_shop_fails() {
    let s = Setup::new(SHARED);
    let key = card_key(&s.env, &signing_key(1));
    let expires = START + 30 * DAY;
    let nobody = Address::generate(&s.env);
    assert_eq!(
        s.kepter
            .try_buy(&s.buyer, &nobody, &usdc(5), &key, &expires),
        Err(Ok(Error::MerchantNotFound))
    );
    s.kepter.close_store(&s.shop);
    assert_eq!(
        s.kepter
            .try_buy(&s.buyer, &s.shop, &usdc(5), &key, &expires),
        Err(Ok(Error::StoreClosed))
    );
}

#[test]
fn friends_can_chip_in() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(20), &signing_key(1));
    let friend = s.funded_account();
    let cousin = s.funded_account();
    s.kepter.top_up(&friend, &card_id, &usdc(10));
    s.kepter.top_up(&cousin, &card_id, &usdc(10));
    s.kepter.top_up(&friend, &card_id, &usdc(5));

    let card = s.kepter.get_card(&card_id);
    assert_eq!(card.balance, usdc(45));
    assert_eq!(card.total_paid, usdc(45));
    assert_eq!(card.funder_count, 3);
    assert_eq!(s.kepter.get_funder(&card_id, &1).account, friend);
    assert_eq!(s.kepter.get_funder(&card_id, &1).paid, usdc(15));
    assert_eq!(s.kepter.get_funder(&card_id, &2).paid, usdc(10));
    assert_eq!(s.kepter.get_merchant(&s.shop).outstanding, usdc(45));
    s.assert_backed();
}

#[test]
fn a_shop_can_give_store_credit() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(5), &signing_key(1));
    s.admin.mint(&s.shop, &usdc(50));
    s.kepter.top_up(&s.shop, &card_id, &usdc(20));
    assert_eq!(s.kepter.get_funder(&card_id, &1).account, s.shop);
    assert_eq!(s.kepter.get_card(&card_id).balance, usdc(25));
}

#[test]
fn top_up_respects_the_card_limit() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(990), &signing_key(1));
    let friend = s.funded_account();
    assert_eq!(
        s.kepter.try_top_up(&friend, &card_id, &usdc(11)),
        Err(Ok(Error::CardLimitReached))
    );
    assert!(s.kepter.try_top_up(&friend, &card_id, &usdc(10)).is_ok());
    assert_eq!(
        s.kepter.try_top_up(&friend, &card_id, &(usdc(1) - 1)),
        Err(Ok(Error::InvalidAmount))
    );
}

#[test]
fn top_up_allows_at_most_twenty_funders() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(1), &signing_key(1));
    for _ in 1..20 {
        s.kepter.top_up(&s.funded_account(), &card_id, &usdc(1));
    }
    assert_eq!(s.kepter.get_card(&card_id).funder_count, 20);
    assert_eq!(
        s.kepter.try_top_up(&s.funded_account(), &card_id, &usdc(1)),
        Err(Ok(Error::TooManyFunders))
    );
    // An existing funder can still add more.
    assert!(s.kepter.try_top_up(&s.buyer, &card_id, &usdc(1)).is_ok());
}

#[test]
fn top_up_fails_after_expiry_settlement_or_closing() {
    let s = Setup::new(SHARED);
    let friend = s.funded_account();

    let expired = s.buy(usdc(5), &signing_key(1));
    s.set_time(START + 30 * DAY);
    assert_eq!(
        s.kepter.try_top_up(&friend, &expired, &usdc(5)),
        Err(Ok(Error::CardExpired))
    );
    s.kepter.settle(&expired);
    assert_eq!(
        s.kepter.try_top_up(&friend, &expired, &usdc(5)),
        Err(Ok(Error::CardSettled))
    );

    s.set_time(START);
    let open = s.buy(usdc(5), &signing_key(2));
    s.kepter.close_store(&s.shop);
    assert_eq!(
        s.kepter.try_top_up(&friend, &open, &usdc(5)),
        Err(Ok(Error::StoreClosed))
    );
}
