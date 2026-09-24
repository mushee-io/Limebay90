"use client";

import { useEffect, useState } from "react";
import {
  buildBuyAction,
  buildCancelResellAction,
  buildResellAction,
} from "@/lib/ultra/actions";
import type {
  NoshUniq,
  ResolvedMetadata,
  UltraFactoryRow,
  UltraResaleRow,
  WalletAction,
} from "@/lib/ultra/types";

type Detail = {
  item: NoshUniq;
  factory: UltraFactoryRow | null;
  resale: UltraResaleRow | null;
  metadata: ResolvedMetadata | null;
};

type Props = {
  seed: NoshUniq;
  account: string | null;
  onClose: () => void;
  onConnect: () => void;
  onExecute: (
    action: WalletAction,
    label: string,
    summary: string,
  ) => Promise<boolean>;
  onChanged: () => Promise<void>;
};

export function UniqModal({
  seed,
  account,
  onClose,
  onConnect,
  onExecute,
  onChanged,
}: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/ultra/uniq?owner=" +
          encodeURIComponent(seed.owner) +
          "&id=" +
          encodeURIComponent(seed.id),
        { cache: "no-store" },
      );
      const data = (await response.json()) as Detail & { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to resolve Uniq.");
      setDetail(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Uniq.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // seed identity is stable for the life of the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed.id, seed.owner]);

  const execute = async (
    action: WalletAction,
    label: string,
    summary: string,
  ) => {
    setBusy(true);
    setError(null);
    const success = await onExecute(action, label, summary);
    if (success) {
      await onChanged();
      onClose();
    }
    setBusy(false);
  };

  const buy = () => {
    if (!account) return onConnect();
    const listing = detail?.resale;
    if (!listing) return setError("This Uniq is no longer listed.");
    try {
      return execute(
        buildBuyAction(account, seed.id, listing.price),
        "Buy Uniq",
        "Bought Uniq #" + seed.id + " for " + listing.price,
      );
    } catch (buyError) {
      setError(buyError instanceof Error ? buyError.message : "Buy failed.");
    }
  };

  const list = () => {
    if (!account) return onConnect();
    if (account !== seed.owner) return setError("Only the current owner can list this Uniq.");
    try {
      return execute(
        buildResellAction(account, seed.id, price),
        "List Uniq",
        "Listed Uniq #" + seed.id + " for " + price + " UOS",
      );
    } catch (listError) {
      setError(listError instanceof Error ? listError.message : "Listing failed.");
    }
  };

  const cancel = () => {
    if (!account) return onConnect();
    try {
      return execute(
        buildCancelResellAction(account, seed.id),
        "Cancel listing",
        "Cancelled listing for Uniq #" + seed.id,
      );
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Cancellation failed.");
    }
  };

  const item = detail?.item ?? seed;
  const metadata = detail?.metadata;
  const isOwner = Boolean(account && account === item.owner);
  const isListed = Boolean(detail?.resale);
  const canBuy = Boolean(account && !isOwner && isListed);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="uniq-modal"
        role="dialog"
        aria-modal="true"
        aria-label={"Uniq #" + seed.id}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="detail-art">
          {metadata?.image ? (
            <img src={metadata.image} alt={metadata.name || "Uniq artwork"} />
          ) : (
            <div className="detail-placeholder">
              <span>N</span>
              <small>UNIQ {seed.id}</small>
            </div>
          )}
        </div>

        <div className="detail-content">
          <span className="eyebrow">ULTRA UNIQ / #{seed.id}</span>
          <h2>{metadata?.name || "Uniq #" + seed.id}</h2>
          <p className="detail-description">
            {metadata?.description ||
              "On-chain Ultra Uniq. Metadata is resolved only from its token or factory URI."}
          </p>

          {loading && <div className="detail-loading">Resolving metadata + chain state…</div>}
          {error && <div className="notice">{error}</div>}
          {metadata?.error && <div className="metadata-warning">{metadata.error}</div>}

          <dl className="detail-grid">
            <div><dt>Owner</dt><dd>{item.owner}</dd></div>
            <div><dt>Factory</dt><dd>#{item.factoryId}</dd></div>
            <div><dt>Serial</dt><dd>#{item.serialNumber ?? "—"}</dd></div>
            <div><dt>Creator</dt><dd>{item.assetCreator ?? "—"}</dd></div>
            <div><dt>Minted</dt><dd>{item.mintDate ?? "—"}</dd></div>
            <div><dt>Status</dt><dd>{isListed ? "Listed" : "Owned"}</dd></div>
          </dl>

          {metadata?.resolvedUri && (
            <a
              className="metadata-link"
              href={metadata.resolvedUri}
              target="_blank"
              rel="noreferrer"
            >
              Open verified metadata ↗
            </a>
          )}

          <div className="trade-box">
            {isListed && (
              <div className="listing-price">
                <small>LISTED PRICE</small>
                <strong>{detail?.resale?.price}</strong>
              </div>
            )}

            {!account ? (
              <button className="primary-cta wide" onClick={onConnect}>
                Connect Ultra to trade
              </button>
            ) : canBuy ? (
              <button className="primary-cta wide" onClick={buy} disabled={busy}>
                {busy ? "Waiting for Ultra…" : "Buy now →"}
              </button>
            ) : isOwner && isListed ? (
              <button className="secondary-cta wide" onClick={cancel} disabled={busy}>
                {busy ? "Waiting for Ultra…" : "Cancel listing"}
              </button>
            ) : isOwner ? (
              <div className="list-row">
                <div className="input-unit">
                  <input
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="25"
                    aria-label="Listing price"
                  />
                  <span>UOS</span>
                </div>
                <button className="primary-cta" onClick={list} disabled={busy}>
                  {busy ? "Signing…" : "List for sale"}
                </button>
              </div>
            ) : (
              <span className="trade-note">Not listed for sale.</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
