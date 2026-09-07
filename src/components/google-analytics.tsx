import Script from "next/script";

import { site } from "@/lib/seo";

/** Loads Google Analytics only on the production host so local/preview traffic stays out. */
export function GoogleAnalytics() {
  if (process.env.VERCEL_ENV !== "production") return null;

  const id = site.gaMeasurementId;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `}
      </Script>
    </>
  );
}
