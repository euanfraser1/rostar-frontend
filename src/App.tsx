import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, Outlet } from "react-router-dom";
import Venues from "./pages/Venues";
import Artists from "./pages/Artists";
import Calendar from "./pages/Calendar";
import NewEvent from "./pages/NewEvent";
import Login from "./pages/Login";
import ArtistGigs from "./pages/ArtistGigs";
import ArtistUnavailability from "./pages/ArtistUnavailability";
import VenueCalendar from "./pages/VenueCalendar";
import Invoices from "./pages/Invoices";
import { fetchCurrentUser, type AuthUser, logout } from "./api/auth";
import { apiGet } from "./api/http";

// ── Icons ─────────────────────────────────────────────────────────────────────

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function CalendarIcon() {
  return (
    <NavIcon>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </NavIcon>
  );
}

function BookingsIcon() {
  return (
    <NavIcon>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </NavIcon>
  );
}

function VenuesIcon() {
  return (
    <NavIcon>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4" />
    </NavIcon>
  );
}

function InvoicesIcon() {
  return (
    <NavIcon>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      <path d="M3 7h5" />
      <path d="M3 11h4" />
      <path d="M3 15h3" />
    </NavIcon>
  );
}

function ArtistsIcon() {
  return (
    <NavIcon>
      <path d="M18 7.16C17.94 7.15 17.87 7.15 17.81 7.16C16.43 7.11 15.33 5.98 15.33 4.58C15.33 3.15 16.48 2 17.91 2C19.34 2 20.49 3.16 20.49 4.58C20.48 5.98 19.38 7.11 18 7.16Z" />
      <path d="M16.97 14.44C18.34 14.67 19.85 14.43 20.91 13.72C22.32 12.78 22.32 11.24 20.91 10.3C19.84 9.59 18.31 9.35 16.94 9.59" />
      <path d="M5.97 7.16C6.03 7.15 6.1 7.15 6.16 7.16C7.54 7.11 8.64 5.98 8.64 4.58C8.64 3.15 7.49 2 6.06 2C4.63 2 3.48 3.16 3.48 4.58C3.49 5.98 4.59 7.11 5.97 7.16Z" />
      <path d="M7 14.44C5.63 14.67 4.12 14.43 3.06 13.72C1.65 12.78 1.65 11.24 3.06 10.3C4.13 9.59 5.66 9.35 7.03 9.59" />
      <path d="M12 14.63C11.94 14.62 11.87 14.62 11.81 14.63C10.43 14.58 9.33 13.45 9.33 12.05C9.33 10.62 10.48 9.47 11.91 9.47C13.34 9.47 14.49 10.63 14.49 12.05C14.48 13.45 13.38 14.59 12 14.63Z" />
      <path d="M9.09 17.78C7.68 18.72 7.68 20.26 9.09 21.2C10.69 22.27 13.31 22.27 14.91 21.2C16.32 20.26 16.32 18.72 14.91 17.78C13.32 16.72 10.69 16.72 9.09 17.78Z" />
    </NavIcon>
  );
}

function UnavailabilityIcon() {
  return (
    <NavIcon>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </NavIcon>
  );
}

// ── Upcoming events sidebar widget ────────────────────────────────────────────

type SidebarEvent = {
  id: string;
  startDateTime: string;
  status: "UNBOOKED" | "OFFERED" | "CONFIRMED";
  venue: { id: string; name: string };
  artist: { id: string; name: string } | null;
};

const SIDEBAR_EVENT_DOT: Record<SidebarEvent["status"], string> = {
  UNBOOKED: "#5a82c4",
  OFFERED:  "#fdbc00",
  CONFIRMED: "#a10000",
};

function UpcomingEvents() {
  const [events, setEvents] = useState<SidebarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({ from: now, to: future });
    apiGet<SidebarEvent[]>(`/events?${params}`)
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
        );
        setEvents(sorted.slice(0, 5));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        height: 1, background: "#e5e7eb", margin: "8px 4px 14px",
      }} />
      <div style={{
        fontSize: 11, fontWeight: 600, color: "#9ca3af",
        textTransform: "uppercase", letterSpacing: "0.06em",
        padding: "0 4px", marginBottom: 8,
      }}>
        Upcoming
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: "#9ca3af", padding: "0 4px" }}>Loading…</div>
      )}

      {!loading && events.length === 0 && (
        <div style={{ fontSize: 12, color: "#9ca3af", padding: "0 4px" }}>No upcoming events</div>
      )}

      {!loading && events.length > 0 && (
        <div style={{ display: "grid", gap: 5 }}>
          {events.map((ev) => {
            const d = new Date(ev.startDateTime);
            const label = ev.status === "CONFIRMED" && ev.artist
              ? ev.artist.name
              : ev.venue.name;
            const dot = SIDEBAR_EVENT_DOT[ev.status];
            return (
              <div
                key={ev.id}
                style={{
                  padding: "7px 10px", borderRadius: 8,
                  background: "#f9fafb", borderLeft: `3px solid ${dot}`,
                }}
              >
                <div style={{
                  fontWeight: 600, fontSize: 12, color: "#374151",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {label}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  {d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  {" · "}
                  {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: AuthUser };

// ── Shared layout shell ───────────────────────────────────────────────────────

const sidebarNavStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 8,
  textDecoration: "none",
  color: isActive ? "#c41e3a" : "#374151",
  background: isActive ? "#fdecea" : "transparent",
  fontWeight: isActive ? 600 : 400,
  fontSize: 14,
});

const topTabStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.45)",
  color: "#fff",
  borderRadius: 6,
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const logoutBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  color: "#c41e3a",
  background: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 13,
};

function AppShell({
  user,
  onLogout,
  sidebar,
}: {
  user: AuthUser;
  onLogout: () => void;
  sidebar: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Top bar */}
      <header
        style={{
          background: "#c41e3a",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          height: 64,
          flexShrink: 0,
        }}
      >
        <img
          src="/rostar-logo.png"
          alt="Rostar"
          style={{ height: 48, width: "auto", mixBlendMode: "lighten" }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {(["Settings", "Help", "My Account"] as const).map((label) => (
            <button key={label} type="button" style={topTabStyle}>
              {label}
            </button>
          ))}
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginLeft: 10 }}>
            {user.email}
          </span>
          <button type="button" onClick={onLogout} style={logoutBtnStyle}>
            Logout
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left sidebar */}
        <nav
          style={{
            width: 220,
            background: "#fff",
            borderRight: "1px solid #e5e7eb",
            padding: "20px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flexShrink: 0,
            overflowY: "auto",
          }}
        >
          {sidebar}
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, overflow: "auto", padding: "24px", background: "#f9fafb" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Admin layout ──────────────────────────────────────────────────────────────

function AdminLayout({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <AppShell
      user={user}
      onLogout={onLogout}
      sidebar={
        <>
          <NavLink to="/calendar" style={sidebarNavStyle}>
            <CalendarIcon /> Calendar
          </NavLink>
          <NavLink to="/events/new" style={sidebarNavStyle}>
            <BookingsIcon /> Bookings
          </NavLink>
          <NavLink to="/venues" style={sidebarNavStyle}>
            <VenuesIcon /> Venues
          </NavLink>
          <NavLink to="/artists" style={sidebarNavStyle}>
            <ArtistsIcon /> Artists
          </NavLink>
          <NavLink to="/invoices" style={sidebarNavStyle}>
            <InvoicesIcon /> Invoices
          </NavLink>
          <UpcomingEvents />
        </>
      }
    />
  );
}

function AdminLayoutRoute() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser().then((user) => {
      if (!mounted) return;
      if (!user) setAuth({ status: "unauthenticated" });
      else setAuth({ status: "authenticated", user });
    });
    return () => { mounted = false; };
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  if (auth.status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
  if (auth.status === "unauthenticated") return <Navigate to="/login" replace />;
  if (auth.user.role !== "ADMIN") return <div style={{ padding: 24 }}>Not authorised</div>;

  return <AdminLayout user={auth.user} onLogout={handleLogout} />;
}

// ── Artist layout ─────────────────────────────────────────────────────────────

function ArtistLayout({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <AppShell
      user={user}
      onLogout={onLogout}
      sidebar={
        <>
          <NavLink to="/artist/calendar" style={sidebarNavStyle}>
            <CalendarIcon /> Calendar
          </NavLink>
          <NavLink to="/artist/unavailability" style={sidebarNavStyle}>
            <UnavailabilityIcon /> Unavailability
          </NavLink>
          <UpcomingEvents />
        </>
      }
    />
  );
}

function ArtistLayoutRoute() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser().then((user) => {
      if (!mounted) return;
      if (!user) setAuth({ status: "unauthenticated" });
      else setAuth({ status: "authenticated", user });
    });
    return () => { mounted = false; };
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  if (auth.status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
  if (auth.status === "unauthenticated") return <Navigate to="/login" replace />;
  if (auth.user.role !== "ARTIST") return <div style={{ padding: 24 }}>Not authorised</div>;
  if (auth.user.artistId === null) {
    return (
      <div style={{ padding: 24, color: "#555" }}>
        Your account is not linked to an artist profile. Please contact Rostar.
      </div>
    );
  }

  return <ArtistLayout user={auth.user} onLogout={handleLogout} />;
}

// ── Venue layout ──────────────────────────────────────────────────────────────

function VenueLayout({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <AppShell
      user={user}
      onLogout={onLogout}
      sidebar={
        <>
          <NavLink to="/venue/calendar" style={sidebarNavStyle}>
            <CalendarIcon /> My Calendar
          </NavLink>
          <UpcomingEvents />
        </>
      }
    />
  );
}

function VenueLayoutRoute() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser().then((user) => {
      if (!mounted) return;
      if (!user) setAuth({ status: "unauthenticated" });
      else setAuth({ status: "authenticated", user });
    });
    return () => { mounted = false; };
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  if (auth.status === "loading") return <div style={{ padding: 24 }}>Loading...</div>;
  if (auth.status === "unauthenticated") return <Navigate to="/login" replace />;
  if (auth.user.role !== "VENUE") return <div style={{ padding: 24 }}>Not authorised</div>;
  if (auth.user.venueId === null) {
    return (
      <div style={{ padding: 24, color: "#555" }}>
        Your account is not linked to a venue. Please contact Rostar.
      </div>
    );
  }

  return <VenueLayout user={auth.user} onLogout={handleLogout} />;
}

// ── App ───────────────────────────────────────────────────────────────────────

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/calendar" replace />} />

      <Route element={<AdminLayoutRoute />}>
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/events/new" element={<NewEvent />} />
        <Route path="/venues" element={<Venues />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/invoices" element={<Invoices />} />
      </Route>

      <Route element={<ArtistLayoutRoute />}>
        <Route path="/artist/calendar" element={<ArtistGigs />} />
        <Route path="/artist/unavailability" element={<ArtistUnavailability />} />
      </Route>
      <Route path="/artist/gigs" element={<Navigate to="/artist/calendar" replace />} />

      <Route element={<VenueLayoutRoute />}>
        <Route path="/venue/calendar" element={<VenueCalendar />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
