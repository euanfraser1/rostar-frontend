import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api/http";
import { Button, Card, IconCircle, PageHeader, colors } from "../components/ui";

type AvailabilityItem = {
  id: string;
  status: string;
  createdAt: string;
  event: {
    id: string;
    startDateTime: string;
    endDateTime: string;
    status: string;
    venueName: string;
    postcodePrefix: string;
  };
};

type OfferItem = {
  id: string;
  status: string;
  createdAt: string;
  event: {
    id: string;
    startDateTime: string;
    endDateTime: string;
    status: string;
    artistFee: string | null;
    notes: string | null;
    venue: { id: string; name: string; postcode: string; phone: string | null };
  };
};

type GigEvent = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  status: "UNBOOKED" | "OFFERED" | "CONFIRMED";
  venue: { id: string; name: string | null; postcode: string };
};

const OFFER_TERMS =
  "By accepting this gig you agree to Rostar Live’s booking terms: arrive on time, perform the agreed set length, " +
  "and notify Rostar immediately of any issues. Payment is subject to venue confirmation that the gig took place, " +
  "under your self-billing agreement with Rostar Live Ltd.";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFee(fee: string | null) {
  if (!fee) return null;
  return `£${Number(fee).toFixed(2)}`;
}

function relativeFromNow(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days from now`;
}

function CalendarGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function InboxGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}

function EmptyInboxIllustration() {
  return (
    <div
      style={{
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: colors.brandSoftBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        margin: "0 auto 20px",
      }}
    >
      <span style={{ position: "absolute", top: 14, left: 22, color: colors.brand, opacity: 0.45, fontSize: 12 }}>✦</span>
      <span style={{ position: "absolute", top: 28, right: 18, color: colors.brand, opacity: 0.35, fontSize: 10 }}>✦</span>
      <span style={{ position: "absolute", bottom: 22, right: 26, color: colors.brand, opacity: 0.4, fontSize: 11 }}>✦</span>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
        <rect x="14" y="22" width="44" height="32" rx="6" fill="#f7c0cb" />
        <path d="M14 30l22 14 22-14" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="26" y="16" width="20" height="24" rx="3" fill="#fff" stroke={colors.brand} strokeWidth="2" />
        <circle cx="36" cy="28" r="7" fill={colors.brandSoft} />
        <path d="M33 28.5l2.2 2.2 4-4" stroke={colors.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function ArtistInbox() {
  const navigate = useNavigate();
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [upcoming, setUpcoming] = useState<GigEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [termsByOffer, setTermsByOffer] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const eventParams = new URLSearchParams({
        from: now.toISOString(),
        to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const [avail, offs, events] = await Promise.all([
        apiGet<AvailabilityItem[]>("/artists/me/availability-requests"),
        apiGet<OfferItem[]>("/artists/me/offers"),
        apiGet<GigEvent[]>(`/events?${eventParams}`),
      ]);
      setAvailability(avail);
      setOffers(offs);
      const sorted = [...events].sort(
        (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      );
      setUpcoming(sorted);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function respondAvailability(id: string, accept: boolean) {
    setBusyId(id);
    setActionError(null);
    const result = await apiPost<unknown, { accept: boolean }>(
      `/availability-requests/${id}/respond`,
      { accept }
    );
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setAvailability((prev) => prev.filter((r) => r.id !== id));
    window.dispatchEvent(new Event("artist-inbox-changed"));
  }

  async function respondOffer(id: string, accept: boolean) {
    if (accept && !termsByOffer[id]) {
      setActionError("Please accept the terms before taking this gig.");
      return;
    }
    setBusyId(id);
    setActionError(null);
    const result = await apiPost<unknown, { accept: boolean; acceptedTerms?: boolean }>(
      `/offers/${id}/respond`,
      accept ? { accept: true, acceptedTerms: true } : { accept: false }
    );
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setOffers((prev) => prev.filter((o) => o.id !== id));
    window.dispatchEvent(new Event("artist-inbox-changed"));
  }

  const empty = !loading && availability.length === 0 && offers.length === 0;
  const pendingCount = availability.length + offers.length;
  const now = new Date();
  const monthGigs = upcoming.filter((ev) => {
    const d = new Date(ev.startDateTime);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const nextGig =
    upcoming.find((ev) => ev.status === "CONFIRMED" || ev.status === "OFFERED") ??
    upcoming[0] ??
    null;

  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle="Availability checks and gig offers from Rostar."
      />

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {actionError && <p style={{ color: "crimson" }}>{actionError}</p>}
      {loading && <p style={{ opacity: 0.6 }}>Loading…</p>}

      {empty && (
        <Card style={{ textAlign: "center", padding: "48px 24px", marginBottom: 16 }}>
          <EmptyInboxIllustration />
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
            You're all caught up!
          </div>
          <p
            style={{
              margin: "0 auto 22px",
              maxWidth: 420,
              fontSize: 14,
              color: colors.textMuted,
              lineHeight: 1.5,
            }}
          >
            No availability checks or gig offers waiting. We'll notify you here when Rostar sends the next one.
          </p>
          <Button icon={<CalendarGlyph size={16} />} onClick={() => navigate("/artist/calendar")}>
            View calendar
          </Button>
        </Card>
      )}

      {offers.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px", color: colors.text }}>Gig offers</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {offers.map((o) => {
              const busy = busyId === o.id;
              return (
                <Card
                  key={o.id}
                  padding="14px 16px"
                  style={{
                    borderLeft: `4px solid ${colors.warningDot}`,
                    background: "#fff8e1",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                    {o.event.venue.name}
                  </div>
                  <div style={{ fontSize: 13, display: "grid", gap: 3, color: "#374151" }}>
                    <div>
                      {formatWhen(o.event.startDateTime)} –{" "}
                      {new Date(o.event.endDateTime).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div>Location: {o.event.venue.postcode}</div>
                    {o.event.artistFee && (
                      <div>
                        Artist fee: <strong>{formatFee(o.event.artistFee)}</strong>
                      </div>
                    )}
                    {o.event.venue.phone && <div>Venue phone: {o.event.venue.phone}</div>}
                    {o.event.notes && <div>Notes: {o.event.notes}</div>}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 10,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.8)",
                      fontSize: 12,
                      lineHeight: 1.45,
                      opacity: 0.9,
                    }}
                  >
                    {OFFER_TERMS}
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      marginTop: 10,
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!termsByOffer[o.id]}
                      disabled={busy}
                      onChange={(e) =>
                        setTermsByOffer((prev) => ({ ...prev, [o.id]: e.target.checked }))
                      }
                      style={{ marginTop: 2 }}
                    />
                    <span>I agree to the booking terms</span>
                  </label>

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <Button
                      onClick={() => respondOffer(o.id, true)}
                      disabled={busy}
                      style={{
                        background: busy ? "#999" : colors.success,
                        padding: "7px 16px",
                        fontSize: 13,
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => respondOffer(o.id, false)}
                      disabled={busy}
                      style={{
                        color: colors.danger,
                        borderColor: colors.danger,
                        padding: "7px 16px",
                        fontSize: 13,
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {availability.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px", color: colors.text }}>
            Availability requests
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {availability.map((r) => {
              const busy = busyId === r.id;
              return (
                <Card
                  key={r.id}
                  padding="14px 16px"
                  style={{
                    borderLeft: `4px solid ${colors.infoDot}`,
                    background: "#eef4fb",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {r.event.venueName}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    {formatWhen(r.event.startDateTime)} –{" "}
                    {new Date(r.event.endDateTime).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                    Area: {r.event.postcodePrefix}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => respondAvailability(r.id, true)}
                      disabled={busy}
                      title="Available"
                      style={{
                        width: 40,
                        height: 36,
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 16,
                        background: busy ? "#999" : colors.success,
                        color: "#fff",
                        border: "none",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => respondAvailability(r.id, false)}
                      disabled={busy}
                      title="Not available"
                      style={{
                        width: 40,
                        height: 36,
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 16,
                        background: busy ? "#ccc" : colors.danger,
                        color: "#fff",
                        border: "none",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginTop: empty ? 0 : 8,
          }}
        >
          <Card>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: colors.brand,
                marginBottom: 14,
              }}
            >
              Next gig
            </div>
            {nextGig ? (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <IconCircle>
                  <CalendarGlyph />
                </IconCircle>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: colors.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {nextGig.venue.name
                      ?? (nextGig.venue.postcode
                        ? `Area ${nextGig.venue.postcode}`
                        : "Upcoming gig")}
                  </div>
                  <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                    {formatWhen(nextGig.startDateTime)}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textSubtle, marginTop: 2 }}>
                    {relativeFromNow(nextGig.startDateTime)}
                  </div>
                  <Button
                    variant="secondary"
                    style={{ marginTop: 12, padding: "7px 14px", fontSize: 13 }}
                    onClick={() => navigate("/artist/calendar")}
                  >
                    View details
                  </Button>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: colors.textMuted }}>
                No upcoming gigs yet.
              </p>
            )}
          </Card>

          <Card>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: colors.brand,
                marginBottom: 14,
              }}
            >
              This month
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <IconCircle>
                  <CalendarGlyph />
                </IconCircle>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>
                    {monthGigs.length}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                    Upcoming gigs
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  borderLeft: `1px solid ${colors.border}`,
                  paddingLeft: 12,
                }}
              >
                <IconCircle tone="success">
                  <InboxGlyph />
                </IconCircle>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>
                    {pendingCount}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                    Requests awaiting response
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
