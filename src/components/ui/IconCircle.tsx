import React from "react";
import { colors } from "./theme";

type Tone = "brand" | "success";

type Props = {
  children: React.ReactNode;
  tone?: Tone;
  size?: number;
};

const tones: Record<Tone, { bg: string; color: string }> = {
  brand: { bg: colors.brandSoft, color: colors.brand },
  success: { bg: colors.successSoft, color: colors.success },
};

export default function IconCircle({ children, tone = "brand", size = 40 }: Props) {
  const t = tones[tone];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: t.bg,
        color: t.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}
