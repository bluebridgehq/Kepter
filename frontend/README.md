# Kepter website

The Kepter website: the home page, opening a shop, the shop dashboard, the counter scanner, the poster, buying a card, chipping in, and the gift card the recipient opens.

Built with Vite, React 19, TypeScript, Tailwind CSS v4 and React Router. It talks to Stellar only through [`@kepter/sdk`](../sdk) and has no backend.

## Run it

From the repository root:

```
pnpm install
pnpm --filter @kepter/sdk build
pnpm dev
```

The site opens at http://localhost:5173 and uses the testnet deployment in [`deployments/testnet.json`](../deployments/testnet.json).

To point it at another deployment, copy `.env.example` to `.env.local` and fill in the values.

## Pages

| Route | Page | Who |
|---|---|---|
| `/` | Home | Everyone |
| `/open` | Open a shop, in 3 steps | Shop owner |
| `/shop` | Dashboard: cards waiting to be spent, ready to settle, history, store credit, rule, close | Shop owner |
| `/shop/scan` | Scan a customer's code at the counter | Shop owner |
| `/shop/poster` | Printable counter poster and a square image for social | Shop owner |
| `/s/:shop` | Buy a gift card at a shop | Buyer |
| `/g/:cardId` | Chip in to a gift | Friends |
| `/c/:cardId#k=...` | The gift card: unwrap, balance, pay at the counter | Recipient |

The recipient's pages never use crypto words. The card's secret lives after `#` in the link and never reaches a server.

## How it is put together

| Folder | What is in it |
|---|---|
| `src/pages` | One file per route. Each page is loaded only when it is visited |
| `src/components` | The gift card visual, sheets, the payment progress sheet, the header and small UI pieces |
| `src/lib` | Config, formatting, card status, rule wording, storage, sharing, and the wallet, transaction and toast providers |
| `src/index.css` | Design tokens (colours for light and dark, radii, shadows, motion) as a Tailwind v4 theme |

- **Wallets** connect through Stellar Wallets Kit, which loads only when someone connects or signs.
- **Every action that moves money** goes through `useTx().run(...)`, which shows the payment progress sheet: approve in wallet, sending, done or failed with a plain reason and a retry.
- **The scanner** checks each code before charging (right shop, enough balance, not expired, signature valid for the card's current nonce), so a bad code shows a clear message instead of a failed transaction.
- **The gift card page** watches the card while its code is on screen and updates the balance by itself when the shop charges it.

## Checks

```
pnpm --filter @kepter/frontend typecheck
pnpm --filter @kepter/frontend lint
pnpm --filter @kepter/frontend build
```

## Hosting

It builds to a static site in `dist/`. Every route must serve `index.html`. `vercel.json` does this on Vercel. On Render, add a rewrite from `/*` to `/index.html`. Set `VITE_SITE_URL` to the site's address so shared links point to it.
