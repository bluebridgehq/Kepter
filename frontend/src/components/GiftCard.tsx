import type { CSSProperties } from "react";

interface GiftCardProps {
  shop: string;
  amount: string;
  label: string;
  tag: string;
  footLeft?: string;
  footRight?: string;
  className?: string;
  style?: CSSProperties;
}

/** The card visual from the design handoff. Sizes scale with the container width. */
export function GiftCard({ shop, amount, label, tag, footLeft, footRight, className, style }: GiftCardProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1.586",
        borderRadius: 22,
        overflow: "hidden",
        background: "#0F4C3A",
        color: "#FFFFFF",
        boxShadow: "0 22px 44px -22px rgba(10,40,30,.6), 0 2px 6px rgba(0,0,0,.08)",
        containerType: "inline-size",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.10) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-18%",
          top: "-45%",
          width: "75%",
          aspectRatio: "1",
          borderRadius: "50%",
          border: "1.5px solid rgba(255,255,255,.10)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-8%",
          top: "-25%",
          width: "52%",
          aspectRatio: "1",
          borderRadius: "50%",
          border: "1.5px solid rgba(255,255,255,.08)",
        }}
      />
      <div style={{ position: "absolute", top: 0, bottom: 0, right: "17%", width: "7%", background: "#F2A33A" }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: "calc(17% + 7%)",
          width: "1.2%",
          background: "rgba(255,255,255,.18)",
        }}
      />
      <div
        style={{
          position: "relative",
          height: "100%",
          boxSizing: "border-box",
          padding: "6.5cqw 7cqw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2cqw", maxWidth: "66%" }}>
          <div
            style={{
              fontSize: "3.4cqw",
              fontWeight: 600,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,.72)",
            }}
          >
            {tag}
          </div>
          <div
            style={{
              fontSize: "6.4cqw",
              fontWeight: 700,
              lineHeight: 1.12,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            {shop}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.4cqw", maxWidth: "72%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: ".6cqw" }}>
            <div style={{ fontSize: "3.4cqw", fontWeight: 500, color: "rgba(255,255,255,.75)" }}>{label}</div>
            <div
              style={{
                fontSize: "13cqw",
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "-.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {amount}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "4cqw",
              fontSize: "3.5cqw",
              fontWeight: 500,
              color: "rgba(255,255,255,.82)",
              whiteSpace: "nowrap",
            }}
          >
            {footLeft && <span>{footLeft}</span>}
            {footRight && <span>{footRight}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
