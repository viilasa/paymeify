"use client";

export function InvoicePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-[#111] px-3 py-1.5 text-[12px] font-medium text-white"
    >
      Print / PDF
    </button>
  );
}
