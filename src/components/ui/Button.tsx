import React from "react";
import { colors } from "./theme";

type Variant = "primary" | "secondary" | "ghost";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: React.ReactNode;
};

const base: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 8,
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  lineHeight: 1.2,
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: {
    background: colors.brand,
    color: "#fff",
    border: "none",
  },
  secondary: {
    background: colors.surface,
    color: colors.brand,
    border: `1px solid ${colors.border}`,
  },
  ghost: {
    background: "transparent",
    color: colors.brand,
    border: "none",
    padding: "6px 0",
  },
};

export default function Button({
  variant = "primary",
  icon,
  children,
  disabled,
  style,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...base,
        ...variants[variant],
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
