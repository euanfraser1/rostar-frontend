import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/http";

type AvailabilityItem = {
  id: string;
  status: string;
  createdAt: string;
  event: {
    id: string;
    startDateTime: string;
    endDateTime: string;
    status: string;
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

export default function ArtistInbox() {
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [termsByOffer, setTermsByOffer] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [avail, offs] = await Promise.all([
        apiGet<AvailabilityItem[]>("/artists/me/availability-requests"),
        apiGet<OfferItem[]>("/artists/me/offers"),
      ]);
      setAvailability(avail);
      setOffers(offs);
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

  return (
    <div>
      <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Inbox</h1>
      <p style={{ margin: "0 0 20px", opacity: 0.7, fontSize: 14 }}>
        Availability checks and gig offers from Rostar.
      </p>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {actionError && <p style={{ color: "crimson" }}>{actionError}</p>}
      {loading && <p style={{ opacity: 0.6 }}>Loading…</p>}
      {empty && (
        <p style={{ opacity: 0.65 }}>Nothing waiting for you right now.</p>
      )}

      {offers.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Gig offers</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {offers.map((o) => {
              const busy = busyId === o.id;
              return (
                <div
                  key={o.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    borderLeft: "4px solid #fdbc00",
                    background: "#fff8e1",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                    {o.event.venue.name}
                  </div>
                  <div style={{ fontSize: 13, display: "grid", gap: 3 }}>
                    <div>{formatWhen(o.event.startDateTime)} – {new Date(o.event.endDateTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</div>
                    <div>Location: {o.event.venue.postcode}</div>
                    {o.event.artistFee && <div>Artist fee: <strong>{formatFee(o.event.artistFee)}</strong></div>}
                    {o.event.venue.phone && <div>Venue phone: {o.event.venue.phone}</div>}
                    {o.event.notes && <div>Notes: {o.event.notes}</div>}
                  </div>

                  <div style={{
                    marginTop: 12, padding: 10, borderRadius: 8,
                    background: "rgba(255,255,255,0.8)", fontSize: 12, lineHeight: 1.45, opacity: 0.9,
                  }}>
                    {OFFER_TERMS}
                  </div>

                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={!!termsByOffer[o.id]}
                      disabled={busy}
                      onChange={(e) => setTermsByOffer((prev) => ({ ...prev, [o.id]: e.target.checked }))}
                      style={{ marginTop: 2 }}
                    />
                    <span>I agree to the booking terms</span>
                  </label>

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => respondOffer(o.id, true)}
                      disabled={busy}
                      style={{
                        padding: "7px 16px", borderRadius: 6, fontWeight: 600, fontSize: 13,
                        background: busy ? "#999" : "#1a7a4a", color: "#fff", border: "none",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respondOffer(o.id, false)}
                      disabled={busy}
                      style={{
                        padding: "7px 16px", borderRadius: 6, fontWeight: 600, fontSize: 13,
                        background: "transparent", color: "#a10000",
                        border: "1px solid #a10000",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {availability.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Availability requests</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {availability.map((r) => {
              const busy = busyId === r.id;
              return (
                <div
                  key={r.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    borderLeft: "4px solid #5a82c4",
                    background: "#eef4fb",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    Are you free?
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
                        width: 40, height: 36, borderRadius: 6, fontWeight: 700, fontSize: 16,
                        background: busy ? "#999" : "#1a7a4a", color: "#fff", border: "none",
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
                        width: 40, height: 36, borderRadius: 6, fontWeight: 700, fontSize: 16,
                        background: busy ? "#ccc" : "#a10000", color: "#fff", border: "none",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
