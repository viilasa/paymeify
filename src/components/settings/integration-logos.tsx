import { cn } from "@/lib/utils";

export function GPayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-full", className)} aria-hidden>
      <rect width="40" height="40" rx="9" fill="#fff" />
      <g transform="translate(8 8)">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </g>
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
