import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPatch } from "../api/http";
import { Info } from "lucide-react";

type EventStatus = "UNBOOKED" | "OFFERED" | "CONFIRMED";

type GigEvent = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  status: EventStatus;
  venueFee: string | null;
  artistFee: string | null;
  rostarCut: string | null;
  notes: string | null;
  venue: { id: string; name: string; postcode: string };
  artist: { id: string; name: string } | null;
};

type Artist = { id: string; name: string };

type ArtistUnavailability = {
  id: string;
  artistId: string;
  startDateTime: string;
  endDateTime: string;
  notes: string | null;
  artist: { id: string; name: string };
};

const STATUS_CONFIG: Record<EventStatus, { label: string; bg: string; color: string; dot: string }> = {
  UNBOOKED:  { label: "Unbooked",  bg: "#dde8f5", color: "#2a5298", dot: "#5a82c4" },
  OFFERED:   { label: "Offered",   bg: "#fff4cc", color: "#7a5700", dot: "#fdbc00" },
  CONFIRMED: { label: "Confirmed", bg: "#fde8e8", color: "#a10000", dot: "#a10000" },
};

const STATUS_SORT_ORDER: Record<EventStatus, number> = {
  UNBOOKED: 0,
  OFFERED: 1,
  CONFIRMED: 2,
};

function pad2(n: number) { return String(n).padStart(2, "0"); }
function localDateKey(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function mondayIndex(day: number) { return (day + 6) % 7; }
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function formatFee(fee: string | null) {
  if (!fee) return null;
  return `£${Number(fee).toFixed(2)}`;
}

export default function Calendar() {
  const navigate = useNavigate();

  const [events, setEvents] = useState<GigEvent[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [unavailabilities, setUnavailabilities] = useState<ArtistUnavailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Assign-artist inline form state
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignArtistId, setAssignArtistId] = useState("");
  const [assignStatus, setAssignStatus] = useState<EventStatus>("CONFIRMED");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Load artists once (for the assign dropdown)
  useEffect(() => {
    apiGet<Artist[]>("/artists")
      .then((data) => setArtists([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {}); // non-critical; dropdown just stays empty
  }, []);

  // Load events + unavailability for the viewed month
  useEffect(() => {
    setLoading(true);
    setError(null);
    const from = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const to = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });

    Promise.all([
      apiGet<GigEvent[]>(`/events?${params}`),
      apiGet<ArtistUnavailability[]>(`/artist-unavailability?${params}`),
    ])
      .then(([evData, unavData]) => {
        setEvents([...evData].sort(
          (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
        ));
        setUnavailabilities(unavData);
        setLoading(false);
      })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, [viewDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, GigEvent[]>();
    for (const ev of events) {
      const key = localDateKey(new Date(ev.startDateTime));
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    for (const [key, arr] of map) {
      map.set(key, arr.sort(
        (a, b) =>
          STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status] ||
          new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      ));
    }
    return map;
  }, [events]);

  // For each artist, collect their unavailability blocks for the month
  const unavailByArtist = useMemo(() => {
    const map = new Map<string, ArtistUnavailability[]>();
    for (const u of unavailabilities) {
      const arr = map.get(u.artistId) ?? [];
      arr.push(u);
      map.set(u.artistId, arr);
    }
    return map;
  }, [unavailabilities]);

  // Check if a given artist overlaps a given event's time window
  function artistConflictsForEvent(artistId: string, ev: GigEvent): ArtistUnavailability[] {
    const blocks = unavailByArtist.get(artistId) ?? [];
    const evStart = new Date(ev.startDateTime).getTime();
    const evEnd = new Date(ev.endDateTime).getTime();
    return blocks.filter((u) => {
      const uStart = new Date(u.startDateTime).getTime();
      const uEnd = new Date(u.endDateTime).getTime();
      return uStart < evEnd && uEnd > evStart;
    });
  }

  const [legendOpen, setLegendOpen] = useState(false);

  const monthStart = startOfMonth(viewDate);
  const monthDays = daysInMonth(viewDate);
  const leadingBlanks = mondayIndex(monthStart.getDay());
  const monthLabel = viewDate.toLocaleString(undefined, { month: "long", year: "numeric" });
  const todayKey = localDateKey(new Date());
  const selectedEvents = selectedDayKey ? eventsByDay.get(selectedDayKey) ?? [] : [];

  function prevMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDayKey(null); }
  function nextMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDayKey(null); }
  function goToday() { setViewDate(new Date()); setSelectedDayKey(localDateKey(new Date())); }

  function eventLabel(ev: GigEvent) {
    if (ev.status === "CONFIRMED" && ev.artist) return ev.artist.name;
    return ev.venue.name;
  }

  function openAssign(ev: GigEvent) {
    setAssigningId(ev.id);
    setAssignArtistId(ev.artist?.id ?? "");
    setAssignStatus(ev.status === "UNBOOKED" ? "CONFIRMED" : ev.status);
    setAssignError(null);
  }

  function closeAssign() {
    setAssigningId(null);
    setAssignError(null);
  }

  async function saveAssign(eventId: string) {
    setAssignError(null);
    if (!assignArtistId) {
      setAssignError("Please select an artist.");
      return;
    }
    setAssignSaving(true);

    const result = await apiPatch<GigEvent, Record<string, unknown>>(
      `/events/${eventId}`,
      { artistId: assignArtistId, status: assignStatus }
    );

    setAssignSaving(false);

    if (!result.ok) {
      setAssignError(result.message);
      return;
    }

    // Update the event in local state so the calendar refreshes instantly
    setEvents((prev) => prev.map((e) => (e.id === eventId ? result.data : e)));
    setAssigningId(null);
  }

  async function clearArtist(eventId: string) {
    const result = await apiPatch<GigEvent, Record<string, unknown>>(
      `/events/${eventId}`,
      { artistId: null, status: "UNBOOKED" }
    );
    if (result.ok) {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? result.data : e)));
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Calendar</h1>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {/* Nav */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>←</button>
        <button onClick={goToday} style={{ padding: "6px 10px", borderRadius: 8 }}>Today</button>
        <button onClick={nextMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>→</button>
        <div style={{ marginLeft: 12, fontWeight: 600 }}>{monthLabel}</div>
        {loading && <span style={{ marginLeft: 8, fontSize: 13, opacity: 0.6 }}>Loading…</span>}

        {/* Colour key */}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <button
            onClick={() => setLegendOpen((o) => !o)}
            title="Colour key"
            style={{
              background: "none", border: "none", outline: "none", cursor: "pointer",
              padding: 4, borderRadius: 6,
              display: "flex", alignItems: "center",
              color: legendOpen ? "#c41e3a" : "#9ca3af",
            }}
          >
            <Info size={20} />
          </button>
          {legendOpen && (
            <div style={{
              position: "absolute", right: 0, top: 40, zIndex: 100,
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
              padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              minWidth: 160,
            }}>
              <div style={{ fontWeight: 600, fontSize: 11, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Colour key
              </div>
              {(Object.keys(STATUS_CONFIG) as EventStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 6 }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                    {cfg.label}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Month grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} style={{ fontSize: 12, opacity: 0.6, padding: "0 4px", fontWeight: 600 }}>{d}</div>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} style={{ minHeight: 96, border: "1px solid #eee", borderRadius: 10, background: "#fafafa" }} />
        ))}

        {Array.from({ length: monthDays }).map((_, i) => {
          const day = i + 1;
          const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
          const key = localDateKey(cellDate);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isSelected = selectedDayKey === key;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              onClick={() => { setSelectedDayKey(key); setAssigningId(null); }}
              style={{
                textAlign: "left", minHeight: 96, padding: 8, borderRadius: 10,
                border: isSelected ? "2px solid #a10000" : "1px solid #eee",
                background: "#fff", cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <strong style={{
                  fontSize: 13, background: isToday ? "#a10000" : "transparent",
                  color: isToday ? "#fff" : "inherit", borderRadius: "50%",
                  width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {day}
                </strong>
                {dayEvents.length > 0 && <span style={{ fontSize: 11, opacity: 0.6 }}>{dayEvents.length}</span>}
              </div>
              <div style={{ display: "grid", gap: 3 }}>
                {dayEvents.slice(0, 2).map((ev) => {
                  const cfg = STATUS_CONFIG[ev.status];
                  return (
                    <div
                      key={ev.id}
                      style={{
                        fontSize: 11, padding: "3px 6px", borderRadius: 6,
                        background: cfg.bg, color: cfg.color,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        borderLeft: `3px solid ${cfg.dot}`,
                      }}
                      title={`${formatTime(ev.startDateTime)} — ${eventLabel(ev)} [${ev.status}]`}
                    >
                      {formatTime(ev.startDateTime)} {eventLabel(ev)}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && <div style={{ fontSize: 11, opacity: 0.6 }}>+{dayEvents.length - 2} more</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail panel */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {selectedDayKey
              ? `Events on ${new Date(selectedDayKey + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}`
              : "Select a day"}
          </h2>
          {selectedDayKey && (
            <button
              onClick={() => navigate(`/events/new?date=${selectedDayKey}`)}
              style={{
                padding: "5px 14px", borderRadius: 8, background: "#a10000",
                color: "#fff", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              + Add slot
            </button>
          )}
        </div>

        {!selectedDayKey && <p style={{ opacity: 0.6 }}>Click a day in the calendar to see full details.</p>}
        {selectedDayKey && selectedEvents.length === 0 && <p style={{ opacity: 0.6 }}>No events for this day.</p>}

        {selectedEvents.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {selectedEvents.map((ev) => {
              const cfg = STATUS_CONFIG[ev.status];
              const isAssigning = assigningId === ev.id;

              return (
                <div
                  key={ev.id}
                  style={{
                    padding: "12px 16px", borderRadius: 10,
                    background: cfg.bg, borderLeft: `4px solid ${cfg.dot}`,
                  }}
                >
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>
                        {formatTime(ev.startDateTime)} – {formatTime(ev.endDateTime)}
                      </span>
                      <span style={{
                        marginLeft: 10, fontSize: 11, padding: "2px 8px", borderRadius: 20,
                        background: cfg.dot, color: "#fff", fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {!isAssigning && (
                        <button
                          onClick={() => openAssign(ev)}
                          style={{
                            padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: "#a10000", color: "#fff", border: "none", cursor: "pointer",
                          }}
                        >
                          {ev.artist ? "Reassign" : "Assign artist"}
                        </button>
                      )}
                      {!isAssigning && ev.artist && (
                        <button
                          onClick={() => clearArtist(ev.id)}
                          style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 12,
                            background: "transparent", color: "#a10000",
                            border: "1px solid #a10000", cursor: "pointer",
                          }}
                        >
                          Unassign
                        </button>
                      )}
                      {isAssigning && (
                        <button
                          onClick={closeAssign}
                          style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 12,
                            background: "transparent", border: "1px solid #888",
                            color: "#555", cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Event details */}
                  <div style={{ fontSize: 14, display: "grid", gap: 3 }}>
                    <div>
                      <span style={{ opacity: 0.6 }}>Venue: </span>
                      <strong>{ev.venue.name}</strong>
                      {ev.venue.postcode && <span style={{ opacity: 0.6 }}> ({ev.venue.postcode})</span>}
                    </div>
                    <div>
                      <span style={{ opacity: 0.6 }}>Artist: </span>
                      {ev.artist
                        ? <strong>{ev.artist.name}</strong>
                        : <em style={{ opacity: 0.5 }}>Unassigned</em>}
                    </div>
                    {(ev.venueFee || ev.artistFee || ev.rostarCut) && (
                      <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
                        {ev.venueFee && <span style={{ opacity: 0.8 }}>Venue fee: <strong>{formatFee(ev.venueFee)}</strong></span>}
                        {ev.artistFee && <span style={{ opacity: 0.8 }}>Artist fee: <strong>{formatFee(ev.artistFee)}</strong></span>}
                        {ev.rostarCut && <span style={{ opacity: 0.8 }}>Rostar cut: <strong>{formatFee(ev.rostarCut)}</strong></span>}
                      </div>
                    )}
                    {ev.notes && (
                      <div style={{ marginTop: 4, opacity: 0.8 }}>
                        <span style={{ opacity: 0.7 }}>Notes: </span>{ev.notes}
                      </div>
                    )}
                  </div>

                  {/* Inline assign form */}
                  {isAssigning && (
                    <div style={{
                      marginTop: 12, padding: "12px 14px", borderRadius: 8,
                      background: "rgba(255,255,255,0.7)", display: "grid", gap: 10,
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Assign artist</div>

                      {assignError && (
                        <p style={{ margin: 0, color: "crimson", fontSize: 13 }}>{assignError}</p>
                      )}

                      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                        Artist
                        <select
                          value={assignArtistId}
                          onChange={(e) => setAssignArtistId(e.target.value)}
                          disabled={assignSaving}
                          style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13 }}
                        >
                          <option value="">Select an artist…</option>
                          {artists.map((a) => {
                            const conflicts = artistConflictsForEvent(a.id, ev);
                            return (
                              <option key={a.id} value={a.id}>
                                {a.name}{conflicts.length > 0 ? " (unavailable)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      {/* Unavailability warning */}
                      {assignArtistId && (() => {
                        const conflicts = artistConflictsForEvent(assignArtistId, ev);
                        if (conflicts.length === 0) return null;
                        return (
                          <div style={{
                            padding: "10px 12px", borderRadius: 8,
                            background: "#fff8e1", border: "1px solid #f5c400",
                            fontSize: 13, color: "#7a5700",
                          }}>
                            <strong>⚠ Artist has marked themselves unavailable for this time:</strong>
                            <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
                              {conflicts.map((c) => (
                                <li key={c.id}>
                                  {new Date(c.startDateTime).toLocaleString()} – {new Date(c.endDateTime).toLocaleString()}
                                  {c.notes ? ` — ${c.notes}` : ""}
                                </li>
                              ))}
                            </ul>
                            <div style={{ marginTop: 6, opacity: 0.8 }}>You can still proceed with the booking.</div>
                          </div>
                        );
                      })()}

                      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                        Set status to
                        <select
                          value={assignStatus}
                          onChange={(e) => setAssignStatus(e.target.value as EventStatus)}
                          disabled={assignSaving}
                          style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13 }}
                        >
                          <option value="OFFERED">Offered</option>
                          <option value="CONFIRMED">Confirmed</option>
                        </select>
                      </label>

                      <button
                        onClick={() => saveAssign(ev.id)}
                        disabled={assignSaving}
                        style={{
                          padding: "7px 18px", borderRadius: 6, fontWeight: 600, fontSize: 13,
                          background: assignSaving ? "#999" : "#a10000",
                          color: "#fff", border: "none", cursor: assignSaving ? "not-allowed" : "pointer",
                          justifySelf: "start",
                        }}
                      >
                        {assignSaving ? "Saving…" : "Confirm"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
