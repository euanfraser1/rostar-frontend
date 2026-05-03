import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/http";

type EventStatus = "UNBOOKED" | "OFFERED" | "CONFIRMED";

type GigEvent = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  status: EventStatus;
  venueFee: string | null;
  notes: string | null;
  venue: { id: string; name: string; postcode: string };
  artist: { id: string; name: string } | null;
};

const STATUS_CONFIG: Record<EventStatus, { label: string; bg: string; color: string; dot: string }> = {
  UNBOOKED:  { label: "Available",  bg: "#dde8f5", color: "#2a5298", dot: "#5a82c4" },
  OFFERED:   { label: "Pending",    bg: "#fff4cc", color: "#7a5700", dot: "#fdbc00" },
  CONFIRMED: { label: "Confirmed",  bg: "#fde8e8", color: "#a10000", dot: "#a10000" },
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

// Label shown on the calendar cell chip
function cellLabel(ev: GigEvent): string {
  if (ev.status === "CONFIRMED" && ev.artist) return ev.artist.name;
  return formatTime(ev.startDateTime) + (ev.venueFee ? ` · ${formatFee(ev.venueFee)}` : "");
}

export default function VenueCalendar() {
  const [events, setEvents] = useState<GigEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const from = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const to = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });

    apiGet<GigEvent[]>(`/events?${params}`)
      .then((data) => {
        // Unbooked first, then offered, then confirmed — mirrors master calendar ordering
        const order: Record<EventStatus, number> = { UNBOOKED: 0, OFFERED: 1, CONFIRMED: 2 };
        setEvents(
          [...data].sort((a, b) => {
            const dayA = localDateKey(new Date(a.startDateTime));
            const dayB = localDateKey(new Date(b.startDateTime));
            if (dayA !== dayB) return dayA < dayB ? -1 : 1;
            if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
            return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
          })
        );
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

  const monthStart = startOfMonth(viewDate);
  const monthDays = daysInMonth(viewDate);
  const leadingBlanks = mondayIndex(monthStart.getDay());
  const monthLabel = viewDate.toLocaleString(undefined, { month: "long", year: "numeric" });
  const todayKey = localDateKey(new Date());
  const selectedEvents = selectedDayKey ? eventsByDay.get(selectedDayKey) ?? [] : [];

  function prevMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDayKey(null); }
  function nextMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDayKey(null); }
  function goToday() { setViewDate(new Date()); setSelectedDayKey(localDateKey(new Date())); }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>My Calendar</h1>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {(["UNBOOKED", "OFFERED", "CONFIRMED"] as EventStatus[]).map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: STATUS_CONFIG[s].dot }} />
            {STATUS_CONFIG[s].label}
          </div>
        ))}
      </div>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {/* Month nav */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>←</button>
        <button onClick={goToday} style={{ padding: "6px 10px", borderRadius: 8 }}>Today</button>
        <button onClick={nextMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>→</button>
        <div style={{ marginLeft: 12, fontWeight: 600 }}>{monthLabel}</div>
        {loading && <span style={{ marginLeft: 8, fontSize: 13, opacity: 0.6 }}>Loading…</span>}
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
              onClick={() => setSelectedDayKey(key)}
              style={{
                textAlign: "left", minHeight: 96, padding: 8, borderRadius: 10,
                border: isSelected ? "2px solid #a10000" : "1px solid #eee",
                background: "#fff", cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <strong style={{
                  fontSize: 13,
                  background: isToday ? "#a10000" : "transparent",
                  color: isToday ? "#fff" : "inherit",
                  borderRadius: "50%",
                  width: 22, height: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
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
                      title={`${formatTime(ev.startDateTime)} [${ev.status}]`}
                    >
                      {cellLabel(ev)}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div style={{ fontSize: 11, opacity: 0.6 }}>+{dayEvents.length - 2} more</div>
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
            ? new Date(selectedDayKey + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })
            : "Select a day"}
        </h2>

        {!selectedDayKey && <p style={{ opacity: 0.6 }}>Click a day to see details.</p>}
        {selectedDayKey && selectedEvents.length === 0 && <p style={{ opacity: 0.6 }}>No events on this day.</p>}

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
                    {ev.status === "CONFIRMED" && ev.artist && (
                      <div>
                        <span style={{ opacity: 0.6 }}>Artist: </span>
                        <strong>{ev.artist.name}</strong>
                      </div>
                    )}
                    {ev.venueFee && (
                      <div>
                        <span style={{ opacity: 0.6 }}>Venue fee: </span>
                        <strong>{formatFee(ev.venueFee)}</strong>
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
