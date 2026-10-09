# Kepter website

The Kepter website: the home page, the shop list, opening a shop, the shop dashboard, the counter scanner, the poster, buying a card, chipping in, and the gift card the recipient opens.

Live on testnet at [kepter.vercel.app](https://kepter.vercel.app).

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

### On a phone

```
pnpm dev:phone
```

This serves the site over HTTPS on your local network, because phone browsers only allow the camera (for the scanner) on HTTPS. Open the `Network` address it prints on a phone connected to the same wifi. The certificate is self signed, so the browser shows a warning first: choose Advanced, then continue.

Wallet apps' built in browsers may refuse a self signed certificate. To test wallet signing on a phone, use the hosted site instead.

## Light and dark

The site follows the device setting until someone taps the sun or moon button in the header. That choice is saved on the device.

## Pages

| Route | Page | Who |
|---|---|---|
| `/` | Home | Everyone |
| `/shops` | Find a shop by category, name or city | Buyer |
| `/open` | Open a shop, in 3 steps | Shop owner |
| `/shop` | Dashboard: cards waiting to be spent, ready to settle, history, store credit, rule, shop details, close | Shop owner |
| `/shop/scan` | Scan a customer's code at the counter, or paste one from an online order | Shop owner |
| `/shop/poster` | Printable counter poster and a square image for social | Shop owner |
| `/s/:shop` | Buy a gift card at a shop | Buyer |
| `/g/:cardId` | Chip in to a gift | Friends |
| `/c/:cardId#k=...` | The gift card: unwrap, balance, pay at the counter or online | Recipient |

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

The live site is on Vercel, deployed from `main` on every push, with `VITE_SITE_URL=https://kepter.vercel.app`.

It builds to a static site in `dist/`. Every route must serve `index.html`.

On Vercel, import the repository and set the root directory to `frontend`. `vercel.json` sets the build command (it builds the SDK first), the output folder and the route rewrite.

On Render, use a static site with the build command `pnpm install && pnpm --filter @kepter/sdk build && pnpm --filter @kepter/frontend build`, publish directory `frontend/dist`, and a rewrite from `/*` to `/index.html`.

Set `VITE_SITE_URL` to the site's address so shared links point to it.
