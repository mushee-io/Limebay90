import {
  FACTORY_TABLE,
  NFT_CONTRACT,
  RESALE_TABLE,
  TOKEN_TABLE,
  ULTRA_TESTNET_CHAIN_ID,
  ULTRA_TESTNET_DEFAULT_RPCS,
} from "./config";
import type {
  NoshUniq,
  UltraChainInfo,
  UltraFactoryRow,
  UltraResaleRow,
  UltraTableResponse,
  UltraTokenRow,
} from "./types";

function endpoints() {
  const custom = process.env.ULTRA_TESTNET_RPC?.trim();
  return custom
    ? [custom, ...ULTRA_TESTNET_DEFAULT_RPCS.filter((rpc) => rpc !== custom)]
    : [...ULTRA_TESTNET_DEFAULT_RPCS];
}

async function ultraRpc<T>(path: string, body?: unknown): Promise<T> {
  let lastError: unknown;

  for (const endpoint of endpoints()) {
    try {
      const response = await fetch(endpoint + path, {
        method: body ? "POST" : "GET",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        throw new Error(endpoint + " returned HTTP " + response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Ultra Testnet RPC endpoints failed.");
}

export async function getTableRows<T>(input: {
  code: string;
  scope: string;
  table: string;
  limit?: number;
  lower_bound?: string | number;
  upper_bound?: string | number;
  reverse?: boolean;
}): Promise<UltraTableResponse<T>> {
  return ultraRpc<UltraTableResponse<T>>("/v1/chain/get_table_rows", {
    json: true,
    ...input,
  });
}

export async function getChainHealth() {
  const info = await ultraRpc<UltraChainInfo>("/v1/chain/get_info");
  return {
    online: info.chain_id === ULTRA_TESTNET_CHAIN_ID,
    chainId: info.chain_id,
    expectedChainId: ULTRA_TESTNET_CHAIN_ID,
    headBlock: info.head_block_num,
    headBlockTime: info.head_block_time,
  };
}

export async function getFactory(factoryId: string): Promise<UltraFactoryRow | null> {
  const result = await getTableRows<UltraFactoryRow>({
    code: NFT_CONTRACT,
    scope: NFT_CONTRACT,
    table: FACTORY_TABLE,
    lower_bound: factoryId,
    limit: 1,
  });

  const row = result.rows[0];
  return row && String(row.id) === factoryId ? row : null;
}

export async function getOwnedToken(
  owner: string,
  tokenId: string,
): Promise<UltraTokenRow | null> {
  const result = await getTableRows<UltraTokenRow>({
    code: NFT_CONTRACT,
    scope: owner,
    table: TOKEN_TABLE,
    lower_bound: tokenId,
    limit: 1,
  });

  const row = result.rows[0];
  return row && String(row.id) === tokenId ? row : null;
}

export async function getResale(tokenId: string): Promise<UltraResaleRow | null> {
  const result = await getTableRows<UltraResaleRow>({
    code: NFT_CONTRACT,
    scope: NFT_CONTRACT,
    table: RESALE_TABLE,
    lower_bound: tokenId,
    limit: 1,
  });

  const row = result.rows[0];
  return row && String(row.token_id) === tokenId ? row : null;
}

function toNoshUniq(
  token: UltraTokenRow,
  owner: string,
  factory: UltraFactoryRow | null,
  sale?: UltraResaleRow | null,
): NoshUniq {
  return {
    id: String(token.id),
    factoryId: String(token.token_factory_id),
    serialNumber: token.serial_number ?? null,
    owner,
    price: sale?.price ?? null,
    mintDate: token.mint_date ?? null,
    tokenUri: token.uri ?? null,
    tokenHash: token.hash ?? null,
    collectionUri: factory?.default_token_uri ?? null,
    factoryUri: factory?.factory_uri ?? null,
    assetCreator: factory?.asset_creator ?? null,
    assetManager: factory?.asset_manager ?? null,
    source: sale ? "resale" : "inventory",
  };
}

export async function getExploreUniqs(limit = 12): Promise<NoshUniq[]> {
  const resales = await getTableRows<UltraResaleRow>({
    code: NFT_CONTRACT,
    scope: NFT_CONTRACT,
    table: RESALE_TABLE,
    limit,
    reverse: true,
  });

  const factoryCache = new Map<string, Promise<UltraFactoryRow | null>>();

  const listings = await Promise.all(
    resales.rows.slice(0, limit).map(async (sale): Promise<NoshUniq | null> => {
      const tokenId = String(sale.token_id);
      const token = await getOwnedToken(sale.owner, tokenId);
      if (!token) return null;

      const factoryId = String(token.token_factory_id);
      let factoryPromise = factoryCache.get(factoryId);
      if (!factoryPromise) {
        factoryPromise = getFactory(factoryId);
        factoryCache.set(factoryId, factoryPromise);
      }

      return toNoshUniq(token, sale.owner, await factoryPromise, sale);
    }),
  );

  return listings.filter((item): item is NoshUniq => item !== null);
}

export async function getInventoryUniqs(account: string): Promise<NoshUniq[]> {
  const tokens = await getTableRows<UltraTokenRow>({
    code: NFT_CONTRACT,
    scope: account,
    table: TOKEN_TABLE,
    limit: 100,
    reverse: true,
  });

  const factoryIds = [
    ...new Set(tokens.rows.map((token) => String(token.token_factory_id))),
  ];

  const factories = await Promise.all(
    factoryIds.map(async (id) => [id, await getFactory(id)] as const),
  );
  const factoryMap = new Map(factories);

  return tokens.rows.map((token) => {
    const factoryId = String(token.token_factory_id);
    return toNoshUniq(token, account, factoryMap.get(factoryId) ?? null);
  });
}

export async function getUniqDetail(owner: string, tokenId: string) {
  const token = await getOwnedToken(owner, tokenId);
  if (!token) return null;

  const [factory, sale] = await Promise.all([
    getFactory(String(token.token_factory_id)),
    getResale(tokenId),
  ]);

  const validSale = sale?.owner === owner ? sale : null;

  return {
    item: toNoshUniq(token, owner, factory, validSale),
    token,
    factory,
    resale: validSale,
  };
}

export async function getFactoriesByManager(account: string) {
  const factories = await getTableRows<UltraFactoryRow>({
    code: NFT_CONTRACT,
    scope: NFT_CONTRACT,
    table: FACTORY_TABLE,
    limit: 250,
    reverse: true,
  });

  return factories.rows
    .filter(
      (factory) =>
        factory.asset_manager === account || factory.asset_creator === account,
    )
    .slice(0, 50);
}
