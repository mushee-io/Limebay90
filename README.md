# Nosh

**Nosh is an NFT marketplace for the Ultra blockchain.**

This repository contains Milestones 1–5 of the Nosh MVP, built against **Ultra Testnet** and Ultra's native **Uniq** NFT standard.

## What is complete

### Milestone 1 — Marketplace foundation
- Next.js + TypeScript application
- Responsive premium marketplace UI
- Explore / My Uniqs navigation
- Honest loading, empty and RPC error states
- No mock NFT records are substituted for chain data

### Milestone 2 — Ultra Testnet
- Ultra Testnet chain ID configured
- Public RPC failover across multiple Ultra block producers
- Live chain health route at `/api/ultra/health`
- Optional `ULTRA_TESTNET_RPC` override

### Milestone 3 — Ultra Wallet
- Official `@ultraos/wallet-sdk@^0.6.1`
- Testnet extension provider
- Connect / eager reconnect / disconnect
- Account-aware UI
- Clear warning when the Ultra browser extension is missing

### Milestone 4 — User Uniq inventory
- Reads the connected account's real `eosio.nft.ft::token.b` table
- Resolves each Uniq's real `factory.b` row
- Displays token ID, factory ID, serial number, owner and on-chain provenance

### Milestone 5 — Live Explore
- Reads real listings from `eosio.nft.ft::resale.a`
- Resolves each listing to the seller's real `token.b` row
- Resolves the real factory from `factory.b`
- Displays actual UOS listing prices
- If Testnet returns zero listings, Nosh shows a real empty state instead of fake demo NFTs

## Architecture

```
Ultra Wallet Extension
        |
        v
@ultraos/wallet-sdk
        |
        v
     Nosh UI
        |
        v
Next.js server routes
        |
        v
Ultra Testnet RPC
  eosio.nft.ft
   ├─ resale.a
   ├─ token.b
   └─ factory.b
```

The RPC reads run through Nosh server routes so the browser is not tied to one block producer's CORS policy. The RPC client automatically falls back across Ultra's documented Testnet producer endpoints.

## Run locally

```bash
npm install
npm run dev
```

For Ultra Wallet Extension testing, use HTTPS. The Ultra extension only injects its provider on HTTPS pages. One option with Next is:

```bash
npx next dev --experimental-https
```

Then set the Ultra Wallet Extension to **Testnet** and open the HTTPS local URL.

## Environment

No secret is required for Milestones 1–5.

Optional:

```bash
ULTRA_TESTNET_RPC=https://ultra-testnet.eosphere.io
```

If omitted, Nosh uses its built-in RPC failover list.

## Important implementation note

Ultra Uniq metadata URIs can point to packaged metadata rather than a directly renderable image. In Milestones 1–5 the NFT cards therefore use deterministic Nosh artwork while all identity, ownership, factory and price information comes from Ultra on-chain data. Metadata unpacking / rich NFT detail rendering belongs in the next milestone.

## Next

Milestone 6: individual Uniq detail + metadata resolver.

Then:
- Create Uniq Factory
- Mint
- Resell
- Buy
- Activity / profiles
