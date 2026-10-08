use soroban_sdk::{contracttype, Address, BytesN, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Merchant {
    pub name: String,
    /// Shop's share of an unused balance at expiry, in basis points.
    pub expiry_keep_bps: u32,
    pub closed_at: Option<u64>,
    pub card_count: u32,
    pub open_cards: u32,
    pub outstanding: i128,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Card {
    pub merchant: Address,
    pub key: BytesN<32>,
    pub total_paid: i128,
    pub balance: i128,
    pub funder_count: u32,
    /// The shop's rule at the time the card was bought.
    pub expiry_keep_bps: u32,
    pub created_at: u64,
    pub expires_at: u64,
    pub nonce: u32,
    pub settled: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FunderInfo {
    pub account: Address,
    pub paid: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Settlement {
    pub to_shop: i128,
    pub to_funders: i128,
}
