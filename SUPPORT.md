# Getting help

Thanks for using Kepter. Most questions are answered in the docs below, so please check them first.

## Where to look

| You want to | Read |
|:------------|:-----|
| Understand what Kepter is and who it is for | [docs/OVERVIEW.md](docs/OVERVIEW.md) |
| Understand how the contract works | [docs/DESIGN.md](docs/DESIGN.md) |
| Set up the project and contribute | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Use the SDK in your own app | [sdk/README.md](sdk/README.md) |
| Run or host the website | [frontend/README.md](frontend/README.md) |
| Try it without installing anything | [kepter.vercel.app](https://kepter.vercel.app) |

## Asking a question

Ask in [GitHub Discussions](https://github.com/bluebridgehq/kepter/discussions). Issues are for bugs and planned work, so questions opened as issues may be moved there.

## Reporting a bug or asking for a feature

[Open an issue](https://github.com/bluebridgehq/kepter/issues/new/choose) with the matching form. Search the open issues first in case someone already reported it.

## Security problems

Never report these in public. Follow [SECURITY.md](SECURITY.md).

## Common questions

**My wallet will not receive test USDC.** It needs the USDC asset added first. On kepter.vercel.app, open any shop, connect your wallet and tap **Add USDC to my wallet**, then use [Circle's faucet](https://faucet.circle.com) with **Stellar Testnet** selected.

**The camera does not open on my phone.** Phone browsers only allow the camera on HTTPS. Use the live site, or run `pnpm dev:phone` locally.

**I lost a gift card link.** If you bought it in this browser, it is under **Your gifts**. Otherwise only the person who has the link can open the card.
