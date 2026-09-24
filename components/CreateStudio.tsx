"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildCreateFactoryAction,
  buildMintAction,
} from "@/lib/ultra/actions";
import type { UltraFactoryRow, WalletAction } from "@/lib/ultra/types";

type Props = {
  account: string | null;
  onConnect: () => void;
  onExecute: (
    action: WalletAction,
    label: string,
    summary: string,
  ) => Promise<boolean>;
};

export function CreateStudio({ account, onConnect, onExecute }: Props) {
  const [factoryUri, setFactoryUri] = useState("");
  const [defaultTokenUri, setDefaultTokenUri] = useState("");
  const [maxSupply, setMaxSupply] = useState("100");
  const [royaltyPercent, setRoyaltyPercent] = useState("5");
  const [factoryMaxUos, setFactoryMaxUos] = useState("5");
  const [mintFactoryId, setMintFactoryId] = useState("");
  const [recipient, setRecipient] = useState(account ?? "");
  const [tokenUri, setTokenUri] = useState("");
  const [mintMaxUos, setMintMaxUos] = useState("2");
  const [factories, setFactories] = useState<UltraFactoryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const loadFactories = useCallback(async () => {
    if (!account) return;
    try {
      const response = await fetch(
        "/api/ultra/factories?account=" + encodeURIComponent(account),
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        factories?: UltraFactoryRow[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Factory lookup failed.");
      setFactories(data.factories ?? []);
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Could not load factories.",
      );
    }
  }, [account]);

  useEffect(() => {
    setRecipient(account ?? "");
    if (account) loadFactories();
  }, [account, loadFactories]);

  const createFactory = async () => {
    if (!account) return onConnect();
    setLocalError(null);
    try {
      const action = buildCreateFactoryAction(account, {
        factoryUri,
        defaultTokenUri,
        maxSupply,
        royaltyPercent,
        maxUosPayment: factoryMaxUos,
      });
      setBusy(true);
      const success = await onExecute(
        action,
        "Create collection",
        "Created a Nosh Uniq Factory",
      );
      if (success) await loadFactories();
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Collection creation failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const mint = async () => {
    if (!account) return onConnect();
    setLocalError(null);
    try {
      const action = buildMintAction(account, {
        factoryId: mintFactoryId,
        recipient,
        tokenUri: tokenUri || undefined,
        maxUosPayment: mintMaxUos,
      });
      setBusy(true);
      await onExecute(
        action,
        "Mint NFT",
        "Minted one Uniq from factory #" + mintFactoryId,
      );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Mint failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="studio-grid">
      <section className="studio-panel">
        <div className="studio-topline">
          <span className="studio-step">01</span>
          <span>Collection setup</span>
        </div>

        <div className="panel-heading">
          <h3>Create a collection</h3>
          <p>
            Start with a native Ultra Uniq Factory. Your wallet remains the
            creator and manager, and the payment cap below protects the UOS
            amount you approve.
          </p>
        </div>

        <div className="form-stack">
          <label>
            <span>Collection metadata URI</span>
            <input
              value={factoryUri}
              onChange={(event) => setFactoryUri(event.target.value)}
              placeholder="https://…/factory.json or ipfs://…"
            />
          </label>

          <label>
            <span>Default NFT metadata URI</span>
            <input
              value={defaultTokenUri}
              onChange={(event) => setDefaultTokenUri(event.target.value)}
              placeholder="https://…/{serial_number}.json"
            />
          </label>

          <div className="form-row">
            <label>
              <span>Max supply</span>
              <input
                inputMode="numeric"
                value={maxSupply}
                onChange={(event) => setMaxSupply(event.target.value)}
              />
            </label>

            <label>
              <span>Royalty</span>
              <div className="input-unit">
                <input
                  inputMode="decimal"
                  value={royaltyPercent}
                  onChange={(event) => setRoyaltyPercent(event.target.value)}
                />
                <span>%</span>
              </div>
            </label>

            <label>
              <span>Max RAM payment</span>
              <div className="input-unit">
                <input
                  inputMode="decimal"
                  value={factoryMaxUos}
                  onChange={(event) => setFactoryMaxUos(event.target.value)}
                />
                <span>UOS</span>
              </div>
            </label>
          </div>
        </div>

        <div className="panel-action">
          <div>
            <small>Wallet approval required</small>
            <span>Ultra action · create.b</span>
          </div>
          <button
            className="primary-cta"
            onClick={createFactory}
            disabled={busy}
          >
            {busy ? "Waiting for Ultra…" : "Create collection"}
          </button>
        </div>
      </section>

      <section className="studio-panel">
        <div className="studio-topline">
          <span className="studio-step">02</span>
          <span>Mint NFT</span>
        </div>

        <div className="panel-heading">
          <h3>Mint from a collection</h3>
          <p>
            Choose one of your factories or enter its ID manually. Leave the
            token metadata field blank to inherit the collection default.
          </p>
        </div>

        {factories.length > 0 && (
          <div className="factory-chips">
            {factories.map((factory) => (
              <button
                key={String(factory.id)}
                className={mintFactoryId === String(factory.id) ? "selected" : ""}
                onClick={() => setMintFactoryId(String(factory.id))}
              >
                <strong>Factory #{String(factory.id)}</strong>
                <small>{factory.minted_tokens_no ?? 0} minted</small>
              </button>
            ))}
          </div>
        )}

        <div className="form-stack">
          <label>
            <span>Factory ID</span>
            <input
              inputMode="numeric"
              value={mintFactoryId}
              onChange={(event) => setMintFactoryId(event.target.value)}
              placeholder="e.g. 2048"
            />
          </label>

          <label>
            <span>Recipient</span>
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="Ultra account"
            />
          </label>

          <label>
            <span>Token metadata URI <small>optional</small></span>
            <input
              value={tokenUri}
              onChange={(event) => setTokenUri(event.target.value)}
              placeholder="ipfs://… or https://…"
            />
          </label>

          <label>
            <span>Max RAM payment</span>
            <div className="input-unit">
              <input
                inputMode="decimal"
                value={mintMaxUos}
                onChange={(event) => setMintMaxUos(event.target.value)}
              />
              <span>UOS</span>
            </div>
          </label>
        </div>

        <div className="panel-action">
          <div>
            <small>Wallet approval required</small>
            <span>Ultra action · issue.b</span>
          </div>
          <button className="primary-cta" onClick={mint} disabled={busy}>
            {busy ? "Waiting for Ultra…" : "Mint NFT"}
          </button>
        </div>
      </section>

      {localError && <div className="notice studio-notice">{localError}</div>}
    </div>
  );
}
