import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/http";

type Venue = {
  id: string;
  name: string;
  postcode?: string | null;
  city?: string | null;
};

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPostcode, setNewPostcode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Venue[]>("/venues")
      .then(setVenues)
      .catch((e) => setError(String(e)));
  }, []);

  async function handleAddVenue(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const name = newName.trim();
    const postcode = newPostcode.trim();
    if (!name) {
      setFormError("Please enter a venue name.");
      return;
    }
    if (!postcode) {
      setFormError("Please enter a postcode.");
      return;
    }
    const result = await apiPost<Venue, { name: string; postcode: string }>("/venues", {
      name,
      postcode,
    });
    if (result.ok) {
      setVenues((prev) =>
        [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName("");
      setNewPostcode("");
      setFormSuccess("Venue added.");
    } else {
      setFormError(result.message);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Venues</h1>

      <form
        onSubmit={handleAddVenue}
        style={{
          marginBottom: 24,
          padding: 16,
          background: "#f5f5f5",
          borderRadius: 8,
          maxWidth: 400,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Add venue</h2>
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="venue-name" style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
            Venue name
          </label>
          <input
            id="venue-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc" }}
            placeholder="e.g. The Red Lion"
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="venue-postcode" style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
            Postcode
          </label>
          <input
            id="venue-postcode"
            type="text"
            value={newPostcode}
            onChange={(e) => setNewPostcode(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc" }}
            placeholder="e.g. SW1A 1AA"
          />
        </div>
        {formError && <p style={{ color: "crimson", margin: "0 0 8px 0", fontSize: 14 }}>{formError}</p>}
        {formSuccess && <p style={{ color: "green", margin: "0 0 8px 0", fontSize: 14 }}>{formSuccess}</p>}
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            background: "#c41e3a",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Add venue
        </button>
      </form>

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
