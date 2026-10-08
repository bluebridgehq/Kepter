//! Checks the redemption message against `test-vectors/redeem.json`, which the
//! SDK checks too, so Rust and TypeScript always build the same bytes.

use ed25519_dalek::Signer;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::{Bytes, Env};

use super::*;

const VECTORS: &str = include_str!("../../../../test-vectors/redeem.json");

fn field(name: &str) -> &'static str {
    let tag = std::format!("\"{name}\": \"");
    let start = VECTORS.find(&tag).expect("field missing") + tag.len();
    let end = VECTORS[start..].find('"').unwrap() + start;
    &VECTORS[start..end]
}

fn number(name: &str) -> u128 {
    let tag = std::format!("\"{name}\": ");
    let start = VECTORS.find(&tag).expect("field missing") + tag.len();
    let end = VECTORS[start..]
        .find(|c: char| !c.is_ascii_digit())
        .unwrap()
        + start;
    VECTORS[start..end].parse().unwrap()
}

fn hex(bytes: &[u8]) -> std::string::String {
    bytes.iter().map(|b| std::format!("{b:02x}")).collect()
}

#[test]
fn redemption_message_matches_shared_vectors() {
    let env = Env::default();
    let passphrase = field("network_passphrase");
    let network_id = env
        .crypto()
        .sha256(&Bytes::from_slice(&env, passphrase.as_bytes()));
    env.ledger().set_network_id(network_id.to_array());

    let seed = field("secret_seed_hex");
    let seed: std::vec::Vec<u8> = (0..seed.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&seed[i..i + 2], 16).unwrap())
        .collect();
    let key = ed25519_dalek::SigningKey::from_bytes(&seed.try_into().unwrap());

    let msg = crate::redeem_message(
        &env,
        number("card_id") as u64,
        number("amount") as i128,
        number("nonce") as u32,
        number("valid_until") as u64,
    );
    let msg = to_vec(&msg);

    assert_eq!(
        hex(&key.verifying_key().to_bytes()),
        field("public_key_hex")
    );
    assert_eq!(msg.len(), 84);
    assert_eq!(hex(&msg), field("message_hex"));
    assert_eq!(hex(&key.sign(&msg).to_bytes()), field("signature_hex"));
}
