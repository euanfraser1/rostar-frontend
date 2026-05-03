import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/http";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";

type EventStatus = "UNBOOKED" | "OFFERED" | "CONFIRMED";

type GigEvent = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  status: EventStatus;
  artistFee: string | null;
  notes: string | null;
  venue: { id: string; name: string; postcode: string };
};

type Unavailability = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  notes: string | null;
};

const STATUS_CONFIG: Record<EventStatus, { label: string; bg: string; color: string; dot: string }> = {
  UNBOOKED:  { label: "Unbooked",  bg: "#dde8f5", color: "#2a5298", dot: "#5a82c4" },
  OFFERED:   { label: "Offered",   bg: "#fff4cc", color: "#7a5700", dot: "#fdbc00" },
  CONFIRMED: { label: "Confirmed", bg: "#fde8e8", color: "#a10000", dot: "#a10000" },
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

export default function ArtistGigs() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<GigEvent[]>([]);
  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const from = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const to = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });

    Promise.all([
      apiGet<GigEvent[]>(`/events?${params}`),
      apiGet<Unavailability[]>(`/artists/me/unavailability?${params}`),
    ])
      .then(([evData, unavData]) => {
        setEvents([...evData].sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()));
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
    return map;
  }, [events]);

  // Map day key -> unavailability blocks that overlap that day at all
  const unavailByDay = useMemo(() => {
    const map = new Map<string, Unavailability[]>();
    for (const u of unavailabilities) {
      const start = new Date(u.startDateTime);
      const end = new Date(u.endDateTime);
      // Walk every calendar day the block touches
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(0, 0, 0, 0);
      while (cursor <= endDay) {
        const key = localDateKey(cursor);
        const arr = map.get(key) ?? [];
        arr.push(u);
        map.set(key, arr);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [unavailabilities]);

  const monthStart = startOfMonth(viewDate);
  const monthDays = daysInMonth(viewDate);
  const leadingBlanks = mondayIndex(monthStart.getDay());
  const monthLabel = viewDate.toLocaleString(undefined, { month: "long", year: "numeric" });
  const todayKey = localDateKey(new Date());
  const selectedEvents = selectedDayKey ? eventsByDay.get(selectedDayKey) ?? [] : [];
  const selectedUnavail = selectedDayKey ? unavailByDay.get(selectedDayKey) ?? [] : [];

  function prevMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDayKey(null); }
  function nextMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDayKey(null); }
  function goToday() { setViewDate(new Date()); setSelectedDayKey(localDateKey(new Date())); }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>My Gigs</h1>
        <button
          onClick={() => navigate("/artist/unavailability")}
          style={{
            padding: "6px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13,
            background: "#a10000", color: "#fff", border: "none", cursor: "pointer",
          }}
        >
          Manage unavailability
        </button>
      </div>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {/* Month nav */}
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
              position: "absolute", right: 0, top: 36, zIndex: 100,
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
              padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              minWidth: 160,
            }}>
              <div style={{ fontWeight: 600, fontSize: 11, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Colour key
              </div>
              {[
                { label: "Offered",     dot: "#fdbc00" },
                { label: "Confirmed",   dot: "#a10000" },
                { label: "Unavailable", dot: "#b0b0b0" },
              ].map(({ label, dot }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 6 }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
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
          const dayUnavail = unavailByDay.get(key) ?? [];
          const isSelected = selectedDayKey === key;
          const isToday = key === todayKey;
          const hasUnavail = dayUnavail.length > 0;

          return (
            <button
              key={key}
              onClick={() => setSelectedDayKey(key)}
              style={{
                textAlign: "left", minHeight: 96, padding: 8, borderRadius: 10,
                border: isSelected ? "2px solid #a10000" : "1px solid #eee",
                background: hasUnavail ? "#f5f5f5" : "#fff",
                cursor: "pointer",
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
                {hasUnavail && (
                  <div style={{
                    fontSize: 11, padding: "3px 6px", borderRadius: 6,
                    background: "#e8e8e8", color: "#666",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    borderLeft: "3px solid #b0b0b0",
                  }}>
                    Unavailable
                  </div>
                )}
                {dayEvents.slice(0, hasUnavail ? 1 : 2).map((ev) => {
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
                      title={`${formatTime(ev.startDateTime)} — ${ev.venue.name} [${ev.status}]`}
                    >
                      {formatTime(ev.startDateTime)} {ev.venue.name}
                    </div>
                  );
                })}
                {dayEvents.length > (hasUnavail ? 1 : 2) && (
                  <div style={{ fontSize: 11, opacity: 0.6 }}>+{dayEvents.length - (hasUnavail ? 1 : 2)} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail panel */}
      <div style={{ marginTop: 20 }}>
        <h2 style={{ margin: "0 0 10px 0", fontSize: 18 }}>
          {selectedDayKey
            ? `${new Date(selectedDayKey + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}`
            : "Select a day"}
        </h2>

        {!selectedDayKey && <p style={{ opacity: 0.6 }}>Click a day to see full details.</p>}
        {selectedDayKey && selectedEvents.length === 0 && selectedUnavail.length === 0 && (
          <p style={{ opacity: 0.6 }}>No gigs on this day.</p>
        )}

        {selectedUnavail.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginBottom: 12, maxWidth: 540 }}>
            {selectedUnavail.map((u) => (
              <div
                key={u.id}
                style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "#e8e8e8", borderLeft: "4px solid #b0b0b0",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: "#555" }}>
                  Unavailable: {formatTime(u.startDateTime)} – {formatTime(u.endDateTime)}
                </div>
                {u.notes && <div style={{ fontSize: 13, opacity: 0.7, marginTop: 3 }}>{u.notes}</div>}
              </div>
            ))}
          </div>
        )}

        {selectedEvents.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {selectedEvents.map((ev) => {
              const cfg = STATUS_CONFIG[ev.status];
              return (
                <div
                  key={ev.id}
                  style={{
                    padding: "14px 16px", borderRadius: 10, maxWidth: 540,
                    background: cfg.bg, borderLeft: `4px solid ${cfg.dot}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      {formatTime(ev.startDateTime)} – {formatTime(ev.endDateTime)}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 20,
                      background: cfg.dot, color: "#fff", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, display: "grid", gap: 4 }}>
                    <div>
                      <span style={{ opacity: 0.6 }}>Venue: </span>
                      <strong>{ev.venue.name}</strong>
                      {ev.venue.postcode && (
                        <span style={{ opacity: 0.6 }}> · {ev.venue.postcode}</span>
                      )}
                    </div>
                    {ev.artistFee && (
                      <div>
                        <span style={{ opacity: 0.6 }}>Fee: </span>
                        <strong>{formatFee(ev.artistFee)}</strong>
                      </div>
                    )}
                    {ev.notes && (
                      <div style={{ marginTop: 4, opacity: 0.8 }}>
                        <span style={{ opacity: 0.7 }}>Notes: </span>{ev.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
