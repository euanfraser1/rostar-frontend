import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, apiPost, apiPatch } from "../api/http";

type Venue = { id: string; name: string; postcode: string };
type Artist = { id: string; name: string };
type CreatedEvent = { id: string; startDateTime: string };

type CreateEventBody = {
  venueId: string;
  startDateTime: string;
  endDateTime: string;
  venueFee?: string;
  artistFee?: string;
  rostarCut?: string;
  notes?: string;
  repeatWeeklyCount?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSummaryDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(start: string, end: string): string {
  if (!start || !end) return "—";
  const diff =
    (new Date(`1970-01-01T${end}`).getTime() -
      new Date(`1970-01-01T${start}`).getTime()) /
    (1000 * 60 * 60);
  if (diff <= 0) return `${start} – ${end}`;
  const hrs = diff % 1 === 0 ? diff.toFixed(0) : diff.toFixed(1);
  return `${start} – ${end} (${hrs}h)`;
}

function parseFee(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

function fmtGBP(n: number): string {
  return `£${n.toFixed(2)}`;
}

// ── Small reusable UI pieces ───────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        width: 42,
        height: 24,
        borderRadius: 12,
        background: checked ? "#c41e3a" : "#d1d5db",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 4,
          left: checked ? 22 : 4,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.18s",
          display: "block",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 20px",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <span style={{ color: "#6b7280", display: "flex" }}>{icon}</span>
      <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{title}</span>
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const sz = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IconBuilding() {
  return <svg {...sz}><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4" /></svg>;
}
function IconUser() {
  return <svg {...sz}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconCalendar() {
  return <svg {...sz}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function IconPound() {
  return <svg {...sz}><line x1="4" y1="18" x2="20" y2="18" /><path d="M8 18V9a4 4 0 018 0v1" /><path d="M6 14h8" /></svg>;
}
function IconCreditCard() {
  return <svg {...sz}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
}
function IconNote() {
  return <svg {...sz}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}
function IconRepeat() {
  return <svg {...sz}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg>;
}
function IconInfo() {
  return <svg {...sz}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
function IconClock() {
  return <svg {...sz}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}

// ── Input styles ──────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  color: "#111827",
  boxSizing: "border-box",
  outline: "none",
  background: "#fff",
};

const labelBase: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 13,
  fontWeight: 500,
  color: "#374151",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function NewEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venueError, setVenueError] = useState<string | null>(null);

  // Form state
  const prefillDate = searchParams.get("date") ?? "";
  const prefillVenueId = searchParams.get("venueId") ?? "";
  const [venueId, setVenueId] = useState(prefillVenueId);
  const [artistId, setArtistId] = useState("");
  const [date, setDate] = useState(prefillDate);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("22:00");
  const [venueFee, setVenueFee] = useState("");
  const [artistFee, setArtistFee] = useState("");
  const [rostarCut, setRostarCut] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Unpaid");
  const [depositAmount, setDepositAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatCount, setRepeatCount] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<Venue[]>("/venues"),
      apiGet<Artist[]>("/artists"),
    ])
      .then(([v, a]) => {
        setVenues([...v].sort((a, b) => a.name.localeCompare(b.name)));
        setArtists([...a].sort((a, b) => a.name.localeCompare(b.name)));
        setLoadingVenues(false);
      })
      .catch((e) => {
        setVenueError(String(e));
        setLoadingVenues(false);
      });
  }, []);

  function buildIso(d: string, t: string): string {
    return new Date(`${d}T${t}`).toISOString();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!venueId) return setError("Please select a venue.");
    if (!date) return setError("Please choose a date.");
    if (!startTime || !endTime) return setError("Please set start and end times.");

    const startIso = buildIso(date, startTime);
    const endIso = buildIso(date, endTime);

    if (new Date(endIso) <= new Date(startIso)) {
      return setError("End time must be after start time.");
    }

    const body: CreateEventBody = {
      venueId,
      startDateTime: startIso,
      endDateTime: endIso,
    };

    if (venueFee.trim()) body.venueFee = venueFee.trim();
    if (artistFee.trim()) body.artistFee = artistFee.trim();
    if (rostarCut.trim()) body.rostarCut = rostarCut.trim();
    if (notes.trim()) body.notes = notes.trim();

    if (repeatWeekly) {
      const n = parseInt(repeatCount, 10);
      if (!isNaN(n) && n > 1) body.repeatWeeklyCount = n;
    }

    setSubmitting(true);

    const result = await apiPost<CreatedEvent | CreatedEvent[], CreateEventBody>(
      "/events",
      body
    );

    if (!result.ok) {
      setSubmitting(false);
      setError(result.message);
      return;
    }

    // If artist selected, assign via PATCH
    if (artistId) {
      const created = result.data;
      const ids = Array.isArray(created) ? created.map((ev) => ev.id) : [created.id];
      await Promise.all(
        ids.map((id) =>
          apiPatch<unknown, Record<string, unknown>>(`/events/${id}`, { artistId })
        )
      );
    }

    setSubmitting(false);
    navigate("/calendar");
  }

  // Derived summary values
  const selectedVenue = venues.find((v) => v.id === venueId);
  const selectedArtist = artists.find((a) => a.id === artistId);
  const totalFee =
    parseFee(venueFee) + parseFee(artistFee) + parseFee(rostarCut);
  const hasFees = venueFee || artistFee || rostarCut;

  const paymentBadgeColor: Record<string, string> = {
    Unpaid: "#f59e0b",
    Paid: "#22c55e",
    "Partially paid": "#3b82f6",
    "Not applicable": "#9ca3af",
  };

  if (loadingVenues)
    return <p style={{ padding: 24 }}>Loading venues…</p>;
  if (venueError)
    return (
      <p style={{ color: "crimson", padding: 24 }}>
        Failed to load data: {venueError}
      </p>
    );

  return (
    <div>
      {/* Page heading */}
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "#111827" }}>
        Create booking slot
      </h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b7280" }}>
        Create an unbooked event slot for a venue. You can assign an artist now or later.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", gap: 24, alignItems: "flex-start" }}
      >
        {/* ── Left: form sections ─────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Row 1: Venue + Artist */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* 1. Venue */}
            <Card>
              <CardHeader icon={<IconBuilding />} title="1. Venue" />
              <div style={{ padding: "16px 20px" }}>
                <label style={labelBase}>
                  Venue
                  <select
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    disabled={submitting}
                    required
                    style={{ ...inputBase, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 }}
                  >
                    <option value="">Select a venue…</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedVenue && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
                    {selectedVenue.postcode}
                  </p>
                )}
              </div>
            </Card>

            {/* 2. Artist */}
            <Card>
              <CardHeader icon={<IconUser />} title="2. Artist" />
              <div style={{ padding: "16px 20px" }}>
                <label style={labelBase}>
                  Assign artist (optional)
                  <select
                    value={artistId}
                    onChange={(e) => setArtistId(e.target.value)}
                    disabled={submitting}
                    style={{ ...inputBase, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 }}
                  >
                    <option value="">Unassigned</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/artists")}
                  style={{
                    marginTop: 10,
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#3b82f6",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add new artist
                </button>
              </div>
            </Card>
          </div>

          {/* 3. Date & time */}
          <Card>
            <CardHeader icon={<IconCalendar />} title="3. Date & time" />
            <div
              style={{
                padding: "16px 20px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
              <label style={labelBase}>
                Date
                <div style={{ position: "relative" }}>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={submitting}
                    required
                    style={inputBase}
                  />
                </div>
              </label>
              <label style={labelBase}>
                Start time
                <div style={{ position: "relative" }}>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={submitting}
                    required
                    style={inputBase}
                  />
                </div>
              </label>
              <label style={labelBase}>
                End time
                <div style={{ position: "relative" }}>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={submitting}
                    required
                    style={inputBase}
                  />
                </div>
              </label>
            </div>
          </Card>

          {/* 4. Fees */}
          <Card>
            <CardHeader icon={<IconPound />} title="4. Fees" />
            <div style={{ padding: "16px 20px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: 16,
                  alignItems: "end",
                }}
              >
                <label style={labelBase}>
                  Venue fee (£)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 300"
                    value={venueFee}
                    onChange={(e) => setVenueFee(e.target.value)}
                    disabled={submitting}
                    style={inputBase}
                  />
                </label>
                <label style={labelBase}>
                  Artist fee (£)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 200"
                    value={artistFee}
                    onChange={(e) => setArtistFee(e.target.value)}
                    disabled={submitting}
                    style={inputBase}
                  />
                </label>
                <label style={labelBase}>
                  Rostar cut (£)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 100"
                    value={rostarCut}
                    onChange={(e) => setRostarCut(e.target.value)}
                    disabled={submitting}
                    style={inputBase}
                  />
                </label>
                {hasFees && (
                  <div style={{ paddingBottom: 2 }}>
                    <div style={{ fontSize: 11, color: "#c41e3a", fontWeight: 600, marginBottom: 2 }}>
                      Calculated total
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
                      {fmtGBP(totalFee)}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      (Venue fee + Artist fee)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Row: Payment status + Notes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* 5. Payment status */}
            <Card>
              <CardHeader icon={<IconCreditCard />} title="5. Payment status" />
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelBase}>
                  Deposit / payment status
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    disabled={submitting}
                    style={{ ...inputBase, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 }}
                  >
                    <option>Unpaid</option>
                    <option>Partially paid</option>
                    <option>Paid</option>
                    <option>Not applicable</option>
                  </select>
                </label>
                <label style={labelBase}>
                  Deposit amount (£) (optional)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 100.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={submitting}
                    style={inputBase}
                  />
                </label>
              </div>
            </Card>

            {/* 6. Notes */}
            <Card>
              <CardHeader icon={<IconNote />} title="6. Notes" />
              <div style={{ padding: "16px 20px" }}>
                <label style={labelBase}>
                  Notes (optional)
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={submitting}
                    rows={4}
                    placeholder="Any gig notes for Rostar, venue, or artist…"
                    style={{ ...inputBase, resize: "vertical", fontFamily: "inherit" }}
                  />
                </label>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9ca3af" }}>
                  This is internal and won't be shared with the artist.
                </p>
              </div>
            </Card>
          </div>

          {/* 7. Repeat weekly */}
          <Card>
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span style={{ color: "#6b7280", display: "flex" }}>
                <IconRepeat />
              </span>
              <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>
                7. Repeat weekly (optional)
              </span>
              <div style={{ flex: 1 }} />
              <Toggle
                checked={repeatWeekly}
                onChange={setRepeatWeekly}
                disabled={submitting}
              />
              <span style={{ fontSize: 14, color: "#6b7280" }}>
                Repeat this slot weekly
              </span>
            </div>

            {repeatWeekly && (
              <div
                style={{
                  padding: "0 20px 16px",
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: 14,
                }}
              >
                <label style={{ ...labelBase, maxWidth: 200 }}>
                  Number of weeks (including this one)
                  <input
                    type="number"
                    min="2"
                    max="52"
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(e.target.value)}
                    disabled={submitting}
                    style={inputBase}
                  />
                </label>
              </div>
            )}
          </Card>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={submitting}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                background: "#fff",
                color: "#374151",
                border: "1px solid #d1d5db",
                fontWeight: 500,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                background: submitting ? "#9ca3af" : "#c41e3a",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting
                ? "Creating…"
                : repeatWeekly
                ? `Create ${repeatCount || 1} weekly slots`
                : "Create gig slot"}
            </button>
          </div>
        </div>

        {/* ── Right: booking summary ──────────────────────────────────────── */}
        <div style={{ width: 280, flexShrink: 0, position: "sticky", top: 24 }}>
          <Card>
            {/* Summary header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "#6b7280", display: "flex" }}>
                  <IconCalendar />
                </span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                  Booking summary
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                Review your slot details before creating.
              </p>
            </div>

            {/* Summary rows */}
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

              <SummaryRow
                label="Venue"
                value={
                  selectedVenue ? (
                    <span>
                      {selectedVenue.name}
                      <br />
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>
                        {selectedVenue.postcode}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>—</span>
                  )
                }
              />

              <SummaryRow
                label="Date"
                value={
                  date ? (
                    formatSummaryDate(date)
                  ) : (
                    <span style={{ color: "#9ca3af" }}>—</span>
                  )
                }
              />

              <SummaryRow
                label="Time"
                value={
                  startTime && endTime ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <IconClock />
                      {formatTimeRange(startTime, endTime)}
                    </span>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>—</span>
                  )
                }
              />

              <SummaryRow
                label="Artist"
                value={
                  selectedArtist ? (
                    selectedArtist.name
                  ) : (
                    <span style={{ color: "#9ca3af" }}>Unassigned</span>
                  )
                }
              />

              {/* Fees */}
              <div
                style={{
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: 12,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  Fees
                </div>
                <SummaryRow
                  label="Venue fee"
                  value={venueFee ? fmtGBP(parseFee(venueFee)) : <span style={{ color: "#9ca3af" }}>—</span>}
                />
                <div style={{ marginTop: 8 }}>
                  <SummaryRow
                    label="Artist fee"
                    value={artistFee ? fmtGBP(parseFee(artistFee)) : <span style={{ color: "#9ca3af" }}>—</span>}
                  />
                </div>
                <div style={{ marginTop: 8 }}>
                  <SummaryRow
                    label="Rostar cut"
                    value={rostarCut ? fmtGBP(parseFee(rostarCut)) : <span style={{ color: "#9ca3af" }}>—</span>}
                  />
                </div>
                {hasFees && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid #f3f4f6",
                    }}
                  >
                    <SummaryRow
                      label={<strong>Total</strong>}
                      value={<strong>{fmtGBP(totalFee)}</strong>}
                    />
                  </div>
                )}
              </div>

              {/* Payment status */}
              <div
                style={{
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: 12,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  Payment Status
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#374151" }}>Status</span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: `${paymentBadgeColor[paymentStatus] ?? "#9ca3af"}22`,
                      color: paymentBadgeColor[paymentStatus] ?? "#9ca3af",
                    }}
                  >
                    {paymentStatus}
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <SummaryRow
                    label="Deposit"
                    value={depositAmount ? fmtGBP(parseFee(depositAmount)) : <span style={{ color: "#9ca3af" }}>Not set</span>}
                  />
                </div>
              </div>
            </div>

            {/* Info note */}
            <div
              style={{
                margin: "0 16px 16px",
                padding: "10px 12px",
                background: "#f9fafb",
                borderRadius: 8,
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <span style={{ color: "#9ca3af", flexShrink: 0, marginTop: 1, display: "flex" }}>
                <IconInfo />
              </span>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                You can <strong>edit these details</strong> at any time after the slot has been created.
              </p>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}

// ── Summary row helper ────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 13, color: "#6b7280", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          color: "#111827",
          textAlign: "right",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}
