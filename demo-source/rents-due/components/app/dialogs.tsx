"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { newId, propertiesOf, unitLabel, type Adjustment, type Payment, type Unit } from "@/lib/rent";

const fieldLabel = "grid min-w-0 gap-1.5 text-sm font-medium";

/** Add or edit a unit, including its tenant (leave the tenant empty for a vacant unit). */
export function UnitDialog({
  open,
  onOpenChange,
  unit,
  onSave,
  others,
  defaultSince,
  defaultProperty,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  onSave: (unit: Unit) => void;
  /** The other units, for the duplicate-name check and the property suggestions. */
  others: Unit[];
  defaultSince: string;
  /** Property for a new unit (the one picked on the Units tab). */
  defaultProperty: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <UnitForm
            key={unit?.id ?? "new"}
            unit={unit}
            onSave={(u) => {
              onSave(u);
              onOpenChange(false);
            }}
            others={others}
            defaultSince={defaultSince}
            defaultProperty={defaultProperty}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UnitForm({
  unit,
  onSave,
  others,
  defaultSince,
  defaultProperty,
}: {
  unit: Unit | null;
  onSave: (unit: Unit) => void;
  others: Unit[];
  defaultSince: string;
  defaultProperty: string;
}) {
  const [property, setProperty] = useState(unit?.property ?? defaultProperty);
  const [name, setName] = useState(unit?.name ?? "");
  const [rent, setRent] = useState(unit ? String(unit.rent) : "");
  const [dueDay, setDueDay] = useState(String(unit?.dueDay ?? 1));
  const [tenant, setTenant] = useState(unit?.tenant ?? "");
  const [phone, setPhone] = useState(unit?.phone ?? "");
  const [email, setEmail] = useState(unit?.email ?? "");
  const [leaseEnd, setLeaseEnd] = useState(unit?.leaseEnd ?? "");
  const [since, setSince] = useState(unit ? unit.since : defaultSince);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const rentNum = Number(rent);
    const dayNum = Number(dueDay);
    const prop = property.trim();
    if (!trimmed) return setError("Give the unit a name.");
    if (others.some((o) => o.name.toLowerCase() === trimmed.toLowerCase() && o.property.toLowerCase() === prop.toLowerCase()))
      return setError(prop ? `${prop} already has a unit named ${trimmed}.` : "Another unit already has that name.");
    if (!Number.isFinite(rentNum) || rentNum <= 0) return setError("Rent must be more than 0.");
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 28)
      return setError("Due day must be a whole number from 1 to 28.");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError("That email doesn't look right.");
    onSave({
      id: unit?.id ?? newId("u"),
      // Reuse the existing spelling ("asuncion" -> "Asunción") so one property doesn't split in two.
      property: propertiesOf(others).find((x) => x.toLowerCase() === prop.toLowerCase()) ?? prop,
      name: trimmed,
      rent: Math.round(rentNum * 100) / 100,
      dueDay: dayNum,
      tenant: tenant.trim(),
      phone: phone.trim(),
      email: email.trim(),
      leaseEnd,
      since: since || (tenant.trim() ? defaultSince : ""),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <DialogHeader className="gap-1">
        <DialogTitle className="pr-8">
          {unit ? `Edit ${unitLabel(unit)}` : "Add unit"}
        </DialogTitle>
        <DialogDescription className="text-xs leading-snug">
          {unit
            ? "Fixes the current tenant's details. To change tenants, use Move out / Move in."
            : "Leave the tenant name empty for a vacant unit."}
        </DialogDescription>
      </DialogHeader>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <label className={fieldLabel}>
              Property
              <Input
                value={property}
                maxLength={60}
                list="unit-properties"
                onChange={(e) => setProperty(e.target.value)}
                placeholder="Guacamayo"
              />
              <datalist id="unit-properties">
                {propertiesOf(others).map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <label className={fieldLabel}>
              Unit name
              <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="2B" />
            </label>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <label className={fieldLabel}>
              Monthly rent
              <Input type="number" min="0" step="0.01" value={rent} onChange={(e) => setRent(e.target.value)} />
            </label>
            <label className={fieldLabel}>
              Due day (1 to 28)
              <Input type="number" min="1" max="28" step="1" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </label>
          </div>
          <label className={fieldLabel}>
            Rent starts (current tenant&rsquo;s first month)
            <Input type="month" value={since} onChange={(e) => setSince(e.target.value)} />
            <span className="text-[11px] leading-snug font-normal text-muted-foreground">
              Moves back by itself when an imported receipt is from an earlier month.
            </span>
          </label>
      <label className={fieldLabel}>
        Tenant name
        <Input value={tenant} maxLength={80} onChange={(e) => setTenant(e.target.value)} />
      </label>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className={fieldLabel}>
          Phone
          <Input value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Lease ends
          <Input type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} />
        </label>
      </div>
      <label className={fieldLabel}>
        Email
        <Input type="email" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}

/** Record or edit a payment. */
export function PaymentDialog({
  open,
  onOpenChange,
  payment,
  defaults,
  units,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  /** Prefill for a new payment; `tenancyId`/`tenant` record it for a specific (former) tenant. */
  defaults: { unitId: string; amount: number; month: string; date: string; tenancyId?: string; tenant?: string };
  units: Unit[];
  onSave: (payment: Payment) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <PaymentForm
            key={payment?.id ?? `new-${defaults.unitId}-${defaults.month}`}
            payment={payment}
            defaults={defaults}
            units={units}
            onSave={(p) => {
              onSave(p);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  payment,
  defaults,
  units,
  onSave,
}: {
  payment: Payment | null;
  defaults: { unitId: string; amount: number; month: string; date: string; tenancyId?: string; tenant?: string };
  units: Unit[];
  onSave: (payment: Payment) => void;
}) {
  const [unitId, setUnitId] = useState(payment?.unitId ?? defaults.unitId);
  const [amount, setAmount] = useState(String(payment?.amount ?? (defaults.amount || "")));
  const [date, setDate] = useState(payment?.date ?? defaults.date);
  const [month, setMonth] = useState(payment?.month ?? defaults.month);
  const [note, setNote] = useState(payment?.note ?? "");
  const [error, setError] = useState("");

  const items = units.map((u) => ({ value: u.id, label: u.tenant ? `${unitLabel(u)} · ${u.tenant}` : unitLabel(u) }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!unitId) return setError("Pick a unit.");
    if (!Number.isFinite(amt) || amt <= 0) return setError("Amount must be more than 0.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Enter the date received.");
    if (!/^\d{4}-\d{2}$/.test(month)) return setError("Enter the rent month.");
    onSave({
      id: payment?.id ?? newId("p"),
      unitId,
      amount: Math.round(amt * 100) / 100,
      date,
      month,
      note: note.trim(),
      // Keep the tenant it belongs to unless it moves to another unit (then the server picks by month).
      tenancyId: unitId === (payment?.unitId ?? defaults.unitId) ? (payment?.tenancyId ?? defaults.tenancyId ?? null) : null,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{payment ? "Edit payment" : "Record payment"}</DialogTitle>
        <DialogDescription>
          {defaults.tenant && !payment
            ? `From former tenant ${defaults.tenant}; it reduces what they owe.`
            : "Partial payments are fine; they add up for the month."}
        </DialogDescription>
      </DialogHeader>
      <label className={fieldLabel}>
        Unit
        <Select items={items} value={unitId} onValueChange={(v) => v && setUnitId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className={fieldLabel}>
          Amount
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Date received
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label className={fieldLabel}>
        Rent month
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </label>
      <label className={fieldLabel}>
        Note (optional)
        <Textarea value={note} maxLength={200} rows={2} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}

/** Add an extra charge (debt) or a credit to a unit's account. */
export function AdjustmentDialog({
  open,
  onOpenChange,
  unitName,
  unitId,
  today,
  adjustment = null,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitName: string;
  unitId: string;
  today: string;
  /** Set to edit an existing charge or credit; null adds a new one. */
  adjustment?: Adjustment | null;
  onSave: (a: Adjustment) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <AdjustmentForm
            key={adjustment?.id ?? `new-${unitId}`}
            unitName={unitName}
            unitId={unitId}
            today={today}
            adjustment={adjustment}
            onSave={(a) => {
              onSave(a);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const kinds = [
  { value: "charge", label: "Charge (tenant owes more)" },
  { value: "credit", label: "Credit (tenant owes less)" },
];

function AdjustmentForm({
  unitName,
  unitId,
  today,
  adjustment,
  onSave,
}: {
  unitName: string;
  unitId: string;
  today: string;
  adjustment: Adjustment | null;
  onSave: (a: Adjustment) => void;
}) {
  const [kind, setKind] = useState(adjustment && adjustment.amount < 0 ? "credit" : "charge");
  const [amount, setAmount] = useState(adjustment ? String(Math.abs(adjustment.amount)) : "");
  const [date, setDate] = useState(adjustment?.date ?? today);
  const [note, setNote] = useState(adjustment?.note ?? "");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("Amount must be more than 0.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Enter a date.");
    if (!note.trim()) return setError("Add a short description, like \"Late fee\".");
    const rounded = Math.round(amt * 100) / 100;
    onSave({
      id: adjustment?.id ?? newId("a"),
      unitId,
      amount: kind === "credit" ? -rounded : rounded,
      date,
      note: note.trim(),
      tenancyId: adjustment?.tenancyId ?? null,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{adjustment ? `Edit ${adjustment.amount < 0 ? "credit" : "charge"}` : "Add charge or credit"}</DialogTitle>
        <DialogDescription>For {unitName}. Late fees, repairs, deposits, refunds and similar.</DialogDescription>
      </DialogHeader>
      <label className={fieldLabel}>
        Type
        <Select items={kinds} value={kind} onValueChange={(v) => v && setKind(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kinds.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className={fieldLabel}>
          Amount
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Date
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label className={fieldLabel}>
        Description
        <Input value={note} maxLength={100} onChange={(e) => setNote(e.target.value)} placeholder="Late fee" />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}
