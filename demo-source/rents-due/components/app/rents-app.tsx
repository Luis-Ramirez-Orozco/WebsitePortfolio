"use client";

import { useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import GlassShell, {
  BarList,
  DataTable,
  EmptyState,
  GlassPanel,
  Grid,
  List,
  ListRow,
  Progress,
  RowActions,
  SearchField,
  ShellButton,
  Stack,
  Stat,
  StatGrid,
  type ShellView,
} from "@/components/ui/glass-shell";
import { AddBuildingCard, BuildingCard, BuildingStyles, PAID_LIT } from "@/components/app/building-card";
import { AdjustmentDialog, PaymentDialog, UnitDialog } from "@/components/app/dialogs";
import { EditDatesDialog, MoveInDialog, MoveOutDialog, type EditDatesInfo, type MoveInInfo, type MoveOutInfo } from "@/components/app/tenancy-dialogs";
import { HistoryDialog } from "@/components/app/history-dialog";
import { getDb, getVersion, localSend, resetDemo, subscribe, type Data } from "@/lib/demo-store";
import {
  dateLabel,
  money,
  monthLabel,
  monthOf,
  pad,
  rowFor,
  shiftMonth,
  statusLabel,
  buildLedger,
  propertiesOf,
  unitLabel,
  type Adjustment,
  type Tenancy,
  currentTenancy,
  pastTenancies,
  type Payment,
  type Row,
  type Status,
  type Unit,
} from "@/lib/rent";

/* "Today" as a YYYY-MM-DD string. null on the server so nothing time-dependent is prerendered. */
const noopSubscribe = () => () => {};
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Property picker value for units that have no property. */
const NO_PROPERTY = "__none__";

export default function RentsApp() {
  const today = useSyncExternalStore(noopSubscribe, localToday, () => null);
  if (!today) return <div style={{ minHeight: "100svh" }} aria-busy="true" />;
  return <Tracker today={today} />;
}

const badgeColor: Record<Status, string> = {
  paid: "var(--gw-accent)",
  partial: "#b7791f",
  due: "var(--gw-muted)",
  overdue: "var(--color-destructive, #dc2626)",
  vacant: "var(--gw-muted)",
};

/** "Guacamayo" over "departamento 3": a payment's place on two lines, wrapping instead of cutting off. */
function PaymentTitle({ unit }: { unit: Unit | undefined }) {
  const line: CSSProperties = { display: "block", whiteSpace: "normal", overflowWrap: "anywhere", fontSize: "inherit", color: "inherit", margin: 0 };
  if (!unit) return <span style={line}>Deleted unit</span>;
  return (
    <>
      {unit.property && <span style={{ ...line, color: "var(--gw-muted)" }}>{unit.property}</span>}
      <span style={line}>{unit.name}</span>
    </>
  );
}

function Badge({ status }: { status: Status }) {
  const color = badgeColor[status];
  const style: CSSProperties = {
    display: "inline-block",
    padding: "2px 9px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 500,
    color,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
  };
  return <span style={style}>{statusLabel[status]}</span>;
}

function Tracker({ today }: { today: string }) {
  /* Demo: the data lives in this browser only (see lib/demo-store.ts). */
  const version = useSyncExternalStore(subscribe, getVersion, () => 0);
  const initial: Data = useMemo(() => getDb(), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const { units, tenancies, payments, adjustments } = initial;
  const edit = true;
  const [error, setError] = useState("");

  /** Apply a change in the browser store; the view re-renders by itself. */
  async function call(method: "POST" | "DELETE", url: string, body?: unknown) {
    setError("");
    try {
      await localSend(method, url, body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }
  const [monthPick, setMonthPick] = useState<string | null>(null);
  const month = monthPick ?? monthOf(today);
  const [q, setQ] = useState("");
  // Reopen the tab you were on: it's kept in the address (#units), which survives a reload.
  // Tracker only renders in the browser, so reading location here can't cause a hydration mismatch.
  const [initialView] = useState(() => window.location.hash.slice(1) || undefined);
  const [propertyPick, setPropertyPick] = useState(""); // "" = all properties
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [adjDlg, setAdjDlg] = useState<{ open: boolean; adjustment: Adjustment | null }>({ open: false, adjustment: null });

  const [unitDlg, setUnitDlg] = useState<{ open: boolean; unit: Unit | null }>({
    open: false,
    unit: null,
  });
  const [payDlg, setPayDlg] = useState<{
    open: boolean;
    payment: Payment | null;
    defaults: { unitId: string; amount: number; month: string; date: string; tenancyId?: string; tenant?: string };
  }>({ open: false, payment: null, defaults: { unitId: "", amount: 0, month: "", date: "" } });

  const rows = useMemo(
    () => units.map((u) => rowFor(u, month, payments, today, tenancies)),
    [units, month, payments, today, tenancies],
  );
  const occupied = rows.filter((r) => r.status !== "vacant");
  const expected = occupied.reduce((s, r) => s + r.unit.rent, 0);
  const collected = occupied.reduce((s, r) => s + Math.min(r.paid, r.unit.rent), 0);
  const outstanding = expected - collected;
  const rate = expected ? (collected / expected) * 100 : 0;
  const attention = occupied
    .filter((r) => r.status !== "paid")
    .sort((a, b) => Number(b.status === "overdue") - Number(a.status === "overdue") || a.dueDate.localeCompare(b.dueDate));
  const count = (s: Status) => occupied.filter((r) => r.status === s).length;

  /* This month's overdue units, for the notification bell. */
  const notifications = useMemo(
    () =>
      units
        .map((u) => rowFor(u, monthOf(today), payments, today, tenancies))
        .filter((r) => r.status === "overdue")
        .map((r) => ({
          id: r.unit.id,
          title: `${unitLabel(r.unit)} is overdue`,
          body: `${money(r.balance)} owed by ${r.unit.tenant}`,
        })),
    [units, payments, today, tenancies],
  );

  /** `forTenancy`: a payment from that (former) tenant, e.g. collecting what they still owe. */
  function openPayment(unitId?: string, payment: Payment | null = null, forTenancy?: { tenancy: Tenancy; owed: number }) {
    const first = unitId ?? attention[0]?.unit.id ?? occupied[0]?.unit.id ?? units[0]?.id ?? "";
    const row = rows.find((r) => r.unit.id === first);
    const t = forTenancy?.tenancy;
    setPayDlg({
      open: true,
      payment,
      defaults: t
        ? { unitId: first, amount: forTenancy.owed, month: t.end.slice(0, 7), date: today, tenancyId: t.id, tenant: t.tenant }
        : { unitId: first, amount: row?.balance ?? 0, month, date: today },
    });
  }
  const [moveOutInfo, setMoveOutInfo] = useState<MoveOutInfo | null>(null);
  const [moveInInfo, setMoveInInfo] = useState<MoveInInfo | null>(null);
  const [datesInfo, setDatesInfo] = useState<EditDatesInfo | null>(null);
  const savePayment = (p: Payment) => call("POST", "/api/payments", p);
  const saveUnit = (u: Unit) => call("POST", "/api/units", u);
  const saveAdjustment = (a: Adjustment) => call("POST", "/api/adjustments", a);
  const deleteAdjustment = (id: string) => call("DELETE", `/api/adjustments?id=${encodeURIComponent(id)}`);
  function deleteUnit(u: Unit) {
    const n = payments.filter((p) => p.unitId === u.id).length;
    if (!confirm(`Delete ${unitLabel(u)}${n ? ` and its ${n} payment${n === 1 ? "" : "s"}` : ""}? This can't be undone.`)) return;
    if (historyId === u.id) setHistoryId(null);
    void call("DELETE", `/api/units?id=${encodeURIComponent(u.id)}`);
  }
  function deletePayment(p: Payment) {
    if (!confirm(`Delete the ${money(p.amount)} payment from ${dateLabel(p.date)}?`)) return;
    void call("DELETE", `/api/payments?id=${encodeURIComponent(p.id)}`);
  }


  /** The month selector. In the heading row it hides on phones, where a copy is pinned under the navigation bar. */
  const renderMonthNav = (pinned: boolean) => (
    <div
      className={pinned ? "gw-month-nav" : "gw-month-nav gw-pin-on-phone"}
      style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
    >
      <RowActions
        actions={[{ label: "Previous month", icon: ChevronLeft, onClick: () => setMonthPick(shiftMonth(month, -1)) }]}
      />
      <h1 style={{ minWidth: 190, textAlign: "center", fontSize: 22, fontWeight: 500, letterSpacing: "-0.03em", margin: 0 }} aria-live="polite">
        {monthLabel(month)}
      </h1>
      <RowActions
        actions={[{ label: "Next month", icon: ChevronRight, onClick: () => setMonthPick(shiftMonth(month, 1)) }]}
      />
    </div>
  );
  const monthNav = renderMonthNav(false);
  const pinnedMonthNav = renderMonthNav(true);

  /* ---------------- Overview ---------------- */
  const overview = (
    <Stack>
      <StatGrid>
        <Stat label="Expected" value={money(expected)} note={`${occupied.length} occupied unit${occupied.length === 1 ? "" : "s"}`} icon={Wallet} />
        <Stat label="Collected" value={money(collected)} note={`${count("paid")} of ${occupied.length} paid in full`} icon={CheckCircle2} />
        <Stat label="Outstanding" value={money(outstanding)} note={`${count("overdue")} overdue`} icon={AlertCircle} />
      </StatGrid>
      <Grid>
        <GlassPanel title="Needs attention">
          {attention.length ? (
            <List>
              {attention.map((r) => (
                <ListRow
                  key={r.unit.id}
                  icon={r.status === "overdue" ? AlertCircle : Banknote}
                  accent={r.status !== "overdue"}
                  title={`${unitLabel(r.unit)} · ${r.unit.tenant}`}
                  subtitle={`${statusLabel[r.status]} · due ${dateLabel(r.dueDate)}${r.paid ? ` · ${money(r.paid)} paid` : ""}`}
                  value={money(r.balance)}
                  actions={
                    edit ? (
                      <RowActions
                        actions={[
                          { label: `Record payment for ${unitLabel(r.unit)}`, icon: Plus, onClick: () => openPayment(r.unit.id) },
                        ]}
                      />
                    ) : undefined
                  }
                />
              ))}
            </List>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title={occupied.length ? "Everyone has paid" : "No occupied units"}
              description={occupied.length ? `All rent for ${monthLabel(month)} is in.` : "Add a tenant to a unit to start tracking."}
            />
          )}
        </GlassPanel>
        <GlassPanel title="Collection">
          <Progress
            label="Collected"
            value={rate}
            display={`${Math.round(rate)}%`}
            note={
              <>
                <span>{money(collected)} received</span>
                <span>{money(expected)} expected</span>
              </>
            }
            icon={Wallet}
          />
          <div style={{ marginTop: 24 }}>
            <BarList
              items={[
                // Partly paid but not yet late is still "Due".
                { label: statusLabel.paid, n: count("paid") },
                { label: statusLabel.due, n: count("due") + count("partial") },
                { label: statusLabel.overdue, n: count("overdue") },
              ].map((b) => ({ label: b.label, display: b.n, ratio: occupied.length ? b.n / occupied.length : 0 }))}
            />
          </div>
        </GlassPanel>
      </Grid>
    </Stack>
  );

  /* ---------------- Units ---------------- */
  const properties = propertiesOf(units);
  const unassigned = units.filter((u) => !u.property).length;
  // Forget a pick whose property no longer exists (renamed or emptied).
  const property =
    propertyPick === NO_PROPERTY ? (unassigned ? NO_PROPERTY : "") : properties.includes(propertyPick) ? propertyPick : "";
  const inProperty = (u: Unit) => (property === "" ? true : property === NO_PROPERTY ? !u.property : u.property === property);
  const propRows = rows.filter((r) => inProperty(r.unit));
  const propertyTitle = property === "" ? "" : property === NO_PROPERTY ? "No property" : property;
  const propertyPicker = properties.length ? (
    <div className="gw-prop-tabs" role="group" aria-label="Property">
      {[
        { id: "", label: "All properties", n: units.length },
        ...properties.map((p) => ({ id: p, label: p, n: units.filter((u) => u.property === p).length })),
        ...(unassigned ? [{ id: NO_PROPERTY, label: "No property", n: unassigned }] : []),
      ].map((t) => (
        <button key={t.id || "all"} type="button" aria-pressed={property === t.id} onClick={() => setPropertyPick(t.id)}>
          {t.label}
          <span>{t.n}</span>
        </button>
      ))}
    </div>
  ) : null;
  const needle = q.trim().toLowerCase();
  const visible = propRows.filter((r) => `${r.unit.property} ${r.unit.name} ${r.unit.tenant}`.toLowerCase().includes(needle));
  const legend = (
    <div className="gw-bld-legend" aria-hidden="true">
      <span><i style={{ background: PAID_LIT }} />Paid</span>
      <span><i style={{ background: "#f6c453" }} />Partial</span>
      <span><i style={{ background: "var(--color-destructive, #dc2626)" }} />Overdue</span>
      <span><i style={{ background: "color-mix(in srgb, var(--gw-ink) 16%, transparent)" }} />Due/vacant</span>
    </div>
  );
  const historyUnit = units.find((u) => u.id === historyId) ?? null;
  const buildingsPanel = (
    <GlassPanel title={propertyTitle || "Buildings"} action={legend}>
      <div className="gw-bld-grid">
        {propRows.map((r, i) => (
          <BuildingCard
            key={r.unit.id}
            row={r}
            index={i}
            badge={<Badge status={r.status} />}
            total={buildLedger(r.unit, currentTenancy(r.unit.id, tenancies), payments, adjustments, today).balance}
            onClick={() => setHistoryId(r.unit.id)}
            showProperty={property === "" && properties.length > 0}
          />
        ))}
        {edit && (
          <AddBuildingCard
            count={propRows.length}
            onClick={() => setUnitDlg({ open: true, unit: null })}
          />
        )}
      </div>
    </GlassPanel>
  );
  const unitsView = (
    <Stack>
      <BuildingStyles />
      {propertyPicker}
      {buildingsPanel}
    <GlassPanel title={`${propertyTitle || "Units"} · ${monthLabel(month)}`} action={<SearchField value={q} onChange={setQ} placeholder="Search units" />}>
      {units.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No units yet"
          description="Add your first apartment to start tracking rent."
          action={edit ? <ShellButton icon={Plus} onClick={() => setUnitDlg({ open: true, unit: null })}>Add unit</ShellButton> : undefined}
        />
      ) : visible.length ? (
        <DataTable<Row>
          label="Units"
          rows={visible}
          getKey={(r) => r.unit.id}
          columns={[
            {
              header: "Unit",
              cell: (r) => (
                <>
                  <strong>{property === "" ? unitLabel(r.unit) : r.unit.name}</strong>
                  <small>{r.unit.tenant ? [r.unit.tenant, r.unit.phone].filter(Boolean).join(" · ") : "Vacant"}</small>
                </>
              ),
            },
            { header: "Rent", cell: (r) => <>{money(r.unit.rent)}<small>due day {r.unit.dueDay}</small></> },
            { header: "Paid", cell: (r) => (r.status === "vacant" ? "–" : money(r.paid)) },
            { header: "Status", cell: (r) => <Badge status={r.status} /> },
            ...(!edit ? [] : [{
              header: "Actions",
              cell: (r: Row) => (
                <RowActions
                  actions={[
                    ...(r.status !== "vacant" && r.balance > 0
                      ? [{ label: `Record payment for ${unitLabel(r.unit)}`, icon: Plus, onClick: () => openPayment(r.unit.id) }]
                      : []),
                    { label: `Edit ${unitLabel(r.unit)}`, icon: Pencil, onClick: () => setUnitDlg({ open: true, unit: units.find((u) => u.id === r.unit.id) ?? r.unit }) },
                    { label: `Delete ${unitLabel(r.unit)}`, icon: Trash2, onClick: () => deleteUnit(r.unit) },
                  ]}
                />
              ),
            }]),
          ]}
        />
      ) : (
        <EmptyState icon={Building2} title="No matching units" description="Try another search." />
      )}
    </GlassPanel>
    </Stack>
  );

  /* ---------------- Payments ---------------- */
  const monthPayments = payments
    .filter((p) => p.month === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0);
  const paymentsPanel = (
    <GlassPanel title={`Payments for ${monthLabel(month)}`} action={`${money(monthTotal)} received`}>
      {monthPayments.length ? (
        <List>
          {monthPayments.map((p) => (
            <ListRow
              key={p.id}
              icon={Banknote}
              title={<PaymentTitle unit={units.find((u) => u.id === p.unitId)} />}
              value={money(p.amount)}
              accent
              actions={
                <RowActions
                  actions={[
                    { label: "Edit payment or add a note", icon: Pencil, onClick: () => openPayment(p.unitId, p) },
                    { label: "Delete payment", icon: Trash2, onClick: () => deletePayment(p) },
                  ]}
                />
              }
            />
          ))}
        </List>
      ) : (
        <EmptyState
          icon={Banknote}
          title="No payments this month"
          description="Record a payment when rent comes in."
          action={edit && occupied.length ? <ShellButton icon={Plus} onClick={() => openPayment()}>Record payment</ShellButton> : undefined}
        />
      )}
    </GlassPanel>
  );

  const paymentsView = <Stack>{paymentsPanel}</Stack>;

  const addUnit = edit ? (
    <ShellButton icon={Plus} onClick={() => setUnitDlg({ open: true, unit: null })}>
      Add unit
    </ShellButton>
  ) : null;
  const recordPayment = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {monthNav}
      <ShellButton icon={Plus} disabled={!occupied.length} onClick={() => openPayment()}>
        Record payment
      </ShellButton>
      <ShellButton onClick={() => { if (confirm("Reset the demo back to its original sample data?")) { setHistoryId(null); resetDemo(); } }}>
        Reset demo
      </ShellButton>
    </div>
  );

  const views: ShellView[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, action: monthNav, pinned: pinnedMonthNav, content: overview },
    {
      id: "units",
      label: "Units",
      icon: Building2,
      action: (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {monthNav}
          {addUnit}
        </div>
      ),
      pinned: pinnedMonthNav,
      content: unitsView,
    },
    { id: "payments", label: "Payments", icon: Banknote, action: recordPayment, pinned: pinnedMonthNav, content: paymentsView },
  ];

  return (
    <>
      <GlassShell
        showTitles={false}
        initialViewId={initialView}
        onViewChange={(id) => window.history.replaceState(null, "", `#${id}`)}
        brand="Rents"
        showGlassControls={false}
        showTopBar={false}
        tagline="Rent tracker"
        userName="Demo"
        views={views}
        notifications={notifications}
        footerNote="Demo · sample data, changes stay in your browser"
        backgroundImage="https://cdn.21st.dev/assets/mirror/4a/4a0ed73b8ab76bd427aa70ab124329127f3df27cc7f31223a832ed7d28b3dda4.jpg"
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
      <MoveOutDialog
        info={moveOutInfo}
        today={today}
        onClose={() => setMoveOutInfo(null)}
        onSave={(unitId, d) => void call("POST", "/api/tenancies", { action: "move_out", unitId, ...d })}
      />
      <EditDatesDialog
        info={datesInfo}
        onClose={() => setDatesInfo(null)}
        onSave={(tenancyId, start, end) => void call("POST", "/api/tenancies", { action: "edit_dates", tenancyId, start, end })}
      />
      <MoveInDialog
        info={moveInInfo}
        today={today}
        onClose={() => setMoveInInfo(null)}
        onSave={(unitId, d) => void call("POST", "/api/tenancies", { action: "move_in", unitId, ...d })}
      />
      <UnitDialog
        open={unitDlg.open}
        onOpenChange={(open) => setUnitDlg((s) => ({ ...s, open }))}
        unit={unitDlg.unit}
        onSave={saveUnit}
        others={units.filter((u) => u.id !== unitDlg.unit?.id)}
        defaultSince={monthOf(today)}
        defaultProperty={property === NO_PROPERTY ? "" : property}
      />
      <HistoryDialog
        canEdit={edit}
        open={historyUnit !== null}
        onOpenChange={(open) => !open && setHistoryId(null)}
        unit={historyUnit}
        tenancies={tenancies}
        payments={payments}
        adjustments={adjustments}
        today={today}
        onRecordPayment={(tenancy, owed) =>
          historyUnit && openPayment(historyUnit.id, null, tenancy ? { tenancy, owed: owed ?? 0 } : undefined)
        }
        onMoveOut={(t, owed) =>
          historyUnit && setMoveOutInfo({ unitId: historyUnit.id, unitName: unitLabel(historyUnit), tenant: t.tenant, start: t.start, owed })
        }
        onMoveIn={() =>
          historyUnit &&
          setMoveInInfo({
            unitId: historyUnit.id,
            unitName: unitLabel(historyUnit),
            rent: historyUnit.rent,
            earliest: pastTenancies(historyUnit.id, tenancies)[0]?.end ?? "",
          })
        }
        onDeleteUnit={() => historyUnit && deleteUnit(historyUnit)}
        onEditDates={(t) => setDatesInfo({ tenancyId: t.id, tenant: t.tenant, start: t.start, end: t.end })}
        onWriteOff={(t, writtenOff) => {
          if (writtenOff && !confirm(`Write off what ${t.tenant} still owes? It stays on their record, marked written off.`)) return;
          void call("POST", "/api/tenancies", { action: writtenOff ? "write_off" : "reopen", tenancyId: t.id });
        }}
        onAddAdjustment={() => setAdjDlg({ open: true, adjustment: null })}
        onEditAdjustment={(adjustment) => setAdjDlg({ open: true, adjustment })}
        onDeleteAdjustment={deleteAdjustment}
        onEditUnit={() => historyUnit && setUnitDlg({ open: true, unit: historyUnit })}
        onEditPayment={(p) => openPayment(p.unitId, p)}
        onViewReceipt={() => {}} // demo payments have no receipt images
      />
      <AdjustmentDialog
        open={adjDlg.open && historyUnit !== null}
        onOpenChange={(open) => setAdjDlg((s) => ({ ...s, open }))}
        adjustment={adjDlg.adjustment}
        unitName={historyUnit ? unitLabel(historyUnit) : ""}
        unitId={historyUnit?.id ?? ""}
        today={today}
        onSave={saveAdjustment}
      />
      <PaymentDialog
        open={payDlg.open}
        onOpenChange={(open) => setPayDlg((s) => ({ ...s, open }))}
        payment={payDlg.payment}
        defaults={payDlg.defaults}
        units={units}
        onSave={savePayment}
      />
    </>
  );
}
