import { ImageResponse } from "next/og";

export const alt = "Paymeify — Projects delivered. Payments tracked.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "#f5f5f5",
              color: "#090909",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.4 }}>
            Paymeify
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              letterSpacing: -1.6,
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            Projects delivered. Payments tracked.
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#8a8a8a",
              maxWidth: 760,
              lineHeight: 1.4,
            }}
          >
            Milestone tracker for freelancers. Share one link. Get paid by UPI
            in India or Razorpay anywhere.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
