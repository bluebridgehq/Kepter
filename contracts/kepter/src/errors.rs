use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyRegistered = 1,
    MerchantNotFound = 2,
    StoreClosed = 3,
    InvalidRule = 4,
    InvalidName = 5,
    InvalidAmount = 6,
    CardLimitReached = 7,
    TooManyFunders = 8,
    InvalidExpiry = 9,
    CardNotFound = 10,
    CardExpired = 11,
    CardSettled = 12,
    InsufficientBalance = 13,
    QrExpired = 14,
    QrTooLong = 15,
    NotSettleable = 16,
    NothingToSettle = 17,
    NothingOwed = 18,
    FunderNotFound = 19,
    Overflow = 20,
    InvalidCategory = 21,
    InvalidCity = 22,
    InvalidContact = 23,
}
