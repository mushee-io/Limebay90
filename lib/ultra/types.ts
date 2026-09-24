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
  resale_shares?: Array<{ receiver: string; basis_point: number }>;
  minted_tokens_no?: number;
  existing_tokens_no?: number;
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
  collectionUri: string | null;
  assetCreator: string | null;
  assetManager: string | null;
  source: "resale" | "inventory";
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
