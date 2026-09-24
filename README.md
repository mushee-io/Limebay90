# Nosh

**Nosh is a native NFT marketplace for Ultra's Uniq standard.**

The MVP is complete through **Milestones 1–10** on **Ultra Testnet**.

## Completed milestones

1. **Marketplace foundation** — Next.js, TypeScript, responsive premium marketplace UI.
2. **Ultra Testnet** — chain health checks and RPC failover.
3. **Ultra Wallet** — official `@ultraos/wallet-sdk` extension connection.
4. **Wallet inventory** — real `eosio.nft.ft::token.b` ownership.
5. **Explore** — real `resale.a` listings, prices and factory provenance.
6. **Uniq detail + metadata** — per-token detail state, dynamic default-token URI substitution, IPFS/HTTPS metadata resolution and artwork.
7. **Create + mint** — native `create.b` Uniq Factory creation and `issue.b` minting with user-controlled maximum UOS payment caps.
8. **Sell** — native `resell` listing plus `cancelresell`.
9. **Buy** — native `buy` transactions using the chain listing price as `max_price`.
10. **Profile / collections / activity / hardening** — account-derived collection grouping, Nosh transaction receipts, strict account/amount/URI validation, SSRF-safe metadata fetching and production CI.

## Source of truth

Nosh does not maintain a shadow NFT ledger. Ownership and marketplace state come from Ultra:

```
eosio.nft.ft
├── factory.b   # Uniq Factory configuration
├── token.b     # account-scoped ownership
└── resale.a    # live resale marketplace
```

## Transaction flow

All write actions are built in the browser and sent to the **official Ultra Wallet SDK**. The connected user approves/signs them; private keys never enter Nosh.

Supported MVP actions:

```
create.b
issue.b
resell
cancelresell
buy
```

## Metadata

Nosh resolves an individual Uniq from:

1. the token-specific `uri`, or
2. the factory `default_token_uri`.

Dynamic placeholders supported by the resolver:

```
{factory_id}
{id}
{token_id}
{hash}
{serial_number}
```

`ipfs://` metadata is resolved through an HTTPS IPFS gateway. Server-side metadata fetching rejects localhost/private-network destinations and responses over 2 MB.

## API routes

```
GET /api/ultra/health
GET /api/ultra/explore
GET /api/ultra/inventory?account=<account>
GET /api/ultra/uniq?owner=<account>&id=<token_id>
GET /api/ultra/factories?account=<account>
```

## Run

```bash
npm install
npm run dev
```

For local Ultra Testnet wallet testing, use HTTPS:

```bash
npx next dev --experimental-https
```

Set the Ultra Wallet Browser Extension to **Testnet**.

## Environment

No secret is required.

Optional custom RPC:

```bash
ULTRA_TESTNET_RPC=https://ultra-testnet.eosphere.io
```

## Safety / transaction limits

Nosh never silently submits a transaction. Factory creation and minting expose a maximum UOS payment field, listing prices are validated to 8 decimals, buys use the current on-chain listing price as the maximum price, and every action requires wallet approval.

## CI

GitHub Actions runs:

```bash
npm install
npm run typecheck
npm run build
```
