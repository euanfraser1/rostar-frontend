import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/http";

type Artist = { id: string; name: string };

export default function Artists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Artist[]>("/artists")
      .then(setArtists)
      .catch((e) => setError(String(e)));
  }, []);

  async function handleAddArtist(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const name = newName.trim();
    if (!name) {
      setFormError("Please enter an artist name.");
      return;
    }
    const result = await apiPost<Artist, { name: string }>("/artists", { name });
    if (result.ok) {
      setArtists((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setFormSuccess("Artist added.");
    } else {
      setFormError(result.message);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Artists</h1>

      <form
        onSubmit={handleAddArtist}
        style={{
          marginBottom: 24,
          padding: 16,
          background: "#f5f5f5",
          borderRadius: 8,
          maxWidth: 400,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Add artist</h2>
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="artist-name" style={{ display: "block", marginBottom: 4, fontSize: 14 }}>
            Artist name
          </label>
          <input
            id="artist-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc" }}
            placeholder="e.g. Jack Doyle"
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
          Add artist
        </button>
      </form>

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
