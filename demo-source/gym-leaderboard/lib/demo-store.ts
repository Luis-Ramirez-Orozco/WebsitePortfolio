/* The demo's "server": everything lives in this browser (localStorage). Nothing is sent anywhere, and one
   visitor's changes never show up for another. The people, lifts and chat below are all invented.
   The data is generated relative to today's date so the demo always looks current. */
import {
  type Badge,
  type BadgeColor,
  type Category,
  type ChatMessage,
  type Connections,
  type Exercise,
  type Lift,
  type Metric,
  type Person,
  type Role,
  type TeamMember,
  type Vote,
} from "@/lib/lifts";

const KEY = "gym-leaderboard-demo-v1";
export const ME = "u-you";

type U = { id: string; name: string; email: string; role: Role };
type RawLift = { id: string; userId: string; exerciseId: string; weight: number; date: string; note: string; created: number };
type RawVote = { liftId: string; userId: string; vote: Vote };
type RawConn = { requester: string; addressee: string; status: "pending" | "accepted" };
type RawBadge = { id: string; userId: string; label: string; color: BadgeColor };
type RawMsg = { seq: number; id: string; userId: string; body: string; createdAt: string };
export type DB = { users: U[]; exercises: Exercise[]; lifts: RawLift[]; votes: RawVote[]; conns: RawConn[]; badges: RawBadge[]; messages: RawMsg[] };

/* ---------- starter data ---------- */
const EX: [string, string, Category, Metric][] = [
  ["ex-bench-press", "Bench Press", "upper", "weight"],
  ["ex-incline-db-press", "Incline DB Press", "upper", "weight"],
  ["ex-overhead-press", "Overhead Press", "upper", "weight"],
  ["ex-barbell-row", "Barbell Row", "upper", "weight"],
  ["ex-lat-pulldown", "Lat Pulldown", "upper", "weight"],
  ["ex-barbell-curl", "Barbell Curl", "upper", "weight"],
  ["ex-tricep-pushdown", "Tricep Pushdown", "upper", "weight"],
  ["ex-squat", "Squat", "lower", "weight"],
  ["ex-deadlift", "Deadlift", "lower", "weight"],
  ["ex-leg-press", "Leg Press", "lower", "weight"],
  ["ex-hip-thrust", "Hip Thrust", "lower", "weight"],
  ["ex-romanian-deadlift", "Romanian Deadlift", "lower", "weight"],
  ["ex-1-mile-run", "1 Mile Run", "other", "time_min"],
  ["ex-plank", "Plank", "other", "time_max"],
  ["ex-dead-hang", "Dead Hang", "other", "time_max"],
];
/* Typical one-person best for each exercise (lb, or seconds), before each person's strength factor. */
const TYPICAL: Record<string, number> = {
  "ex-bench-press": 205, "ex-incline-db-press": 70, "ex-overhead-press": 125, "ex-barbell-row": 165, "ex-lat-pulldown": 140,
  "ex-barbell-curl": 85, "ex-tricep-pushdown": 70, "ex-squat": 275, "ex-deadlift": 335, "ex-leg-press": 450, "ex-hip-thrust": 275,
  "ex-romanian-deadlift": 245, "ex-1-mile-run": 450, "ex-plank": 140, "ex-dead-hang": 75,
};
const PEOPLE: [string, string, number][] = [
  ["u-maya", "Maya Reyes", 1.22], ["u-jordan", "Jordan Kim", 1.12], ["u-sam", "Sam Patel", 1.05], ["u-chris", "Chris Nguyen", 0.98],
  ["u-taylor", "Taylor Brooks", 0.94], ["u-devon", "Devon Hill", 0.9], ["u-riley", "Riley Santos", 0.86], ["u-avery", "Avery Cole", 0.82],
  ["u-morgan", "Morgan Lee", 0.78], ["u-jesse", "Jesse Ortiz", 0.72],
];

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dayStr = (back: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function buildSeed(): DB {
  const r = rng(20261117);
  const users: U[] = [
    { id: ME, name: "You", email: "you@example.com", role: "admin" },
    ...PEOPLE.map(([id, name]) => ({ id, name, email: `${name.split(" ")[0].toLowerCase()}@example.com`, role: "editor" as Role })),
  ];
  const lifts: RawLift[] = [];
  const votes: RawVote[] = [];
  let n = 0;
  const friends = ["u-maya", "u-jordan", "u-sam", "u-chris", "u-taylor", "u-devon"]; // accepted connections of "You"
  const everyone = users.map((u) => u.id);

  const add = (userId: string, exId: string, factor: number, back: number, note = "") => {
    const metric = EX.find((e) => e[0] === exId)![3];
    const base = TYPICAL[exId];
    // Timed exercises: faster mile = smaller number, so a strong person divides; others multiply.
    const raw = metric === "time_min" ? base / (0.85 + (factor - 0.7) * 0.5) : base * factor * (0.92 + r() * 0.16);
    const step = metric === "weight" ? 5 : 1;
    const weight = Math.max(step, Math.round(raw / step) * step);
    const id = `lift-${++n}`;
    lifts.push({ id, userId, exerciseId: exId, weight, date: dayStr(back), note, created: n });
    return id;
  };
  const approve = (liftId: string, by: string[]) => by.forEach((u) => votes.push({ liftId, userId: u, vote: "approve" }));

  for (const [uid, , factor] of PEOPLE) {
    const exs = EX.map((e) => e[0]).filter(() => r() < 0.72);
    for (const ex of exs) {
      const back = 3 + Math.floor(r() * 55);
      const id = add(uid, ex, factor, back);
      const others = everyone.filter((u) => u !== uid && u !== ME);
      const roll = r();
      if (roll < 0.96) approve(id, [others[Math.floor(r() * others.length)]]); // verified
      // otherwise left pending
    }
  }
  // Your own lifts: two verified, one still waiting.
  approve(add(ME, "ex-bench-press", 0.95, 12, "Paused reps"), ["u-maya"]);
  approve(add(ME, "ex-squat", 0.9, 20), ["u-jordan"]);
  add(ME, "ex-deadlift", 0.88, 2, "New PR");
  // Lifts from your connections that are waiting on you to verify (shows the Verify button).
  add("u-sam", "ex-bench-press", 1.28, 1, "Big one, spotter watched");
  add("u-chris", "ex-squat", 1.2, 2);
  add("u-taylor", "ex-hip-thrust", 1.3, 1, "Belt, 3 plates");
  // One dispute, kept off the board.
  const d = add("u-devon", "ex-overhead-press", 1.6, 4, "Felt light");
  votes.push({ liftId: d, userId: "u-maya", vote: "reject" });

  const conns: RawConn[] = [
    ...friends.map((f) => ({ requester: f, addressee: ME, status: "accepted" as const })),
    { requester: "u-avery", addressee: ME, status: "pending" }, // incoming request
    { requester: ME, addressee: "u-jesse", status: "pending" }, // request you sent
  ];
  const badges: RawBadge[] = [
    { id: "b1", userId: "u-maya", label: "1000 lb club", color: "gold" },
    { id: "b2", userId: "u-jordan", label: "Mile master", color: "blue" },
    { id: "b3", userId: "u-sam", label: "Rookie of the month", color: "green" },
  ];
  const stamp = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();
  const chat: [string, string, number][] = [
    ["u-maya", "Leg day at 6, who's in?", 1700],
    ["u-sam", "In. Going for a squat PR today", 1690],
    ["u-jordan", "Bring the belt, you'll need it 😅", 1685],
    ["u-chris", "I'll be there around 6:30", 1660],
    ["u-taylor", "Just logged my hip thrust, someone verify it please", 190],
    ["u-devon", "Verified. Nice lift!", 170],
    ["u-maya", "Leaderboard is getting spicy this week", 95],
    ["u-sam", "Bench PR incoming, someone verify it when I log it", 40],
  ];
  const messages: RawMsg[] = chat.map(([userId, body, m], i) => ({ seq: i + 1, id: `msg-${i + 1}`, userId, body, createdAt: stamp(m) }));

  return { users, exercises: EX.map(([id, name, category, metric]) => ({ id, name, category, metric })), lifts, votes, conns, badges, messages };
}

/* ---------- storage + change notifications ---------- */
let db: DB | null = null;
let version = 0;
const listeners = new Set<() => void>();
export const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
export const getVersion = () => version;

export function getDb(): DB {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as DB;
      if (d.users && d.exercises && d.lifts && d.votes && d.conns && d.badges && d.messages) return (db = d);
    }
  } catch {
    /* blocked or corrupt storage: start from fresh sample data */
  }
  return (db = buildSeed());
}
function commit() {
  version++;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable: the demo still works until the page closes */
  }
  listeners.forEach((f) => f());
}
export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  db = buildSeed();
  version++;
  listeners.forEach((f) => f());
}

/* ---------- what the pages read ---------- */
export function derive(d: DB) {
  const name = (id: string) => d.users.find((u) => u.id === id)?.name ?? "Someone";
  const lifts: Lift[] = d.lifts
    .map((l) => {
      const vs = d.votes.filter((v) => v.liftId === l.id);
      return {
        id: l.id, userId: l.userId, userName: name(l.userId), exerciseId: l.exerciseId, weight: l.weight, date: l.date, note: l.note,
        approvals: vs.filter((v) => v.vote === "approve").map((v) => name(v.userId)),
        rejects: vs.filter((v) => v.vote === "reject").map((v) => name(v.userId)),
        myVote: vs.find((v) => v.userId === ME)?.vote ?? null,
        created: l.created,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created)
    .map(({ created, ...l }) => (void created, l));
  const exercises = [...d.exercises].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  const people: Person[] = d.users.map(({ id, name, role }) => ({ id, name, role })).sort((a, b) => a.name.localeCompare(b.name));
  const team: TeamMember[] = d.users.map((u) => ({ ...u, disabled: false }));
  const badges: Badge[] = [
    ...d.users.filter((u) => u.role === "admin").map((u) => ({ id: `admin-${u.id}`, userId: u.id, label: "Admin", color: "gold" as const, auto: true })),
    ...d.badges.map((b) => ({ ...b, auto: false })),
  ];
  const connections: Connections = { connected: [], incoming: [], outgoing: [] };
  for (const c of d.conns) {
    if (c.requester !== ME && c.addressee !== ME) continue;
    const other = c.requester === ME ? c.addressee : c.requester;
    if (c.status === "accepted") connections.connected.push(other);
    else if (c.addressee === ME) connections.incoming.push(other);
    else connections.outgoing.push(other);
  }
  const me = d.users.find((u) => u.id === ME)!;
  return { me, exercises, lifts, people, team, badges, connections };
}

export function listMessagesAfter(after: number): ChatMessage[] {
  const d = getDb();
  const name = (id: string) => d.users.find((u) => u.id === id)?.name ?? "Someone";
  return d.messages.filter((m) => m.seq > after).map((m) => ({ ...m, userName: name(m.userId) }));
}

/* ---------- the "API": same paths and bodies the original server used ---------- */
type Body = Record<string, unknown>;
export async function localSend(method: string, url: string, body?: unknown): Promise<Record<string, unknown>> {
  const d = getDb();
  const u = new URL(url, "http://demo.local");
  const b = (body ?? {}) as Body;
  const p = u.pathname;
  const fail = (m: string): never => {
    throw new Error(m);
  };

  if (p === "/api/lifts" && method === "POST") {
    const ex = d.exercises.find((e) => e.id === b.exerciseId);
    if (!ex) fail("That exercise no longer exists.");
    const weight = Number(b.weight);
    if (ex!.metric === "weight" && weight > 2000) fail("That weight looks too high.");
    d.lifts.push({ id: String(b.id), userId: ME, exerciseId: ex!.id, weight, date: String(b.date), note: String(b.note ?? ""), created: Date.now() });
  } else if (p === "/api/lifts" && method === "DELETE") {
    const id = u.searchParams.get("id");
    d.lifts = d.lifts.filter((l) => l.id !== id);
    d.votes = d.votes.filter((v) => v.liftId !== id);
  } else if (p === "/api/lifts/vote") {
    const lift = d.lifts.find((l) => l.id === b.liftId);
    if (!lift) fail("That lift was deleted.");
    if (lift!.userId === ME) fail("You can't verify or dispute your own lift.");
    d.votes = d.votes.filter((v) => !(v.liftId === lift!.id && v.userId === ME));
    d.votes.push({ liftId: lift!.id, userId: ME, vote: b.vote as Vote });
  } else if (p === "/api/exercises" && method === "POST") {
    const nm = String(b.name ?? "").trim();
    if (d.exercises.some((e) => e.name.toLowerCase() === nm.toLowerCase())) fail("Another exercise already has that name.");
    d.exercises.push({ id: String(b.id), name: nm, category: b.category as Category, metric: (b.metric as Metric) ?? "weight" });
  } else if (p === "/api/exercises" && method === "DELETE") {
    const id = u.searchParams.get("id");
    d.exercises = d.exercises.filter((e) => e.id !== id);
    const gone = new Set(d.lifts.filter((l) => l.exerciseId === id).map((l) => l.id));
    d.lifts = d.lifts.filter((l) => l.exerciseId !== id);
    d.votes = d.votes.filter((v) => !gone.has(v.liftId));
  } else if (p === "/api/connections" && method === "POST") {
    const other = String(b.userId);
    const mine = d.conns.find((c) => (c.requester === ME && c.addressee === other) || (c.requester === other && c.addressee === ME));
    if (b.action === "accept") {
      if (!mine || mine.status !== "pending" || mine.addressee !== ME) fail("That request is no longer there.");
      mine!.status = "accepted";
    } else if (!mine) d.conns.push({ requester: ME, addressee: other, status: "pending" });
    else if (mine.status === "pending" && mine.requester === other) mine.status = "accepted";
  } else if (p === "/api/connections" && method === "DELETE") {
    const other = u.searchParams.get("userId");
    d.conns = d.conns.filter((c) => !((c.requester === ME && c.addressee === other) || (c.requester === other && c.addressee === ME)));
  } else if (p === "/api/badges" && method === "POST") {
    d.badges.push({ id: String(b.id), userId: String(b.userId), label: String(b.label), color: b.color as BadgeColor });
  } else if (p === "/api/badges" && method === "DELETE") {
    d.badges = d.badges.filter((x) => x.id !== u.searchParams.get("id"));
  } else if (p === "/api/chat" && method === "POST") {
    const seq = Math.max(0, ...d.messages.map((m) => m.seq)) + 1;
    d.messages.push({ seq, id: String(b.id), userId: ME, body: String(b.body), createdAt: new Date().toISOString() });
  } else fail("Not available in the demo.");
  commit();
  return { ok: true };
}
