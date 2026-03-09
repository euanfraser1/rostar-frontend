import { useEffect, useState } from "react";
import { apiGet } from "../api/http";

type Artist = { id: string; name: string };

export default function Artists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Artist[]>("/artists")
      .then(setArtists)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Artists</h1>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!error && artists.length === 0 && <p>No artists found (or still loading)…</p>}

      <ul>
        {artists.map((a) => (
          <li key={a.id}>{a.name}</li>
        ))}
      </ul>
    </div>
  );
}
