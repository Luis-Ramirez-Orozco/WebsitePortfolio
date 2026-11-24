"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Dumbbell, Link2, MessageCircle, Plus, Settings2, ShieldCheck, Trash2, Trophy, UserRound, X } from "lucide-react";
import { LeaderboardCard } from "@/components/ui/leaderboard-card";
import { ChatView } from "@/components/app/chat-view";
import GlassShell, {
  EmptyState,
  GlassPanel,
  List,
  ListRow,
  RowActions,
  ShellButton,
  Stack,
  type ShellView,
  useShell,
} from "@/components/ui/glass-shell";
import { AccountView } from "@/components/app/account-view";
import { ExerciseDialog, LiftDialog, ManageExercisesDialog, type LiftInput } from "@/components/app/dialogs";
import {
  CATEGORIES,
  fmtDate,
  fmtResult,
  fmtShortDate,
  isTimed,
  liftStatus,
  metricSubtitle,
  rankings,
  signalLevel,
  type Badge,
  type Category,
  type Connections,
  type Person,
  type Exercise,
  type Lift,
  type Vote,
  type Role,
  type TeamMember,
} from "@/lib/lifts";
import { EXERCISE_COOKIE, TAB_COOKIE, TABS } from "@/lib/prefs";
import { send } from "@/lib/send";

type User = { id: string; name: string; email: string; role: Role };

const muted = { color: "var(--gw-muted)", fontSize: 13 } as const;

/** Jumps to the Account tab (where connections live). Must render inside the glass shell. */
function GoToConnections() {
  const { setView } = useShell();
  return (
    <button type="button" className="lb-btn is-primary" onClick={() => setView("account")}>
      <Link2 size={14} aria-hidden="true" /> Find connections
    </button>
  );
}

/* Remembered across refreshes so the page reopens where the person left it. */
function remember(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export default function GymApp({
  user,
  team,
  exercises,
  lifts,
  badges,
  initialTab,
  initialExercise,
  people,
  connections,
}: {
  people: Person[];
  connections: Connections;
  user: User;
  team: TeamMember[];
  exercises: Exercise[];
  lifts: Lift[];
  badges: Badge[];
  initialTab?: string;
  initialExercise?: string;
}) {
  const badgesOf = (userId: string) => badges.filter((b) => b.userId === userId);
  const router = { refresh() {} }; // demo: changes land in the browser store, which re-renders the page by itself
  const [error, setError] = useState("");
  const [liftDlg, setLiftDlg] = useState<{ open: boolean; exerciseId: string | null }>({ open: false, exerciseId: null });
  const [exDlg, setExDlg] = useState<{ open: boolean; category: Category }>({ open: false, category: "upper" });
  const [manageOpen, setManageOpen] = useState(false);
  const [selected, setSelectedState] = useState<string | undefined>(initialExercise);
  const setSelected = (id: string) => {
    setSelectedState(id);
    remember(EXERCISE_COOKIE, id);
  };

  /* People ranked per exercise; each group lists its most popular exercises first (A to Z on a tie). */
  const ranked = useMemo(
    () => new Map(exercises.map((x) => [x.id, rankings(x.id, lifts, x.metric).length])),
    [exercises, lifts],
  );
  const exerciseGroups = useMemo(
    () =>
      CATEGORIES.flatMap(([c, label]) => {
        const count = (x: Exercise) => ranked.get(x.id) ?? 0;
        const items = exercises
          .filter((x) => x.category === c)
          .sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name));
        return items.length ? [{ label, items }] : [];
      }),
    [exercises, ranked],
  );

  const canPost = user.role !== "viewer";
  const isAdmin = user.role === "admin";
  const exName = (id: string) => exercises.find((x) => x.id === id)?.name ?? "Exercise";
  /** A lift's result in its exercise's unit ("245 lb" or "2:15"). */
  const result = (l: Lift) => fmtResult(l.weight, exercises.find((x) => x.id === l.exerciseId)?.metric);

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }
  const vote = (liftId: string, v: Vote) => act(() => send("POST", "/api/lifts/vote", { liftId, vote: v }));
  const removeLift = (l: Lift) => {
    if (confirm(`Delete ${l.userName}'s ${result(l)} ${exName(l.exerciseId)}?`))
      void act(() => send("DELETE", `/api/lifts?id=${encodeURIComponent(l.id)}`));
  };

  /* ---------- verification lists ---------- */
  /* Only your connections can verify or dispute your lifts (and you theirs). Admins can vote on anyone's. */
  const connectedIds = new Set(connections.connected);
  const canVoteOn = (l: Lift) => canPost && l.userId !== user.id && (isAdmin || connectedIds.has(l.userId));
  const waiting = lifts.filter((l) => canVoteOn(l) && !l.myVote && liftStatus(l) === "pending");
  const incomingRequests = connections.incoming.filter((id) => people.some((p) => p.id === id));
  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? "Someone";
  const disputed = lifts.filter((l) => liftStatus(l) === "disputed");
  const mine = lifts.filter((l) => l.userId === user.id);

  function statusText(l: Lift) {
    const s = liftStatus(l);
    if (s === "verified") return `Verified by ${l.approvals.join(", ")}`;
    if (s === "disputed") return `Disputed by ${l.rejects.join(", ")}`;
    return "Waiting for verification";
  }

  /** Verify / Dispute buttons for someone else's lift (members only). */
  function voteButtons(l: Lift) {
    if (!canVoteOn(l)) return [];
    return [
      l.myVote !== "approve" && (
        <button key="v" type="button" className="lb-btn is-primary" onClick={() => void vote(l.id, "approve")}>
          <Check size={14} aria-hidden="true" /> Verify
        </button>
      ),
      l.myVote !== "reject" && (
        <button key="d" type="button" className="lb-btn" onClick={() => void vote(l.id, "reject")}>
          <X size={14} aria-hidden="true" /> Dispute
        </button>
      ),
    ].filter(Boolean);
  }

  function liftRow(l: Lift, opts: { showName: boolean; buttons?: ReactNode[]; trailing?: ReactNode }) {
    const s = liftStatus(l);
    const buttons = (opts.buttons ?? []).filter(Boolean);
    return (
      <ListRow
        key={l.id}
        icon={s === "verified" ? ShieldCheck : s === "disputed" ? X : Dumbbell}
        accent={s === "verified"}
        title={opts.showName ? `${l.userName} · ${exName(l.exerciseId)}` : exName(l.exerciseId)}
        subtitle={
          <>
            {fmtDate(l.date)}
            {l.note ? ` · ${l.note}` : ""}
            {s !== "pending" || !opts.showName ? (
              <>
                <br />
                {statusText(l)}
              </>
            ) : null}
          </>
        }
        value={result(l)}
        actions={
          <>
            {opts.trailing}
            {buttons.length > 0 && <span className="lb-actions">{buttons}</span>}
          </>
        }
      />
    );
  }

  /* ---------- leaderboards ---------- */
  /** One leaderboard for every exercise; the picker lists them by group, popular ones first. */
  function leaderboardView() {
    const list = exerciseGroups.flatMap((g) => g.items);
    if (!list.length)
      return (
        <GlassPanel title="Leaderboard">
          <EmptyState icon={Dumbbell} title="No exercises yet" description="Add one from Log & Verify." />
        </GlassPanel>
      );
    // Reopen the exercise picked last; otherwise the busiest board (most people ranked).
    const count = (x: Exercise) => ranked.get(x.id) ?? 0;
    const ex = list.find((x) => x.id === selected) ?? list.reduce((a, b) => (count(b) > count(a) ? b : a), list[0]);
    const rows = rankings(ex.id, lifts, ex.metric);
    const pending = lifts.filter((l) => l.exerciseId === ex.id && liftStatus(l) === "pending").length;
    return (
      <LeaderboardCard
        key={ex.id} // fresh page 1 when switching exercises
        className="gw-reveal"
        title="Leaderboard"
        subtitle={metricSubtitle(ex.metric)}
        runLabel="Choose exercise"
        runOptions={list.map((x) => {
          // Signal bars show how busy each board is: dots = nobody yet, 5 bars = more than ten people.
          const n = count(x);
          return {
            id: x.id,
            label: x.name,
            group: exerciseGroups.find((g) => g.items.includes(x))?.label,
            tag: isTimed(x.metric) ? "Time" : undefined,
            signal: signalLevel(n),
            signalLabel: n === 1 ? "1 person ranked" : `${n} people ranked`,
          };
        })}
        selectedRunId={ex.id}
        onRunChange={setSelected}
        currentUserId={user.id}
        formatValue={(v) => fmtResult(v, ex.metric)}
        podiumRankings={rows.slice(0, 3).map((r, i) => ({ userId: r.userId, userName: r.userName, rank: i + 1, value: r.weight }))}
        rankings={rows.map((r, i) => ({
          userId: r.userId,
          rank: i + 1,
          userName: r.userName,
          valueNote: fmtShortDate(r.date),
          value: r.weight,
          badges: badgesOf(r.userId),
        }))}
        emptyMessage={
          pending > 0
            ? `No verified ${ex.name} lifts yet. ${pending} waiting in Log & Verify.`
            : `No verified ${ex.name} lifts yet. Log one in Log & Verify to claim the top spot.`
        }
        actions={pending > 0 ? <span style={muted}>{pending} waiting to be verified</span> : null}
      />
    );
  }

  const logActions = canPost ? (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <ShellButton icon={Plus} onClick={() => setExDlg({ open: true, category: "upper" })}>
        Add exercise
      </ShellButton>
      <ShellButton icon={Dumbbell} onClick={() => setLiftDlg({ open: true, exerciseId: null })}>
        Log a lift
      </ShellButton>
    </div>
  ) : null;

  /* ---------- verify view ---------- */
  const verifyView = (
    <Stack>
      {canPost && connectedIds.size === 0 && (
        <GlassPanel title="Connect with your gym crew">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
            <p style={muted}>
              Only your connections can verify your lifts. Connect with the people you train with so your lifts can count.
            </p>
            <GoToConnections />
          </div>
        </GlassPanel>
      )}
      {canPost && (
        <GlassPanel
          title={`Waiting on you (${waiting.length})`}
          action={isAdmin ? "As admin you can verify anyone" : "Your connections' lifts"}
        >
          {waiting.length ? (
            <List>{waiting.map((l) => liftRow(l, { showName: true, buttons: voteButtons(l) }))}</List>
          ) : (
            <p style={muted}>You&rsquo;re all caught up.</p>
          )}
        </GlassPanel>
      )}
      {disputed.length > 0 && (
        <GlassPanel title={`Disputed (${disputed.length})`} action="Off the board until every dispute is withdrawn">
          <List>
            {disputed.map((l) =>
              liftRow(l, {
                showName: true,
                buttons: voteButtons(l),
                trailing:
                  l.userId === user.id || isAdmin ? (
                    <RowActions actions={[{ label: "Delete lift", icon: Trash2, onClick: () => removeLift(l) }]} />
                  ) : null,
              }),
            )}
          </List>
        </GlassPanel>
      )}
      {canPost && (
        <GlassPanel title="Your lifts">
          {mine.length ? (
            <List>
              {mine.map((l) =>
                liftRow(l, {
                  showName: false,
                  trailing: <RowActions actions={[{ label: "Delete lift", icon: Trash2, onClick: () => removeLift(l) }]} />,
                }),
              )}
            </List>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="No lifts yet"
              description="Log one and ask a friend who saw it to verify."
              action={
                <button type="button" onClick={() => setLiftDlg({ open: true, exerciseId: null })}>
                  Log a lift
                </button>
              }
            />
          )}
        </GlassPanel>
      )}
      {isAdmin && (
        <GlassPanel title="Exercises" action="Admin">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
            <p style={muted}>
              {exercises.length} exercises. Remove ones your crew doesn&rsquo;t use.
            </p>
            <button type="button" className="lb-btn" onClick={() => setManageOpen(true)}>
              <Settings2 size={14} aria-hidden="true" /> Manage exercises
            </button>
          </div>
        </GlassPanel>
      )}
    </Stack>
  );

  const views: ShellView[] = [
    {
      id: "leaderboard",
      label: "Leaderboard",
      icon: Trophy,
      // No page heading here: the card's own "Leaderboard" title is enough (empty heading is hidden in mobile.css).
      title: "",
      eyebrow: "",
      content: leaderboardView(),
    },
    {
      id: "log",
      label: waiting.length ? `Log & Verify (${waiting.length})` : "Log & Verify",
      icon: ShieldCheck,
      title: "Log & Verify",
      eyebrow: "Lifts count once one of your connections verifies them",
      action: logActions,
      content: verifyView,
    },
    {
      id: "chat",
      label: "Chat",
      icon: MessageCircle,
      title: "Crew chat",
      eyebrow: "Everyone in the group",
      content: <ChatView me={user} badges={badges} />,
    },
    {
      id: "account",
      label: incomingRequests.length ? `Account (${incomingRequests.length})` : "Account",
      title: "Account",
      icon: UserRound,
      eyebrow: isAdmin ? "You, your connections, crew and badges" : canPost ? "You, your connections and invites" : "Your account",
      content: <AccountView user={user} team={team} badges={badges} people={people} connections={connections} />,
    },
  ];

  return (
    <>
      <GlassShell
        brand="Gym Leaderboard"
        brandIcon={Dumbbell}
        tagline="Who's on top"
        userName={user.name}
        views={views}
        initialViewId={initialTab && (TABS as readonly string[]).includes(initialTab) ? initialTab : undefined}
        onViewChange={(id) => remember(TAB_COOKIE, id)}
        notifications={[
          ...incomingRequests.map((id) => ({ id: `req-${id}`, title: `${personName(id)} wants to connect`, body: "Open Account to accept" })),
          ...waiting.map((l) => ({
            id: l.id,
            title: `${l.userName} logged ${result(l)} ${exName(l.exerciseId)}`,
            body: "Open Log & Verify to confirm it",
          })),
        ]}
        footerNote="Demo · sample crew, changes stay in your browser"
      />
      {error && (
        <div
          role="alert"
          style={{
            position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 60,
            maxWidth: "calc(100% - 24px)", padding: "10px 16px", borderRadius: 10, fontSize: 13,
            background: "var(--color-destructive, #dc2626)", color: "#fff", display: "flex", gap: 12, alignItems: "center",
          }}
        >
          {error}
          <button type="button" aria-label="Dismiss error" onClick={() => setError("")} style={{ font: "inherit", color: "inherit" }}>
            ✕
          </button>
        </div>
      )}
      <LiftDialog
        open={liftDlg.open}
        onOpenChange={(open) => setLiftDlg((s) => ({ ...s, open }))}
        exercises={exercises}
        groups={exerciseGroups}
        exerciseId={liftDlg.exerciseId}
        onSave={async (l: LiftInput) => {
          await send("POST", "/api/lifts", l);
          router.refresh();
        }}
      />
      <ExerciseDialog
        open={exDlg.open}
        onOpenChange={(open) => setExDlg((s) => ({ ...s, open }))}
        category={exDlg.category}
        onSave={async (e) => {
          await send("POST", "/api/exercises", e);
          router.refresh();
        }}
      />
      {isAdmin && (
        <ManageExercisesDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          exercises={exercises}
          liftCount={(id) => lifts.filter((l) => l.exerciseId === id).length}
          onDelete={(ex) => {
            const n = lifts.filter((l) => l.exerciseId === ex.id).length;
            if (confirm(`Delete ${ex.name}${n ? ` and its ${n} logged ${n === 1 ? "lift" : "lifts"}` : ""}? This can't be undone.`))
              void act(() => send("DELETE", `/api/exercises?id=${encodeURIComponent(ex.id)}`));
          }}
        />
      )}
    </>
  );
}
