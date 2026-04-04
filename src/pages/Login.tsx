import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("adminpassword");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    const user = result.data;
    if (user.role === "ADMIN") {
      navigate("/");
    } else if (user.role === "ARTIST") {
      navigate("/artist/gigs");
    } else {
      navigate("/");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          <div>Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          />
        </label>
        <label>
          <div>Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          />
        </label>
        {error && (
          <div style={{ color: "red", fontSize: 14 }}>
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} style={{ padding: "8px 12px" }}>
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 12, color: "#555" }}>
        Dev accounts: <br />
        Admin – admin@example.com / adminpassword <br />
        Artist – artist@example.com / artistpassword
      </p>
    </div>
  );
}

