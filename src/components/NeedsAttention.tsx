import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiGet } from "../api/http";
import { colors, statusTone } from "./ui";

export const NEEDS_ATTENTION_CHANGED = "needs-attention-changed";

export function notifyNeedsAttentionChanged() {
  window.dispatchEvent(new Event(NEEDS_ATTENTION_CHANGED));
}

type AttentionKind = "FIND_ARTIST" | "SEND_OFFER";

type AttentionItem = {
  kind: AttentionKind;
  eventId: string;
  startDateTime: string;
  venueName: string;
};

const PREVIEW_LIMIT = 5;

const COPY: Record<AttentionKind, { title: string; badge: string }> = {
  FIND_ARTIST: { title: "Find artist for gig", badge: "Unbooked" },
  SEND_OFFER: { title: "Send offers to available artists", badge: "Offer" },
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function localDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${weekday} ${pad2(d.getDate())} ${month}`;
}

function CalendarMark() {
  return (
    <span
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: colors.brandSoft,
        color: colors.brand,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    </span>
  );
}

export default function NeedsAttention() {
  const location = useLocation();
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      try {
        const data = await apiGet<AttentionItem[]>(
          `/needs-attention?from=${encodeURIComponent(start.toISOString())}`
        );
        if (mounted) setItems(data);
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    const refresh = () => { void load(); };
    window.addEventListener(NEEDS_ATTENTION_CHANGED, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      mounted = false;
      window.removeEventListener(NEEDS_ATTENTION_CHANGED, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [location.pathname]);

  const visible = expanded ? items : items.slice(0, PREVIEW_LIMIT);
  const hasMore = items.length > PREVIEW_LIMIT;

  return (
    <div style={{ marginTop: 8, paddingBottom: 8 }}>
      <div style={{ height: 1, background: colors.border, margin: "8px 4px 14px" }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 4px",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: colors.textSubtle,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Needs attention
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 13,
              fontWeight: 600,
              color: colors.brand,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {expanded ? "Show less" : "View all"}
          </button>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: colors.textSubtle, padding: "0 4px" }}>Loading…</div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ fontSize: 12, color: colors.textSubtle, padding: "0 4px" }}>
          No gigs need attention
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
          {visible.map((item) => {
            const copy = COPY[item.kind];
            const tone = item.kind === "SEND_OFFER" ? statusTone.offered : statusTone.unbooked;
            const dateKey = localDateKey(item.startDateTime);
            return (
              <Link
                key={item.eventId}
                to={`/calendar?date=${dateKey}&event=${item.eventId}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 4px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "inherit",
                  minWidth: 0,
                }}
              >
                <CalendarMark />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: colors.text,
                      lineHeight: 1.3,
                    }}
                  >
                    {copy.title}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 2,
                      fontSize: 12,
                      color: colors.textMuted,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.venueName}
                    <br />
                    {formatDay(item.startDateTime)}
                  </span>
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    marginTop: 1,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    background: tone.bg,
                    color: tone.color,
                    lineHeight: 1.4,
                  }}
                >
                  {copy.badge}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
