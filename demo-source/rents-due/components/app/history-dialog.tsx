"use client";

import { useMemo } from "react";
import { CalendarDays, DoorClosed, DoorOpen, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildLedger,
  currentTenancy,
  dateLabel,
  money,
  pastTenancies,
  shortMonth,
  type Adjustment,
  type LedgerEntry,
  type Payment,
  type Tenancy,
  type Unit,
} from "@/lib/rent";

/** Short row titles: "Rent due" / "Payment" with "Nov 26" underneath. */
const kindTitle: Record<LedgerEntry["kind"], string> = { rent: "Rent due", payment: "Payment", charge: "Charge", credit: "Credit" };

/** Row buttons: a 30px button with a 17px icon, and an invisible edge that makes the touch area about 42px
    without making the row any taller. */
const rowButton =
  "relative inline-grid size-[30px] place-items-center rounded-lg align-middle text-muted-foreground " +
  "hover:bg-muted hover:text-foreground after:absolute after:-inset-1.5 after:content-['']";

const kindStyle: Record<LedgerEntry["kind"], string> = {
  rent: "text-foreground",
  charge: "text-destructive",
  payment: "text-emerald-700 dark:text-emerald-400",
  credit: "text-emerald-700 dark:text-emerald-400",
};

const green = "text-emerald-700 dark:text-emerald-400";

/** "Nov 3, 2026" */
const fullDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

type RowActions = {
  canEdit: boolean;
  adjustments: Adjustment[];
  onEditPayment: (payment: Payment) => void;
  onViewReceipt: (payment: Payment) => void;
  onEditAdjustment: (adjustment: Adjustment) => void;
  onDeleteAdjustment: (id: string) => void;
};

/** A unit: the current tenant's account, moving tenants in and out, and every former tenant's account. */
export function HistoryDialog({
  open,
  onOpenChange,
  unit,
  tenancies,
  payments,
  adjustments,
  today,
  onRecordPayment,
  onAddAdjustment,
  onDeleteAdjustment,
  onEditAdjustment,
  onEditUnit,
  onEditPayment,
  onViewReceipt,
  onMoveOut,
  onMoveIn,
  onWriteOff,
  onEditDates,
  onDeleteUnit,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  tenancies: Tenancy[];
  payments: Payment[];
  adjustments: Adjustment[];
  today: string;
  /** Record a payment; with a tenancy, for that (former) tenant, e.g. collecting an old debt. */
  onRecordPayment: (tenancy?: Tenancy, owed?: number) => void;
  onAddAdjustment: () => void;
  onDeleteAdjustment: (id: string) => void;
  /** Edit a charge or credit that was added by hand. */
  onEditAdjustment: (adjustment: Adjustment) => void;
  onEditUnit: () => void;
  /** Edit a payment (amount, date, month, note). */
  onEditPayment: (payment: Payment) => void;
  /** Show the receipt screenshot an imported payment came from. */
  onViewReceipt: (payment: Payment) => void;
  onMoveOut: (tenancy: Tenancy, owed: number) => void;
  onMoveIn: () => void;
  /** Give up on (true) or reopen (false) a former tenant's remaining debt. */
  onWriteOff: (tenancy: Tenancy, writtenOff: boolean) => void;
  /** Fix a tenant's move-in / move-out dates. */
  onEditDates: (tenancy: Tenancy) => void;
  /** Delete the whole unit (asks first). */
  onDeleteUnit: () => void;
  canEdit: boolean;
}) {
  const data = useMemo(() => {
    if (!unit) return null;
    const current = currentTenancy(unit.id, tenancies);
    const ledger = current ? buildLedger(unit, current, payments, adjustments, today) : null;
    const past = pastTenancies(unit.id, tenancies).map((t) => ({ tenancy: t, ledger: buildLedger(unit, t, payments, adjustments, today) }));
    const loose = buildLedger(unit, null, payments, adjustments, today);
    return { current, ledger, past, loose };
  }, [unit, tenancies, payments, adjustments, today]);

  const actions: RowActions = { canEdit, adjustments, onEditPayment, onViewReceipt, onEditAdjustment, onDeleteAdjustment };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          "h-[min(88svh,52rem)] max-h-[min(88svh,52rem)] w-full grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-2xl " +
          "[&_[data-slot=dialog-close]]:z-10 [&_[data-slot=dialog-close]]:size-9 [&_[data-slot=dialog-close]]:rounded-full " +
          "[&_[data-slot=dialog-close]]:bg-popover [&_[data-slot=dialog-close]]:shadow-md [&_[data-slot=dialog-close]]:ring-1 " +
          "[&_[data-slot=dialog-close]]:ring-foreground/10"
        }
      >
        {unit && data && (
          <>
            {/* Frozen at the top: property, apartment, tenant (and the close button). */}
            <DialogHeader className="gap-0.5 border-b border-foreground/10 px-4 pt-4 pb-3 pr-14">
              {unit.property && (
                <span className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">{unit.property}</span>
              )}
              <DialogTitle className="truncate text-lg leading-tight">{unit.name}</DialogTitle>
              <span className={`truncate text-sm ${data.current ? "text-foreground" : "text-muted-foreground"}`}>
                {data.current ? data.current.tenant : "Vacant"}
              </span>
            </DialogHeader>

            {/* Everything below scrolls. */}
          <div className="min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-contain p-4">
            <DialogDescription>
              {data.current
                ? `${money(data.current.rent)} a month, due on day ${unit.dueDay}. Moved in ${fullDate(data.current.start)}; the balance counts from then.`
                : data.past[0]
                  ? `Vacant since ${fullDate(data.past[0].tenancy.end)}. No rent is charged while it's empty.`
                  : "Vacant. No rent is charged while it's empty."}
            </DialogDescription>

            {data.ledger && <Summary ledger={data.ledger} />}

            {canEdit && (
              <div className="flex flex-wrap gap-2">
                {data.current ? (
                  <>
                    <Button size="sm" onClick={() => onRecordPayment()}>
                      <Plus /> Payment
                    </Button>
                    <Button size="sm" variant="outline" onClick={onAddAdjustment} title="Add a charge or credit" aria-label="MISC: add a charge or credit">
                      <Plus /> MISC
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onMoveOut(data.current!, data.ledger?.balance ?? 0)}>
                      <DoorOpen /> Move out
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onEditDates(data.current!)}>
                      <CalendarDays /> Edit move-in date
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={onMoveIn}>
                    <DoorClosed /> Move in new tenant
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={onEditUnit}>
                  Edit unit
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={onDeleteUnit}>
                  <Trash2 /> Delete unit
                </Button>
              </div>
            )}

            {data.ledger &&
              (data.ledger.entries.length ? (
                <LedgerTable entries={data.ledger.entries} label={`${data.current!.tenant} account`} {...actions} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
              ))}

            {data.past.length > 0 && (
              <section className="grid gap-2" aria-label="Previous tenants">
                <h3 className="text-sm font-semibold">Previous tenants ({data.past.length})</h3>
                {data.past.map(({ tenancy: t, ledger }) => {
                  const owes = ledger.balance > 0.005;
                  const writtenOff = t.closed === "written_off";
                  const state = !owes
                    ? ledger.balance < -0.005
                      ? { text: `Credit ${money(-ledger.balance)}`, cls: green }
                      : { text: "Settled", cls: "text-muted-foreground" }
                    : writtenOff
                      ? { text: `Written off ${money(ledger.balance)}`, cls: "text-muted-foreground" }
                      : { text: `Owes ${money(ledger.balance)}`, cls: "text-destructive" };
                  return (
                    <details key={t.id} className="group rounded-lg border border-foreground/15 bg-muted/30">
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{t.tenant}</span>
                          <span className="block text-xs text-muted-foreground">
                            {shortMonth(t.start.slice(0, 7))} – {shortMonth(t.end.slice(0, 7))}
                            {t.note ? ` · ${t.note}` : ""}
                          </span>
                        </span>
                        <span className={`text-right text-sm font-semibold whitespace-nowrap ${state.cls}`}>{state.text}</span>
                        <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
                      </summary>
                      <div className="grid gap-3 border-t border-foreground/10 p-3">
                        <p className="text-xs text-muted-foreground">
                          Moved in {fullDate(t.start)}, moved out {fullDate(t.end)}. {money(t.rent)} a month.
                        </p>
                        {canEdit && (
                          <div className="flex flex-wrap gap-2">
                            {owes && !writtenOff && (
                              <Button size="sm" variant="outline" onClick={() => onRecordPayment(t, ledger.balance)}>
                                <Plus /> Payment
                              </Button>
                            )}
                            {owes && (
                              <Button size="sm" variant="outline" onClick={() => onWriteOff(t, !writtenOff)}>
                                {writtenOff ? "Reopen debt" : "Write off debt"}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => onEditDates(t)}>
                              <CalendarDays /> Edit dates
                            </Button>
                          </div>
                        )}
                        {ledger.entries.length ? (
                          <LedgerTable entries={ledger.entries} label={`${t.tenant} account`} {...actions} />
                        ) : (
                          <p className="text-xs text-muted-foreground">No transactions.</p>
                        )}
                      </div>
                    </details>
                  );
                })}
              </section>
            )}

            {data.loose.entries.length > 0 && (
              <details className="rounded-lg border border-foreground/15 bg-muted/30">
                <summary className="cursor-pointer list-none p-3 text-sm font-medium">
                  Not linked to a tenant ({data.loose.entries.length})
                </summary>
                <div className="border-t border-foreground/10 p-3">
                  <LedgerTable entries={data.loose.entries} label="Not linked to a tenant" {...actions} />
                </div>
              </details>
            )}

            <p className="text-xs text-muted-foreground">
              Balance: red means the tenant owes; green means they are ahead (credit).
            </p>
          </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Summary({ ledger }: { ledger: ReturnType<typeof buildLedger> }) {
  const b = ledger.balance;
  const summary =
    b > 0 ? { label: "Balance · owes", text: money(b), cls: "text-destructive" }
    : b < 0 ? { label: "Balance · credit", text: money(-b), cls: green }
    : { label: "Balance", text: "Settled", cls: "text-foreground" };
  return (
    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      {[
        { label: summary.label, value: summary.text, cls: summary.cls },
        { label: "Total charged", value: money(ledger.charged), cls: "" },
        { label: "Total received", value: money(ledger.received), cls: "" },
        { label: "Credits", value: money(ledger.credits), cls: ledger.credits > 0 ? green : "" },
      ].map((c) => (
        <div key={c.label} className="min-w-0 rounded-lg border border-foreground/15 bg-muted/60 p-3 shadow-sm">
          <div className="text-xs text-muted-foreground">{c.label}</div>
          <div className={`break-words text-base font-semibold sm:text-lg ${c.cls}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

/** Newest first: date, what it was, amounts, buttons, and the running balance at the right edge. */
function LedgerTable({ entries, label, canEdit, adjustments, onEditPayment, onViewReceipt, onEditAdjustment, onDeleteAdjustment }: RowActions & {
  entries: LedgerEntry[];
  label: string;
}) {
  const rows = [...entries].reverse();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm sm:min-w-[520px]" aria-label={label}>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-normal">Date</th>
            <th className="py-2 pr-3 font-normal">Description</th>
            <th className="hidden py-2 pr-3 text-right font-normal sm:table-cell">Charge</th>
            <th className="hidden py-2 pr-3 text-right font-normal sm:table-cell">Paid / credit</th>
            <th className="w-16 py-2" aria-label="Actions" />
            <th className="py-2 text-right font-normal">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.key} className="border-b last:border-0">
              <td className="whitespace-nowrap py-2 pr-3 text-muted-foreground">{dateLabel(e.date)}</td>
              <td className="py-2 pr-3">
                <span className={`block font-medium ${kindStyle[e.kind]}`}>{kindTitle[e.kind]}</span>
                {e.month && <span className="block text-xs text-muted-foreground">{shortMonth(e.month)}</span>}
                {e.note && e.kind !== "rent" && (
                  <span className="line-clamp-2 block break-words text-xs text-muted-foreground">{e.note}</span>
                )}
                {/* Phones hide the two amount columns, so show the amount here instead. */}
                <span className={`block text-xs sm:hidden ${e.credit ? green : "text-muted-foreground"}`}>
                  {e.charge ? `Charge ${money(e.charge)}` : ""}
                  {e.charge && e.credit ? " · " : ""}
                  {e.credit ? `${e.kind === "credit" ? "Credit" : "Paid"} ${money(e.credit)}` : ""}
                </span>
              </td>
              <td className="hidden py-2 pr-3 text-right sm:table-cell">{e.charge ? money(e.charge) : ""}</td>
              <td className={`hidden py-2 pr-3 text-right sm:table-cell ${e.credit ? green : ""}`}>{e.credit ? money(e.credit) : ""}</td>
              {/* Fixed-width action column before the balance, so balances sit at the right edge and line up. */}
              <td className="w-16 py-1 text-left whitespace-nowrap">
                {e.payment?.receipt && (
                  <button
                    type="button"
                    aria-label={`View the receipt for the ${money(e.credit)} payment`}
                    title="View receipt"
                    className={rowButton}
                    onClick={() => onViewReceipt(e.payment!)}
                  >
                    <Eye className="size-[17px]" />
                  </button>
                )}
                {canEdit && e.payment && (
                  <button
                    type="button"
                    aria-label={`Edit the ${money(e.credit)} payment or add a note`}
                    title="Edit or add a note"
                    className={rowButton}
                    onClick={() => onEditPayment(e.payment!)}
                  >
                    <Pencil className="size-[17px]" />
                  </button>
                )}
                {canEdit && e.adjustmentId && (
                  <button
                    type="button"
                    aria-label={`Edit ${e.label.toLowerCase()}: ${e.note}`}
                    title="Edit"
                    className={rowButton}
                    onClick={() => {
                      const a = adjustments.find((x) => x.id === e.adjustmentId);
                      if (a) onEditAdjustment(a);
                    }}
                  >
                    <Pencil className="size-[17px]" />
                  </button>
                )}
                {canEdit && e.adjustmentId && (
                  <button
                    type="button"
                    aria-label={`Delete ${e.label.toLowerCase()}: ${e.note}`}
                    title="Delete"
                    className={rowButton}
                    onClick={() => {
                      if (confirm(`Delete this ${e.label.toLowerCase()} (${e.note})?`)) onDeleteAdjustment(e.adjustmentId!);
                    }}
                  >
                    <Trash2 className="size-[17px]" />
                  </button>
                )}
              </td>
              <td className={`whitespace-nowrap py-2 pl-2 text-right font-medium ${e.balance > 0 ? "text-destructive" : e.balance < 0 ? green : ""}`}>
                {money(Math.abs(e.balance))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
