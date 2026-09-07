import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoicePrintButton } from "@/components/client-portal/invoice-print-button";
import { formatDate, formatMoney } from "@/lib/format";
import { getInvoiceByTokenAndPosition } from "@/lib/invoices";
import { projectPortalUrl } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; position: string }>;
}): Promise<Metadata> {
  const { token, position } = await params;
  const pos = Number(position);
  const view = Number.isInteger(pos) ? await getInvoiceByTokenAndPosition(token, pos) : null;
  return {
    title: view ? `Invoice ${view.invoice.number}` : "Invoice",
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string; position: string }>;
}) {
  const { token, position: positionRaw } = await params;
  const position = Number(positionRaw);
  if (!Number.isInteger(position) || position < 1) notFound();

  const view = await getInvoiceByTokenAndPosition(token, position);
  if (!view) notFound();

  const { invoice, project } = view;
  const portalUrl = projectPortalUrl(project);
  const isPaid = invoice.status === "paid";

  return (
    <div className="min-h-screen bg-[#f4f4f5] px-4 py-10 text-[#111] print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-160">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <p className="text-[12px] text-[#666]">Paymeify invoice</p>
          <div className="flex gap-2">
            <Link
              href={portalUrl}
              className="rounded-lg border border-[#ddd] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111]"
            >
              Open project
            </Link>
            <InvoicePrintButton />
          </div>
        </div>

        <article className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm sm:p-8 print:border-0 print:shadow-none">
          <header className="flex flex-col gap-4 border-b border-[#eee] pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] tracking-[0.08em] text-[#888] uppercase">Invoice</p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-tight">{invoice.number}</h1>
              <p className="mt-2 text-[13px] text-[#555]">{project.name}</p>
            </div>
            <div
              className={`inline-flex self-start rounded-full px-2.5 py-1 text-[11px] font-medium ${
                isPaid ? "bg-[#e8f7ee] text-[#0f7a3a]" : "bg-[#fff4e5] text-[#9a6700]"
              }`}
            >
              {isPaid ? "Paid" : "Due"}
            </div>
          </header>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] tracking-[0.06em] text-[#888] uppercase">From</p>
              <p className="mt-1 text-[14px] font-medium">{invoice.from_name}</p>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.06em] text-[#888] uppercase">Bill to</p>
              <p className="mt-1 text-[14px] font-medium">{invoice.client_name}</p>
              {invoice.client_email ? (
                <p className="mt-0.5 text-[13px] text-[#555]">{invoice.client_email}</p>
              ) : null}
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-[13px] sm:grid-cols-3">
            <div>
              <dt className="text-[#888]">Issued</dt>
              <dd className="mt-0.5 font-medium">{formatDate(invoice.issued_at)}</dd>
            </div>
            <div>
              <dt className="text-[#888]">Due</dt>
              <dd className="mt-0.5 font-medium">{formatDate(invoice.due_date)}</dd>
            </div>
            {isPaid && invoice.paid_at ? (
              <div>
                <dt className="text-[#888]">Paid on</dt>
                <dd className="mt-0.5 font-medium">{formatDate(invoice.paid_at)}</dd>
              </div>
            ) : null}
          </dl>

          <table className="mt-8 w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#eee] text-[#888]">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#f3f3f3]">
                <td className="py-3 pr-4">{invoice.line_title}</td>
                <td className="py-3 text-right tabular-nums">
                  {formatMoney(Number(invoice.amount), invoice.currency)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-4 text-right font-medium">Total</td>
                <td className="pt-4 text-right text-[16px] font-semibold tabular-nums">
                  {formatMoney(Number(invoice.amount), invoice.currency)}
                </td>
              </tr>
            </tfoot>
          </table>

          {!isPaid ? (
            <div className="mt-8 print:hidden">
              <Link
                href={portalUrl}
                className="inline-flex rounded-lg bg-[#111] px-4 py-2.5 text-[13px] font-medium text-white"
              >
                Pay now
              </Link>
              <p className="mt-2 text-[12px] text-[#777]">
                Opens your project link to pay this milestone.
              </p>
            </div>
          ) : null}

          <p className="mt-10 text-[11px] leading-relaxed text-[#999]">
            This is a payment invoice from Paymeify, not a GST tax invoice. For tax
            paperwork, ask the freelancer directly.
          </p>
        </article>
      </div>
    </div>
  );
}
