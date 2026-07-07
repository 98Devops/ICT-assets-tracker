# premium-ui-system

**When to use:** building any IATS screen or component. If it looks like a default shadcn demo, it is not done.

## Tokens (tailwind.config.js)
- Ink `#1A1714` (dark surfaces/sidebar), ink-muted `#57504A` (secondary text)
- Surface `#FBF8F4`, panel `#F4EFE9`, hairline `#D9D2CA`
- Ember `#C1440E` — SPARINGLY: primary actions, active nav, key numbers only
- Status: active green `#1B7F4B`, faulty/lost red `#C0392B`, in_repair amber `#B7791F`, retired gray

## Type
- `font-display` (Fraunces) for h1–h3 · `font-sans` (Archivo) for UI · `font-mono` (JetBrains Mono) for asset tags, serials, money, big stat numerals.

## Rules
- Dark ink sidebar, light content; ember left-border on active nav item.
- Spacing on 4/8px scale; generous whitespace; 150–200ms transitions.
- Loading = skeletons (`PageSkeleton`), never full-page spinners.
- Empty states: icon + one sentence + a clear next-action button.
- Status chips: `.badge` + status color; asset history = vertical timeline.
- Tables: sticky header, row hover, mono for tags/serials.
- Confirmations via sonner toasts. All inputs labeled; WCAG AA contrast; visible focus (`ring-ember`).
- Mobile: asset detail + assign/return flows must work one-handed on a phone.
- `.no-print` class hides chrome on print pages (QR label sheets).
