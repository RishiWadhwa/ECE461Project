# HaaS Frontend Style Guide

Keeps fonts, color, and component styling consistent across the React client. The source of truth is `haas-app/src/index.css`; if this guide and the CSS disagree, fix whichever is wrong in the same PR.

## Principles

- **Dark theme only.** Near-black backgrounds, layered surfaces, burnt-orange accents.
- **No hard-coded colors, sizes, or fonts in components.** Use the CSS variables and shared classes below. Inline `style` is for one-off layout (margins, grid), never for color or typography.
- **No hard-coded page data.** Anything displayed comes from the API (R2-2). Placeholder or empty states are fine; fake rows are not.
- **Reuse before adding.** Check `index.css` for an existing class before writing a new one. New shared styles go in `index.css`, not in per-component files.

## Fonts

Loaded from Google Fonts in `index.html`. Do not add other families.

| Role | Family | Use for |
| --- | --- | --- |
| Display | `'Bebas Neue'` | Logo, page/section titles, card titles, big numbers. Uppercase text with letter-spacing. |
| Body | `'Rubik'` (300–700) | Paragraphs, buttons, inputs, labels of content. Base size 14px, line-height 1.6. |
| Data / meta | `'JetBrains Mono'` | IDs, form labels, descriptions under titles, status text, messages, badges. |

| Element | Font | Size | Spacing |
| --- | --- | --- | --- |
| Header logo | Bebas Neue | 28px | 3px |
| Sign-in title | Bebas Neue | 64px | 8px |
| `.section-title` | Bebas Neue | 26px | 3px |
| `.card-title` | Bebas Neue | 17px | 2px |
| `.hw-number` | Bebas Neue | 40px | 2px |
| `.section-desc`, `.pair-meta` | JetBrains Mono | 11–12px | – |
| `.form-label` | JetBrains Mono | 11px, uppercase | 1.5px |
| Buttons | Rubik 600 | 14px | 0.5px |

Titles are written in UPPERCASE in the markup (`PROJECTS`, `CREATE PROJECT`).

## Color tokens

Defined on `:root`. Always reference with `var(--name)`.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0c0c0e` | Page background |
| `--surface` | `#161618` | Cards, header, panels |
| `--surface2` | `#1e1e22` | Inputs, tab bar, nested blocks |
| `--surface3` | `#26262c` | Disabled controls, meter track |
| `--border` | `#2e2e36` | All 1px borders |
| `--orange` | `#bf5700` | Primary action, active tab, accents |
| `--orange-glow` | `#e06820` | Primary button hover |
| `--orange-light` | `#ff8c3a` | Titles, logo, active text |
| `--orange-dim` | `rgba(191,87,0,.15)` | Selected / badge background |
| `--text` | `#f0ece6` | Primary text |
| `--text-muted` | `#7a7472` | Secondary text, labels |
| `--text-dim` | `#4a4644` | Disabled text, empty-state hints |
| `--green` | `#3ecf6e` | Success, availability, online status |
| `--red` | `#e85050` | Errors |

Rules:
- Orange means "interactive or selected." Green means "ok / available." Red means "error." Don't repurpose them.
- Never use pure white or black for text or backgrounds (button text on orange is the one `#fff` exception).
- Add a new token to `:root` rather than a raw hex in a rule.

## Shape, spacing, depth

- Radius: `--radius` 10px (cards), `--radius-lg` 16px (form panels, modals), 7px (inputs, buttons), 8px (message blocks).
- Spacing is on a 2/4px grid; common values are 6, 8, 14, 16, 20, 24, 32px. Page padding is `28px 32px` (`20px 16px` under 800px).
- Borders are 1px `--border`. Orange borders only for hover, focus, and selected states.
- Shadows are rare: the header glow, the modal (`--shadow`), and button hover glow. Don't add drop shadows to cards.
- Motion is subtle: 0.15–0.2s ease transitions on color/border/transform; the status dot pulses. No page-load animations beyond that.

## Layout

- App shell: `.app` > `.header` (64px, orange bottom border) > `.section-tabs` > `.content`.
- Sign-in uses the centered `.loading-screen` with `.loading-title`.
- Two-column pages use `.two-col` (content + 360px side column) and collapse to one column under 800px.
- Card grids use `auto-fill` with `minmax` (240px for project cards, 280–320px for hardware).

## Component patterns

Use these classes instead of restyling.

| Pattern | Markup / classes |
| --- | --- |
| Page header | `.section-header` > `.section-title` + `.section-desc` |
| Card | `.card` with a `.card-title` |
| Form | `.form-panel` > `.form-row` > `label.form-label` + `input.form-input` |
| Primary button | `.btn` |
| Secondary button | `.btn.btn-ghost` |
| Full-width / small | `.btn-block` / `.btn-sm` |
| Button group | `.btn-row` (children share width equally) |
| Modal | `.modal-backdrop` > `form.modal` (click backdrop to close) |
| Tabs | `.sec-tab` (+ `.active`), optional `.sec-tab-badge` |
| Selectable card | `.pod-card.project-card` (+ `.selected`) |
| Stat | `.social-section-label` (caption) + `.hw-number` (+ `.hw-available`) |
| Usage bar | `.meter-track` > `.meter-fill` (width = % available) |
| Success / error message | `.msg.msg-ok` / `.msg.msg-error`, prefixed with `✓` / `✕` |
| Empty state | `.no-path` (boxed) or `.none-label` (inline italic) |

## Behavior and copy

- **Every async view handles three states:** loading (`Loading…`), error (`.msg-error` with the server's message), and empty (`.no-path`).
- Disable buttons while a request is in flight and when input is invalid (empty ID, non-positive integer quantity).
- Button labels are short verbs in Title Case: `Sign In`, `Create Project`, `Check Out`. In-flight labels use an ellipsis: `Signing in…`.
- Error text comes from the API response when available; don't invent messages that hide the backend's reason.
- Every input has a `<label htmlFor>`; icon glyphs (`◉ ◈ ⇢ ✓ ✕`) are decorative and never the only signal.
- Passwords use `type="password"` and proper `autoComplete`; never log or display them.

## Code conventions

- Components are TypeScript function components in `src/components/`, one per file, default export, `PascalCase.tsx`.
- Props typed with an `interface Props`; use `import type` for types (`verbatimModuleSyntax` is on).
- All network calls go through `src/api.ts`; components never call `fetch` directly.
- Keep `tsc -b` and `npm run lint` clean before opening a PR.

## Adding something new

1. Look for an existing class or token that fits.
2. If none does, add a token or class to `index.css` using existing tokens, and add a row to the tables above in the same PR.
3. Check it at desktop width and under 800px.
