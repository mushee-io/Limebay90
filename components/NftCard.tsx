import type { CSSProperties } from "react";
import type { NoshUniq } from "@/lib/ultra/types";

function shortAccount(value: string) {
  if (value.length <= 10) return value;
  return value.slice(0, 5) + "…" + value.slice(-4);
}

function hueFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

export function NftCard({ item }: { item: NoshUniq }) {
  const hue = hueFor(item.id + item.factoryId);
  const artStyle = {
    "--nosh-hue": String(hue),
    "--nosh-hue-2": String((hue + 76) % 360),
  } as CSSProperties;

  return (
    <article className="nft-card">
      <div className="nft-art" style={artStyle}>
        <div className="nft-art-grid" />
        <span className="nft-art-mark">N</span>
        <span className="nft-art-id">UNIQ {item.id}</span>
      </div>

      <div className="nft-card-body">
        <div className="nft-card-kicker">
          <span>Factory #{item.factoryId}</span>
          <span>#{item.serialNumber ?? "—"}</span>
        </div>

        <h3>Uniq #{item.id}</h3>

        <div className="nft-card-owner">
          <span>Owner</span>
          <strong title={item.owner}>{shortAccount(item.owner)}</strong>
        </div>

        <div className="nft-card-footer">
          {item.price ? (
            <div>
              <small>Listed for</small>
              <strong>{item.price}</strong>
            </div>
          ) : (
            <div>
              <small>Status</small>
              <strong>Owned</strong>
            </div>
          )}
          <span className="onchain-dot">ONCHAIN</span>
        </div>
      </div>
    </article>
  );
}
