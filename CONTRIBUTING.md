# Contributing to Kepter

Thanks for helping. This guide covers setup, how to pick up work, and what a good pull request looks like.

## Setup

1. Install Rust 1.91 or newer: https://rustup.rs
2. Add the contract target: `rustup target add wasm32v1-none`
3. Install the Stellar CLI: https://developers.stellar.org/docs/tools/cli
4. Clone the repo and run the tests:

```
git clone https://github.com/bluebridgehq/kepter.git
cd kepter/contracts
cargo test
```

For the SDK you also need Node 24 or newer and pnpm. From the repository root run `pnpm install`, then `pnpm --filter @kepter/sdk test`.

Read [docs/DESIGN.md](docs/DESIGN.md) before changing contract logic. It explains the card lifecycle, the redemption message, settlement and the running totals.

## Picking an issue

- Look for open issues with acceptance criteria and a suggested complexity.
- Comment on the issue before you start so two people do not do the same work.
- If something is unclear, ask on the issue. Small questions early save big rewrites later.

## Making changes

- Keep each pull request to one issue.
- Add or update tests for any change in behaviour. Contract tests live in `contracts/kepter/src/test/`, grouped by feature.
- Money math must stay integer only and use checked arithmetic.
- Update the contract's own state before calling the USDC contract.
- If you change the redemption message, update `test-vectors/redeem.json` and say so clearly in the pull request, because the SDK depends on it.
- Update `docs/DESIGN.md` if you change a function, a limit, an error or an event.

## Before you open a pull request

For contract changes, run these inside `contracts/`:

```
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test
stellar contract build
```

For SDK changes, run `pnpm typecheck`, `pnpm test` and `pnpm build` inside `sdk/`. If you change the contract's interface, rebuild it and run `pnpm generate` in `sdk/` so the generated client matches.

CI runs the same checks. Link the issue in the description with `Closes #<number>`.

## Code style

- Follow the style of the surrounding code.
- Comment only where the reason is not obvious from the code.
- Prefer clear names over clever code.

## Security

If you find a way to take or lock money that should not be possible, please do not open a public issue. Contact the maintainers privately through GitHub first.
