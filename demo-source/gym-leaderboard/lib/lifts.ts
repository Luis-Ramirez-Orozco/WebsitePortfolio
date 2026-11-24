/* Types and rules shared by the server and the page. */

/** Weight unit shown everywhere. */
export const UNIT = "lb";
/** How many other members must verify a lift before it counts on the leaderboard. */
export const VERIFY_NEEDED = 1;

export const BADGE_COLORS = ["gold", "silver", "bronze", "red", "blue", "green", "purple"] as const;
export type BadgeColor = (typeof BADGE_COLORS)[number];
/** `auto` badges come from someone's role (the gold Admin badge) and can't be removed by hand. */
export type Badge = { id: string; userId: string; label: string; color: BadgeColor; auto: boolean };

/** Everyone active in the app (names are already public on the leaderboard and in chat). */
export type Person = { id: string; name: string; role: "admin" | "editor" | "viewer" };
/** The signed-in person's connections, as user ids. */
export type Connections = { connected: string[]; incoming: string[]; outgoing: string[] };

export type Category = "upper" | "lower" | "other";
export const CATEGORIES: [Category, string][] = [
  ["upper", "Upper body"],
  ["lower", "Lower body"],
  ["other", "Other"],
];
/** How an exercise is scored. Lifts store the number in `weight`: pounds, or seconds for timed exercises. */
export type Metric = "weight" | "time_max" | "time_min";
export const METRICS: [Metric, string][] = [
  ["weight", "Weight (heaviest wins)"],
  ["time_max", "Time (longest wins)"],
  ["time_min", "Time (fastest wins)"],
];
export const isTimed = (m: Metric) => m !== "weight";
export type Vote = "approve" | "reject";
export type Exercise = { id: string; name: string; category: Category; metric: Metric };
export type Lift = {
  id: string;
  userId: string;
  userName: string;
  exerciseId: string;
  weight: number;
  date: string; // YYYY-MM-DD
  note: string;
  approvals: string[]; // names of members who verified it
  rejects: string[]; // names of members who disputed it
  myVote: Vote | null;
};
export type LiftStatus = "verified" | "pending" | "disputed";

/** Any dispute holds a lift off the board; otherwise it needs VERIFY_NEEDED verifications. */
export function liftStatus(l: Lift): LiftStatus {
  if (l.rejects.length > 0) return "disputed";
  return l.approvals.length >= VERIFY_NEEDED ? "verified" : "pending";
}

export type Ranking = { userId: string; userName: string; weight: number; date: string };

/** Each person's best verified result for one exercise, best first (earlier date wins a tie).
    Best = heaviest or longest, except "time_min" exercises (the mile) where the fastest wins. */
export function rankings(exerciseId: string, lifts: Lift[], metric: Metric = "weight"): Ranking[] {
  const dir = metric === "time_min" ? -1 : 1; // +1: bigger is better, -1: smaller is better
  const best = new Map<string, Ranking>();
  for (const l of lifts) {
    if (l.exerciseId !== exerciseId || liftStatus(l) !== "verified") continue;
    const cur = best.get(l.userId);
    if (!cur || dir * (l.weight - cur.weight) > 0 || (l.weight === cur.weight && l.date < cur.date)) {
      best.set(l.userId, { userId: l.userId, userName: l.userName, weight: l.weight, date: l.date });
    }
  }
  return [...best.values()].sort((a, b) => dir * (b.weight - a.weight) || a.date.localeCompare(b.date));
}

/** Seconds as m:ss (or h:mm:ss), e.g. 135 -> "2:15". */
export function fmtTime(totalSeconds: number) {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** A result in its exercise's unit: "245 lb" or "2:15". */
export const fmtResult = (n: number, metric: Metric = "weight") => (isTimed(metric) ? fmtTime(n) : fmtWeight(n));

/** What the leaderboard ranks, in plain words. */
export const metricSubtitle = (m: Metric) =>
  m === "time_min" ? "Fastest verified time per person" : m === "time_max" ? "Longest verified time per person" : "Heaviest verified lift per person";

/** Signal strength 0-5 for how many people are ranked: 0 = nobody, 5 = more than ten, 1-4 in between. */
export const signalLevel = (people: number) => (people <= 0 ? 0 : people > 10 ? 5 : Math.min(4, Math.ceil((people * 4) / 10)));

/** Random id for a new row. Phones only offer crypto.randomUUID on https pages, so fall back to
    crypto.getRandomValues (available everywhere) when testing over plain http on Wi-Fi. */
export function newId(prefix: string) {
  if (typeof crypto.randomUUID === "function") return `${prefix}-${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export const fmtWeight = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} ${UNIT}`;

export const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Compact date, e.g. 11/8/26 (order follows the phone's region). */
export const fmtShortDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "2-digit" });

/** Today's date on this device as YYYY-MM-DD. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Demo-only types that used to live with the server code. */
export type Role = "admin" | "editor" | "viewer";
export type TeamMember = { id: string; email: string; name: string; role: Role; disabled: boolean };
export type ChatMessage = { seq: number; id: string; userId: string; userName: string; body: string; createdAt: string };
