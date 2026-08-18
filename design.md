# Snip UI Design Language

Snip uses a dark, minimal interface with a warm, luminous accent. The page should
feel spacious and calm, with the URL form as the single visual focal point. The
visual direction is original to Snip: do not use another product's logo, name, or
marketing copy.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--snip-bg` | `#0b0a0d` | Page background |
| `--snip-surface` | `#151318` | Cards and form |
| `--snip-surface-raised` | `#1d1a21` | Hover and count accents |
| `--snip-text` | `#f7f3fa` | Headings and primary text |
| `--snip-muted` | `#a9a2b0` | Supporting text |
| `--snip-faint` | `#716b77` | Labels and table headings |
| `--snip-coral` | `#ff9278` | Warm accent start |
| `--snip-pink` | `#ff5d8f` | Accent center |
| `--snip-violet` | `#b486ff` | Accent end |
| `--snip-accent` | `linear-gradient(105deg, coral, pink 50%, violet)` | Primary actions |

- Font stack: `Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, sans-serif.
- Type scale: eyebrow `0.7rem`, body `0.95rem-1rem`, section heading `1.35rem`, hero heading `clamp(3rem, 8vw, 6.5rem)`.
- Spacing: use a `0.5rem` base rhythm; favor `2rem`, `3rem`, and `5rem` for section breathing room.
- Radii: pills `999px`, form controls `1rem`, cards `1.5rem`.
- Borders: `1px solid rgb(255 255 255 / 10%)`; use brighter borders only for focus and success/error states.
- Shadows: large, soft black shadows for floating surfaces; avoid hard drop shadows.
- Glow: a fixed, full-viewport top band using blurred coral/pink/violet radial gradients. It must use `position: fixed`, `left: 0`, `right: 0`, and `pointer-events: none`.

## Element Mapping

- Page header: `.hero` is the centered hero with a small eyebrow, bold headline, and muted subline.
- URL form: `.shorten-form` is the large chat-style pill; the gradient button is attached to its right.
- Result and error notices: `.notice` uses the same rounded surface language with green or red semantic borders.
- Links table: `.links-panel` is a generously rounded card with a subtle border, quiet table labels, and accent code links.
