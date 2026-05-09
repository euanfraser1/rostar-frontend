import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/http";

type VenueUser = { id: string; email: string };
type Venue = { id: string; name: string; postcode: string; user: VenueUser | null };

type LoginForm = { email: string; password: string; error: string | null; success: boolean };

const defaultForm = (): LoginForm => ({ email: "", password: "", error: null, success: false });

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPostcode, setNewPostcode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Per-venue login setup forms
  const [loginForms, setLoginForms] = useState<Record<string, LoginForm>>({});
  const [openLoginId, setOpenLoginId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Venue[]>("/venues")
      .then(setVenues)
      .catch((e) => setError(String(e)));
  }, []);

  function getForm(venueId: string): LoginForm {
    return loginForms[venueId] ?? defaultForm();
  }

  function patchForm(venueId: string, patch: Partial<LoginForm>) {
    setLoginForms((prev) => ({ ...prev, [venueId]: { ...(prev[venueId] ?? defaultForm()), ...patch } }));
  }

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
    const result = await apiPost<Venue, { name: string; postcode: string }>("/venues", { name, postcode });
    if (result.ok) {
      setVenues((prev) =>
        [...prev, { ...result.data, user: null }].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName("");
      setNewPostcode("");
      setFormSuccess("Venue added.");
    } else {
      setFormError(result.message);
    }
  }

  async function handleCreateLogin(e: React.FormEvent, venue: Venue) {
    e.preventDefault();
    const form = getForm(venue.id);
    patchForm(venue.id, { error: null });

    if (!form.email.trim()) {
      patchForm(venue.id, { error: "Email is required." });
      return;
    }
    if (form.password.length < 6) {
      patchForm(venue.id, { error: "Password must be at least 6 characters." });
      return;
    }

    const result = await apiPost<{ venueId: string; userId: string; email: string }, Record<string, string>>(
      `/venues/${venue.id}/account`,
      { email: form.email.trim(), password: form.password }
    );

    if (result.ok) {
      setVenues((prev) =>
        prev.map((v) =>
          v.id === venue.id ? { ...v, user: { id: result.data.userId, email: result.data.email } } : v
        )
      );
      patchForm(venue.id, { success: true });
      setOpenLoginId(null);
    } else {
      patchForm(venue.id, { error: result.message });
    }
  }

  return (
    <div>

      <form
        onSubmit={handleAddVenue}
        style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8, maxWidth: 400 }}
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
            style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box" }}
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
            style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box" }}
            placeholder="e.g. SW1A 1AA"
          />
        </div>
        {formError && <p style={{ color: "crimson", margin: "0 0 8px 0", fontSize: 14 }}>{formError}</p>}
        {formSuccess && <p style={{ color: "green", margin: "0 0 8px 0", fontSize: 14 }}>{formSuccess}</p>}
        <button
          type="submit"
          style={{ padding: "8px 16px", background: "#c41e3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}
        >
          Add venue
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!error && venues.length === 0 && <p>No venues found (or still loading)…</p>}

      <div style={{ display: "grid", gap: 12, maxWidth: 600 }}>
        {venues.map((v) => {
          const form = getForm(v.id);
          const isOpen = openLoginId === v.id;
          return (
            <div
              key={v.id}
              style={{ padding: "12px 16px", border: "1px solid #e5e5e5", borderRadius: 10, background: "#fff" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: 15 }}>{v.name}</strong>
                  {v.postcode && <span style={{ marginLeft: 8, fontSize: 13, opacity: 0.6 }}>{v.postcode}</span>}
                  {v.user && (
                    <div style={{ fontSize: 12, color: "#2a5298", marginTop: 2 }}>
                      Login: {v.user.email}
                    </div>
                  )}
                  {form.success && (
                    <div style={{ fontSize: 12, color: "green", marginTop: 2 }}>Login created.</div>
                  )}
                </div>
                {!v.user && (
                  <button
                    type="button"
                    onClick={() => setOpenLoginId(isOpen ? null : v.id)}
                    style={{
                      fontSize: 12, padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                      background: isOpen ? "#eee" : "#f5f5f5", border: "1px solid #ccc", fontWeight: 500,
                    }}
                  >
                    {isOpen ? "Cancel" : "Set up login"}
                  </button>
                )}
              </div>

              {isOpen && !v.user && (
                <form
                  onSubmit={(e) => handleCreateLogin(e, v)}
                  style={{ marginTop: 12, display: "grid", gap: 8 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, marginBottom: 3 }}>Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => patchForm(v.id, { email: e.target.value })}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box", fontSize: 13 }}
                        placeholder="venue@email.com"
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, marginBottom: 3 }}>Password</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => patchForm(v.id, { password: e.target.value })}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box", fontSize: 13 }}
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>
                  {form.error && <p style={{ color: "crimson", margin: 0, fontSize: 13 }}>{form.error}</p>}
                  <button
                    type="submit"
                    style={{ justifySelf: "start", padding: "6px 14px", background: "#c41e3a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                  >
                    Create login
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
