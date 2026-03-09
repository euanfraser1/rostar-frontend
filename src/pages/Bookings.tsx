import { useEffect, useState } from "react";
import { apiGet } from "../api/http";

type Booking = {
  id: string;
  dateTime: string;
  notes?: string | null;
  artist: { id: string; name: string };
  venue: { id: string; name: string; postcode?: string | null };
};

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Booking[]>("/bookings")
      .then(setBookings)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Bookings</h1>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!error && bookings.length === 0 && <p>No bookings found (or still loading)…</p>}

      <ul>
        {bookings.map((b) => (
          <li key={b.id}>
            <strong>{new Date(b.dateTime).toLocaleString()}</strong> —{" "}
            {b.artist.name} @ {b.venue.name}
            {b.venue.postcode ? ` (${b.venue.postcode})` : ""}
            {b.notes ? ` — ${b.notes}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
