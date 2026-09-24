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
      setLocalError(error instanceof Error ? error.message : "Could not load factories.");
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
        "Create factory",
        "Created a Nosh Uniq Factory",
      );
      if (success) await loadFactories();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Factory creation failed.");
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
        "Mint Uniq",
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
        <div className="panel-heading">
          <span>FACTORY / CREATE.B</span>
          <h3>Create a collection</h3>
          <p>
            You are both creator and manager. Ultra charges the connected account
            for factory RAM; Nosh caps that payment at the value you set below.
          </p>
        </div>

        <label>
          Factory metadata URI
          <input
            value={factoryUri}
            onChange={(event) => setFactoryUri(event.target.value)}
            placeholder="https://…/factory.json or ipfs://…"
          />
        </label>
        <label>
          Default Uniq metadata URI
          <input
            value={defaultTokenUri}
            onChange={(event) => setDefaultTokenUri(event.target.value)}
            placeholder="https://…/{serial_number}.json"
          />
        </label>

        <div className="form-row">
          <label>
            Max supply
            <input
              inputMode="numeric"
              value={maxSupply}
              onChange={(event) => setMaxSupply(event.target.value)}
            />
          </label>
          <label>
            Creator royalty %
            <input
              inputMode="decimal"
              value={royaltyPercent}
              onChange={(event) => setRoyaltyPercent(event.target.value)}
            />
          </label>
          <label>
            Max factory RAM payment
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

        <button className="primary-cta wide" onClick={createFactory} disabled={busy}>
          {busy ? "Waiting for Ultra…" : "Create factory →"}
        </button>
      </section>

      <section className="studio-panel">
        <div className="panel-heading">
          <span>MINT / ISSUE.B</span>
          <h3>Mint a Uniq</h3>
          <p>
            Mint one token to any valid Ultra account. Leave token metadata blank
            to use the factory&apos;s default Uniq metadata.
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
                #{String(factory.id)}
                <small>{factory.minted_tokens_no ?? 0} minted</small>
              </button>
            ))}
          </div>
        )}

        <label>
          Factory ID
          <input
            inputMode="numeric"
            value={mintFactoryId}
            onChange={(event) => setMintFactoryId(event.target.value)}
            placeholder="e.g. 2048"
          />
        </label>
        <label>
          Recipient
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="Ultra account"
          />
        </label>
        <label>
          Token metadata URI <small>(optional)</small>
          <input
            value={tokenUri}
            onChange={(event) => setTokenUri(event.target.value)}
            placeholder="ipfs://… or https://…"
          />
        </label>
        <label>
          Max mint RAM payment
          <div className="input-unit">
            <input
              inputMode="decimal"
              value={mintMaxUos}
              onChange={(event) => setMintMaxUos(event.target.value)}
            />
            <span>UOS</span>
          </div>
        </label>

        <button className="primary-cta wide" onClick={mint} disabled={busy}>
          {busy ? "Waiting for Ultra…" : "Mint Uniq →"}
        </button>
      </section>

      {localError && <div className="notice studio-notice">{localError}</div>}
    </div>
  );
}
