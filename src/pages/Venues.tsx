import { useEffect, useState } from "react";
import { apiGet } from "../api/http";

type Venue = {
  id: string;
  name: string;
  postcode?: string | null;
  city?: string | null;
};

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Venue[]>("/venues")
      .then(setVenues)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Venues</h1>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!error && venues.length === 0 && <p>No venues found (or still loading)…</p>}

      <ul>
        {venues.map((v) => (
          <li key={v.id}>
            <strong>{v.name}</strong>
            {v.postcode ? ` — ${v.postcode}` : ""}
            {v.city ? ` — ${v.city}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
