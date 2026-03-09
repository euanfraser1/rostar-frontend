import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/http";

type Booking = {
  id: string;
  dateTime: string;
  notes?: string | null;
  artist: { id: string; name: string };
  venue: { id: string; name: string; postcode?: string | null };
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Local date key YYYY-MM-DD (local time, not UTC) */
function localDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Monday=0 ... Sunday=6 */
function mondayIndex(day: number) {
  // JS: Sunday=0 ... Saturday=6
  // Convert so Monday=0 ... Sunday=6
  return (day + 6) % 7;
}

export default function Calendar() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Month we’re viewing
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Booking[]>("/bookings")
      .then((data) => {
        // sort by dateTime for nicer display
        const sorted = [...data].sort(
          (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        );
        setBookings(sorted);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = localDateKey(new Date(b.dateTime));
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return map;
  }, [bookings]);

  const monthStart = startOfMonth(viewDate);
  const monthDays = daysInMonth(viewDate);
  const leadingBlanks = mondayIndex(monthStart.getDay()); // number of empty cells before day 1
  const monthLabel = viewDate.toLocaleString(undefined, { month: "long", year: "numeric" });

  const selectedBookings = selectedDayKey ? bookingsByDay.get(selectedDayKey) ?? [] : [];

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelectedDayKey(null);
  }
  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelectedDayKey(null);
  }
  function goToday() {
    setViewDate(new Date());
    setSelectedDayKey(localDateKey(new Date()));
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Calendar</h1>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>
          ←
        </button>
        <button onClick={goToday} style={{ padding: "6px 10px", borderRadius: 8 }}>
          Today
        </button>
        <button onClick={nextMonth} style={{ padding: "6px 10px", borderRadius: 8 }}>
          →
        </button>

        <div style={{ marginLeft: 12, fontWeight: 600 }}>{monthLabel}</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
        }}
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} style={{ fontSize: 12, opacity: 0.7, padding: "0 4px" }}>
            {d}
          </div>
        ))}

        {/* Leading blanks */}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div
            key={`blank-${i}`}
            style={{
              minHeight: 96,
              border: "1px solid #eee",
              borderRadius: 10,
              background: "#fafafa",
            }}
          />
        ))}

        {/* Day cells */}
        {Array.from({ length: monthDays }).map((_, i) => {
          const day = i + 1;
          const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
          const key = localDateKey(cellDate);
          const dayBookings = bookingsByDay.get(key) ?? [];
          const isSelected = selectedDayKey === key;

          return (
            <button
              key={key}
              onClick={() => setSelectedDayKey(key)}
              style={{
                textAlign: "left",
                minHeight: 96,
                padding: 10,
                borderRadius: 10,
                border: isSelected ? "2px solid #333" : "1px solid #eee",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <strong>{day}</strong>
                {dayBookings.length > 0 && (
                  <span style={{ fontSize: 12, opacity: 0.8 }}>
                    {dayBookings.length} booking{dayBookings.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                {dayBookings.slice(0, 2).map((b) => {
                  const t = new Date(b.dateTime).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={b.id}
                      style={{
                        fontSize: 12,
                        padding: "4px 6px",
                        borderRadius: 8,
                        background: "#f6f6f6",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={`${t} — ${b.artist.name} @ ${b.venue.name}`}
                    >
                      {t} — {b.artist.name}
                    </div>
                  );
                })}
                {dayBookings.length > 2 && (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>+{dayBookings.length - 2} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail panel */}
      <div style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 8, fontSize: 18 }}>
          {selectedDayKey ? `Bookings on ${selectedDayKey}` : "Select a day"}
        </h2>

        {!selectedDayKey && <p>Click a day in the calendar to see full details.</p>}

        {selectedDayKey && selectedBookings.length === 0 && <p>No bookings for this day.</p>}

        {selectedDayKey && selectedBookings.length > 0 && (
          <ul style={{ paddingLeft: 18 }}>
            {selectedBookings.map((b) => (
              <li key={b.id} style={{ marginBottom: 8 }}>
                <strong>
                  {new Date(b.dateTime).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>{" "}
                — {b.artist.name} @ {b.venue.name}
                {b.venue.postcode ? ` (${b.venue.postcode})` : ""}
                {b.notes ? ` — ${b.notes}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
