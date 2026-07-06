# AjoCoin

Decentralized group savings (ajo) mini app for [Nimiq Pay](https://nimiq.com). Create savings circles, contribute NIM to a shared treasury, and release round payouts to members in turn.

**Live demo:** https://ajocoin.vercel.app

**Open in Nimiq Pay:**

```
nimiqpay://miniapp?url=ajocoin.vercel.app
```

## Features

- Connect Nimiq wallet via the Mini Apps SDK
- Create ajo groups with fixed or flexible savings and cycle presets
- Join via invite link, share invites, and add members
- Contribute NIM to the group treasury with real transactions
- Treasurer releases payouts; turn alerts for withdraw, contribute, and up next
- Group voting and activity tracking

## Tech stack

- React 18, TypeScript, Vite, Tailwind CSS
- [`@nimiq/mini-app-sdk`](https://www.npmjs.com/package/@nimiq/mini-app-sdk) for wallet connect and NIM payments
- Deployed on Vercel

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Run logic smoke tests:

```bash
npx tsx scripts/smoke-test.ts
```

## Nimiq Pay integration

AjoCoin uses the Nimiq Mini Apps Framework for:

- `init()` / `connect()` — wallet connection inside Nimiq Pay
- `listAccounts()` — account selection
- `sendBasicTransaction()` — contributions and payout releases in NIM

Open the app inside Nimiq Pay to use a real wallet. A browser-only preview will show the connect UI but cannot complete transactions without the injected provider.

## Competition

Built for the [Nimiq Mini Apps Competition](https://miniappscompetition.com/) — Cycle I (July 2026).

## License

MIT — see [LICENSE](LICENSE).