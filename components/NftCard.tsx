import type { NoshUniq } from "@/lib/ultra/types";

function shortAccount(value: string) {
  if (value.length <= 12) return value;
  return value.slice(0, 6) + "…" + value.slice(-4);
}

function toneFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 4;
  return "tone-" + hash;
}

export function NftCard({
  item,
  onOpen,
}: {
  item: NoshUniq;
  onOpen?: (item: NoshUniq) => void;
}) {
  return (
    <article className="nft-card">
      <button
        className="nft-card-open"
        type="button"
        onClick={() => onOpen?.(item)}
        aria-label={"Open Uniq #" + item.id}
      >
        <div className={"nft-art " + toneFor(item.id + item.factoryId)}>
          <span className="nft-art-badge">Factory #{item.factoryId}</span>
          <span className="nft-art-mark">N</span>
          <span className="nft-art-id">UNIQ #{item.id}</span>
        </div>

        <div className="nft-card-body">
          <div className="nft-card-title-row">
            <div>
              <h3>Uniq #{item.id}</h3>
              <span>Serial #{item.serialNumber ?? "—"}</span>
            </div>
            <span className={item.price ? "status-pill listed" : "status-pill"}>
              {item.price ? "Listed" : "Owned"}
            </span>
          </div>

          <dl className="nft-card-stats">
            <div>
              <dt>Owner</dt>
              <dd title={item.owner}>{shortAccount(item.owner)}</dd>
            </div>
            <div>
              <dt>{item.price ? "Price" : "Creator"}</dt>
              <dd>
                {item.price
                  ? item.price
                  : item.assetCreator
                    ? shortAccount(item.assetCreator)
                    : "—"}
              </dd>
            </div>
          </dl>

          <div className="nft-card-footer">
            <span>Ultra Testnet</span>
            <strong>View NFT ↗</strong>
          </div>
        </div>
      </button>
    </article>
  );
}
