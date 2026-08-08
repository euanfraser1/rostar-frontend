import { colors } from "./theme";

type Props = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 700,
          color: colors.text,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 14,
            color: colors.textMuted,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
