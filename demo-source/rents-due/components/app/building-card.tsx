"use client";

import type { ReactNode } from "react";
import { money, unitLabel, type Row, type Status } from "@/lib/rent";

/* Six different little buildings. Units are matched by position, so six units get six designs. */
type Spec = {
  w: number;
  h: number;
  floors: number;
  cols: number;
  roof: "flat" | "gable" | "tower" | "stepped" | "dome" | "slant";
};

const specs: Spec[] = [
  { w: 74, h: 50, floors: 2, cols: 3, roof: "flat" },
  { w: 44, h: 84, floors: 5, cols: 2, roof: "tower" },
  { w: 64, h: 54, floors: 2, cols: 3, roof: "gable" },
  { w: 66, h: 66, floors: 3, cols: 3, roof: "stepped" },
  { w: 88, h: 46, floors: 2, cols: 4, roof: "dome" },
  { w: 58, h: 68, floors: 3, cols: 2, roof: "slant" },
];

const GROUND = 100;
const LIT = "#f6c453"; // partly paid: warm yellow
/** Paid: a soft green from the same family as the credit green, bright enough to read as a lit window. */
export const PAID_LIT = "#5fcf8f";
const ALERT = "var(--color-destructive, #dc2626)";

function litCount(row: Row, total: number) {
  if (row.status === "paid") return total;
  if (row.status === "partial") return Math.max(1, Math.ceil((row.paid / row.unit.rent) * total) - 0);
  return 0;
}

function Roof({ spec, x, y }: { spec: Spec; x: number; y: number }) {
  const { w } = spec;
  const cx = x + w / 2;
  const fill = "color-mix(in srgb, var(--gw-ink) 34%, transparent)";
  switch (spec.roof) {
    case "flat":
      return (
        <>
          <rect x={x - 3} y={y - 4} width={w + 6} height={5} rx={1.5} fill={fill} />
          <rect x={x + 8} y={y - 11} width={10} height={7} fill={fill} />
        </>
      );
    case "tower":
      return (
        <>
          <rect x={x - 2} y={y - 4} width={w + 4} height={5} rx={1.5} fill={fill} />
          <rect x={cx - 0.75} y={y - 20} width={1.5} height={16} fill={fill} />
          <circle className="gw-bld-blink" cx={cx} cy={y - 21} r={2} fill={ALERT} />
        </>
      );
    case "gable":
      return (
        <>
          <polygon points={`${x - 4},${y + 1} ${cx},${y - 20} ${x + w + 4},${y + 1}`} fill={fill} />
          <rect x={x + w - 18} y={y - 16} width={7} height={13} fill={fill} />
        </>
      );
    case "stepped":
      return (
        <>
          <rect x={x - 2} y={y - 4} width={w + 4} height={5} rx={1.5} fill={fill} />
          <rect x={x + 12} y={y - 14} width={w - 24} height={11} fill={fill} />
          <rect x={x + w - 22} y={y - 24} width={12} height={10} rx={2} fill={fill} />
          <rect x={x + w - 18} y={y - 14} width={4} height={10} fill={fill} />
        </>
      );
    case "dome":
      return (
        <>
          <rect x={x - 3} y={y - 4} width={w + 6} height={5} rx={1.5} fill={fill} />
          <path d={`M ${cx - 18} ${y - 4} A 18 18 0 0 1 ${cx + 18} ${y - 4} Z`} fill={fill} />
          <rect x={cx - 0.75} y={y - 28} width={1.5} height={8} fill={fill} />
        </>
      );
    case "slant":
      return (
        <>
          <polygon points={`${x - 3},${y + 1} ${x - 3},${y - 14} ${x + w + 3},${y + 1}`} fill={fill} />
          <rect x={x + w + 3} y={y + 14} width={14} height={GROUND - y - 14} rx={2} fill={fill} opacity={0.6} />
        </>
      );
  }
}

function Building({ row, spec }: { row: Row; spec: Spec }) {
  const { w, h, floors, cols } = spec;
  const x = (120 - w) / 2;
  const y = GROUND - h;
  const total = floors * cols;
  const lit = litCount(row, total);
  const areaTop = y + 8;
  const areaH = h - 8 - 20;
  const rowH = areaH / floors;
  const colW = (w - 16) / cols;
  const winH = Math.min(9, rowH - 4);
  const winW = Math.min(11, colW - 5);
  const overdue = row.status === "overdue";

  const wins = [];
  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const isLit = (idx * 7) % total < lit;
      const cls = isLit ? (row.status === "paid" ? "gw-bld-paid" : "gw-bld-lit") : overdue ? "gw-bld-alert" : "gw-bld-dim";
      wins.push(
        <rect
          key={idx}
          className={cls}
          x={x + 8 + c * colW + (colW - winW) / 2}
          y={areaTop + r * rowH + (rowH - winH) / 2}
          width={winW}
          height={winH}
          rx={1.5}
          style={{ animationDelay: `${((idx * 37) % 29) / 10}s` }}
        />,
      );
    }
  }

  return (
    <svg viewBox="0 0 120 108" aria-hidden="true" className="gw-bld-svg">
      <line x1="4" y1={GROUND + 1} x2="116" y2={GROUND + 1} stroke="var(--gw-line)" strokeWidth="1.5" strokeLinecap="round" />
      <g className="gw-bld-body">
        <Roof spec={spec} x={x} y={y} />
        <rect x={x} y={y} width={w} height={h} rx={2.5} fill="color-mix(in srgb, var(--gw-ink) 16%, transparent)" />
        <rect x={x} y={y} width={w} height={h} rx={2.5} fill="none" stroke="color-mix(in srgb, var(--gw-ink) 30%, transparent)" strokeWidth="1" />
        {wins}
        <rect x={120 / 2 - 5} y={GROUND - 12} width={10} height={12} rx={2} fill="color-mix(in srgb, var(--gw-ink) 38%, transparent)" />
        {row.status === "vacant" && (
          <g>
            <rect x={x + w - 4} y={GROUND - 30} width={1.5} height={30} fill="color-mix(in srgb, var(--gw-ink) 40%, transparent)" />
            <rect x={x + w - 4} y={GROUND - 30} width={26} height={11} rx={2} fill="var(--gw-muted)" />
            <text x={x + w + 9} y={GROUND - 22.5} fontSize="4.6" textAnchor="middle" fill="var(--gw-background)" fontWeight="700">
              FOR RENT
            </text>
          </g>
        )}
        {row.status === "paid" && (
          <g className="gw-bld-pop">
            <circle cx={x + w - 2} cy={y + 2} r={8} fill="var(--gw-accent)" />
            <path d={`M ${x + w - 6} ${y + 2} l 3 3 l 5 -6`} fill="none" stroke="var(--gw-background)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
        {overdue && (
          <g className="gw-bld-blink">
            <circle cx={x + w - 2} cy={y + 2} r={8} fill={ALERT} />
            <rect x={x + w - 3} y={y - 3} width="2" height="6" rx="1" fill="var(--gw-background)" />
            <circle cx={x + w - 2} cy={y + 6.5} r="1.2" fill="var(--gw-background)" />
          </g>
        )}
      </g>
    </svg>
  );
}

const accentFor: Record<Status, string> = {
  paid: "var(--gw-accent)",
  partial: "#b7791f",
  due: "var(--gw-muted)",
  overdue: "var(--color-destructive, #dc2626)",
  vacant: "var(--gw-muted)",
};

export function BuildingCard({
  row,
  index,
  badge,
  total,
  onClick,
  showProperty = false,
}: {
  row: Row;
  index: number;
  badge: ReactNode;
  /** Whole-account balance: positive = owes, negative = credit. */
  total: number;
  onClick: () => void;
  /** Show the property above the unit name (when several properties are listed together). */
  showProperty?: boolean;
}) {
  const { unit, status } = row;
  const line =
    status === "vacant"
      ? "Available to rent"
      : status === "paid"
        ? `Paid ${money(row.paid)}`
        : `Owes ${money(row.balance)}`;
  const totalLine = total > 0.005 ? `Total owed ${money(total)}` : total < -0.005 ? `Credit ${money(-total)}` : "";
  return (
    <button
      type="button"
      className="gw-bld-card"
      style={{ "--bld-accent": accentFor[status], animationDelay: `${index * 70}ms` } as React.CSSProperties}
      data-status={status}
      onClick={onClick}
      aria-label={`${unitLabel(unit)}${unit.tenant ? `, ${unit.tenant}` : ", vacant"}. ${line}.${totalLine ? ` ${totalLine}.` : ""} Click to view history.`}
    >
      <Building row={row} spec={specs[index % specs.length]} />
      {showProperty && unit.property && (
        <span className="gw-bld-property" title={unit.property}>
          {unit.property}
        </span>
      )}
      <strong title={unit.name}>{unit.name}</strong>
      <span className="gw-bld-tenant" title={unit.tenant || undefined}>
        {unit.tenant || "No tenant"}
      </span>
      <span className="gw-bld-foot">
        {badge}
        <span>{line}</span>
        {totalLine && (
          <span className={total > 0 ? "gw-bld-owed" : "gw-bld-credit"}>{totalLine}</span>
        )}
      </span>
    </button>
  );
}

/** Dashed tile at the end of the grid for adding another apartment. */
export function AddBuildingCard({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" className="gw-bld-card gw-bld-add" onClick={onClick} style={{ animationDelay: `${count * 70}ms` }}>
      <span className="gw-bld-plus" aria-hidden="true">
        +
      </span>
      <strong>Add apartment</strong>
      <span className="gw-bld-tenant">New building</span>
    </button>
  );
}

export function BuildingStyles() {
  return <style>{css}</style>;
}

const css = `
.gw-bld-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  grid-auto-rows: 1fr;
  gap: 14px;
}
.gw-bld-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 14px 10px 14px;
  border-radius: 16px;
  background: var(--gw-item-surface);
  text-align: center;
  position: relative;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  animation: gw-bld-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}
.gw-bld-card:before {
  content: "";
  position: absolute;
  left: 18px; right: 18px; top: 0;
  height: 3px;
  border-radius: 0 0 4px 4px;
  background: var(--bld-accent);
  opacity: 0.85;
}
.gw-bld-card:hover {
  transform: translateY(-4px);
  background: var(--gw-hover);
  box-shadow: 0 14px 26px -18px var(--gw-panel-shadow);
}
.gw-bld-card[data-status="overdue"] {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bld-accent) 45%, transparent);
}
.gw-bld-svg { width: 100%; max-width: 150px; height: auto; overflow: visible; }
.gw-bld-card strong { font-size: 13px; font-weight: 600; margin-top: 4px; }
.gw-bld-card strong, .gw-bld-property, .gw-bld-tenant, .gw-bld-foot > span {
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gw-bld-property { font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--gw-muted); margin-top: 4px; margin-bottom: -4px; }
/* Property picker above the buildings: scrolls sideways on narrow screens instead of overflowing. */
.gw-prop-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px; margin: -2px; }
.gw-prop-tabs::-webkit-scrollbar { display: none; }
.gw-prop-tabs button {
  flex: none; display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px;
  font-size: 12px !important; background: var(--gw-item-surface) !important; color: var(--gw-ink);
}
.gw-prop-tabs button span { font-size: 10px; color: var(--gw-muted); }
.gw-prop-tabs button[aria-pressed="true"] { background: var(--gw-button) !important; color: var(--gw-button-ink) !important; }
.gw-prop-tabs button[aria-pressed="true"] span { color: inherit; opacity: 0.7; }
.gw-bld-tenant { font-size: 11px; color: var(--gw-muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gw-bld-foot { display: flex; flex-direction: column; align-items: center; gap: 5px; margin-top: auto; padding-top: 8px; max-width: 100%; font-size: 11px; color: var(--gw-muted); }
.gw-bld-body { transform-box: fill-box; transform-origin: 50% 100%; animation: gw-bld-grow 0.7s cubic-bezier(0.2, 0.9, 0.25, 1.1) both; }
.gw-bld-card:hover .gw-bld-body { animation: gw-bld-bounce 0.5s ease; }
.gw-bld-lit { fill: ${LIT}; filter: drop-shadow(0 0 3px ${LIT}); animation: gw-bld-flicker 4.5s ease-in-out infinite; }
.gw-bld-paid { fill: ${PAID_LIT}; filter: drop-shadow(0 0 3px color-mix(in srgb, ${PAID_LIT} 80%, transparent)); animation: gw-bld-flicker 4.5s ease-in-out infinite; }
.gw-bld-dim { fill: color-mix(in srgb, var(--gw-ink) 16%, transparent); }
.gw-bld-alert { fill: color-mix(in srgb, ${ALERT} 70%, transparent); animation: gw-bld-pulse 1.8s ease-in-out infinite; }
.gw-bld-blink { animation: gw-bld-pulse 1.4s ease-in-out infinite; }
.gw-bld-pop { transform-box: fill-box; transform-origin: center; animation: gw-bld-pop 0.5s 0.6s cubic-bezier(0.3, 1.6, 0.5, 1) both; }
.gw-bld-legend { display: flex; flex-wrap: nowrap; gap: 8px; font-size: 9px; line-height: 1; color: var(--gw-muted); white-space: nowrap; }
.gw-bld-legend span { display: inline-flex; align-items: center; gap: 3px; }
.gw-bld-legend i { width: 7px; height: 7px; border-radius: 2px; display: inline-block; flex: none; }
.gw-bld-owed { color: var(--color-destructive, #dc2626); font-weight: 500; }
.gw-bld-credit { color: var(--gw-accent); font-weight: 500; }
.gw-bld-add { justify-content: center; min-height: 190px; border: 1.5px dashed var(--gw-line); background: transparent; color: var(--gw-muted); }
.gw-bld-add:before { display: none; }
.gw-bld-add:hover { color: var(--gw-ink); border-color: var(--gw-accent); }
.gw-bld-plus { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font-size: 26px; line-height: 1; background: var(--gw-item-surface); margin-bottom: 8px; transition: transform 0.25s ease; }
.gw-bld-add:hover .gw-bld-plus { transform: rotate(90deg) scale(1.08); }
@keyframes gw-bld-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes gw-bld-grow { from { transform: scaleY(0.2); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
@keyframes gw-bld-bounce { 0%,100% { transform: scale(1); } 40% { transform: scale(1.04, 0.97); } 70% { transform: scale(0.99, 1.02); } }
@keyframes gw-bld-flicker { 0%,100% { opacity: 1; } 45% { opacity: 0.8; } 50% { opacity: 1; } 78% { opacity: 0.88; } }
@keyframes gw-bld-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes gw-bld-pop { from { transform: scale(0); } to { transform: scale(1); } }
@media (max-width: 700px) {
  .gw-bld-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .gw-bld-card { padding: 12px 6px; }
}
@media (prefers-reduced-motion: reduce) {
  .gw-bld-card, .gw-bld-body, .gw-bld-lit, .gw-bld-paid, .gw-bld-alert, .gw-bld-blink, .gw-bld-pop { animation: none !important; }
  .gw-bld-card:hover { transform: none; }
}
`;
