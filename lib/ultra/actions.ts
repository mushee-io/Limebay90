import { NFT_CONTRACT } from "./config";
import type { WalletAction } from "./types";

const ACCOUNT_RE = /^[a-z1-5.]{1,12}$/;
const UINT_RE = /^\d+$/;

export function assertUltraAccount(account: string) {
  if (!ACCOUNT_RE.test(account)) {
    throw new Error("Invalid Ultra account name.");
  }
  return account;
}

export function assertUInt(value: string, label: string) {
  if (!UINT_RE.test(value) || BigInt(value) < 0n) {
    throw new Error(label + " must be a non-negative integer.");
  }
  return value;
}

export function assertMetadataUri(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 1024) {
    throw new Error(label + " is required and must be under 1024 characters.");
  }

  if (
    !/^https:\/\//i.test(trimmed) &&
    !/^ipfs:\/\//i.test(trimmed)
  ) {
    throw new Error(label + " must start with https:// or ipfs://.");
  }

  return trimmed;
}

export function formatUos(value: string, allowZero = false) {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,8})?$/.test(normalized)) {
    throw new Error("Enter a valid UOS amount with up to 8 decimals.");
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0 || (!allowZero && numeric <= 0)) {
    throw new Error(allowZero ? "UOS amount cannot be negative." : "UOS amount must be greater than zero.");
  }

  return numeric.toFixed(8) + " UOS";
}

function authorization(actor: string) {
  return [{ actor: assertUltraAccount(actor), permission: "active" }];
}

export function buildCreateFactoryAction(
  account: string,
  input: {
    factoryUri: string;
    defaultTokenUri: string;
    maxSupply: string;
    royaltyPercent: string;
    maxUosPayment: string;
  },
): WalletAction {
  const actor = assertUltraAccount(account);
  const supply = Number(assertUInt(input.maxSupply, "Max supply"));
  if (!Number.isSafeInteger(supply) || supply < 1 || supply > 1_000_000) {
    throw new Error("Max supply must be between 1 and 1,000,000.");
  }

  const royalty = Number(input.royaltyPercent);
  if (!Number.isFinite(royalty) || royalty < 0 || royalty > 70) {
    throw new Error("Creator royalty must be between 0% and 70%.");
  }

  const basisPoint = Math.round(royalty * 100);

  return {
    contract: NFT_CONTRACT,
    action: "create.b",
    authorization: authorization(actor),
    data: {
      create: {
        memo: "Created with Nosh",
        asset_manager: actor,
        asset_creator: actor,
        minimum_resell_price: "0.00000000 UOS",
        resale_shares:
          basisPoint > 0 ? [{ receiver: actor, basis_point: basisPoint }] : null,
        mintable_window_start: null,
        mintable_window_end: null,
        trading_window_start: null,
        trading_window_end: null,
        recall_window_start: null,
        recall_window_end: null,
        max_mintable_tokens: supply,
        lockup_time: null,
        conditionless_receivers: null,
        stat: 0,
        factory_uri: assertMetadataUri(input.factoryUri, "Factory metadata URI"),
        factory_hash: null,
        authorized_minters: null,
        account_minting_limit: null,
        transfer_window_start: null,
        transfer_window_end: null,
        maximum_uos_payment: formatUos(input.maxUosPayment),
        default_token_uri: assertMetadataUri(
          input.defaultTokenUri,
          "Default Uniq metadata URI",
        ),
        default_token_hash: null,
        lock_hash: false,
      },
    },
  };
}

export function buildMintAction(
  account: string,
  input: {
    factoryId: string;
    recipient: string;
    tokenUri?: string;
    maxUosPayment: string;
  },
): WalletAction {
  const actor = assertUltraAccount(account);
  const recipient = assertUltraAccount(input.recipient);
  const factoryId = assertUInt(input.factoryId.trim(), "Factory ID");
  const tokenUri = input.tokenUri?.trim();

  return {
    contract: NFT_CONTRACT,
    action: "issue.b",
    authorization: authorization(actor),
    data: {
      issue: {
        to: recipient,
        token_configs: [
          {
            token_factory_id: factoryId,
            amount: 1,
            custom_data: "",
          },
        ],
        memo: "Minted with Nosh",
        authorizer: null,
        maximum_uos_payment: formatUos(input.maxUosPayment),
        token_metadata: tokenUri
          ? [
              {
                meta_uri: assertMetadataUri(tokenUri, "Uniq metadata URI"),
                meta_hash: null,
              },
            ]
          : null,
      },
    },
  };
}

export function buildResellAction(
  account: string,
  tokenId: string,
  price: string,
): WalletAction {
  const actor = assertUltraAccount(account);
  return {
    contract: NFT_CONTRACT,
    action: "resell",
    authorization: authorization(actor),
    data: {
      resell: {
        seller: actor,
        token_id: assertUInt(tokenId, "Token ID"),
        price: formatUos(price),
        promoter_basis_point: 250,
        memo: "Listed on Nosh",
      },
    },
  };
}

export function buildCancelResellAction(
  account: string,
  tokenId: string,
): WalletAction {
  const actor = assertUltraAccount(account);
  return {
    contract: NFT_CONTRACT,
    action: "cancelresell",
    authorization: authorization(actor),
    data: {
      cancelresell: {
        token_id: assertUInt(tokenId, "Token ID"),
        memo: "Listing cancelled on Nosh",
      },
    },
  };
}

export function buildBuyAction(
  account: string,
  tokenId: string,
  listedPrice: string,
): WalletAction {
  const actor = assertUltraAccount(account);
  if (!/^\d+(\.\d{8}) UOS$/.test(listedPrice)) {
    throw new Error("Listing has an invalid UOS price.");
  }

  return {
    contract: NFT_CONTRACT,
    action: "buy",
    authorization: authorization(actor),
    data: {
      buy: {
        buyer: actor,
        receiver: actor,
        token_id: assertUInt(tokenId, "Token ID"),
        memo: "Purchased on Nosh",
        max_price: listedPrice,
        promoter_id: null,
      },
    },
  };
}
