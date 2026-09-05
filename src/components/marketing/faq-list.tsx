import type { FaqItem } from "@/lib/content/faq";

export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <details key={item.question} className="group py-4">
          <summary className="cursor-pointer list-none text-[14px] font-medium marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-start justify-between gap-4">
              {item.question}
              <span
                aria-hidden
                className="mt-0.5 text-[13px] text-subtle-foreground transition-transform group-open:rotate-45"
              >
                +
              </span>
            </span>
          </summary>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
