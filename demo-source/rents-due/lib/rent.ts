import { CURRENCY, LOCALE } from "@/lib/config";

export type Unit = {
  id: string;
  /** Property (building or complex) the unit belongs to, e.g. "Guacamayo". Empty = none. */
  property: string;
  name: string;
  rent: number;
  /** Day of the month rent is due (1 to 28). */
  dueDay: number;
  /** Empty tenant means the unit is vacant. */
  tenant: string;
  phone: string;
  email: string;
  leaseEnd: string;
  /** First month rent is charged for the current tenant (YYYY-MM). Mirrors the current tenancy's start. */
  since: string;
};

/**
 * One tenant's stay in a unit. Rent is charged from the move-in month until move-out, and every payment and
 * charge belongs to one tenancy, so a new tenant starts at zero and a former tenant's debt stays on their record.
 */
export type Tenancy = {
  id: string;
  unitId: string;
  tenant: string;
  phone: string;
  email: string;
  rent: number;
  /** Move-in date (YYYY-MM-DD). Rent is charged from this month. */
  start: string;
  /** Move-out date (YYYY-MM-DD); empty while they still live there. */
  end: string;
  /** "written_off" once a former tenant's remaining debt is given up on. */
  closed: string;
  note: string;
};

/** Anything besides monthly rent: positive = extra charge (debt), negative = credit. */
export type Adjustment = {
  id: string;
  unitId: string;
  amount: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  note: string;
  /** Tenancy it belongs to (set by the server from the date when not chosen). */
  tenancyId?: string | null;
};

export type Payment = {
  id: string;
  unitId: string;
  amount: number;
  /** ISO date the money arrived (YYYY-MM-DD). */
  date: string;
  /** Rent month this payment applies to (YYYY-MM). */
  month: string;
  /** Written by a person (imported payments start empty). */
  note: string;
  /** The receipt it was imported from: its id and path, for showing the screenshot. */
  receipt?: string | null;
  receiptFile?: string | null;
  /** Tenancy (tenant) it belongs to; set by the server from the rent month when not chosen. */
  tenancyId?: string | null;
};

export type Status = "paid" | "partial" | "due" | "overdue" | "vacant";

export const money = (n: number) =>
  n.toLocaleString(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 2 });

export const pad = (n: number) => String(n).padStart(2, "0");

export const monthOf = (iso: string) => iso.slice(0, 7);

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** "Nov 26": a month in 3 letters and a 2-digit year. */
export function shortMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" })} ${String(y).slice(-2)}`;
}

export function dateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const dueDateOf = (unit: Unit, month: string) => `${month}-${pad(unit.dueDay)}`;

/** Rent is charged for a month from the move-in month on, and until move-out: a month counts when its due date
    is on or before the move-out date (moving out on the 15th with rent due on the 1st owes that month). */
export function chargesRent(t: Tenancy, unit: Unit, month: string) {
  if (month < monthOf(t.start)) return false;
  return !t.end || dueDateOf(unit, month) <= t.end;
}

/** Who the unit's card shows for a month: the tenant living there (the newest one when a move-out and a move-in
    share a month). A tenant who moved out no longer shows from their move-out month on, even though that month's
    rent can still be on their account, so the card says vacant instead of showing someone who has left. */
export function tenancyFor(unit: Unit, month: string, tenancies: Tenancy[]) {
  return tenancies
    .filter((t) => t.unitId === unit.id && chargesRent(t, unit, month) && (!t.end || month < monthOf(t.end)))
    .sort((a, b) => b.start.localeCompare(a.start))[0];
}

/** The tenant living there now (no move-out date). */
export const currentTenancy = (unitId: string, tenancies: Tenancy[]) => tenancies.find((t) => t.unitId === unitId && !t.end);

/** Former tenants of a unit, most recent first. */
export const pastTenancies = (unitId: string, tenancies: Tenancy[]) =>
  tenancies.filter((t) => t.unitId === unitId && t.end).sort((a, b) => b.start.localeCompare(a.start));

export function paidFor(unitId: string, month: string, payments: Payment[], tenancyId?: string) {
  return payments
    .filter((p) => p.unitId === unitId && p.month === month && (tenancyId === undefined || p.tenancyId === tenancyId))
    .reduce((sum, p) => sum + p.amount, 0);
}

export type Row = {
  unit: Unit;
  paid: number;
  balance: number;
  status: Status;
  dueDate: string;
};

/** A unit's rent status for one month, for whoever lived there that month (vacant when nobody did). The returned
    unit carries that tenant's name and rent. */
export function rowFor(unit: Unit, month: string, payments: Payment[], today: string, tenancies: Tenancy[] = []): Row {
  const t = tenancyFor(unit, month, tenancies);
  const hasTenancies = tenancies.some((x) => x.unitId === unit.id);
  if (hasTenancies) unit = t ? { ...unit, tenant: t.tenant, rent: t.rent } : { ...unit, tenant: "" };
  const paid = paidFor(unit.id, month, payments, t?.id);
  const dueDate = dueDateOf(unit, month);
  const balance = Math.max(0, unit.rent - paid);
  let status: Status;
  if (!unit.tenant) status = "vacant";
  else if (balance === 0) status = "paid";
  else if (today > dueDate) status = "overdue";
  else if (paid > 0) status = "partial";
  else status = "due";
  return { unit, paid, balance, status, dueDate };
}

/** "Guacamayo · 2B", or just the unit name when it has no property. */
export const unitLabel = (u: { name: string; property?: string }) => (u.property ? `${u.property} · ${u.name}` : u.name);

/** Property names in use, sorted. */
export const propertiesOf = (units: { property: string }[]) =>
  [...new Set(units.map((u) => u.property).filter(Boolean))].sort((a, b) => a.localeCompare(b));

export const statusLabel: Record<Status, string> = {
  paid: "Paid",
  partial: "Partial",
  due: "Due",
  overdue: "Overdue",
  vacant: "Vacant",
};

/** A random v4 UUID. crypto.randomUUID only exists on secure pages (https or localhost), so a phone testing
    the dev server over http://192.168.x.x needs the getRandomValues fallback, which works everywhere. */
function uuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const newId = (prefix: string) => `${prefix}-${uuid()}`;

export type LedgerEntry = {
  key: string;
  date: string;
  kind: "rent" | "payment" | "charge" | "credit";
  label: string;
  /** Rent month (YYYY-MM) of a rent charge or a payment. */
  month?: string;
  note: string;
  /** Adds to what the tenant owes. */
  charge: number;
  /** Reduces what the tenant owes. */
  credit: number;
  /** Running balance after this entry. Positive = owes, negative = credit. */
  balance: number;
  adjustmentId?: string;
  payment?: Payment;
};

/**
 * One tenant's account: monthly rent while they lived there, their payments, and their other charges and credits.
 * With no tenancy, it is the unit's payments and charges that belong to no tenant (no rent is charged).
 */
export function buildLedger(unit: Unit, tenancy: Tenancy | null | undefined, payments: Payment[], adjustments: Adjustment[], today: string) {
  const raw: Omit<LedgerEntry, "balance">[] = [];
  const belongs = (x: { unitId: string; tenancyId?: string | null }) =>
    x.unitId === unit.id && (tenancy ? x.tenancyId === tenancy.id : !x.tenancyId);
  const mine = payments.filter(belongs);
  const cur = monthOf(today);
  if (tenancy) {
    for (let m = monthOf(tenancy.start); m <= cur && chargesRent(tenancy, unit, m); m = shiftMonth(m, 1)) {
      raw.push({ key: `rent-${m}`, date: dueDateOf(unit, m), kind: "rent", label: `Rent · ${monthLabel(m)}`, month: m, note: `Due day ${unit.dueDay}`, charge: tenancy.rent, credit: 0 });
    }
  }
  for (const p of mine) {
    raw.push({ key: p.id, date: p.date, kind: "payment", label: `Payment · ${monthLabel(p.month)}`, month: p.month, note: p.note, charge: 0, credit: p.amount, payment: p });
  }
  for (const a of adjustments.filter(belongs)) {
    raw.push({
      key: a.id,
      date: a.date,
      kind: a.amount >= 0 ? "charge" : "credit",
      label: a.amount >= 0 ? "Charge" : "Credit",
      note: a.note,
      charge: Math.max(0, a.amount),
      credit: Math.max(0, -a.amount),
      adjustmentId: a.id,
    });
  }
  const order = { rent: 0, charge: 1, payment: 2, credit: 2 } as const;
  raw.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind]);
  let balance = 0;
  const entries: LedgerEntry[] = raw.map((e) => {
    balance = Math.round((balance + e.charge - e.credit) * 100) / 100;
    return { ...e, balance };
  });
  const charged = entries.reduce((s, e) => s + e.charge, 0);
  /** Money actually paid. */
  const received = entries.filter((e) => e.kind === "payment").reduce((s, e) => s + e.credit, 0);
  /** Credits given (discounts, deposits applied, refunds owed to the tenant). */
  const credits = entries.filter((e) => e.kind === "credit").reduce((s, e) => s + e.credit, 0);
  return { entries, balance, charged, received, credits };
}
