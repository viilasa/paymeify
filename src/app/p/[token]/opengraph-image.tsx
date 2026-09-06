import { ImageResponse } from "next/og";

import { getPublicProject } from "@/lib/data/public-project";

export const alt = "Paymeify project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ProjectOpenGraphImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getPublicProject(token);
  const name = view?.project.name ?? "Project link";
  const studio = view?.project.business_name ?? "Paymeify";
  const remaining = view
    ? `${view.totals.completedCount} of ${view.totals.milestoneCount} milestones completed`
    : "Share progress and collect milestone payments.";

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
        <div style={{ display: "flex", fontSize: 22, color: "#8a8a8a" }}>{studio}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
              maxWidth: 980,
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 26, color: "#8a8a8a" }}>{remaining}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: "#5f5f5f" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "#f5f5f5",
              color: "#090909",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            P
          </div>
          Paymeify
        </div>
      </div>
    ),
    { ...size },
  );
}
