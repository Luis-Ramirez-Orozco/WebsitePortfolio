"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/rent";

const fieldLabel = "grid min-w-0 gap-1.5 text-sm font-medium";

export type MoveOutInfo = { unitId: string; unitName: string; tenant: string; start: string; owed: number };
export type MoveOutData = { date: string; note: string; writeOff: boolean };

/** The current tenant leaves: pick the date (rent stops after it) and what happens to what they still owe. */
export function MoveOutDialog({
  info,
  today,
  onClose,
  onSave,
}: {
  info: MoveOutInfo | null;
  today: string;
  onClose: () => void;
  onSave: (unitId: string, data: MoveOutData) => void;
}) {
  return (
    <Dialog open={info !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{info && <MoveOutForm key={info.unitId} info={info} today={today} onSave={(d) => (onSave(info.unitId, d), onClose())} />}</DialogContent>
    </Dialog>
  );
}

function MoveOutForm({ info, today, onSave }: { info: MoveOutInfo; today: string; onSave: (d: MoveOutData) => void }) {
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [writeOff, setWriteOff] = useState(false);
  const [error, setError] = useState("");
  const owes = info.owed > 0.005;
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Enter the move-out date.");
        if (date < info.start) return setError("That's before they moved in.");
        onSave({ date, note: note.trim(), writeOff: owes && writeOff });
      }}
    >
      <DialogHeader>
        <DialogTitle className="pr-8">Move out {info.tenant}</DialogTitle>
        <DialogDescription>
          {info.unitName} becomes vacant. Rent stops after the move-out date, and the next tenant starts at zero.
        </DialogDescription>
      </DialogHeader>
      <label className={fieldLabel}>
        Move-out date
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className={fieldLabel}>
        Note (optional)
        <Input value={note} maxLength={200} placeholder="Evicted, lease ended…" onChange={(e) => setNote(e.target.value)} />
      </label>
      {owes ? (
        <div className="grid gap-2 rounded-lg border border-foreground/15 p-3 text-sm">
          <p>
            {info.tenant} owes <strong className="text-destructive">{money(info.owed)}</strong> today. It stays on their
            record under Previous tenants, where you can still record payments.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={writeOff} onChange={(e) => setWriteOff(e.target.checked)} />
            Write it off (you don&rsquo;t expect to collect it)
          </label>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{info.tenant} doesn&rsquo;t owe anything today.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="submit">Move out</Button>
      </DialogFooter>
    </form>
  );
}

export type MoveInInfo = { unitId: string; unitName: string; rent: number; earliest: string };
export type MoveInData = { tenant: string; phone: string; email: string; rent: number; date: string };

/** A new tenant moves into a vacant unit, starting at a zero balance. */
export function MoveInDialog({
  info,
  today,
  onClose,
  onSave,
}: {
  info: MoveInInfo | null;
  today: string;
  onClose: () => void;
  onSave: (unitId: string, data: MoveInData) => void;
}) {
  return (
    <Dialog open={info !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>{info && <MoveInForm key={info.unitId} info={info} today={today} onSave={(d) => (onSave(info.unitId, d), onClose())} />}</DialogContent>
    </Dialog>
  );
}

function MoveInForm({ info, today, onSave }: { info: MoveInInfo; today: string; onSave: (d: MoveInData) => void }) {
  const [tenant, setTenant] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [rent, setRent] = useState(String(info.rent || ""));
  const [date, setDate] = useState(today < info.earliest ? info.earliest : today);
  const [error, setError] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const r = Number(rent);
        if (!tenant.trim()) return setError("Enter the tenant's name.");
        if (!Number.isFinite(r) || r <= 0) return setError("Rent must be more than 0.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Enter the move-in date.");
        if (info.earliest && date < info.earliest) return setError("That's before the last tenant moved out.");
        onSave({ tenant: tenant.trim(), phone: phone.trim(), email: email.trim(), rent: Math.round(r * 100) / 100, date });
      }}
    >
      <DialogHeader>
        <DialogTitle className="pr-8">Move in a new tenant</DialogTitle>
        <DialogDescription>
          {info.unitName}. Their balance starts at zero; rent is charged from the move-in month.
        </DialogDescription>
      </DialogHeader>
      <label className={fieldLabel}>
        Tenant name
        <Input value={tenant} maxLength={80} onChange={(e) => setTenant(e.target.value)} />
      </label>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className={fieldLabel}>
          Phone (optional)
          <Input type="tel" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Email (optional)
          <Input type="email" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className={fieldLabel}>
          Monthly rent
          <Input type="number" min="0" step="0.01" value={rent} onChange={(e) => setRent(e.target.value)} />
        </label>
        <label className={fieldLabel}>
          Move-in date
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="submit">Move in</Button>
      </DialogFooter>
    </form>
  );
}

export type EditDatesInfo = { tenancyId: string; tenant: string; start: string; end: string };

/** Fix a tenant's move-in date (and move-out date for a former tenant). */
export function EditDatesDialog({
  info,
  onClose,
  onSave,
}: {
  info: EditDatesInfo | null;
  onClose: () => void;
  onSave: (tenancyId: string, start: string, end: string) => void;
}) {
  return (
    <Dialog open={info !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {info && <EditDatesForm key={info.tenancyId} info={info} onSave={(start, end) => (onSave(info.tenancyId, start, end), onClose())} />}
      </DialogContent>
    </Dialog>
  );
}

function EditDatesForm({ info, onSave }: { info: EditDatesInfo; onSave: (start: string, end: string) => void }) {
  const [start, setStart] = useState(info.start);
  const [end, setEnd] = useState(info.end);
  const [error, setError] = useState("");
  const former = Boolean(info.end);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return setError("Enter the move-in date.");
        if (former && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return setError("Enter the move-out date.");
        if (former && end < start) return setError("The move-out date is before the move-in date.");
        onSave(start, former ? end : "");
      }}
    >
      <DialogHeader>
        <DialogTitle className="pr-8">Edit {info.tenant}&rsquo;s dates</DialogTitle>
        <DialogDescription>
          Rent is recounted from the new dates, and payments follow them to whoever lived there that month (ones you
          assigned to a tenant by hand stay put).
        </DialogDescription>
      </DialogHeader>
      <div className={former ? "grid grid-cols-1 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "grid"}>
        <label className={fieldLabel}>
          Move-in date
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        {former && (
          <label className={fieldLabel}>
            Move-out date
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        )}
      </div>
      {!former && <p className="-mt-2 text-xs text-muted-foreground">To set a move-out date, use Move out.</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="submit">Save dates</Button>
      </DialogFooter>
    </form>
  );
}
