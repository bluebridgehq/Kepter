use soroban_sdk::{contractevent, Address, String};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StoreOpened {
    #[topic]
    pub merchant: Address,
    pub name: String,
    pub expiry_keep_bps: u32,
    pub category: u32,
    pub city: String,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StoreUpdated {
    #[topic]
    pub merchant: Address,
    pub name: String,
    pub category: u32,
    pub city: String,
    pub contact: String,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StoreClosed {
    #[topic]
    pub merchant: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExpiryRuleChanged {
    #[topic]
    pub merchant: Address,
    pub expiry_keep_bps: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CardBought {
    #[topic]
    pub card_id: u64,
    #[topic]
    pub merchant: Address,
    pub buyer: Address,
    pub amount: i128,
    pub expires_at: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CardToppedUp {
    #[topic]
    pub card_id: u64,
    pub funder: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CardRedeemed {
    #[topic]
    pub card_id: u64,
    #[topic]
    pub merchant: Address,
    pub amount: i128,
    pub balance: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CardSettled {
    #[topic]
    pub card_id: u64,
    pub to_shop: i128,
    pub to_funders: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AmountOwed {
    #[topic]
    pub card_id: u64,
    #[topic]
    pub account: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OwedClaimed {
    #[topic]
    pub card_id: u64,
    #[topic]
    pub account: Address,
    pub amount: i128,
}
