"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageCircle, SendHorizontal } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-shell";
import { UserBadges } from "@/components/ui/user-badge";
import { newId, type Badge, type ChatMessage } from "@/lib/lifts";
import { listMessagesAfter, subscribe } from "@/lib/demo-store";
import { send } from "@/lib/send";

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** Group chat for the whole crew.  */
export function ChatView({ me, badges = [] }: { me: { id: string; name: string }; badges?: Badge[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lastSeq = useRef(0);
  const atBottom = useRef(true);

  /* Phone keyboards: iPhones differ (some shrink the page, some slide the keyboard over it), so while typing,
     chat.css pins the chat to exactly the visible area above the keyboard, read from the Visual Viewport. */
  useEffect(() => {
    if (!typing) return;
    const vv = window.visualViewport;
    const root = document.documentElement;
    const el = box.current;
    const update = () => {
      root.style.setProperty("--vv-top", `${vv ? vv.offsetTop : 0}px`);
      root.style.setProperty("--vv-h", `${vv ? vv.height : window.innerHeight}px`);
      if (el && atBottom.current) el.scrollTop = el.scrollHeight;
    };
    root.classList.add("chat-typing");
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      root.classList.remove("chat-typing");
      if (el && atBottom.current) requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
    };
  }, [typing]);

  const refresh = useCallback(async () => {
    const fresh = listMessagesAfter(lastSeq.current);
    if (fresh.length) {
      lastSeq.current = fresh[fresh.length - 1].seq;
      setMessages((old) => [...old, ...fresh.filter((m) => !old.some((o) => o.id === m.id))]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const off = subscribe(() => void refresh());
    return () => {
      window.clearTimeout(first);
      off();
    };
  }, [refresh]);

  // Keep the newest message in view, unless the person has scrolled up to read older ones.
  useLayoutEffect(() => {
    const el = box.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      await send("POST", "/api/chat", { id: newId("msg"), body });
      setText("");
      atBottom.current = true;
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <GlassPanel className="chat-panel">
      <div className="chat-typing-bar">
        <strong>Crew chat</strong>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => input.current?.blur()}
        >
          Done
        </button>
      </div>
      <div
        ref={box}
        className="chat-box"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {!loaded ? (
          <p className="chat-empty">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="chat-empty">
            <MessageCircle size={22} aria-hidden="true" />
            No messages yet. Say hi to the crew.
          </p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const mine = m.userId === me.id;
            const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            // Name + badges at the start of each run of messages from the same person (yours say "You").
            const showName = newDay || prev.userId !== m.userId;
            return (
              <div key={m.id}>
                {newDay && <p className="chat-day">{dayLabel(m.createdAt)}</p>}
                <div className={`chat-msg ${mine ? "is-mine" : ""}`}>
                  {showName && (
                    <span className="chat-name">
                      {mine ? "You" : m.userName}
                      <UserBadges badges={badges.filter((b) => b.userId === m.userId)} max={3} />
                    </span>
                  )}
                  <div className="chat-bubble">{m.body}</div>
                  <span className="chat-time">{timeLabel(m.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      {error && (
        <p role="alert" className="chat-error">
          {error}
        </p>
      )}
      <form className="chat-form" onSubmit={submit}>
        <input
          ref={input}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          aria-label="Message"
          placeholder="Message the crew"
          value={text}
          maxLength={1000}
          enterKeyHint="send"
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
        />
        {/* preventDefault on press keeps focus in the box, so the keyboard stays up between messages */}
        <button type="submit" aria-label="Send" disabled={!text.trim() || sending} onPointerDown={(e) => e.preventDefault()}>
          <SendHorizontal size={18} aria-hidden="true" />
        </button>
      </form>
    </GlassPanel>
  );
}
