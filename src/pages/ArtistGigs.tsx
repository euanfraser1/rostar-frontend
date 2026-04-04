import { useEffect, useState } from "react";
import { apiGet } from "../api/http";
import type { AuthUser } from "../api/auth";
import { fetchCurrentUser } from "../api/auth";

type EventWithRelations = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  status: "UNBOOKED" | "OFFERED" | "CONFIRMED";
  venue: {
    id: string;
    name: string;
    postcode: string;
  };
};

export default function ArtistGigs() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<EventWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      const current = await fetchCurrentUser();
      if (!mounted) return;
      if (!current) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      setUser(current);
      try {
        const data = await apiGet<EventWithRelations[]>("/events");
        if (!mounted) return;
        setEvents(data);
      } catch (e) {
        if (!mounted) return;
        setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div>Loading gigs...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div>
      <h1>My Gigs</h1>
      {user && (
        <p style={{ fontSize: 14, color: "#555" }}>
          Logged in as {user.email}
        </p>
      )}
      {events.length === 0 ? (
        <p>No gigs found.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 8 }}>Date</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 8 }}>Time</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 8 }}>Venue</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 8 }}>Postcode</th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const start = new Date(ev.startDateTime);
              const end = new Date(ev.endDateTime);
              return (
                <tr key={ev.id}>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    {start.toLocaleDateString()}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                    {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{ev.venue.name}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{ev.venue.postcode}</td>
                  <td style={{ borderBottom: "1px solid #1px solid #eee", padding: 8 }}>{ev.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

