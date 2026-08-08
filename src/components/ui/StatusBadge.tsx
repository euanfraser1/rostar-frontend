import { statusTone, type StatusTone } from "./theme";

type Props = {
  tone: StatusTone;
  label?: string;
  uppercase?: boolean;
};

export default function StatusBadge({ tone, label, uppercase = true }: Props) {
  const cfg = statusTone[tone];
  const text = label ?? cfg.label;
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: 6,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: uppercase ? "uppercase" : "none",
        background: cfg.bg,
        color: cfg.color,
        lineHeight: 1.4,
      }}
    >
      {text}
    </span>
  );
}
