import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api/http";

type Artist = { id: string; name: string };
type Venue = { id: string; name: string; postcode?: string | null };

type CreateBookingByNameBody = {
  artistName: string;
  venueName: string;
  postcode: string;
  dateTime: string;
  notes?: string;
};

export default function NewBooking() {
  const navigate = useNavigate();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  const [artistName, setArtistName] = useState("");
  const [venueId, setVenueId] = useState(""); // we’ll map this to name+postcode
  const [dateTimeLocal, setDateTimeLocal] = useState(""); // from datetime-local input
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const venueLookup = useMemo(() => {
    const map = new Map<string, Venue>();
    venues.forEach((v) => map.set(v.id, v));
    return map;
  }, [venues]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([apiGet<Artist[]>("/artists"), apiGet<Venue[]>("/venues")])
      .then(([a, v]) => {
        // optional: sort for nicer UX
        setArtists([...a].sort((x, y) => x.name.localeCompare(y.name)));
        setVenues([...v].sort((x, y) => x.name.localeCompare(y.name)));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function toIsoFromDatetimeLocal(value: string): string {
    // value looks like "2026-02-01T13:30"
    // Convert to a real Date in local time, then send ISO to backend.
    const d = new Date(value);
    return d.toISOString();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const venue = venueLookup.get(venueId);
    if (!venue) return setError("Please choose a venue.");
    if (!artistName) return setError("Please choose an artist.");
    if (!dateTimeLocal) return setError("Please choose a date/time.");
    if (!venue.postcode) return setError("Selected venue is missing a postcode (cannot book by-name).");

    const body: CreateBookingByNameBody = {
      artistName,
      venueName: venue.name,
      postcode: venue.postcode,
      dateTime: toIsoFromDatetimeLocal(dateTimeLocal),
      notes: notes.trim() ? notes.trim() : undefined,
    };

    setSubmitting(true);

    const result = await apiPost<any, CreateBookingByNameBody>("/bookings/by-name", body);

    setSubmitting(false);

    if (result.ok) {
      setSuccessMsg("Booking created ✅");
      // quick redirect back to bookings
      setTimeout(() => navigate("/bookings"), 600);
      return;
    }

    if (result.status === 409) {
      setError("That slot is already booked (artist or venue conflict). Try a different time.");
      return;
    }

    setError(result.message);
  }

  if (loading) return <p>Loading form…</p>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>New Booking</h1>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {successMsg && <p style={{ color: "green" }}>{successMsg}</p>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <label>
          <div style={{ marginBottom: 4 }}>Artist</div>
          <select
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            disabled={submitting}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Select an artist…</option>
            {artists.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <div style={{ marginBottom: 4 }}>Venue</div>
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            disabled={submitting}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Select a venue…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.postcode ? ` — ${v.postcode}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          <div style={{ marginBottom: 4 }}>Date & time</div>
          <input
            type="datetime-local"
            value={dateTimeLocal}
            onChange={(e) => setDateTimeLocal(e.target.value)}
            disabled={submitting}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 4 }}>Notes (optional)</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={3}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{ padding: 10, borderRadius: 8, cursor: submitting ? "not-allowed" : "pointer" }}
        >
          {submitting ? "Creating…" : "Create booking"}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        Tip: If you hit a conflict, you’ll get a friendly 409 message here.
      </p>
    </div>
  );
}
