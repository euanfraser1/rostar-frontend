/** Shared brand tokens used across artist / venue / admin portals. */
export const colors = {
  brand: "#c41e3a",
  brandHover: "#a81a31",
  brandSoft: "#fdecea",
  brandSoftBg: "#fdf2f4",
  text: "#111827",
  textMuted: "#6b7280",
  textSubtle: "#9ca3af",
  border: "#e5e7eb",
  surface: "#ffffff",
  pageBg: "#f3f4f6",
  sidebarBg: "#f3f4f6",
  success: "#1a7a4a",
  successBg: "#e6f9f0",
  successSoft: "#dcfce7",
  warning: "#7a5700",
  warningBg: "#fff4cc",
  warningDot: "#fdbc00",
  info: "#2a5298",
  infoBg: "#dde8f5",
  infoDot: "#5a82c4",
  danger: "#a10000",
} as const;

export type StatusTone = "confirmed" | "pending" | "offered" | "unbooked" | "available";

export const statusTone: Record<
  StatusTone,
  { label: string; bg: string; color: string; bar: string }
> = {
  confirmed: {
    label: "Confirmed",
    bg: colors.successBg,
    color: colors.success,
    bar: colors.infoDot,
  },
  pending: {
    label: "Pending",
    bg: colors.warningBg,
    color: colors.warning,
    bar: colors.warningDot,
  },
  offered: {
    label: "Offered",
    bg: colors.warningBg,
    color: colors.warning,
    bar: colors.warningDot,
  },
  unbooked: {
    label: "Unbooked",
    bg: colors.infoBg,
    color: colors.info,
    bar: colors.infoDot,
  },
  available: {
    label: "You're available",
    bg: colors.successBg,
    color: colors.success,
    bar: "#22c55e",
  },
};
