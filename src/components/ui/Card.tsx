import React from "react";
import { colors } from "./theme";

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: number | string;
};

export default function Card({ children, style, padding = 20 }: Props) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding,
        boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
