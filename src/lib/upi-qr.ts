import QRCode from "qrcode";

/**
 * Renders a UPI URI as an inline SVG QR code.
 *
 * Drawn dark-on-white rather than themed to the dark UI: phone cameras are
 * markedly less reliable at reading inverted codes, and a payment that will not
 * scan is worse than one that clashes.
 *
 * Rendered on the server so the QR is in the first paint and `qrcode` never
 * reaches the browser bundle.
 */
export async function upiQrSvg(uri: string): Promise<string> {
  if (typeof window !== "undefined") {
    throw new Error("QR rendering is server-only.");
  }

  return QRCode.toString(uri, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}
