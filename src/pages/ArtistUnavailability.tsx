import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "../api/http";

type Unavailability = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  notes: string | null;
};

function formatDt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ccc",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

export default function ArtistUnavailability() {
  const [rows, setRows] = useState<Unavailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:00");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadRows() {
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    const to = new Date();
    to.setMonth(to.getMonth() + 12);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });

    apiGet<Unavailability[]>(`/artists/me/unavailability?${params}`)
      .then((data) => { setRows(data); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }

  useEffect(() => { loadRows(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!startDate) return setFormError("Please choose a start date.");
    if (!endDate) return setFormError("Please choose an end date.");

    const startIso = buildIso(startDate, startTime);
    const endIso = buildIso(endDate, endTime);

    if (new Date(endIso) <= new Date(startIso)) {
      return setFormError("End must be after start.");
    }

    setSubmitting(true);
    const result = await apiPost<Unavailability, Record<string, unknown>>(
      "/artists/me/unavailability",
      { startDateTime: startIso, endDateTime: endIso, notes: notes.trim() || undefined }
    );
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    setRows((prev) => [...prev, result.data].sort(
      (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    ));
    setStartDate("");
    setStartTime("09:00");
    setEndDate("");
    setEndTime("23:00");
    setNotes("");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await apiDelete(`/artists/me/unavailability/${id}`);
    setDeletingId(null);

    if (!result.ok) {
      alert(result.message);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const now = new Date().toISOString().slice(0, 10);

  return (
    <div>

      {/* Add form */}
      <div style={{
        background: "#f8f8f8", border: "1px solid #e0e0e0",
        borderRadius: 10, padding: 18, marginBottom: 28, maxWidth: 560,
      }}>
        <h2 style={{ margin: "0 0 14px 0", fontSize: 16 }}>Mark unavailable period</h2>
        <form onSubmit={handleAdd} style={{ display: "grid", gap: 12 }}>
          {formError && (
            <p style={{ margin: 0, color: "crimson", fontSize: 13 }}>{formError}</p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              Start date
              <input
                type="date"
                value={startDate}
                min={now}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              Start time
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              End date
              <input
                type="date"
                value={endDate}
                min={startDate || now}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              End time
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Reason / notes (optional)
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Holiday, prior commitment…"
              style={inputStyle}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: 13,
              background: submitting ? "#999" : "#a10000",
              color: "#fff", border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              justifySelf: "start",
            }}
          >
            {submitting ? "Saving…" : "Add period"}
          </button>
        </form>
      </div>

      {/* List */}
      <h2 style={{ margin: "0 0 12px 0", fontSize: 16 }}>Upcoming unavailability</h2>
      {loading && <p style={{ opacity: 0.6 }}>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p style={{ opacity: 0.6 }}>No unavailability set — you appear available for all upcoming slots.</p>
      )}
      {rows.length > 0 && (
        <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
          {rows.map((r) => {
            const isPast = new Date(r.endDateTime) < new Date();
            return (
              <div
                key={r.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "12px 14px", borderRadius: 10,
                  background: isPast ? "#f5f5f5" : "#fff4f4",
                  border: isPast ? "1px solid #e0e0e0" : "1px solid #f5c0c0",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: isPast ? "#888" : "#a10000" }}>
                    {formatDt(r.startDateTime)} → {formatDt(r.endDateTime)}
                  </div>
                  {r.notes && (
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 3 }}>{r.notes}</div>
                  )}
                  {isPast && (
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Past</div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 12,
                    background: "transparent", border: "1px solid #ccc",
                    color: "#666", cursor: deletingId === r.id ? "not-allowed" : "pointer",
                    flexShrink: 0,
                  }}
                >
                  {deletingId === r.id ? "Removing…" : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
