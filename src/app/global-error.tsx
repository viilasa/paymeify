"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#090909",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.25rem",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ marginTop: 8, fontSize: 13, color: "#8a8a8a" }}>
            The application could not load.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              background: "#f5f5f5",
              color: "#090909",
              border: 0,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
