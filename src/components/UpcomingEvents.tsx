import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api/http";
import { StatusBadge, colors, type StatusTone } from "./ui";

type SidebarEvent = {
  id: string;
  startDateTime: string;
  status: "UNBOOKED" | "OFFERED" | "CONFIRMED";
  venue: { id: string; name: string | null; postcode?: string };
  artist: { id: string; name: string } | null;
};

type Portal = "artist" | "admin" | "venue";

function toneFor(status: SidebarEvent["status"], portal: Portal): StatusTone {
  if (status === "CONFIRMED") return "confirmed";
  if (status === "OFFERED") return portal === "admin" ? "offered" : "pending";
  return portal === "admin" ? "unbooked" : "pending";
}

function titleFor(ev: SidebarEvent, portal: Portal): string {
  if (portal === "artist") {
    return ev.venue.name
      ?? (ev.venue.postcode ? `Area ${ev.venue.postcode}` : "Availability check");
  }
  if (ev.status === "CONFIRMED" && ev.artist) return ev.artist.name;
  return ev.venue.name
    ?? (ev.venue.postcode ? `Area ${ev.venue.postcode}` : "Availability ask");
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

const VIEW_ALL: Record<Portal, { to: string; label: string }> = {
  artist: { to: "/artist/calendar", label: "View all gigs" },
  admin: { to: "/calendar", label: "View all events" },
  venue: { to: "/venue/calendar", label: "View all events" },
};

export default function UpcomingEvents({ portal }: { portal: Portal }) {
  const [events, setEvents] = useState<SidebarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const viewAll = VIEW_ALL[portal];

  useEffect(() => {
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({ from: now, to: future });
    apiGet<SidebarEvent[]>(`/events?${params}`)
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
        );
        // Only real venue / offer / confirmed bookings — no private-booking style rows
        setEvents(sorted.slice(0, 5));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        marginTop: 12,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
      }}
    >
      <div style={{ height: 1, background: colors.border, margin: "8px 4px 14px" }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: colors.textSubtle,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          padding: "0 4px",
          marginBottom: 8,
        }}
      >
        Upcoming
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {loading && (
          <div style={{ fontSize: 12, color: colors.textSubtle, padding: "0 4px" }}>Loading…</div>
        )}

        {!loading && events.length === 0 && (
          <div style={{ fontSize: 12, color: colors.textSubtle, padding: "0 4px" }}>
            No upcoming events
          </div>
        )}

        {!loading && events.length > 0 && (
          <div style={{ display: "grid", gap: 8 }}>
            {events.map((ev) => {
              const tone = toneFor(ev.status, portal);
              const bar =
                tone === "confirmed"
                  ? colors.infoDot
                  : tone === "pending" || tone === "offered"
                    ? colors.warningDot
                    : colors.infoDot;
              return (
                <div
                  key={ev.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `3px solid ${bar}`,
                    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.03)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: colors.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {titleFor(ev, portal)}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 3 }}>
                    {formatWhen(ev.startDateTime)}
                  </div>
                  <StatusBadge tone={tone} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link
        to={viewAll.to}
        style={{
          display: "block",
          marginTop: 14,
          padding: "0 4px",
          fontSize: 13,
          fontWeight: 600,
          color: colors.brand,
          textDecoration: "none",
        }}
      >
        {viewAll.label} →
      </Link>
    </div>
  );
}
