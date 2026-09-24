import type {
  ResolvedMetadata,
  UltraFactoryRow,
  UltraMetadata,
  UltraTokenRow,
} from "./types";

function replaceDynamicValues(
  uri: string,
  token: UltraTokenRow,
  factory: UltraFactoryRow,
) {
  const values: Record<string, string> = {
    factory_id: String(factory.id),
    id: String(token.id),
    token_id: String(token.id),
    hash: token.hash ?? "",
    serial_number: String(token.serial_number ?? ""),
  };

  return uri.replace(
    /\{(factory_id|id|token_id|hash|serial_number)\}/g,
    (_, key: string) => values[key] ?? "",
  );
}

function gatewayUri(uri: string) {
  if (uri.startsWith("ipfs://")) {
    const path = uri.slice("ipfs://".length).replace(/^ipfs\//, "");
    return "https://ipfs.io/ipfs/" + path;
  }
  return uri;
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }

  return (
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80:")
  );
}

function safeHttpsUri(uri: string) {
  const converted = gatewayUri(uri);
  const url = new URL(converted);
  if (url.protocol !== "https:" || isPrivateHostname(url.hostname)) {
    throw new Error("Metadata URI must resolve to a public HTTPS host.");
  }
  return url.toString();
}

function findImage(metadata: UltraMetadata) {
  const preferred = ["product", "square", "hero", "gallery"];
  for (const key of preferred) {
    const media = metadata.media?.[key];
    const uri = media?.uris?.[0];
    if (uri) {
      try {
        return safeHttpsUri(uri);
      } catch {
        // Try the next media variant.
      }
    }
  }
  return null;
}

export async function resolveUniqMetadata(
  token: UltraTokenRow,
  factory: UltraFactoryRow,
): Promise<ResolvedMetadata | null> {
  const sourceUri = token.uri || factory.default_token_uri;
  if (!sourceUri) return null;

  const dynamicUri = replaceDynamicValues(sourceUri, token, factory);
  let resolvedUri: string;

  try {
    resolvedUri = safeHttpsUri(dynamicUri);
  } catch (error) {
    return {
      sourceUri,
      resolvedUri: dynamicUri,
      name: null,
      description: null,
      image: null,
      metadata: null,
      error: error instanceof Error ? error.message : "Unsafe metadata URI.",
    };
  }

  try {
    const response = await fetch(resolvedUri, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });

    if (!response.ok) {
      throw new Error("Metadata host returned HTTP " + response.status + ".");
    }

    const length = Number(response.headers.get("content-length") || "0");
    if (length > 2_000_000) {
      throw new Error("Metadata response is larger than 2 MB.");
    }

    const metadata = (await response.json()) as UltraMetadata;

    return {
      sourceUri,
      resolvedUri,
      name: typeof metadata.name === "string" ? metadata.name : null,
      description:
        typeof metadata.description === "string" ? metadata.description : null,
      image: findImage(metadata),
      metadata,
    };
  } catch (error) {
    return {
      sourceUri,
      resolvedUri,
      name: null,
      description: null,
      image: null,
      metadata: null,
      error: error instanceof Error ? error.message : "Metadata could not be loaded.",
    };
  }
}
