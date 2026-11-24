/* App-wide settings. Override with environment variables (NEXT_PUBLIC_* are visible in the browser). */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE || "en-US";
/** How receipts write numeric dates like 05/11/2026: "dmy" = day first (most of the world), "mdy" = US. */
export const DATE_ORDER: "dmy" | "mdy" = process.env.DATE_ORDER === "mdy" ? "mdy" : "dmy";
