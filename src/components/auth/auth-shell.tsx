import * as React from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-[18px] font-medium tracking-tight">{title}</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
      <div className="mt-7">{children}</div>
      {footer ? (
        <div className="mt-6 text-[13px] text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  );
}
