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

## Why AjoCoin is a strong competition entry

AjoCoin turns a familiar savings habit into a clear, social Nimiq mini-app experience. It shows how a lightweight financial app can feel intuitive while still using real wallet actions and on-chain-style flows for contributions, payouts, and treasury coordination.

The app is built around three strengths judges usually look for:

- A real-world use case: collective savings circles are easy to understand and immediately relatable.
- A complete mini-app flow: wallet connect, group setup, member management, contribution, payout release, and follow-up actions are all covered.
- A polished UX: the interface is designed to feel native, simple, and approachable for first-time mini-app users.

## Demo script

1. Open the app inside Nimiq Pay or a compatible Nimiq wallet environment.
2. Connect the wallet and create a new ajo group with a simple name and savings rule.
3. Share the invite link with a second participant and show how joining works.
4. Demonstrate a contribution, then show the recipient rotation and payout release flow.
5. Highlight the voting and vesting experience to show the app goes beyond a simple payment screen.

## Submission note

AjoCoin is designed to work with real Nimiq wallet actions when run inside Nimiq Pay. In a plain browser preview, the UI still works, but actual transaction execution depends on the injected Nimiq provider.

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