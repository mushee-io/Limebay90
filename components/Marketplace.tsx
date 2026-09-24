"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NftCard } from "./NftCard";
import type { NoshUniq } from "@/lib/ultra/types";
import {
  getUltraWallet,
  hasUltraExtension,
  walletErrorMessage,
} from "@/lib/ultra/wallet";

type View = "explore" | "owned";

type Health = {
  online: boolean;
  headBlock?: number;
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const json = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(json.error || "Request failed.");
  }

  return json;
}

export function Marketplace() {
  const [view, setView] = useState<View>("explore");
  const [account, setAccount] = useState<string | null>(null);
  const [explore, setExplore] = useState<NoshUniq[]>([]);
  const [owned, setOwned] = useState<NoshUniq[]>([]);
  const [health, setHealth] = useState<Health>({ online: false });
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [loadingOwned, setLoadingOwned] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadExplore = useCallback(async () => {
    setLoadingExplore(true);
    try {
      const data = await readJson<{ items: NoshUniq[] }>("/api/ultra/explore");
      setExplore(data.items);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load Ultra listings.");
    } finally {
      setLoadingExplore(false);
    }
  }, []);

  const loadInventory = useCallback(async (walletAccount: string) => {
    setLoadingOwned(true);
    try {
      const data = await readJson<{ items: NoshUniq[] }>(
        "/api/ultra/inventory?account=" + encodeURIComponent(walletAccount),
      );
      setOwned(data.items);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load wallet Uniqs.");
    } finally {
      setLoadingOwned(false);
    }
  }, []);

  useEffect(() => {
    loadExplore();

    readJson<Health>("/api/ultra/health")
      .then(setHealth)
      .catch(() => setHealth({ online: false }));

    if (!hasUltraExtension()) return;

    getUltraWallet()
      .then((wallet) => wallet.connect({ onlyIfTrusted: true }))
      .then(({ data }) => {
        setAccount(data.blockchainid);
        loadInventory(data.blockchainid);
      })
      .catch(() => {
        // Eager reconnect is intentionally silent when the origin is not trusted.
      });
  }, [loadExplore, loadInventory]);

  const connect = async () => {
    setNotice(null);

    if (!hasUltraExtension()) {
      setNotice(
        "Ultra Testnet requires the Ultra Wallet browser extension. Install/open it, select Testnet, then connect again.",
      );
      return;
    }

    setWalletBusy(true);
    try {
      const wallet = await getUltraWallet();
      const { data } = await wallet.connect();
      setAccount(data.blockchainid);
      await loadInventory(data.blockchainid);
    } catch (error) {
      setNotice(walletErrorMessage(error));
    } finally {
      setWalletBusy(false);
    }
  };

  const disconnect = async () => {
    setWalletBusy(true);
    setNotice(null);
    try {
      const wallet = await getUltraWallet();
      await wallet.disconnect();
      setAccount(null);
      setOwned([]);
      setView("explore");
    } catch (error) {
      setNotice(walletErrorMessage(error));
    } finally {
      setWalletBusy(false);
    }
  };

  const activeItems = view === "explore" ? explore : owned;
  const loading = view === "explore" ? loadingExplore : loadingOwned;

  const accountLabel = useMemo(() => {
    if (!account) return null;
    return account.length > 12 ? account.slice(0, 7) + "…" : account;
  }, [account]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Nosh home">
          <span className="brand-mark">N</span>
          <span>NOSH</span>
        </a>

        <nav className="desktop-nav" aria-label="Marketplace">
          <button
            className={view === "explore" ? "nav-link active" : "nav-link"}
            onClick={() => setView("explore")}
          >
            Explore
          </button>
          <button
            className={view === "owned" ? "nav-link active" : "nav-link"}
            onClick={() => {
              setView("owned");
              if (account) loadInventory(account);
            }}
          >
            My Uniqs
          </button>
          <span className="nav-link future">Create <small>M6+</small></span>
        </nav>

        <div className="top-actions">
          <span className={health.online ? "network-pill online" : "network-pill"}>
            <i />
            ULTRA TESTNET
          </span>

          {account ? (
            <button className="wallet-button connected" onClick={disconnect} disabled={walletBusy}>
              <span>{accountLabel}</span>
              <b>Disconnect</b>
            </button>
          ) : (
            <button className="wallet-button" onClick={connect} disabled={walletBusy}>
              {walletBusy ? "Connecting…" : "Connect Ultra"}
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">NATIVE NFT MARKETPLACE / ULTRA</span>
          <h1>
            Own the thing.
            <br />
            <em>Not the screenshot.</em>
          </h1>
          <p>
            Discover and collect real Ultra Uniqs. Nosh reads ownership, listings,
            prices and factory provenance directly from Ultra Testnet.
          </p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => setView("explore")}>
              Explore Uniqs <span>↗</span>
            </button>
            <button className="text-cta" onClick={connect}>
              Connect wallet →
            </button>
          </div>
        </div>

        <div className="hero-poster" aria-hidden="true">
          <span className="poster-top">ULTRA / UNIQ</span>
          <div className="orb orb-a" />
          <div className="orb orb-b" />
          <span className="poster-n">N</span>
          <span className="poster-bottom">NO COPIES. JUST PROOF.</span>
        </div>
      </section>

      <section className="market-shell">
        <div className="market-heading">
          <div>
            <span className="section-index">01 / MARKET</span>
            <h2>{view === "explore" ? "Live on Ultra" : "Your collection"}</h2>
          </div>
          <div className="market-meta">
            {view === "explore" ? (
              <>
                <span>{explore.length} resolved listings</span>
                <button onClick={loadExplore}>Refresh ↻</button>
              </>
            ) : account ? (
              <>
                <span>{owned.length} owned Uniqs</span>
                <button onClick={() => loadInventory(account)}>Refresh ↻</button>
              </>
            ) : (
              <button onClick={connect}>Connect to view inventory →</button>
            )}
          </div>
        </div>

        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)}>×</button>
          </div>
        )}

        {loading ? (
          <div className="loading-grid" aria-label="Loading Uniqs">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="skeleton" key={index} />
            ))}
          </div>
        ) : view === "owned" && !account ? (
          <div className="empty-state">
            <span>NO WALLET / NO INVENTORY</span>
            <h3>Connect your Ultra wallet.</h3>
            <p>Nosh will read your Uniqs directly from your account-scoped token.b table.</p>
            <button className="primary-cta" onClick={connect}>Connect Ultra</button>
          </div>
        ) : activeItems.length === 0 ? (
          <div className="empty-state">
            <span>CHAIN RETURNED ZERO ROWS</span>
            <h3>No Uniqs found here yet.</h3>
            <p>
              This view never substitutes demo NFTs. If Ultra Testnet has no matching rows,
              Nosh shows the real empty state.
            </p>
          </div>
        ) : (
          <div className="nft-grid">
            {activeItems.map((item) => (
              <NftCard key={item.source + "-" + item.owner + "-" + item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="proof-strip">
        <div>
          <span>CHAIN</span>
          <strong>ULTRA TESTNET</strong>
        </div>
        <div>
          <span>NFT STANDARD</span>
          <strong>UNIQ</strong>
        </div>
        <div>
          <span>CONTRACT</span>
          <strong>eosio.nft.ft</strong>
        </div>
        <div>
          <span>HEAD BLOCK</span>
          <strong>{health.headBlock ? health.headBlock.toLocaleString() : "—"}</strong>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#">
          <span className="brand-mark">N</span>
          <span>NOSH</span>
        </a>
        <p>NFT infrastructure for Ultra. Milestones 1–5.</p>
        <span>2026 / TESTNET BUILD</span>
      </footer>
    </main>
  );
}
