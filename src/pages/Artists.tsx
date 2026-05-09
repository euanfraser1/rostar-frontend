import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/http";

type ArtistUser = { id: string; email: string };
type Artist = { id: string; name: string; user: ArtistUser | null };

type LoginFormState = { email: string; password: string; error: string | null };

export default function Artists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [openLoginPanel, setOpenLoginPanel] = useState<string | null>(null);
  const [loginForms, setLoginForms] = useState<Record<string, LoginFormState>>({});

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
      setArtists((prev) =>
        [...prev, { ...result.data, user: null }].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName("");
      setFormSuccess("Artist added.");
    } else {
      setFormError(result.message);
    }
  }

  function getForm(id: string): LoginFormState {
    return loginForms[id] ?? { email: "", password: "", error: null };
  }

  function patchForm(id: string, patch: Partial<LoginFormState>) {
    setLoginForms((prev) => ({ ...prev, [id]: { ...getForm(id), ...patch } }));
  }

  async function handleCreateLogin(e: React.FormEvent, artist: Artist) {
    e.preventDefault();
    const form = getForm(artist.id);
    patchForm(artist.id, { error: null });

    if (!form.email.trim()) {
      patchForm(artist.id, { error: "Email is required." });
      return;
    }
    if (form.password.length < 6) {
      patchForm(artist.id, { error: "Password must be at least 6 characters." });
      return;
    }

    const result = await apiPost<{ artistId: string; userId: string; email: string }, Record<string, string>>(
      `/artists/${artist.id}/account`,
      { email: form.email.trim().toLowerCase(), password: form.password }
    );

    if (result.ok) {
      setArtists((prev) =>
        prev.map((a) =>
          a.id === artist.id ? { ...a, user: { id: result.data.userId, email: result.data.email } } : a
        )
      );
      setOpenLoginPanel(null);
    } else {
      patchForm(artist.id, { error: result.message });
    }
  }

  return (
    <div>

      <form
        onSubmit={handleAddArtist}
        style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8, maxWidth: 400 }}
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
            style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box" }}
            placeholder="e.g. Jack Doyle"
          />
        </div>
        {formError && <p style={{ color: "crimson", margin: "0 0 8px 0", fontSize: 14 }}>{formError}</p>}
        {formSuccess && <p style={{ color: "green", margin: "0 0 8px 0", fontSize: 14 }}>{formSuccess}</p>}
        <button
          type="submit"
          style={{ padding: "8px 16px", background: "#c41e3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}
        >
          Add artist
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!error && artists.length === 0 && <p>No artists found (or still loading)…</p>}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {artists.map((a) => {
          const isOpen = openLoginPanel === a.id;
          const form = getForm(a.id);
          return (
            <li
              key={a.id}
              style={{
                padding: "12px 16px",
                marginBottom: 8,
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                maxWidth: 540,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  {a.user ? (
                    <span style={{ marginLeft: 12, fontSize: 13, color: "#555" }}>
                      Login: {a.user.email}
                    </span>
                  ) : (
                    <span style={{ marginLeft: 12, fontSize: 13, color: "#aaa" }}>No login</span>
                  )}
                </div>
                {!a.user && (
                  <button
                    onClick={() => setOpenLoginPanel(isOpen ? null : a.id)}
                    style={{
                      padding: "5px 12px",
                      background: isOpen ? "#555" : "#c41e3a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isOpen ? "Cancel" : "Set up login"}
                  </button>
                )}
              </div>

              {isOpen && !a.user && (
                <form
                  onSubmit={(e) => handleCreateLogin(e, a)}
                  style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #ebebeb" }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={(e) => patchForm(a.id, { email: e.target.value })}
                      style={{ flex: 1, minWidth: 180, padding: "7px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
                    />
                    <input
                      type="password"
                      placeholder="Password (min 6 chars)"
                      value={form.password}
                      onChange={(e) => patchForm(a.id, { password: e.target.value })}
                      style={{ flex: 1, minWidth: 160, padding: "7px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: "7px 16px",
                        background: "#c41e3a",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 500,
                        fontSize: 14,
                      }}
                    >
                      Create login
                    </button>
                  </div>
                  {form.error && <p style={{ color: "crimson", margin: 0, fontSize: 13 }}>{form.error}</p>}
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
