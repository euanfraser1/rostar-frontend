import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "../api/auth";
import { colors } from "./ui";

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function UserMenu({
  user,
  displayName,
  onLogout,
}: {
  user: AuthUser;
  displayName: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          padding: "6px 8px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "inherit",
        }}
      >
        <PersonIcon />
        <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayName}
        </span>
        <ChevronIcon />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 200,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(16, 24, 40, 0.12)",
            padding: 6,
            zIndex: 50,
          }}
        >
          <div style={{ padding: "8px 10px", fontSize: 12, color: colors.textMuted }}>
            {user.email}
          </div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "9px 10px",
              border: "none",
              background: "transparent",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: colors.brand,
              fontFamily: "inherit",
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
