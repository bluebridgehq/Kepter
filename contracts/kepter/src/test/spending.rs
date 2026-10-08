use super::*;
use crate::Error;

#[test]
fn redeeming_pays_the_shop() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    s.redeem(&key, card_id, usdc(7));

    let card = s.kepter.get_card(&card_id);
    assert_eq!(card.balance, usdc(13));
    assert_eq!(card.nonce, 1);
    assert_eq!(s.token.balance(&s.shop), usdc(7));
    assert_eq!(s.kepter.get_merchant(&s.shop).outstanding, usdc(13));
    s.assert_backed();
}

#[test]
fn a_signature_from_another_key_fails() {
    let s = Setup::new(SHARED);
    let card_id = s.buy(usdc(20), &signing_key(1));
    let (valid_until, sig) = s.sign(&signing_key(2), card_id, usdc(5));
    assert!(s
        .kepter
        .try_redeem(&card_id, &usdc(5), &valid_until, &sig)
        .is_err());
    assert_eq!(s.kepter.get_card(&card_id).balance, usdc(20));
}

#[test]
fn a_signature_for_another_amount_fails() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    let (valid_until, sig) = s.sign(&key, card_id, usdc(5));
    assert!(s
        .kepter
        .try_redeem(&card_id, &usdc(15), &valid_until, &sig)
        .is_err());
}

#[test]
fn the_same_qr_code_cannot_be_used_twice() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    let (valid_until, sig) = s.sign(&key, card_id, usdc(5));
    s.kepter.redeem(&card_id, &usdc(5), &valid_until, &sig);
    assert!(s
        .kepter
        .try_redeem(&card_id, &usdc(5), &valid_until, &sig)
        .is_err());
    assert_eq!(s.kepter.get_card(&card_id).balance, usdc(15));
}

#[test]
fn redeeming_more_than_the_balance_fails() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    let (valid_until, sig) = s.sign(&key, card_id, usdc(21));
    assert_eq!(
        s.kepter.try_redeem(&card_id, &usdc(21), &valid_until, &sig),
        Err(Ok(Error::InsufficientBalance))
    );
}

#[test]
fn qr_codes_expire_and_cannot_be_valid_for_long() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);

    let (valid_until, sig) = s.sign(&key, card_id, usdc(5));
    s.set_time(valid_until + 1);
    assert_eq!(
        s.kepter.try_redeem(&card_id, &usdc(5), &valid_until, &sig),
        Err(Ok(Error::QrExpired))
    );

    let far = s.now() + 15 * 60 + 1;
    let sig = sign_redeem(&s.env, &key, card_id, usdc(5), 0, far);
    assert_eq!(
        s.kepter.try_redeem(&card_id, &usdc(5), &far, &sig),
        Err(Ok(Error::QrTooLong))
    );
}

#[test]
fn an_expired_card_cannot_be_spent() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    s.set_time(START + 30 * DAY);
    let (valid_until, sig) = s.sign(&key, card_id, usdc(5));
    assert_eq!(
        s.kepter.try_redeem(&card_id, &usdc(5), &valid_until, &sig),
        Err(Ok(Error::CardExpired))
    );
}

#[test]
fn a_closed_shop_cannot_redeem() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    s.kepter.close_store(&s.shop);
    let (valid_until, sig) = s.sign(&key, card_id, usdc(5));
    assert_eq!(
        s.kepter.try_redeem(&card_id, &usdc(5), &valid_until, &sig),
        Err(Ok(Error::StoreClosed))
    );
}

#[test]
fn a_card_can_be_spent_to_zero_and_reloaded() {
    let s = Setup::new(SHARED);
    let key = signing_key(1);
    let card_id = s.buy(usdc(20), &key);
    s.redeem(&key, card_id, usdc(20));
    assert_eq!(s.kepter.get_card(&card_id).balance, 0);
    assert_eq!(s.kepter.get_merchant(&s.shop).open_cards, 0);

    s.kepter.top_up(&s.buyer, &card_id, &usdc(5));
    assert_eq!(s.kepter.get_merchant(&s.shop).open_cards, 1);
    s.redeem(&key, card_id, usdc(5));
    assert_eq!(s.token.balance(&s.shop), usdc(25));
    s.assert_backed();
}
