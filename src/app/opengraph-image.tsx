import { ImageResponse } from "next/og";

import { brandLogoSrc } from "@/lib/brand-logo";

export const alt = "Paymeify — Projects delivered. Payments tracked.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await brandLogoSrc();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#090909",
          color: "#f5f5f5",
          padding: "72px 80px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src={logo}
            alt=""
            width={44}
            height={44}
            style={{ width: 44, height: 44, borderRadius: 10 }}
          />
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.03em" }}>
            Paymeify
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 600,
              letterSpacing: "-0.045em",
              lineHeight: 1.05,
              maxWidth: 920,
            }}
          >
            Projects delivered. Payments tracked.
          </div>
          <div style={{ fontSize: 28, color: "#8a8a8a", maxWidth: 760, lineHeight: 1.35 }}>
            Create milestones, share one project link, and get paid as you deliver.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
