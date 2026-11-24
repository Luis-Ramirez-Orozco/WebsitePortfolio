"use client";

import { useState, type CSSProperties } from "react";
import { Check, Clock, Link2, Search, UserPlus, Users, X } from "lucide-react";
import { GlassPanel, List, ListRow, RowActions, Stack } from "@/components/ui/glass-shell";
import { UserBadges } from "@/components/ui/user-badge";
import type { Badge, Connections, Person } from "@/lib/lifts";
import { send } from "@/lib/send";

const muted: CSSProperties = { color: "var(--gw-muted)", fontSize: 13 };
const control: CSSProperties = {
  border: "1px solid var(--gw-line)",
  background: "var(--gw-search)",
  borderRadius: 10,
  padding: "9px 12px 9px 34px",
  fontSize: 14,
  width: "100%",
  minWidth: 0,
};
const SHOWN = 12;

/** Request / accept / remove connections. Your connections are the people who verify your lifts. */
export function ConnectionsView({
  me,
  people,
  connections,
  badges,
  act,
}: {
  me: string;
  people: Person[];
  connections: Connections;
  badges: Badge[];
  act: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const byId = new Map(people.map((p) => [p.id, p]));
  const name = (id: string) => byId.get(id)?.name ?? "Someone";
  const badgesOf = (id: string) => badges.filter((b) => b.userId === id);
  const nameWithBadges = (id: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", color: "inherit", fontSize: "inherit", margin: 0 }}>
      {name(id)}
      <UserBadges badges={badgesOf(id)} max={2} />
    </span>
  );

  const connected = new Set(connections.connected);
  const outgoing = new Set(connections.outgoing);
  const incoming = connections.incoming.filter((id) => byId.has(id));
  // People you could connect with: members and admins (view-only people don't log or verify lifts).
  const candidates = people.filter((p) => p.id !== me && p.role !== "viewer" && !connected.has(p.id) && !incoming.includes(p.id));
  const term = q.trim().toLowerCase();
  const matches = term ? candidates.filter((p) => p.name.toLowerCase().includes(term)) : candidates;
  // Without a search, show the requests you sent first, then everyone else.
  const ordered = [...matches.filter((p) => outgoing.has(p.id)), ...matches.filter((p) => !outgoing.has(p.id))];

  const post = (userId: string, action: "request" | "accept") => act(() => send("POST", "/api/connections", { userId, action }));
  const remove = (userId: string) => act(() => send("DELETE", `/api/connections?userId=${encodeURIComponent(userId)}`));

  return (
    <Stack>
      {incoming.length > 0 && (
        <GlassPanel title={`Requests (${incoming.length})`} action="They want you to verify their lifts">
          <List>
            {incoming.map((id) => (
              <ListRow
                key={id}
                icon={UserPlus}
                accent
                title={nameWithBadges(id)}
                subtitle="Wants to connect"
                actions={
                  <span className="lb-actions">
                    <button type="button" className="lb-btn is-primary" onClick={() => void post(id, "accept")}>
                      <Check size={14} aria-hidden="true" /> Accept
                    </button>
                    <button type="button" className="lb-btn" onClick={() => void remove(id)}>
                      <X size={14} aria-hidden="true" /> Decline
                    </button>
                  </span>
                }
              />
            ))}
          </List>
        </GlassPanel>
      )}

      <GlassPanel title={`Your connections (${connected.size})`} action="They verify your lifts, you verify theirs">
        {connected.size === 0 ? (
          <p style={muted}>
            No connections yet. Connect with the people you train with: only your connections can verify (or dispute) your lifts.
          </p>
        ) : (
          <List>
            {connections.connected
              .filter((id) => byId.has(id))
              .sort((a, b) => name(a).localeCompare(name(b)))
              .map((id) => (
                <ListRow
                  key={id}
                  icon={Link2}
                  title={nameWithBadges(id)}
                  actions={
                    <RowActions
                      actions={[
                        {
                          label: `Remove ${name(id)}`,
                          icon: X,
                          onClick: () => {
                            if (confirm(`Remove ${name(id)} from your connections? You won't be able to verify each other's new lifts.`))
                              void remove(id);
                          },
                        },
                      ]}
                    />
                  }
                />
              ))}
          </List>
        )}
      </GlassPanel>

      <GlassPanel title="Find people">
        <label style={{ position: "relative", display: "block", marginBottom: 12 }}>
          <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--gw-muted)" }} />
          <input
            type="search"
            aria-label="Search people"
            placeholder={`Search ${candidates.length} people`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={control}
          />
        </label>
        {ordered.length === 0 ? (
          <p style={muted}>{term ? "Nobody matches that name." : "You're connected with everyone."}</p>
        ) : (
          <List>
            {ordered.slice(0, SHOWN).map((p) => {
              const pending = outgoing.has(p.id);
              return (
                <ListRow
                  key={p.id}
                  icon={pending ? Clock : Users}
                  title={nameWithBadges(p.id)}
                  subtitle={pending ? "Request sent" : undefined}
                  actions={
                    pending ? (
                      <button type="button" className="lb-btn" onClick={() => void remove(p.id)}>
                        Cancel
                      </button>
                    ) : (
                      <button type="button" className="lb-btn is-primary" onClick={() => void post(p.id, "request")}>
                        <UserPlus size={14} aria-hidden="true" /> Connect
                      </button>
                    )
                  }
                />
              );
            })}
          </List>
        )}
        {ordered.length > SHOWN && (
          <p style={{ ...muted, marginTop: 10, textAlign: "center" }}>
            Showing {SHOWN} of {ordered.length}. Search to find someone.
          </p>
        )}
      </GlassPanel>
    </Stack>
  );
}
