"use client";

import type { NoshActivity, NoshUniq } from "@/lib/ultra/types";

type Props = {
  account: string | null;
  owned: NoshUniq[];
  activity: NoshActivity[];
  onConnect: () => void;
};

export function ProfilePanel({ account, owned, activity, onConnect }: Props) {
  if (!account) {
    return (
      <div className="empty-state">
        <span>PROFILE LOCKED</span>
        <h3>Connect your Ultra account.</h3>
        <p>Your profile and collections are derived from your live token.b inventory.</p>
        <button className="primary-cta" onClick={onConnect}>Connect Ultra</button>
      </div>
    );
  }

  const collections = Array.from(
    owned.reduce((map, item) => {
      const current = map.get(item.factoryId) ?? [];
      current.push(item);
      map.set(item.factoryId, current);
      return map;
    }, new Map<string, NoshUniq[]>()),
  ).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="profile-layout">
      <section className="profile-card">
        <span className="profile-monogram">N</span>
        <small>ULTRA ACCOUNT</small>
        <h3>{account}</h3>
        <div className="profile-stats">
          <div><strong>{owned.length}</strong><span>Uniqs</span></div>
          <div><strong>{collections.length}</strong><span>Collections</span></div>
          <div><strong>{activity.length}</strong><span>Nosh txs</span></div>
        </div>
      </section>

      <section className="collections-panel">
        <div className="panel-heading">
          <span>COLLECTIONS</span>
          <h3>Factory holdings</h3>
        </div>
        {collections.length === 0 ? (
          <p className="muted-copy">No Uniqs are currently held by this account.</p>
        ) : (
          <div className="collection-list">
            {collections.map(([factoryId, items]) => (
              <div key={factoryId}>
                <strong>Factory #{factoryId}</strong>
                <span>{items.length} Uniq{items.length === 1 ? "" : "s"}</span>
                <small>
                  {items.slice(0, 4).map((item) => "#" + item.id).join(" · ")}
                </small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
