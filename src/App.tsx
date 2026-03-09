import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import Venues from "./pages/Venues";
import Artists from "./pages/Artists";
import Bookings from "./pages/Bookings";
import NewBooking from "./pages/NewBooking";
import Calendar from "./pages/Calendar";


const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  textDecoration: "none",
  padding: "6px 10px",
  borderRadius: 8,
  background: isActive ? "#eee" : "transparent",
  color: "inherit",
});

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
        <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <strong style={{ marginRight: 8 }}>Rostar</strong>
          <NavLink to="/" style={linkStyle} end>
            Home
          </NavLink>
          <NavLink to="/venues" style={linkStyle}>
            Venues
          </NavLink>
          <NavLink to="/artists" style={linkStyle}>
            Artists
          </NavLink>
          <NavLink to="/bookings" style={linkStyle}>
            Bookings
          </NavLink>
          <NavLink to="/bookings/new" style={linkStyle}>
            New Booking
          </NavLink>
          <NavLink to="/calendar" style={linkStyle}>
          Calendar
          </NavLink>

        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/new" element={<NewBooking />} />
          <Route path="/calendar" element={<Calendar />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
