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

  const openOwned = () => {
    setView("owned");
    if (account) loadInventory(account);
  };

  return (
    <main>
      <header className="topbar">
        <button
          className="brand brand-button"
          onClick={() => setView("explore")}
          aria-label="Nosh home"
        >
          <span className="brand-mark">N</span>
          <span>NOSH</span>
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
            My NFTs
          </button>
          <button
            className={view === "create" ? "nav-link active" : "nav-link"}
            onClick={() => setView("create")}
          >
            Create
          </button>
        </nav>

        <div className="top-actions">
          <span className={health.online ? "network-pill online" : "network-pill"}>
            <i />
            ULTRA TESTNET
          </span>

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
              {walletBusy ? "Connecting…" : "Connect Ultra"}
            </button>
          )}
        </div>
      </header>

      {view === "explore" && (
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">NFTS ON ULTRA / SIMPLE.</span>
            <h1>
              Create.
              <br />
              <em>Own. Trade.</em>
            </h1>
            <p>
              Nosh is a simple NFT marketplace built on Ultra Uniqs. Create a
              collection, mint an NFT, list it in UOS, or buy one from another
              Ultra user.
            </p>
            <div className="hero-actions">
              <button
                className="primary-cta"
                onClick={() => setView("create")}
              >
                Create NFT <span>↗</span>
              </button>
              <button className="text-cta" onClick={openOwned}>
                View my NFTs →
              </button>
            </div>
          </div>

          <div className="hero-poster" aria-hidden="true">
            <span className="poster-top">NATIVE / ULTRA UNIQ</span>
            <div className="orb orb-a" />
            <div className="orb orb-b" />
            <span className="poster-n">N</span>
            <span className="poster-bottom">NO EXTRA COMPLEXITY.</span>
          </div>
        </section>
      )}

      <section
        className={view === "explore" ? "market-shell" : "market-shell subview-shell"}
      >
        <div className="market-heading">
          <div>
            <span className="section-index">
              {view === "explore"
                ? "01 / MARKET"
                : view === "owned"
                  ? "02 / MY NFTS"
                  : "03 / CREATE"}
            </span>
            <h2>
              {view === "explore"
                ? "NFTs for sale"
                : view === "owned"
                  ? "Your NFTs"
                  : "Create + mint"}
            </h2>
          </div>

          {(view === "explore" || view === "owned") && (
            <div className="market-meta">
              {view === "explore" ? (
                <>
                  <span>{explore.length} live listings</span>
                  <button onClick={loadExplore}>Refresh ↻</button>
                </>
              ) : account ? (
                <>
                  <span>{owned.length} owned NFTs</span>
                  <button onClick={() => loadInventory(account)}>Refresh ↻</button>
                </>
              ) : (
                <button onClick={connect}>Connect wallet →</button>
              )}
            </div>
          )}
        </div>

        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {(view === "explore" || view === "owned") && (
          <>
            {loading ? (
              <div className="loading-grid" aria-label="Loading NFTs">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div className="skeleton" key={index} />
                ))}
              </div>
            ) : view === "owned" && !account ? (
              <div className="empty-state">
                <span>WALLET NOT CONNECTED</span>
                <h3>Connect Ultra Wallet.</h3>
                <p>Your Ultra Uniqs will appear here directly from the chain.</p>
                <button className="primary-cta" onClick={connect}>
                  Connect Ultra
                </button>
              </div>
            ) : activeItems.length === 0 ? (
              <div className="empty-state">
                <span>NOTHING HERE YET</span>
                <h3>
                  {view === "explore"
                    ? "No NFTs are listed right now."
                    : "You do not own any NFTs yet."}
                </h3>
                <p>
                  {view === "explore"
                    ? "Nosh shows real Ultra Testnet listings only."
                    : "Create a collection and mint your first NFT."}
                </p>
                {view === "owned" && (
                  <button
                    className="primary-cta"
                    onClick={() => setView("create")}
                  >
                    Create NFT →
                  </button>
                )}
              </div>
            ) : (
              <div className="nft-grid">
                {activeItems.map((item) => (
                  <NftCard
                    key={item.source + "-" + item.owner + "-" + item.id}
                    item={item}
                    onOpen={setSelected}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {view === "create" && (
          <CreateStudio
            account={account}
            onConnect={connect}
            onExecute={execute}
          />
        )}
      </section>

      <section className="proof-strip">
        <div>
          <span>NETWORK</span>
          <strong>ULTRA TESTNET</strong>
        </div>
        <div>
          <span>NFT</span>
          <strong>UNIQ</strong>
        </div>
        <div>
          <span>MARKET</span>
          <strong>UOS</strong>
        </div>
        <div>
          <span>BLOCK</span>
          <strong>
            {health.headBlock ? health.headBlock.toLocaleString() : "—"}
          </strong>
        </div>
      </section>

      <footer>
        <button
          className="brand brand-button footer-brand"
          onClick={() => setView("explore")}
        >
          <span className="brand-mark">N</span>
          <span>NOSH</span>
        </button>
        <p>Simple NFT marketplace on Ultra.</p>
        <span>TESTNET V1</span>
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
