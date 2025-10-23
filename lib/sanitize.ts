import DOMPurify from "dompurify"

// Sanitizer for HTML before export/save
export function sanitizeHTML(html: string): string {
  if (typeof window === "undefined") return html // SSR-guard
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
