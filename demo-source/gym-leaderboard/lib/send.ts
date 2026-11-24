/* In the demo there is no server: requests are handled in the browser by lib/demo-store.ts. */
import { localSend } from "@/lib/demo-store";

export const send = (method: string, url: string, body?: unknown) => localSend(method, url, body);
