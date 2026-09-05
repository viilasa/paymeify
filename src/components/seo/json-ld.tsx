/**
 * Emits one JSON-LD script. Search engines and answer engines read this as
 * structured facts — keep payloads in `@/lib/seo`, not inline in pages.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
