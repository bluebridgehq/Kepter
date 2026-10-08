extern crate std;

mod buying;
mod settling;
mod shops;
mod spending;
mod totals;
mod vectors;

use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::testutils::{Address as _, IssuerFlags, Ledger as _};
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{Address, Bytes, BytesN, Env, String};

use crate::storage::UNIT;
use crate::{Kepter, KepterClient};

pub const START: u64 = 1_760_000_000;
pub const DAY: u64 = 24 * 60 * 60;
pub const BUYER_PROTECTED: u32 = 0;
pub const SHARED: u32 = 5_000;
pub const SHOP_KEEPS: u32 = 10_000;
pub const FOOD: u32 = 1;

pub fn usdc(amount: i128) -> i128 {
    amount * UNIT
}

pub struct Setup {
    pub env: Env,
    pub kepter: KepterClient<'static>,
    pub usdc: Address,
    pub token: TokenClient<'static>,
    pub admin: StellarAssetClient<'static>,
    pub shop: Address,
    pub buyer: Address,
}

impl Setup {
    pub fn new(rule: u32) -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(START);

        let issuer = Address::generate(&env);
        let sac = env.register_stellar_asset_contract_v2(issuer);
        sac.issuer().set_flag(IssuerFlags::RevocableFlag);
        let usdc_id = sac.address();

        let contract_id = env.register(Kepter, (usdc_id.clone(),));
        let kepter = KepterClient::new(&env, &contract_id);
        let token = TokenClient::new(&env, &usdc_id);
        let admin = StellarAssetClient::new(&env, &usdc_id);

        let shop = Address::generate(&env);
        open_shop(&kepter, &env, &shop, "Tola's Kitchen", rule);

        let buyer = Address::generate(&env);
        admin.mint(&buyer, &usdc(10_000));

        Setup {
            env,
            kepter,
            usdc: usdc_id,
            token,
            admin,
            shop,
            buyer,
        }
    }

    pub fn funded_account(&self) -> Address {
        let account = Address::generate(&self.env);
        self.admin.mint(&account, &usdc(10_000));
        account
    }

    pub fn buy(&self, amount: i128, key: &SigningKey) -> u64 {
        self.kepter.buy(
            &self.buyer,
            &self.shop,
            &amount,
            &card_key(&self.env, key),
            &(START + 30 * DAY),
        )
    }

    pub fn set_time(&self, timestamp: u64) {
        self.env.ledger().set_timestamp(timestamp);
    }

    pub fn now(&self) -> u64 {
        self.env.ledger().timestamp()
    }

    /// A signed redemption for the card's current nonce, valid for 5 minutes.
    pub fn sign(&self, key: &SigningKey, card_id: u64, amount: i128) -> (u64, BytesN<64>) {
        let nonce = self.kepter.get_card(&card_id).nonce;
        let valid_until = self.now() + 300;
        let sig = sign_redeem(&self.env, key, card_id, amount, nonce, valid_until);
        (valid_until, sig)
    }

    pub fn redeem(&self, key: &SigningKey, card_id: u64, amount: i128) {
        let (valid_until, sig) = self.sign(key, card_id, amount);
        self.kepter.redeem(&card_id, &amount, &valid_until, &sig);
    }

    pub fn assert_backed(&self) {
        assert_eq!(
            self.kepter.total_owed(),
            self.token.balance(&self.kepter.address),
            "total owed must equal the contract's USDC balance"
        );
    }
}

pub fn open_shop(kepter: &KepterClient, env: &Env, shop: &Address, name: &str, rule: u32) {
    kepter.register_merchant(
        shop,
        &String::from_str(env, name),
        &rule,
        &FOOD,
        &String::from_str(env, "Yaba, Lagos"),
        &String::from_str(env, "+2348012345678"),
    );
}

pub fn signing_key(seed: u8) -> SigningKey {
    SigningKey::from_bytes(&[seed; 32])
}

pub fn card_key(env: &Env, key: &SigningKey) -> BytesN<32> {
    BytesN::from_array(env, &key.verifying_key().to_bytes())
}

pub fn sign_redeem(
    env: &Env,
    key: &SigningKey,
    card_id: u64,
    amount: i128,
    nonce: u32,
    valid_until: u64,
) -> BytesN<64> {
    let msg = crate::redeem_message(env, card_id, amount, nonce, valid_until);
    BytesN::from_array(env, &key.sign(&to_vec(&msg)).to_bytes())
}

pub fn to_vec(bytes: &Bytes) -> std::vec::Vec<u8> {
    bytes.iter().collect()
}
