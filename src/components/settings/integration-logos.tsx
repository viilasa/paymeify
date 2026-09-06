import { cn } from "@/lib/utils";

export function UpiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-full", className)} aria-hidden>
      <rect width="40" height="40" rx="9" fill="#097939" />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        fill="#fff"
        fontSize="11"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        UPI
      </text>
    </svg>
  );
}

export function RazorpayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-full", className)} aria-hidden>
      <rect width="40" height="40" rx="9" fill="#072654" />
      <path
        d="M13 11.5h9.4c4.1 0 6.8 2.2 6.8 5.7 0 2.6-1.5 4.5-3.9 5.3l4.7 6h-4.6l-4.2-5.5h-4.1V28.5H13V11.5Zm4.1 3.4v4.4h4.8c1.8 0 2.9-1 2.9-2.3 0-1.3-1.1-2.1-2.9-2.1H17.1Z"
        fill="#fff"
      />
      <path d="M24.2 28.5 20 22.6l2.6-1.6 5.7 7.5H24.2Z" fill="#3395FF" />
    </svg>
  );
}

export function StripeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-full", className)} aria-hidden>
      <rect width="40" height="40" rx="9" fill="#635BFF" />
      <path
        d="M18.7 17.1c0-.8.7-1.1 1.9-1.1 1.7 0 3.8.5 5.5 1.4V13c-1.8-.7-3.6-1-5.5-1-4.5 0-7.5 2.3-7.5 6.2 0 6 8.3 5.1 8.3 7.7 0 .9-.8 1.2-2.1 1.2-1.8 0-4.2-.8-6.1-1.8v4.5c2 .9 4.2 1.3 6.1 1.3 4.6 0 7.8-2.3 7.8-6.2 0-6.5-8.4-5.3-8.4-7.8Z"
        fill="#fff"
      />
    </svg>
  );
}
