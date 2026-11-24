/* The demo's "server": everything lives in this browser (localStorage). Nothing is sent anywhere, and one
   visitor's changes never show up for another. All people, phone numbers and amounts are invented.
   The data is generated relative to today's date so the demo always looks current.
   The tenancy rules below mirror the real app's server code (queries.ts), run in memory. */
import { pad, shiftMonth, type Adjustment, type Payment, type Tenancy, type Unit } from "@/lib/rent";

const KEY = "rents-due-demo-v2";
export type Data = { units: Unit[]; tenancies: Tenancy[]; payments: Payment[]; adjustments: Adjustment[] };

const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localToday = () => iso(new Date());

/* ---------- starter data ---------- */
type Plan = {
  id: string; property: string; name: string; rent: number; dueDay: number;
  tenant: string; phone: string; email: string;
  /** Months the current tenant has lived there (0 = vacant). */
  months: number;
  /** This month: paid in full, half paid, or nothing yet. */
  now: "paid" | "partial" | "none";
};
const PLANS: Plan[] = [
  { id: "u-m1a", property: "Maple Court", name: "1A", rent: 1450, dueDay: 1, tenant: "Maya Alvarez", phone: "(555) 010-0141", email: "maya.alvarez@example.com", months: 10, now: "paid" },
  { id: "u-m1b", property: "Maple Court", name: "1B", rent: 1380, dueDay: 1, tenant: "Daniel Brooks", phone: "(555) 010-0172", email: "d.brooks@example.com", months: 6, now: "none" },
  { id: "u-m2a", property: "Maple Court", name: "2A", rent: 1600, dueDay: 5, tenant: "Priya Raman", phone: "(555) 010-0188", email: "priya.raman@example.com", months: 12, now: "paid" },
  { id: "u-m2b", property: "Maple Court", name: "2B", rent: 1525, dueDay: 5, tenant: "Tom & Jess Whitaker", phone: "(555) 010-0119", email: "whitakers@example.com", months: 4, now: "partial" },
  { id: "u-m3a", property: "Maple Court", name: "3A", rent: 1700, dueDay: 10, tenant: "", phone: "", email: "", months: 0, now: "none" },
  { id: "u-h1", property: "Harbor View", name: "H1", rent: 1750, dueDay: 10, tenant: "Elena Kowalski", phone: "(555) 010-0156", email: "elena.k@example.com", months: 8, now: "none" },
  { id: "u-h2", property: "Harbor View", name: "H2", rent: 1150, dueDay: 15, tenant: "Marcus Lee", phone: "(555) 010-0133", email: "marcus.lee@example.com", months: 5, now: "paid" },
  { id: "u-h3", property: "Harbor View", name: "H3", rent: 1295, dueDay: 15, tenant: "Sofia Marin", phone: "(555) 010-0127", email: "sofia.marin@example.com", months: 3, now: "paid" },
];

export function buildSeed(): Data {
  const today = localToday();
  const cur = today.slice(0, 7);
  const units: Unit[] = [], tenancies: Tenancy[] = [], payments: Payment[] = [], adjustments: Adjustment[] = [];
  const pay = (id: string, unitId: string, tenancyId: string, amount: number, date: string, month: string, note = "Bank transfer") =>
    payments.push({ id, unitId, tenancyId, amount, date: date > today ? today : date, month, note });

  PLANS.forEach((p, i) => {
    const since = p.months ? shiftMonth(cur, -p.months) : "";
    units.push({
      id: p.id, property: p.property, name: p.name, rent: p.rent, dueDay: p.dueDay, tenant: p.tenant, phone: p.phone, email: p.email,
      leaseEnd: p.tenant ? `${shiftMonth(cur, 2 + ((i * 3) % 11))}-28` : "", since,
    });
    if (!p.tenant) return;
    const tid = `t-${p.id}-now`;
    tenancies.push({ id: tid, unitId: p.id, tenant: p.tenant, phone: p.phone, email: p.email, rent: p.rent, start: `${since}-01`, end: "", closed: "", note: "" });
    for (let back = p.months; back >= 0; back--) {
      const month = shiftMonth(cur, -back);
      const due = `${month}-${pad(p.dueDay)}`;
      const late = `${month}-${pad(Math.min(28, p.dueDay + (i % 3)))}`;
      if (back > 0) pay(`${p.id}-${month}`, p.id, tid, p.rent, late, month);
      else if (p.now === "paid" && due <= today) pay(`${p.id}-${month}`, p.id, tid, p.rent, due, month);
      else if (p.now === "partial") pay(`${p.id}-${month}`, p.id, tid, Math.round(p.rent / 2), today, month, "First half");
    }
  });

  // 2B had a different tenant before the Whitakers: fully paid, moved out cleanly.
  const prevStart = shiftMonth(cur, -10), prevEnd = shiftMonth(cur, -5);
  tenancies.push({ id: "t-u-m2b-prev", unitId: "u-m2b", tenant: "Liam Foster", phone: "(555) 010-0164", email: "liam.foster@example.com", rent: 1475, start: `${prevStart}-01`, end: `${prevEnd}-28`, closed: "", note: "Moved for work" });
  for (let m = prevStart; m <= prevEnd; m = shiftMonth(m, 1)) pay(`u-m2b-prev-${m}`, "u-m2b", "t-u-m2b-prev", 1475, `${m}-06`, m);

  // 3A is vacant: its last tenant left last month still owing rent (shows the former-tenant record and write-off).
  const nStart = shiftMonth(cur, -9), lastM = shiftMonth(cur, -1);
  tenancies.push({ id: "t-u-m3a-prev", unitId: "u-m3a", tenant: "Nora Fitch", phone: "(555) 010-0199", email: "nora.fitch@example.com", rent: 1700, start: `${nStart}-01`, end: `${lastM}-20`, closed: "", note: "Left early" });
  for (let m = nStart; m < lastM; m = shiftMonth(m, 1)) pay(`u-m3a-${m}`, "u-m3a", "t-u-m3a-prev", 1700, `${m}-11`, m);

  // A late fee and a repair credit, so the history view has more than rent and payments.
  const lm = shiftMonth(cur, -1);
  adjustments.push(
    { id: "a1", unitId: "u-m1b", tenancyId: "t-u-m1b-now", amount: 75, date: `${lm}-12`, note: "Late fee" },
    { id: "a2", unitId: "u-m2b", tenancyId: "t-u-m2b-now", amount: -120, date: `${lm}-20`, note: "Repair credit: kitchen faucet" },
  );
  return { units, tenancies, payments, adjustments };
}

/* ---------- storage + change notifications ---------- */
let db: Data | null = null;
let version = 0;
const listeners = new Set<() => void>();
export const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
export const getVersion = () => version;

export function getDb(): Data {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Data;
      if (d.units && d.tenancies && d.payments && d.adjustments) return (db = d);
    }
  } catch {
    /* blocked or corrupt storage: start from fresh sample data */
  }
  return (db = buildSeed());
}
function commit() {
  db = structuredClone(db!); // new identities, so memoised views recompute
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

/* ---------- the rules (same as the real server's) ---------- */
/** Whoever lived in the unit in that rent month (the newest tenancy that started on or before it), else the unit's first tenancy. */
function tenancyAt(d: Data, unitId: string, month: string): string | null {
  const mine = d.tenancies.filter((t) => t.unitId === unitId);
  const started = mine.filter((t) => t.start.slice(0, 7) <= month).sort((a, b) => b.start.localeCompare(a.start));
  return (started[0] ?? [...mine].sort((a, b) => a.start.localeCompare(b.start))[0])?.id ?? null;
}
const newTenancyId = () => `t-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

function startTenancy(d: Data, unitId: string, t: { tenant: string; phone: string; email: string; rent: number; date: string }) {
  const id = newTenancyId();
  d.tenancies.push({ id, unitId, tenant: t.tenant, phone: t.phone, email: t.email, rent: t.rent, start: t.date, end: "", closed: "", note: "" });
  d.payments.forEach((p) => { if (p.unitId === unitId && !p.tenancyId && p.month >= t.date.slice(0, 7)) p.tenancyId = id; });
  d.adjustments.forEach((a) => { if (a.unitId === unitId && !a.tenancyId && a.date >= t.date) a.tenancyId = id; });
}

function upsertUnit(d: Data, u: Unit) {
  const today = localToday();
  const i = d.units.findIndex((x) => x.id === u.id);
  if (d.units.some((x) => x.id !== u.id && x.property.toLowerCase() === u.property.toLowerCase() && x.name.toLowerCase() === u.name.toLowerCase()))
    throw new Error("Another unit already has that name.");
  if (i >= 0) d.units[i] = u; else d.units.push(u);
  const current = d.tenancies.find((t) => t.unitId === u.id && !t.end);
  if (u.tenant && current) {
    const start = u.since && u.since !== current.start.slice(0, 7) ? `${u.since}-01` : current.start;
    Object.assign(current, { tenant: u.tenant, phone: u.phone, email: u.email, rent: u.rent, start });
  } else if (u.tenant) {
    startTenancy(d, u.id, { tenant: u.tenant, phone: u.phone, email: u.email, rent: u.rent, date: `${u.since || today.slice(0, 7)}-01` });
  } else if (current) {
    current.end = today < current.start ? current.start : today;
  }
}

function moveOut(d: Data, unitId: string, date: string, note: string, writeOff: boolean) {
  const t = d.tenancies.find((x) => x.unitId === unitId && !x.end);
  if (!t) throw new Error("Nobody lives there right now.");
  if (date < t.start) throw new Error("The move-out date is before they moved in.");
  Object.assign(t, { end: date, note, closed: writeOff ? "written_off" : "" });
  const u = d.units.find((x) => x.id === unitId);
  if (u) Object.assign(u, { tenant: "", phone: "", email: "", leaseEnd: "", since: "" });
}

function moveIn(d: Data, unitId: string, t: { tenant: string; phone: string; email: string; rent: number; date: string }) {
  if (d.tenancies.some((x) => x.unitId === unitId && !x.end)) throw new Error("Someone still lives there. Move them out first.");
  const lastEnd = d.tenancies.filter((x) => x.unitId === unitId).map((x) => x.end).sort().pop();
  if (lastEnd && t.date < lastEnd) throw new Error("The move-in date is before the last tenant moved out.");
  startTenancy(d, unitId, t);
  const u = d.units.find((x) => x.id === unitId);
  if (u) Object.assign(u, { tenant: t.tenant, phone: t.phone, email: t.email, rent: t.rent, since: t.date.slice(0, 7) });
}

function editDates(d: Data, tenancyId: string, start: string, end: string) {
  const t = d.tenancies.find((x) => x.id === tenancyId);
  if (!t) throw new Error("That tenant's record no longer exists.");
  if (!t.end) end = "";
  else if (!end) throw new Error("Enter the move-out date.");
  if (end && end < start) throw new Error("The move-out date is before the move-in date.");
  const FAR = "9999-12-31";
  const clash = d.tenancies.find((o) => o.unitId === t.unitId && o.id !== tenancyId && start < (o.end || FAR) && o.start < (end || FAR));
  if (clash) throw new Error(`Those dates overlap ${clash.tenant}'s stay (${clash.start} to ${clash.end || "now"}).`);
  // Payments and charges that were linked automatically follow the new dates; ones assigned by hand stay put.
  const autoP = d.payments.filter((p) => p.unitId === t.unitId && (p.tenancyId ?? null) === tenancyAt(d, p.unitId, p.month));
  const autoA = d.adjustments.filter((a) => a.unitId === t.unitId && (a.tenancyId ?? null) === tenancyAt(d, a.unitId, a.date.slice(0, 7)));
  Object.assign(t, { start, end });
  autoP.forEach((p) => (p.tenancyId = tenancyAt(d, p.unitId, p.month)));
  autoA.forEach((a) => (a.tenancyId = tenancyAt(d, a.unitId, a.date.slice(0, 7))));
  if (!end) { const u = d.units.find((x) => x.id === t.unitId); if (u) u.since = start.slice(0, 7); }
}

/* ---------- the "API": same paths and bodies the original server used ---------- */
type Body = Record<string, unknown>;
export async function localSend(method: string, url: string, body?: unknown): Promise<Record<string, unknown>> {
  const d = getDb();
  const u = new URL(url, "http://demo.local");
  const b = (body ?? {}) as Body;
  const p = u.pathname, id = u.searchParams.get("id");
  const pick = (tid: unknown, unitId: string) => (d.tenancies.some((t) => t.id === tid && t.unitId === unitId) ? (tid as string) : null);

  if (p === "/api/units" && method === "POST") upsertUnit(d, b as unknown as Unit);
  else if (p === "/api/units" && method === "DELETE") {
    d.units = d.units.filter((x) => x.id !== id);
    d.tenancies = d.tenancies.filter((x) => x.unitId !== id);
    d.payments = d.payments.filter((x) => x.unitId !== id);
    d.adjustments = d.adjustments.filter((x) => x.unitId !== id);
  } else if (p === "/api/payments" && method === "POST") {
    const x = b as unknown as Payment;
    const row: Payment = { id: x.id, unitId: x.unitId, amount: x.amount, date: x.date, month: x.month, note: x.note, tenancyId: pick(x.tenancyId, x.unitId) ?? tenancyAt(d, x.unitId, x.month) };
    const i = d.payments.findIndex((q) => q.id === x.id);
    if (i >= 0) d.payments[i] = row; else d.payments.push(row);
  } else if (p === "/api/payments" && method === "DELETE") d.payments = d.payments.filter((x) => x.id !== id);
  else if (p === "/api/adjustments" && method === "POST") {
    const x = b as unknown as Adjustment;
    const row: Adjustment = { id: x.id, unitId: x.unitId, amount: x.amount, date: x.date, note: x.note, tenancyId: pick(x.tenancyId, x.unitId) ?? tenancyAt(d, x.unitId, x.date.slice(0, 7)) };
    const i = d.adjustments.findIndex((q) => q.id === x.id);
    if (i >= 0) d.adjustments[i] = row; else d.adjustments.push(row);
  } else if (p === "/api/adjustments" && method === "DELETE") d.adjustments = d.adjustments.filter((x) => x.id !== id);
  else if (p === "/api/tenancies" && method === "POST") {
    const a = b.action;
    if (a === "move_out") moveOut(d, String(b.unitId), String(b.date), String(b.note ?? ""), Boolean(b.writeOff));
    else if (a === "move_in") moveIn(d, String(b.unitId), { tenant: String(b.tenant), phone: String(b.phone ?? ""), email: String(b.email ?? ""), rent: Number(b.rent), date: String(b.date) });
    else if (a === "edit_dates") editDates(d, String(b.tenancyId), String(b.start), String(b.end ?? ""));
    else {
      const t = d.tenancies.find((x) => x.id === b.tenancyId && x.end);
      if (t) t.closed = a === "write_off" ? "written_off" : "";
    }
  } else throw new Error("Not available in the demo.");
  commit();
  return { ok: true };
}
