export type UInt64 = number | string;

export interface UltraTokenRow {
  id: UInt64;
  token_factory_id: UInt64;
  mint_date: string;
  serial_number: number;
  uos_payment?: number;
  uri?: string | null;
  hash?: string | null;
}

export interface UltraFactoryRow {
  id: UInt64;
  asset_manager: string;
  asset_creator: string;
  minimum_resell_price: string;
  resale_shares?: Array<{ receiver: string; basis_point: number }> | null;
  mintable_window_start?: string | null;
  mintable_window_end?: string | null;
  trading_window_start?: string | null;
  trading_window_end?: string | null;
  max_mintable_tokens?: number | string | null;
  minted_tokens_no?: number;
  existing_tokens_no?: number;
  stat?: number;
  factory_uri?: string | null;
  factory_hash?: string | null;
  account_minting_limit?: number | null;
  transfer_window_start?: string | null;
  transfer_window_end?: string | null;
  default_token_uri?: string | null;
  default_token_hash?: string | null;
  lock_hash?: boolean | number;
}

export interface UltraResaleRow {
  token_id: UInt64;
  owner: string;
  price: string;
  promoter_basis_point?: number;
}

export interface NoshUniq {
  id: string;
  factoryId: string;
  serialNumber: number | null;
  owner: string;
  price: string | null;
  mintDate: string | null;
  tokenUri: string | null;
  tokenHash?: string | null;
  collectionUri: string | null;
  factoryUri?: string | null;
  assetCreator: string | null;
  assetManager: string | null;
  source: "resale" | "inventory";
}

export interface UltraMetadata {
  specVersion?: string;
  name?: string;
  description?: string;
  defaultLocale?: string;
  media?: Record<
    string,
    {
      contentType?: string;
      uris?: string[];
      integrity?: { type?: string; hash?: string };
    }
  >;
  [key: string]: unknown;
}

export interface ResolvedMetadata {
  sourceUri: string;
  resolvedUri: string;
  name: string | null;
  description: string | null;
  image: string | null;
  metadata: UltraMetadata | null;
  error?: string;
}

export interface UltraTableResponse<T> {
  rows: T[];
  more: boolean | string;
  next_key?: string;
}

export interface UltraChainInfo {
  chain_id: string;
  head_block_num: number;
  head_block_time: string;
}

export interface WalletAction {
  contract: string;
  action: string;
  data: Record<string, unknown>;
  authorization?: Array<{ actor: string; permission: string }>;
}
