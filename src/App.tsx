import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
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


const headerLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  textDecoration: "none",
  padding: "10px 16px",
  borderRadius: 8,
  background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
  color: "#fff",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 5,
  fontSize: 13,
  fontWeight: 500,
  minWidth: 72,
});

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="26"
      height="26"
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

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: AuthUser };

function AdminRoute({ children }: { children: React.ReactElement }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser().then((user) => {
      if (!mounted) return;
      if (!user) {
        setAuth({ status: "unauthenticated" });
      } else {
        setAuth({ status: "authenticated", user });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (auth.status === "loading") {
    return <div>Loading...</div>;
  }
  if (auth.status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  if (auth.user.role !== "ADMIN") {
    return <div>Not authorised</div>;
  }
  return children;
}

function ArtistRoute({ children }: { children: React.ReactElement }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser().then((user) => {
      if (!mounted) return;
      if (!user) {
        setAuth({ status: "unauthenticated" });
      } else {
        setAuth({ status: "authenticated", user });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (auth.status === "loading") {
    return <div>Loading...</div>;
  }
  if (auth.status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  if (auth.user.role !== "ARTIST") {
    return <div>Not authorised</div>;
  }
  if (auth.user.artistId === null) {
    return (
      <div style={{ padding: 24, color: "#555" }}>
        Your account is not linked to an artist profile. Please contact Rostar.
      </div>
    );
  }
  return children;
}

function VenueRoute({ children }: { children: React.ReactElement }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser().then((user) => {
      if (!mounted) return;
      if (!user) {
        setAuth({ status: "unauthenticated" });
      } else {
        setAuth({ status: "authenticated", user });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (auth.status === "loading") {
    return <div>Loading...</div>;
  }
  if (auth.status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }
  if (auth.user.role !== "VENUE") {
    return <div>Not authorised</div>;
  }
  if (auth.user.venueId === null) {
    return (
      <div style={{ padding: 24, color: "#555" }}>
        Your account is not linked to a venue. Please contact Rostar.
      </div>
    );
  }
  return children;
}

function Layout({ auth }: { auth: AuthState }) {
  const user = auth.status === "authenticated" ? auth.user : null;

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#c41e3a",
        padding: "8px 0",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          minHeight: 80,
        }}
      >
        <img
          src="/rostar-logo.png"
          alt="Rostar"
          style={{
            height: 64,
            width: "auto",
            display: "block",
            mixBlendMode: "lighten",
          }}
        />
        {user?.role === "ADMIN" && (
          <>
            <NavLink to="/calendar" style={headerLinkStyle}>
              <CalendarIcon />
              Calendar
            </NavLink>
            <NavLink to="/events/new" style={headerLinkStyle}>
              <BookingsIcon />
              Bookings
            </NavLink>
            <NavLink to="/venues" style={headerLinkStyle}>
              <VenuesIcon />
              Venues
            </NavLink>
            <NavLink to="/artists" style={headerLinkStyle}>
              <ArtistsIcon />
              Artists
            </NavLink>
            <NavLink to="/invoices" style={headerLinkStyle}>
              <InvoicesIcon />
              Invoices
            </NavLink>
          </>
        )}
        {user?.role === "ARTIST" && (
          <>
            <NavLink to="/artist/gigs" style={headerLinkStyle}>
              My Gigs
            </NavLink>
            <NavLink to="/artist/unavailability" style={headerLinkStyle}>
              Unavailability
            </NavLink>
          </>
        )}
        {user?.role === "VENUE" && (
          <NavLink to="/venue/calendar" style={headerLinkStyle}>
            <CalendarIcon />
            My Calendar
          </NavLink>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {user ? (
            <>
              <span style={{ fontSize: 12, color: "#fff" }}>{user.email} ({user.role})</span>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "4px 12px",
                  color: "#c41e3a",
                  background: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" style={headerLinkStyle}>
              Login
            </NavLink>
          )}
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (!user) {
        setAuth({ status: "unauthenticated" });
      } else {
        setAuth({ status: "authenticated", user });
      }
    });
  }, [location.pathname]);

  return (
    <>
      <Layout auth={auth} />
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 24px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route
          path="/venues"
          element={
            <AdminRoute>
              <Venues />
            </AdminRoute>
          }
        />
        <Route
          path="/artists"
          element={
            <AdminRoute>
              <Artists />
            </AdminRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <AdminRoute>
              <Calendar />
            </AdminRoute>
          }
        />
        <Route
          path="/events/new"
          element={
            <AdminRoute>
              <NewEvent />
            </AdminRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <AdminRoute>
              <Invoices />
            </AdminRoute>
          }
        />
        <Route
          path="/artist/gigs"
          element={
            <ArtistRoute>
              <ArtistGigs />
            </ArtistRoute>
          }
        />
        <Route
          path="/artist/unavailability"
          element={
            <ArtistRoute>
              <ArtistUnavailability />
            </ArtistRoute>
          }
        />
        <Route
          path="/venue/calendar"
          element={
            <VenueRoute>
              <VenueCalendar />
            </VenueRoute>
          }
        />
      </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
