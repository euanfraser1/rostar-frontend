import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../api/http";

type PaSystem = "FULL_PA" | "LIMITED_PA" | "NO_PA";

type VenueUser = { id: string; email: string };

type Venue = {
  id: string;
  name: string;
  postcode: string;
  phone: string | null;
  contactEmail: string | null;
  paSystem: PaSystem | null;
  technicalNotes: string | null;
  notes: string | null;
  isLiveVenue: boolean;
  user: VenueUser | null;
};

type DetailTab = "details" | "bookings" | "login" | "notes";

type VenueEvent = {
  id: string;
  venueId: string;
  artistId: string | null;
  startDateTime: string;
  endDateTime: string;
  status: "UNBOOKED" | "OFFERED" | "CONFIRMED";
  venueFee: string | null;
  artistFee: string | null;
  rostarCut: string | null;
  notes: string | null;
  artist: { id: string; name: string } | null;
};

type EditSection = "basic" | "contact" | "technical" | "notes" | null;

const PA_LABEL: Record<PaSystem, string> = {
  FULL_PA: "Full PA",
  LIMITED_PA: "Limited PA",
  NO_PA: "No PA",
};

const PA_COLOR: Record<PaSystem, { bg: string; color: string; dot: string }> = {
  FULL_PA:     { bg: "#e6f9f0", color: "#1a7a4a", dot: "#22c55e" },
  LIMITED_PA:  { bg: "#fff7e6", color: "#92400e", dot: "#f59e0b" },
  NO_PA:       { bg: "#f3f4f6", color: "#6b7280", dot: "#d1d5db" },
};

function isComplete(v: Venue) {
  return !!(v.name && v.postcode && v.phone);
}

function loginStatus(v: Venue): "set-up" | "not-set-up" | "incomplete" {
  if (!isComplete(v)) return "incomplete";
  if (v.user) return "set-up";
  return "not-set-up";
}

function LoginBadge({ venue }: { venue: Venue }) {
  const status = loginStatus(venue);
  if (status === "set-up") {
    return (
      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#e6f9f0", color: "#1a7a4a", marginLeft: 8 }}>
        Login set up
      </span>
    );
  }
  if (status === "not-set-up") {
    return (
      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#fff3e0", color: "#c05c00", marginLeft: 8 }}>
        Login not set up
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#fdecea", color: "#c41e3a", marginLeft: 8 }}>
      Incomplete
    </span>
  );
}

function PaBadge({ pa }: { pa: PaSystem | null }) {
  if (!pa) return null;
  const c = PA_COLOR[pa];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {PA_LABEL[pa]}
    </span>
  );
}

function LiveBadge({ live }: { live: boolean }) {
  if (!live) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#f0f4ff", color: "#3b5bdb" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4"/></svg>
      Live venue
    </span>
  );
}

function VenueIcon({ tone = "red" }: { tone?: "red" | "blue" | "purple" | "green" }) {
  const tones = {
    red: { bg: "#fdecef", color: "#c41e3a" },
    blue: { bg: "#eef6ff", color: "#2563eb" },
    purple: { bg: "#f3edff", color: "#7c3aed" },
    green: { bg: "#eafaf4", color: "#0f766e" },
  };

  const t = tones[tone];

  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 18,
        background: t.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="none"
        stroke={t.color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M9 21v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
        <path d="M9 10h.01" />
        <path d="M12 10h.01" />
        <path d="M15 10h.01" />
        <path d="M9 13h.01" />
        <path d="M12 13h.01" />
        <path d="M15 13h.01" />
      </svg>
    </div>
  );
}

// ── Add Venue Modal ────────────────────────────────────────────────────────────

function AddVenueModal({ onClose, onAdded }: { onClose: () => void; onAdded: (v: Venue) => void }) {
  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Venue name is required."); return; }
    if (!postcode.trim()) { setError("Postcode is required."); return; }
    setSaving(true);
    const result = await apiPost<Venue, { name: string; postcode: string }>("/venues", { name: name.trim(), postcode: postcode.trim() });
    setSaving(false);
    if (result.ok) {
      onAdded({ ...result.data, user: null });
    } else {
      setError(result.message);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Add venue</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#6b7280", lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Venue name</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Red Lion" style={inputStyle} />
          <label style={{ ...labelStyle, marginTop: 12 }}>Postcode</label>
          <input value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="e.g. SW1A 1AA" style={inputStyle} />
          {error && <p style={{ color: "#c41e3a", fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={saving} style={primaryBtnStyle}>{saving ? "Adding…" : "Add venue"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Login Setup Form (inside detail panel) ────────────────────────────────────

function LoginSetupForm({ venue, onCreated }: { venue: Venue; onCreated: (user: VenueUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("Email is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSaving(true);
    const result = await apiPost<{ venueId: string; userId: string; email: string }, Record<string, string>>(
      `/venues/${venue.id}/account`, { email: email.trim(), password }
    );
    setSaving(false);
    if (result.ok) {
      onCreated({ id: result.data.userId, email: result.data.email });
    } else {
      setError(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="venue@email.com" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle} />
        </div>
      </div>
      {error && <p style={{ color: "#c41e3a", fontSize: 13, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={saving} style={primaryBtnStyle}>{saving ? "Creating…" : "Create login"}</button>
      </div>
    </form>
  );
}

// ── Editable section helpers ──────────────────────────────────────────────────

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 500, color: "#6b7280", marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box", outline: "none" };
const primaryBtnStyle: React.CSSProperties = { padding: "8px 18px", background: "#c41e3a", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13 };
const cancelBtnStyle: React.CSSProperties = { padding: "8px 18px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 500, fontSize: 13 };
const editBtnStyle: React.CSSProperties = { padding: "5px 14px", background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 7, cursor: "pointer", fontWeight: 500, fontSize: 12 };

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "#111827" : "#d1d5db" }}>{value || "—"}</div>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  venue,
  onClose,
  onUpdate,
  onDelete,
}: {
  venue: Venue;
  onClose: () => void;
  onUpdate: (updated: Venue) => void;
  onDelete: (id: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("details");
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Edit state for each section
  const [basicDraft, setBasicDraft] = useState({ name: venue.name, postcode: venue.postcode });
  const [contactDraft, setContactDraft] = useState({ phone: venue.phone ?? "", contactEmail: venue.contactEmail ?? "" });
  const [techDraft, setTechDraft] = useState({ paSystem: venue.paSystem ?? ("" as PaSystem | ""), technicalNotes: venue.technicalNotes ?? "", isLiveVenue: venue.isLiveVenue });
  const [notesDraft, setNotesDraft] = useState(venue.notes ?? "");

  // Reset drafts when venue changes
  useEffect(() => {
    setBasicDraft({ name: venue.name, postcode: venue.postcode });
    setContactDraft({ phone: venue.phone ?? "", contactEmail: venue.contactEmail ?? "" });
    setTechDraft({ paSystem: venue.paSystem ?? ("" as PaSystem | ""), technicalNotes: venue.technicalNotes ?? "", isLiveVenue: venue.isLiveVenue });
    setNotesDraft(venue.notes ?? "");
    setEditSection(null);
    setEvents([]);
  }, [venue.id]);

  useEffect(() => {
    if (tab !== "bookings") return;
    setEventsLoading(true);
    apiGet<VenueEvent[]>(`/events?venueId=${venue.id}`)
      .then(data => { setEvents(data); setEventsLoading(false); })
      .catch(() => setEventsLoading(false));
  }, [tab, venue.id]);

  async function saveSection(patch: Record<string, unknown>) {
    setSaving(true);
    const result = await apiPatch<Venue, Record<string, unknown>>(`/venues/${venue.id}`, patch);
    setSaving(false);
    if (result.ok) {
      onUpdate({ ...result.data, user: venue.user });
      setEditSection(null);
    }
  }

  async function handleDelete() {
    const result = await apiDelete(`/venues/${venue.id}`);
    if (result.ok) onDelete(venue.id);
  }

  const tabStyle = (t: DetailTab): React.CSSProperties => ({
    padding: "8px 14px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: tab === t ? 600 : 400,
    color: tab === t ? "#c41e3a" : "#6b7280",
    borderBottom: tab === t ? "2px solid #c41e3a" : "2px solid transparent",
    marginBottom: -1,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff", borderLeft: "1px solid #e5e7eb" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{venue.name}</span>
              <LoginBadge venue={venue} />
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{venue.postcode}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20, lineHeight: 1, padding: 0, marginTop: 2 }}>×</button>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {(["details", "bookings", "login", "notes"] as DetailTab[]).map(t => (
            <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
              {t === "details" ? "Details" : t === "bookings" ? "Bookings" : t === "login" ? "Login & Access" : "Notes"}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {tab === "details" && (
          <div style={{ display: "grid", gap: 14 }}>
            {/* Basic information */}
            <Section
              title="Basic information"
              editing={editSection === "basic"}
              onEdit={() => { setBasicDraft({ name: venue.name, postcode: venue.postcode }); setEditSection("basic"); }}
              onCancel={() => setEditSection(null)}
              onSave={() => saveSection({ name: basicDraft.name, postcode: basicDraft.postcode })}
              saving={saving}
            >
              {editSection === "basic" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Venue name</label>
                    <input value={basicDraft.name} onChange={e => setBasicDraft(d => ({ ...d, name: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Postcode</label>
                    <input value={basicDraft.postcode} onChange={e => setBasicDraft(d => ({ ...d, postcode: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <InfoRow label="Venue name" value={venue.name} />
                  <InfoRow label="Postcode" value={venue.postcode} />
                </div>
              )}
            </Section>

            {/* Contact */}
            <Section
              title="Contact"
              editing={editSection === "contact"}
              onEdit={() => { setContactDraft({ phone: venue.phone ?? "", contactEmail: venue.contactEmail ?? "" }); setEditSection("contact"); }}
              onCancel={() => setEditSection(null)}
              onSave={() => saveSection({ phone: contactDraft.phone || null, contactEmail: contactDraft.contactEmail || null })}
              saving={saving}
            >
              {editSection === "contact" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Contact number</label>
                    <input value={contactDraft.phone} onChange={e => setContactDraft(d => ({ ...d, phone: e.target.value }))} placeholder="020 0000 0000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={contactDraft.contactEmail} onChange={e => setContactDraft(d => ({ ...d, contactEmail: e.target.value }))} placeholder="venue@email.com" style={inputStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <InfoRow label="Contact number" value={venue.phone} />
                  <InfoRow label="Email" value={venue.contactEmail} />
                </div>
              )}
            </Section>

            {/* Technical requirements */}
            <Section
              title="Technical requirements"
              editing={editSection === "technical"}
              onEdit={() => { setTechDraft({ paSystem: venue.paSystem ?? "", technicalNotes: venue.technicalNotes ?? "", isLiveVenue: venue.isLiveVenue }); setEditSection("technical"); }}
              onCancel={() => setEditSection(null)}
              onSave={() => saveSection({ paSystem: techDraft.paSystem || null, technicalNotes: techDraft.technicalNotes || null, isLiveVenue: techDraft.isLiveVenue })}
              saving={saving}
            >
              {editSection === "technical" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={labelStyle}>PA system</label>
                      <select value={techDraft.paSystem} onChange={e => setTechDraft(d => ({ ...d, paSystem: e.target.value as PaSystem | "" }))} style={{ ...inputStyle, background: "#fff" }}>
                        <option value="">None</option>
                        <option value="FULL_PA">Full PA</option>
                        <option value="LIMITED_PA">Limited PA</option>
                        <option value="NO_PA">No PA</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={techDraft.isLiveVenue} onChange={e => setTechDraft(d => ({ ...d, isLiveVenue: e.target.checked }))} />
                        Live venue
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Additional notes</label>
                    <input value={techDraft.technicalNotes} onChange={e => setTechDraft(d => ({ ...d, technicalNotes: e.target.value }))} placeholder="e.g. Stage available, in-house engineer." style={inputStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>PA system</div>
                    {venue.paSystem ? <PaBadge pa={venue.paSystem} /> : <span style={{ fontSize: 13, color: "#d1d5db" }}>—</span>}
                  </div>
                  <InfoRow label="Additional notes" value={venue.technicalNotes} />
                </div>
              )}
            </Section>
          </div>
        )}

        {tab === "notes" && (
          <Section
            title="Notes"
            editing={editSection === "notes"}
            onEdit={() => { setNotesDraft(venue.notes ?? ""); setEditSection("notes"); }}
            onCancel={() => setEditSection(null)}
            onSave={() => saveSection({ notes: notesDraft || null })}
            saving={saving}
          >
            {editSection === "notes" ? (
              <textarea
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                placeholder="Add notes about this venue…"
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            ) : (
              <p style={{ fontSize: 13, color: venue.notes ? "#374151" : "#d1d5db", margin: 0, lineHeight: 1.6 }}>
                {venue.notes || "No notes yet."}
              </p>
            )}
          </Section>
        )}

        {tab === "login" && (
          <div style={{ display: "grid", gap: 14 }}>
            <Section title="Login & Access" editing={false} onEdit={() => {}} onCancel={() => {}} onSave={() => {}} saving={false} hideEdit>
              {venue.user ? (
                <div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>Login email</div>
                  <div style={{ fontSize: 13, color: "#111827" }}>{venue.user.email}</div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#e6f9f0", color: "#1a7a4a" }}>Active</span>
                  </div>
                </div>
              ) : isComplete(venue) ? (
                <div>
                  <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>No login set up for this venue yet. Create one below.</p>
                  <LoginSetupForm venue={venue} onCreated={(user) => onUpdate({ ...venue, user })} />
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                  Complete the venue's contact details (phone number required) before setting up a login.
                </p>
              )}
            </Section>
          </div>
        )}

        {tab === "bookings" && (
          <div>
            {eventsLoading ? (
              <div style={{ fontSize: 13, color: "#9ca3af", padding: "20px 0" }}>Loading bookings…</div>
            ) : events.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af", padding: "20px 0" }}>No bookings for this venue yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {events.map(ev => {
                  const start = new Date(ev.startDateTime);
                  const end = new Date(ev.endDateTime);
                  const statusColors: Record<string, { bg: string; color: string }> = {
                    CONFIRMED: { bg: "#e6f9f0", color: "#1a7a4a" },
                    OFFERED:   { bg: "#fff7e6", color: "#92400e" },
                    UNBOOKED:  { bg: "#f3f4f6", color: "#6b7280" },
                  };
                  const sc = statusColors[ev.status] ?? statusColors.UNBOOKED;
                  return (
                    <div key={ev.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 2 }}>
                            {ev.artist ? ev.artist.name : <span style={{ color: "#d1d5db" }}>No artist assigned</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                            {" · "}
                            {start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {ev.notes && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{ev.notes}</div>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.color, flexShrink: 0 }}>
                          {ev.status.charAt(0) + ev.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                      {(ev.venueFee || ev.artistFee) && (
                        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                          {ev.venueFee && <span>Venue fee: <strong style={{ color: "#111827" }}>£{ev.venueFee}</strong></span>}
                          {ev.artistFee && <span>Artist fee: <strong style={{ color: "#111827" }}>£{ev.artistFee}</strong></span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {deleteConfirm ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#c41e3a", fontWeight: 500 }}>Delete this venue?</span>
            <button onClick={handleDelete} style={{ ...primaryBtnStyle, padding: "6px 14px" }}>Yes, delete</button>
            <button onClick={() => setDeleteConfirm(false)} style={{ ...cancelBtnStyle, padding: "6px 14px" }}>Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#c41e3a", fontSize: 13, fontWeight: 500, padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
            Delete venue
          </button>
        )}
        <button
          onClick={() => setEditSection(tab === "details" ? "basic" : tab === "notes" ? "notes" : null)}
          style={{ display: "flex", alignItems: "center", gap: 6, ...primaryBtnStyle }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit venue
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
  hideEdit,
}: {
  title: string;
  children: React.ReactNode;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  hideEdit?: boolean;
}) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{title}</span>
        {!hideEdit && !editing && (
          <button onClick={onEdit} style={editBtnStyle}>Edit</button>
        )}
        {editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
            <button onClick={onSave} disabled={saving} style={primaryBtnStyle}>{saving ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

// ── Main Venues Page ───────────────────────────────────────────────────────────

export default function Venues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    apiGet<Venue[]>("/venues")
      .then(setVenues)
      .catch((e) => setError(String(e)));
  }, []);

  const filtered = venues.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.postcode.toLowerCase().includes(search.toLowerCase())
  );

  const selected = venues.find(v => v.id === selectedId) ?? null;

  function handleAdded(v: Venue) {
    setVenues(prev => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedId(v.id);
    setShowAddModal(false);
  }

  function handleUpdate(updated: Venue) {
    setVenues(prev => prev.map(v => v.id === updated.id ? updated : v));
  }

  function handleDelete(id: string) {
    setVenues(prev => prev.filter(v => v.id !== id));
    setSelectedId(null);
  }

  return (
    <div style={{ display: "flex", height: "100%", gap: 0, margin: -24, overflow: "hidden" }}>
      {/* Left: venue list */}
      <div style={{ flex: selected ? "0 0 55%" : "1", display: "flex", flexDirection: "column", overflow: "hidden", padding: 24, boxSizing: "border-box" }}>
        {/* Page header */}
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>Venues</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>Manage your venues and their details.</p>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search venues..."
              style={{ ...inputStyle, paddingLeft: 32, background: "#fff" }}
            />
          </div>
          <button style={{ ...cancelBtnStyle, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filter
          </button>
          <button onClick={() => setShowAddModal(true)} style={{ ...primaryBtnStyle, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add venue
          </button>
        </div>

        {error && <p style={{ color: "#c41e3a", fontSize: 13 }}>Error: {error}</p>}

        {/* Venue list */}
        <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 10, alignContent: "start" }}>
          {filtered.map(v => {
            const isSelected = selectedId === v.id;
            const status = loginStatus(v);
            return (
              <div
                key={v.id}
                onClick={() => setSelectedId(isSelected ? null : v.id)}
                style={{
                  padding: "14px 16px",
                  border: `1px solid ${isSelected ? "#c41e3a" : "#e5e7eb"}`,
                  borderRadius: 12,
                  background: "#fff",
                  cursor: "pointer",
                  boxShadow: isSelected ? "0 0 0 2px rgba(196,30,58,0.12)" : "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <VenueIcon />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{v.name}</span>
                      <LoginBadge venue={v} />
                    </div>
                    {v.postcode && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280", marginBottom: 2 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {v.postcode}
                      </div>
                    )}
                    {v.phone ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.22 10.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                        {v.phone}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#d1d5db", marginBottom: 6 }}>Add contact number</div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <PaBadge pa={v.paSystem} />
                      <LiveBadge live={v.isLiveVenue} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 2 }}>
                    {status === "set-up" && (
                      <button onClick={e => { e.stopPropagation(); setSelectedId(v.id); }} style={editBtnStyle}>
                        View profile
                      </button>
                    )}
                    {status === "not-set-up" && (
                      <button onClick={e => { e.stopPropagation(); setSelectedId(v.id); }} style={editBtnStyle}>
                        Set up login
                      </button>
                    )}
                    {status === "incomplete" && (
                      <button onClick={e => { e.stopPropagation(); setSelectedId(v.id); }} style={editBtnStyle}>
                        Complete
                      </button>
                    )}
                    <button
                      onClick={e => e.stopPropagation()}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "4px 2px", display: "flex", alignItems: "center" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !error && (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>{search ? "No venues match your search." : "No venues yet."}</p>
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
          {venues.length} {venues.length === 1 ? "venue" : "venues"}
        </div>
      </div>

      {/* Right: detail panel */}
      {selected && (
        <div style={{ flex: "0 0 45%", overflow: "hidden", display: "flex", flexDirection: "column", borderLeft: "1px solid #e5e7eb", boxSizing: "border-box" }}>
          <DetailPanel
            venue={selected}
            onClose={() => setSelectedId(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </div>
      )}

      {showAddModal && (
        <AddVenueModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />
      )}
    </div>
  );
}
