"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreateStudio } from "./CreateStudio";
import { NftCard } from "./NftCard";
import { UniqModal } from "./UniqModal";
import type { NoshUniq, WalletAction } from "@/lib/ultra/types";
import {
  getUltraWallet,
  hasUltraExtension,
  walletErrorMessage,
} from "@/lib/ultra/wallet";

type View = "explore" | "owned" | "create";
type SortMode = "newest" | "price";

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

function numericPrice(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  return Number.parseFloat(value.replace(" UOS", ""));
}

export function Marketplace() {
  const [view, setView] = useState<View>("explore");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [account, setAccount] = useState<string | null>(null);
  const [explore, setExplore] = useState<NoshUniq[]>([]);
  const [owned, setOwned] = useState<NoshUniq[]>([]);
  const [selected, setSelected] = useState<NoshUniq | null>(null);
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
      setNotice(
        error instanceof Error ? error.message : "Could not load Ultra listings.",
      );
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
      setNotice(
        error instanceof Error ? error.message : "Could not load wallet Uniqs.",
      );
    } finally {
      setLoadingOwned(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await loadExplore();
    if (account) await loadInventory(account);
  }, [account, loadExplore, loadInventory]);

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
        // Silent reconnect only. A normal Connect click shows wallet errors.
      });
  }, [loadExplore, loadInventory]);

  const connect = async () => {
    setNotice(null);

    if (!hasUltraExtension()) {
      setNotice(
        "Ultra Testnet requires the Ultra Wallet browser extension. Open/install it, select Testnet, then connect again.",
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
      setSelected(null);
      setView("explore");
    } catch (error) {
      setNotice(walletErrorMessage(error));
    } finally {
      setWalletBusy(false);
    }
  };

  const execute = useCallback(
    async (
      action: WalletAction,
      label: string,
      _summary: string,
    ): Promise<boolean> => {
      if (!account) {
        setNotice("Connect Ultra Wallet before signing a transaction.");
        return false;
      }

      setNotice(null);

      try {
        const wallet = await getUltraWallet();
        const { data } = await wallet.signTransaction(action);
        const shortHash = data.transactionHash
          ? data.transactionHash.slice(0, 10) + "…"
          : "confirmed";
        setNotice(label + " confirmed on Ultra Testnet · " + shortHash);
        return true;
      } catch (error) {
        setNotice(walletErrorMessage(error));
        return false;
      }
    },
    [account],
  );

  const accountLabel = useMemo(() => {
    if (!account) return null;
    return account.length > 12 ? account.slice(0, 7) + "…" : account;
  }, [account]);

  const activeItems = view === "explore" ? explore : owned;
  const loading = view === "explore" ? loadingExplore : loadingOwned;

  const displayItems = useMemo(() => {
    const items = [...activeItems];

    if (sortMode === "price") {
      items.sort((a, b) => numericPrice(a.price) - numericPrice(b.price));
      return items;
    }

    items.sort((a, b) => Number(b.id) - Number(a.id));
    return items;
  }, [activeItems, sortMode]);

  const openOwned = () => {
    setView("owned");
    if (account) loadInventory(account);
  };

  const pageCopy =
    view === "explore"
      ? {
          title: "Explore",
          description:
            "Discover live Ultra Uniq listings, their factory provenance, ownership and UOS price.",
        }
      : view === "owned"
        ? {
            title: "My NFTs",
            description:
              "Your Ultra Uniqs, read directly from your connected Testnet account.",
          }
        : {
            title: "Create",
            description:
              "Create a Uniq Factory, then mint NFTs from it using your Ultra wallet.",
          };

  return (
    <main className="site-shell">
      <header className="topbar">
        <button
          className="brand brand-button"
          onClick={() => setView("explore")}
          aria-label="Nosh home"
        >
          <span className="brand-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>nosh.</span>
        </button>

        <nav className="desktop-nav" aria-label="Nosh">
          <button
            className={view === "explore" ? "nav-link active" : "nav-link"}
            onClick={() => setView("explore")}
          >
            Explore
          </button>
          <button
            className={view === "owned" ? "nav-link active" : "nav-link"}
            onClick={openOwned}
          >
            Gallery
          </button>
          <button
            className={view === "create" ? "nav-link active" : "nav-link"}
            onClick={() => setView("create")}
          >
            Create
          </button>
          <span className="nav-link nav-static">Ultra</span>
          <span className="nav-link nav-static">Docs</span>
        </nav>

        <div className="top-actions">
          <span className={health.online ? "network-chip online" : "network-chip"}>
            <i />
            Ultra Testnet
          </span>

          <button className="launch-button" onClick={() => setView("create")}>
            Launch
          </button>

          {account ? (
            <button
              className="wallet-button connected"
              onClick={disconnect}
              disabled={walletBusy}
            >
              <span>{accountLabel}</span>
              <b>Disconnect</b>
            </button>
          ) : (
            <button
              className="wallet-button"
              onClick={connect}
              disabled={walletBusy}
            >
              {walletBusy ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Nosh mobile navigation">
        <button
          className={view === "explore" ? "active" : ""}
          onClick={() => setView("explore")}
        >
          Explore
        </button>
        <button
          className={view === "owned" ? "active" : ""}
          onClick={openOwned}
        >
          Gallery
        </button>
        <button
          className={view === "create" ? "active" : ""}
          onClick={() => setView("create")}
        >
          Create
        </button>
      </nav>

      <div className="page-wrap">
        <section className="page-intro">
          <div>
            <p className="page-kicker">
              {view === "explore"
                ? "Marketplace"
                : view === "owned"
                  ? "Collection"
                  : "Creator studio"}
            </p>
            <h1>{pageCopy.title}</h1>
            <p className="page-description">{pageCopy.description}</p>
          </div>

          <div className="page-status">
            <span>{health.online ? "Live" : "Checking"}</span>
            <strong>
              Block {health.headBlock ? health.headBlock.toLocaleString() : "—"}
            </strong>
          </div>
        </section>

        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {view === "explore" && explore.length > 0 && (
          <section className="trending-section">
            <div className="section-heading">
              <div>
                <span>Trending</span>
                <p>Live resale inventory from Ultra Testnet.</p>
              </div>
              <button onClick={loadExplore}>Refresh ↻</button>
            </div>

            <div className="trending-row">
              {explore.slice(0, 5).map((item) => (
                <button
                  key={"trend-" + item.id}
                  className="trend-card"
                  onClick={() => setSelected(item)}
                >
                  <span className="trend-avatar">N</span>
                  <div>
                    <strong>Uniq #{item.id}</strong>
                    <small>Factory #{item.factoryId}</small>
                  </div>
                  <div className="trend-value">
                    <strong>{item.price || "Not listed"}</strong>
                    <small>UOS market</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {(view === "explore" || view === "owned") && (
          <section className="market-section">
            <div className="filter-row">
              <div className="pill-group">
                <button
                  className={sortMode === "newest" ? "pill active" : "pill"}
                  onClick={() => setSortMode("newest")}
                >
                  Newest
                </button>
                <button
                  className={sortMode === "price" ? "pill active" : "pill"}
                  onClick={() => setSortMode("price")}
                >
                  Price
                </button>
                <span className="pill muted-pill">Ultra</span>
                <span className="pill muted-pill">UOS</span>
              </div>

              <div className="market-meta">
                <span>
                  {view === "explore"
                    ? explore.length + " live listings"
                    : account
                      ? owned.length + " owned NFTs"
                      : "Wallet not connected"}
                </span>
                {view === "owned" && !account ? (
                  <button onClick={connect}>Connect wallet</button>
                ) : (
                  <button
                    onClick={
                      view === "explore"
                        ? loadExplore
                        : () => account && loadInventory(account)
                    }
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading-grid" aria-label="Loading NFTs">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div className="skeleton" key={index} />
                ))}
              </div>
            ) : view === "owned" && !account ? (
              <div className="empty-state">
                <span>Wallet required</span>
                <h3>Connect your Ultra wallet.</h3>
                <p>Your Uniqs will appear here directly from your Testnet account.</p>
                <button className="primary-cta" onClick={connect}>
                  Connect wallet
                </button>
              </div>
            ) : displayItems.length === 0 ? (
              <div className="empty-state">
                <span>Nothing here yet</span>
                <h3>
                  {view === "explore"
                    ? "No NFTs are listed right now."
                    : "You do not own any NFTs yet."}
                </h3>
                <p>
                  {view === "explore"
                    ? "Nosh only shows real Ultra Testnet resale listings."
                    : "Create a collection and mint your first NFT."}
                </p>
                {view === "owned" && (
                  <button
                    className="primary-cta"
                    onClick={() => setView("create")}
                  >
                    Create NFT
                  </button>
                )}
              </div>
            ) : (
              <div className="nft-grid">
                {displayItems.map((item) => (
                  <NftCard
                    key={item.source + "-" + item.owner + "-" + item.id}
                    item={item}
                    onOpen={setSelected}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {view === "create" && (
          <CreateStudio
            account={account}
            onConnect={connect}
            onExecute={execute}
          />
        )}
      </div>

      <footer>
        <div className="footer-brand-block">
          <button
            className="brand brand-button footer-brand"
            onClick={() => setView("explore")}
          >
            <span className="brand-symbol" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>nosh.</span>
          </button>
          <p>A simple NFT marketplace for Ultra Uniqs.</p>
        </div>

        <div className="footer-column">
          <span>Product</span>
          <button onClick={() => setView("explore")}>Explore</button>
          <button onClick={openOwned}>Gallery</button>
          <button onClick={() => setView("create")}>Create</button>
        </div>

        <div className="footer-column">
          <span>Network</span>
          <strong>Ultra Testnet</strong>
          <small>eosio.nft.ft</small>
          <small>UOS marketplace</small>
        </div>

        <div className="footer-column">
          <span>Status</span>
          <strong>{health.online ? "Operational" : "Checking"}</strong>
          <small>
            Block {health.headBlock ? health.headBlock.toLocaleString() : "—"}
          </small>
        </div>
      </footer>

      {selected && (
        <UniqModal
          seed={selected}
          account={account}
          onClose={() => setSelected(null)}
          onConnect={connect}
          onExecute={execute}
          onChanged={refreshAll}
        />
      )}
    </main>
  );
}
