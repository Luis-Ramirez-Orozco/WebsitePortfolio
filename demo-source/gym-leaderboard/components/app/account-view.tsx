"use client";

import { useState, type CSSProperties } from "react";
import { Award, KeyRound, RotateCcw, X } from "lucide-react";
import { GlassPanel, List, ListRow, SegmentControl, ShellButton, Stack } from "@/components/ui/glass-shell";
import { UserBadge, UserBadges } from "@/components/ui/user-badge";
import { ConnectionsView } from "@/components/app/connections-view";
import { BADGE_COLORS, newId, type Badge, type BadgeColor, type Connections, type Person, type Role, type TeamMember } from "@/lib/lifts";
import { resetDemo } from "@/lib/demo-store";
import { send } from "@/lib/send";

/* In this app: editor = member who can post results, viewer = spectator. */
export const roleText: Record<Role, string> = { admin: "Admin", editor: "Member", viewer: "View only" };

const control: CSSProperties = {
  border: "1px solid var(--gw-line)",
  background: "var(--gw-search)",
  borderRadius: 8,
  padding: "7px 10px",
  fontSize: 12,
  minWidth: 0,
};
const muted: CSSProperties = { color: "var(--gw-muted)", fontSize: 12 };
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export function AccountView({
  user,
  team,
  badges,
  people,
  connections,
}: {
  user: { id: string; name: string; email: string; role: Role };
  team: TeamMember[];
  badges: Badge[];
  people: Person[];
  connections: Connections;
}) {
  const [msg, setMsg] = useState("");
  const [badgeFor, setBadgeFor] = useState("");
  const [badgeLabel, setBadgeLabel] = useState("");
  const [badgeColor, setBadgeColor] = useState<BadgeColor>("gold");
  const [section, setSection] = useState<"connections" | "crew" | "badges">("connections");
  const isAdmin = user.role === "admin";
  const canInvite = user.role !== "viewer";
  const badgesOf = (id: string) => badges.filter((b) => b.userId === id);

  async function act(fn: () => Promise<unknown>) {
    setMsg("");
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <Stack>
      <GlassPanel title="Your account">
        <List>
          <ListRow
            icon={KeyRound}
            title={user.name}
            subtitle={user.email}
            meta={roleText[user.role]}
            actions={
              <ShellButton
                icon={RotateCcw}
                onClick={() => {
                  if (confirm("Reset the demo back to its original sample data?")) resetDemo();
                }}
              >
                Reset demo
              </ShellButton>
            }
          />
        </List>
        {badgesOf(user.id).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
            {badgesOf(user.id).map((b) => (
              <UserBadge key={b.id} label={b.label} color={b.color} check={b.auto} />
            ))}
          </div>
        )}
        {user.role === "viewer" && (
          <p style={{ ...muted, marginTop: 14 }}>Your account is view-only. Ask an admin if you want to post results.</p>
        )}
      </GlassPanel>

      {msg && (
        <p role="alert" style={{ color: "var(--color-destructive, #dc2626)", fontSize: 12 }}>
          {msg}
        </p>
      )}

      {isAdmin && (
        <div className="gw-reveal" style={{ display: "flex", justifyContent: "center" }}>
          <SegmentControl
            label="Account section"
            value={section}
            onChange={setSection}
            options={[
              { value: "connections", label: connections.incoming.length ? `Connect (${connections.incoming.length})` : "Connect" },
              { value: "crew", label: `Crew (${team.length})` },
              { value: "badges", label: `Badges (${badges.filter((b) => !b.auto).length})` },
            ]}
          />
        </div>
      )}

      {canInvite && section === "connections" && (
        <ConnectionsView me={user.id} people={people} connections={connections} badges={badges} act={act} />
      )}

      {isAdmin && section === "crew" && (
        <GlassPanel title="Crew">
          <List>
            {team.map((m) => (
              <ListRow
                key={m.id}
                icon={KeyRound}
                title={
                  <span
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", color: "inherit", fontSize: "inherit", margin: 0 }}
                  >
                    {`${m.name}${m.id === user.id ? " (you)" : ""}`}
                    <UserBadges badges={badgesOf(m.id)} max={3} />
                  </span>
                }
                subtitle={m.role === "admin" ? "That's you" : "Demo member"}
                meta={roleText[m.role]}
              />
            ))}
          </List>
        </GlassPanel>
      )}

      {isAdmin && section === "badges" && (
        <GlassPanel title="Badges" action="Shown next to names">
          <form
            style={{ display: "grid", gap: 8 }}
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                await send("POST", "/api/badges", { id: newId("badge"), userId: badgeFor, label: badgeLabel, color: badgeColor });
                setBadgeLabel("");
              });
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <select
                aria-label="Person"
                required
                style={{ ...control, flex: "1 1 140px" }}
                value={badgeFor}
                onChange={(e) => setBadgeFor(e.target.value)}
              >
                <option value="" disabled>
                  Choose a person…
                </option>
                {team
                  .filter((m) => !m.disabled)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <input
                aria-label="Badge name"
                required
                maxLength={24}
                placeholder="Badge, e.g. 1000 lb club"
                style={{ ...control, flex: "2 1 180px" }}
                value={badgeLabel}
                onChange={(e) => setBadgeLabel(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <select
                aria-label="Badge color"
                style={{ ...control, flex: "1 1 120px" }}
                value={badgeColor}
                onChange={(e) => setBadgeColor(e.target.value as BadgeColor)}
              >
                {BADGE_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {capitalize(c)}
                  </option>
                ))}
              </select>
              <span style={{ ...muted, display: "inline-flex", alignItems: "center", gap: 6 }}>
                Preview <UserBadge label={badgeLabel.trim() || "Badge"} color={badgeColor} />
              </span>
              <ShellButton icon={Award} type="submit" disabled={!badgeFor || !badgeLabel.trim()}>
                Give badge
              </ShellButton>
            </div>
          </form>

          <div style={{ marginTop: 18 }}>
            {badges.filter((b) => !b.auto).length === 0 ? (
              <p style={muted}>No badges given yet. Admins always get the gold checkmark automatically.</p>
            ) : (
              <List>
                {badges
                  .filter((b) => !b.auto)
                  .map((b) => (
                    <ListRow
                      key={b.id}
                      icon={Award}
                      title={team.find((m) => m.id === b.userId)?.name ?? "Someone"}
                      subtitle={<UserBadge label={b.label} color={b.color} />}
                      actions={
                        <span className="gw-mini-actions">
                          <button
                            type="button"
                            aria-label={`Remove ${b.label} badge`}
                            onClick={() => void act(async () => void (await send("DELETE", `/api/badges?id=${encodeURIComponent(b.id)}`)))}
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </span>
                      }
                    />
                  ))}
              </List>
            )}
          </div>
        </GlassPanel>
      )}
    </Stack>
  );
}
