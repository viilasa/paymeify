"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      duration={3500}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "!bg-[#141414] !border !border-[#242424] !text-[#f5f5f5] !rounded-[8px] !text-[13px] !shadow-lg !shadow-black/40",
          description: "!text-[#8a8a8a]",
          actionButton: "!bg-[#f5f5f5] !text-[#090909]",
          cancelButton: "!bg-[#1f1f1f] !text-[#f5f5f5]",
          error: "!text-[#e5646f]",
          success: "!text-[#4ade80]",
        },
      }}
    />
  );
}
