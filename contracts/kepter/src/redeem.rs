use soroban_sdk::{Bytes, BytesN, Env};

/// Prefix that ties a card key's signature to Kepter redemptions only.
pub const DOMAIN_TAG: &[u8; 16] = b"KEPTER_REDEEM_V1";

/// Builds the 84 byte message a card key signs to approve spending `amount`.
///
/// Layout: domain tag (16) | network id (32) | card id (8) | amount (16) |
/// nonce (4) | valid until (8). All integers are big endian. The SDK builds
/// the same bytes, and `test-vectors/redeem.json` keeps the two in step.
pub fn message(env: &Env, card_id: u64, amount: i128, nonce: u32, valid_until: u64) -> Bytes {
    let mut msg = Bytes::from_array(env, DOMAIN_TAG);
    msg.extend_from_array(&env.ledger().network_id().to_array());
    msg.extend_from_array(&card_id.to_be_bytes());
    msg.extend_from_array(&amount.to_be_bytes());
    msg.extend_from_array(&nonce.to_be_bytes());
    msg.extend_from_array(&valid_until.to_be_bytes());
    msg
}

/// Panics, and so aborts the transaction, if the signature does not match.
pub fn verify(
    env: &Env,
    key: &BytesN<32>,
    card_id: u64,
    amount: i128,
    nonce: u32,
    valid_until: u64,
    signature: &BytesN<64>,
) {
    let msg = message(env, card_id, amount, nonce, valid_until);
    env.crypto().ed25519_verify(key, &msg, signature);
}
