import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, apiPost } from "../api/http";

type Venue = { id: string; name: string; postcode: string };

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

type CreatedEvent = { id: string; startDateTime: string };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 14,
  fontWeight: 500,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#a10000",
  margin: "8px 0 4px",
};

export default function NewEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venueError, setVenueError] = useState<string | null>(null);

  // Form fields
  const [venueId, setVenueId] = useState("");
  // Pre-fill date from ?date= query param (YYYY-MM-DD) if coming from calendar
  const prefillDate = searchParams.get("date") ?? "";
  const [date, setDate] = useState(prefillDate);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("22:00");
  const [venueFee, setVenueFee] = useState("");
  const [artistFee, setArtistFee] = useState("");
  const [rostarCut, setRostarCut] = useState("");
  const [notes, setNotes] = useState("");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatCount, setRepeatCount] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Venue[]>("/venues")
      .then((data) => {
        setVenues([...data].sort((a, b) => a.name.localeCompare(b.name)));
        setLoadingVenues(false);
      })
      .catch((e) => {
        setVenueError(String(e));
        setLoadingVenues(false);
      });
  }, []);

  function buildIso(d: string, t: string): string {
    // Combine date (YYYY-MM-DD) + time (HH:MM) into a local datetime, then ISO
    return new Date(`${d}T${t}`).toISOString();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

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
      if (!Number.isNaN(n) && n > 1) body.repeatWeeklyCount = n;
    }

    setSubmitting(true);

    const result = await apiPost<CreatedEvent | CreatedEvent[], CreateEventBody>("/events", body);

    setSubmitting(false);

    if (result.ok) {
      const count = Array.isArray(result.data) ? result.data.length : 1;
      setSuccessMsg(
        count === 1
          ? "Event created — redirecting to calendar…"
          : `${count} weekly events created — redirecting to calendar…`
      );
      setTimeout(() => navigate(`/calendar`), 800);
      return;
    }

    setError(result.message);
  }

  if (loadingVenues) return <p>Loading venues…</p>;
  if (venueError) return <p style={{ color: "crimson" }}>Failed to load venues: {venueError}</p>;

  return (
    <div>
      <p style={{ color: "#555", fontSize: 14, marginTop: -8, marginBottom: 20 }}>
        Create an unbooked event slot for a venue. You can assign an artist later.
      </p>

      {error && (
        <p style={{ color: "crimson", background: "#fff0f0", padding: "10px 14px", borderRadius: 8 }}>
          {error}
        </p>
      )}
      {successMsg && (
        <p style={{ color: "#2a7a2a", background: "#f0fff0", padding: "10px 14px", borderRadius: 8 }}>
          {successMsg}
        </p>
      )}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, maxWidth: 520 }}>

        {/* Venue */}
        <p style={sectionHeadingStyle}>Venue</p>
        <label style={labelStyle}>
          Venue
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            disabled={submitting}
            style={inputStyle}
            required
          >
            <option value="">Select a venue…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.postcode}
              </option>
            ))}
          </select>
        </label>

        {/* Date & time */}
        <p style={sectionHeadingStyle}>Date & Time</p>
        <label style={labelStyle}>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
            style={inputStyle}
            required
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            Start time
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={submitting}
              style={inputStyle}
              required
            />
          </label>
          <label style={labelStyle}>
            End time
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={submitting}
              style={inputStyle}
              required
            />
          </label>
        </div>

        {/* Fees */}
        <p style={sectionHeadingStyle}>Fees (optional)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            Venue fee (£)
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 300"
              value={venueFee}
              onChange={(e) => setVenueFee(e.target.value)}
              disabled={submitting}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Artist fee (£)
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 200"
              value={artistFee}
              onChange={(e) => setArtistFee(e.target.value)}
              disabled={submitting}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Rostar cut (£)
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 100"
              value={rostarCut}
              onChange={(e) => setRostarCut(e.target.value)}
              disabled={submitting}
              style={inputStyle}
            />
          </label>
        </div>

        {/* Notes */}
        <p style={sectionHeadingStyle}>Notes (optional)</p>
        <label style={labelStyle}>
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={3}
            placeholder="Any gig notes for Rostar, venue, or artist…"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>

        {/* Repeat */}
        <p style={sectionHeadingStyle}>Weekly Repeat (optional)</p>
        <label
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}
        >
          <input
            type="checkbox"
            checked={repeatWeekly}
            onChange={(e) => setRepeatWeekly(e.target.checked)}
            disabled={submitting}
            style={{ width: 16, height: 16 }}
          />
          Repeat this slot weekly
        </label>

        {repeatWeekly && (
          <label style={labelStyle}>
            Number of weeks (including this one)
            <input
              type="number"
              min="2"
              max="52"
              value={repeatCount}
              onChange={(e) => setRepeatCount(e.target.value)}
              disabled={submitting}
              style={{ ...inputStyle, maxWidth: 120 }}
            />
          </label>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 8,
            padding: "10px 24px",
            borderRadius: 8,
            background: submitting ? "#999" : "#a10000",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: 15,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting
            ? "Creating…"
            : repeatWeekly
            ? `Create ${repeatCount || 1} weekly slots`
            : "Create gig slot"}
        </button>
      </form>
    </div>
  );
}
