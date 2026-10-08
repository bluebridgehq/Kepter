use soroban_sdk::testutils::storage::Persistent as _;
use soroban_sdk::testutils::Events as _;
use soroban_sdk::Event;

use super::*;
use crate::events::{CardBought, CardRedeemed, CardSettled, CardToppedUp};
use crate::storage::DataKey;

#[test]
fn totals_stay_correct_through_every_action() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(30), &key);
    let other = s.buy(usdc(10), &signing_key(2));
    s.assert_backed();

    let friend = s.funded_account();
    s.kepter.top_up(&friend, &card_id, &usdc(10));
    s.assert_backed();

    s.redeem(&key, card_id, usdc(15));
    s.assert_backed();

    let shop = s.kepter.get_merchant(&s.shop);
    assert_eq!(shop.open_cards, 2);
    assert_eq!(shop.outstanding, usdc(35));

    s.set_time(START + 30 * DAY);
    s.kepter.settle(&card_id);
    s.kepter.settle(&other);
    s.assert_backed();

    let shop = s.kepter.get_merchant(&s.shop);
    assert_eq!(shop.open_cards, 0);
    assert_eq!(shop.outstanding, 0);
    assert_eq!(s.kepter.total_owed(), 0);
}

#[test]
fn data_is_kept_alive_for_a_full_card_life() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(10), &signing_key(1));
    let max = s.env.storage().max_ttl();
    let ttl = s.env.as_contract(&s.kepter.address, || {
        s.env
            .storage()
            .persistent()
            .get_ttl(&DataKey::Card(card_id))
    });
    assert_eq!(ttl, max);
}

#[test]
fn events_describe_each_action() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    let bought = CardBought {
        card_id,
        merchant: s.shop.clone(),
        buyer: s.buyer.clone(),
        amount: usdc(20),
        expires_at: START + 30 * DAY,
    };
    assert!(s
        .env
        .events()
        .all()
        .filter_by_contract(&s.kepter.address)
        .events()
        .contains(&bought.to_xdr(&s.env, &s.kepter.address)));

    let friend = s.funded_account();
    s.kepter.top_up(&friend, &card_id, &usdc(5));
    let topped = CardToppedUp {
        card_id,
        funder: friend,
        amount: usdc(5),
    };
    assert!(s
        .env
        .events()
        .all()
        .events()
        .contains(&topped.to_xdr(&s.env, &s.kepter.address)));

    s.redeem(&key, card_id, usdc(5));
    let redeemed = CardRedeemed {
        card_id,
        merchant: s.shop.clone(),
        amount: usdc(5),
        balance: usdc(20),
    };
    assert!(s
        .env
        .events()
        .all()
        .events()
        .contains(&redeemed.to_xdr(&s.env, &s.kepter.address)));

    s.set_time(START + 30 * DAY);
    s.kepter.settle(&card_id);
    let settled = CardSettled {
        card_id,
        to_shop: usdc(10),
        to_funders: usdc(10),
    };
    assert!(s
        .env
        .events()
        .all()
        .events()
        .contains(&settled.to_xdr(&s.env, &s.kepter.address)));
}
