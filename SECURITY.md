# Security policy

Kepter holds real money for gift cards. A bug in the contract could let someone take or lock that money, so we take every report seriously.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report it privately through GitHub:

1. Go to the [Security Advisories](https://github.com/bluebridgehq/kepter/security/advisories) page
2. Click **Report a vulnerability**
3. Fill in the form. It stays private until we agree to publish it

### What to include

- What the problem is and which part it affects (contract, SDK or website)
- Steps to reproduce, ideally a failing test or a testnet transaction
- What an attacker could do with it: take money, lock money, spend someone else's card, or something else
- Any fix you suggest

### What happens next

| Step | Within |
|:-----|:-------|
| We confirm we got your report | 3 days |
| We tell you whether we can reproduce it and how serious it is | 7 days |
| We fix it, deploy the fix and publish an advisory, crediting you if you wish | Depends on severity |

## Scope

In scope:

- The contract in `contracts/kepter/`: anything that breaks the rules in [docs/DESIGN.md](docs/DESIGN.md), such as taking card money, spending a card without its key, paying the wrong account, or making total owed differ from the USDC the contract holds
- The payment code format: replaying a code, using it at another shop, or forging one
- The SDK and website: leaking a card's secret, or showing a wrong amount before a payment

Out of scope:

- Bugs that need a compromised wallet or device
- Problems in Stellar itself, Circle's USDC, or wallets such as Freighter. Report those to their own teams
- Testnet only issues with no effect on how the contract would behave on mainnet

## Status

Kepter runs on Stellar testnet and **has not been audited**. Please do not use it with real money until an audit is done and this page says so.
