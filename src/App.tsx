import { useEffect, useState } from "react";
import { apiGet } from "./api/http";

type Health = { ok: boolean; db: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Health>("/health")
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Rostar Frontend</h1>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!error && !health && <p>Checking backend…</p>}

      {health && (
        <pre style={{ background: "#f6f6f6", padding: 12 }}>
          {JSON.stringify(health, null, 2)}
        </pre>
      )}
    </div>
  );
}
