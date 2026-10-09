## What does this change?

<!-- One to three sentences. -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Tests
- [ ] Docs
- [ ] CI or scripts
- [ ] Refactor with no change in behaviour

## How was it tested?

<!-- What you ran and what you checked by hand. -->

## Checklist

- [ ] I was assigned to the linked issue before starting
- [ ] The title follows [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `test:`, `docs:`, `ci:`)
- [ ] I read [CONTRIBUTING.md](https://github.com/bluebridgehq/kepter/blob/main/CONTRIBUTING.md)

**Contract** (inside `contracts/`)

- [ ] `cargo fmt --all -- --check`, `cargo clippy --all-targets -- -D warnings` and `cargo test` pass
- [ ] New behaviour has tests, and total owed still equals the contract's USDC balance
- [ ] If the interface changed, I ran `pnpm generate` in `sdk/` and updated `docs/DESIGN.md`

**SDK** (inside `sdk/`)

- [ ] `pnpm typecheck`, `pnpm test` and `pnpm build` pass

**Website**

- [ ] `pnpm --filter @kepter/frontend typecheck`, `lint` and `build` pass
- [ ] Screenshots below at phone width (390 px), in light and dark mode

## Screenshots

<!-- For website changes. -->
