# Nosh

Nosh is a **simple NFT marketplace on Ultra**.

The V1 intentionally does only the basics.

## V1 features

- Connect / disconnect Ultra Wallet
- Create an Ultra Uniq Factory (collection)
- Mint one Uniq/NFT
- View NFTs owned by the connected account
- View live resale listings
- Open a basic NFT detail view
- List an owned NFT for sale in UOS
- Cancel an NFT listing
- Buy a listed NFT

That is the complete product scope for this version.

## Ultra integration

Nosh uses Ultra's native NFT contract instead of deploying a custom NFT contract:

```
eosio.nft.ft
├── create.b       create collection / Uniq Factory
├── issue.b        mint NFT
├── resell         list NFT
├── cancelresell   cancel listing
└── buy            buy listed NFT
```

Read state comes directly from Ultra's NFT tables:

```
factory.b
token.b
resale.a
```

Wallet connection and transaction signing use the official `@ultraos/wallet-sdk`.

## Testnet

The application targets Ultra Testnet.

```
Chain ID:
7fc56be645bb76ab9d747b53089f132dcb7681db06f0852cfa03eaf6f7ac80e9
```

For Testnet, use the Ultra Wallet browser extension and make sure the wallet itself is switched to Testnet.

## Create / mint metadata

Ultra Uniqs use off-chain metadata. The basic creator screen accepts an HTTPS or IPFS metadata URI for:

- the collection/factory metadata
- the default NFT metadata
- optional token-specific metadata when minting

Dynamic `{serial_number}` metadata URLs are supported.

## Run locally

```bash
npm install
npx next dev --experimental-https
```

HTTPS is recommended because the Ultra Wallet extension injects its provider on HTTPS pages.

## Optional RPC override

```bash
ULTRA_TESTNET_RPC=https://ultra-testnet.eosphere.io
```

Without this variable, Nosh falls back across its configured Ultra Testnet RPC endpoints.

## Checks

```bash
npm run typecheck
npm run build
```

<!-- vercel-deploy-trigger: 2026-09-24 -->
