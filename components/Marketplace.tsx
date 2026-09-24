"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreateStudio } from "./CreateStudio";
import { NftCard } from "./NftCard";
import { ProfilePanel } from "./ProfilePanel";
import { UniqModal } from "./UniqModal";
import type {
  NoshActivity,
  NoshUniq,
  WalletAction,
} from "@/lib/ultra/types";
import {
  getUltraWallet,
  hasUltraExtension,
  walletErrorMessage,
} from "@/lib/ultra/wallet";

type View = "explore" | "owned" | "create" | "profile" | "activity";

type Health = {
  online: boolean;
  headBlock?: number;
};

const ACTIVITY_KEY = "nosh.ultra.activity.v1";

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const json = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(json.error || "Request failed.");
  }

  return json;
}

function loadActivity(): NoshActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 100) as NoshActivity[];
  } catch {
    return [];
  }
}

export function Marketplace() {
  const [view, setView] = useState<View>("explore");
  const [account, setAccount] = useState<string | null>(null);
  const [explore, setExplore] = useState<NoshUniq[]>([]);
  const [owned, setOwned] = useState<NoshUniq[]>([]);
  const [activity, setActivity] = useState<NoshActivity[]>([]);
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

  const refreshMarket = useCallback(async () => {
    await loadExplore();
    if (account) await loadInventory(account);
  }, [account, loadExplore, loadInventory]);

  useEffect(() => {
    setActivity(loadActivity());
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

  const execute = useCallback(
    async (
      action: WalletAction,
      label: string,
      summary: string,
    ): Promise<boolean> => {
      if (!account) {
        setNotice("Connect Ultra Wallet before signing a transaction.");
        return false;
      }

      setNotice(null);
      try {
        const wallet = await getUltraWallet();
        const { data } = await wallet.signTransaction(action);
        const entry: NoshActivity = {
          id: data.transactionHash || crypto.randomUUID(),
          transactionHash: data.transactionHash,
          action: label,
          summary,
          timestamp: new Date().toISOString(),
        };

        setActivity((current) => {
          const next = [entry, ...current].slice(0, 100);
          localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
          return next;
        });

        setNotice(label + " confirmed on Ultra Testnet.");
        return true;
      } catch (error) {
        setNotice(walletErrorMessage(error));
        return false;
      }
    },
    [account],
  );

  const activeItems = view === "explore" ? explore : owned;
  const loading = view === "explore" ? loadingExplore : loadingOwned;

  const accountLabel = useMemo(() => {
    if (!account) return null;
    return account.length > 12 ? account.slice(0, 7) + "…" : account;
  }, [account]);

  const heading =
    view === "explore"
      ? ["01 / MARKET", "Live on Ultra"]
      : view === "owned"
        ? ["02 / INVENTORY", "Your Uniqs"]
        : view === "create"
          ? ["03 / STUDIO", "Create on Ultra"]
          : view === "profile"
            ? ["04 / PROFILE", "Collections"]
            : ["05 / ACTIVITY", "Nosh transactions"];

  const setOwnedView = () => {
    setView("owned");
    if (account) loadInventory(account);
  };

  return (
    <main>
      <header className="topbar">
        <button className="brand brand-button" onClick={() => setView("explore")} aria-label="Nosh home">
          <span className="brand-mark">N</span>
          <span>NOSH</span>
        </button>

        <nav className="desktop-nav" aria-label="Marketplace">
          <button className={view === "explore" ? "nav-link active" : "nav-link"} onClick={() => setView("explore")}>Explore</button>
          <button className={view === "owned" ? "nav-link active" : "nav-link"} onClick={setOwnedView}>My Uniqs</button>
          <button className={view === "create" ? "nav-link active" : "nav-link"} onClick={() => setView("create")}>Create</button>
          <button className={view === "profile" ? "nav-link active" : "nav-link"} onClick={() => setView("profile")}>Profile</button>
          <button className={view === "activity" ? "nav-link active" : "nav-link"} onClick={() => setView("activity")}>Activity</button>
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

      {view === "explore" && (
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">NATIVE NFT MARKETPLACE / ULTRA</span>
            <h1>
              Own the thing.
              <br />
              <em>Not the screenshot.</em>
            </h1>
            <p>
              Discover, create, mint, list and collect real Ultra Uniqs. Ownership
              and marketplace state stay on Ultra; Nosh is the trading experience.
            </p>
            <div className="hero-actions">
              <button className="primary-cta" onClick={() => setView("explore")}>
                Explore Uniqs <span>↗</span>
              </button>
              <button className="text-cta" onClick={() => setView("create")}>
                Create collection →
              </button>
            </div>
          </div>

          <div className="hero-poster" aria-hidden="true">
            <span className="poster-top">ULTRA / UNIQ</span>
            <div className="orb orb-a" />
            <div className="orb orb-b" />
            <span className="poster-n">N</span>
            <span className="poster-bottom">CREATE. OWN. TRADE.</span>
          </div>
        </section>
      )}

      <section className={view === "explore" ? "market-shell" : "market-shell subview-shell"}>
        <div className="market-heading">
          <div>
            <span className="section-index">{heading[0]}</span>
            <h2>{heading[1]}</h2>
          </div>

          {(view === "explore" || view === "owned") && (
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
          )}
        </div>

        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)}>×</button>
          </div>
        )}

        {(view === "explore" || view === "owned") && (
          <>
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
                  Nosh never substitutes fake listings. If Ultra Testnet has no matching rows,
                  you see the real empty state.
                </p>
                {view === "owned" && (
                  <button className="primary-cta" onClick={() => setView("create")}>Create + mint →</button>
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
          <CreateStudio account={account} onConnect={connect} onExecute={execute} />
        )}

        {view === "profile" && (
          <ProfilePanel
            account={account}
            owned={owned}
            activity={activity}
            onConnect={connect}
          />
        )}

        {view === "activity" && (
          <div className="activity-panel">
            <div className="activity-intro">
              <p>
                This feed contains transactions signed through Nosh on this device.
                Each hash is the real Ultra transaction returned by the wallet.
              </p>
            </div>

            {activity.length === 0 ? (
              <div className="empty-state compact-empty">
                <span>NO NOSH TRANSACTIONS YET</span>
                <h3>Your signed actions appear here.</h3>
              </div>
            ) : (
              <div className="activity-list">
                {activity.map((entry) => (
                  <article key={entry.id}>
                    <div>
                      <small>{entry.action}</small>
                      <strong>{entry.summary}</strong>
                    </div>
                    <div className="activity-hash">
                      <code>{entry.transactionHash || "Transaction confirmed"}</code>
                      <time>{new Date(entry.timestamp).toLocaleString()}</time>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="proof-strip">
        <div><span>CHAIN</span><strong>ULTRA TESTNET</strong></div>
        <div><span>NFT STANDARD</span><strong>UNIQ</strong></div>
        <div><span>CONTRACT</span><strong>eosio.nft.ft</strong></div>
        <div><span>HEAD BLOCK</span><strong>{health.headBlock ? health.headBlock.toLocaleString() : "—"}</strong></div>
      </section>

      <footer>
        <button className="brand brand-button footer-brand" onClick={() => setView("explore")}>
          <span className="brand-mark">N</span>
          <span>NOSH</span>
        </button>
        <p>NFT marketplace infrastructure for Ultra. Milestones 1–10.</p>
        <span>2026 / TESTNET BUILD</span>
      </footer>

      {selected && (
        <UniqModal
          seed={selected}
          account={account}
          onClose={() => setSelected(null)}
          onConnect={connect}
          onExecute={execute}
          onChanged={refreshMarket}
        />
      )}
    </main>
  );
}
