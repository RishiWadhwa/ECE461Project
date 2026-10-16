# HaaS Frontend Style Guide

This guide is here so the React client stays consistent: same fonts, same colors, same component styles
everywhere. The actual source of truth is `haas-app/src/index.css`. If you notice this guide and the CSS
disagree, fix whichever one is wrong in the same PR.

## Principles

- The app only has a dark theme: near-black backgrounds, layered surfaces, and burnt-orange accents.
- Don't hard-code colors, sizes, or fonts in components. Use the CSS variables and shared classes listed
  below. Inline `style` is fine for one-off layout like margins or grid placement, but never for color or
  typography.
- Don't hard-code page data either. Everything on screen has to come from the API (this is graded under
  R2-2). Placeholder text and empty states are fine, but fake rows are not.
- Check `index.css` for an existing class before you write a new one. New shared styles go in `index.css`,
  not in per-component files.

## Fonts

All three fonts are loaded from Google Fonts in `index.html`. Please don't add any others.

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

Titles are typed in uppercase directly in the markup (`PROJECTS`, `CREATE PROJECT`).

## Color tokens

These are defined on `:root`. Always use them through `var(--name)`.

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

How to use them:
- Orange means something is interactive or selected, green means OK or available, and red means an error.
  Don't use them for anything else.
- Don't use pure white or pure black for text or backgrounds. The one exception is button text on orange,
  which is `#fff`.
- If you need a new color, add a token to `:root` instead of putting a raw hex value in a rule.

## Shape, spacing, depth

- Corner radius: `--radius` (10px) for cards, `--radius-lg` (16px) for form panels and modals, 7px for inputs
  and buttons, and 8px for message blocks.
- Spacing sticks to a 2/4px grid. The values we use most are 6, 8, 14, 16, 20, 24, and 32px. Page padding is
  `28px 32px`, or `20px 16px` under 800px.
- Borders are 1px `--border`. Orange borders are only for hover, focus, and selected states.
- We barely use shadows: just the header glow, the modal (`--shadow`), and the glow on button hover. Don't put
  drop shadows on cards.
- Keep animation subtle. Color, border, and transform changes use 0.15–0.2s ease transitions, and the status
  dot pulses. Other than that, no page-load animations.

## Layout

- App shell: `.app` > `.header` (64px, orange bottom border) > `.section-tabs` > `.content`.
- The sign-in screen uses the centered `.loading-screen` with `.loading-title`.
- Two-column pages use `.two-col` (content plus a 360px side column), which collapses to one column under
  800px.
- Card grids use `auto-fill` with `minmax`: 240px for project cards, and 280–320px for hardware.

## Component patterns

Use these classes instead of restyling things from scratch.

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

- Every view that loads data has to handle three states: loading (`Loading…`), error (`.msg-error` with the
  server's message), and empty (`.no-path`).
- Disable buttons while a request is in flight, and when the input is invalid (an empty ID, or a quantity
  that isn't a positive integer).
- Button labels are short verbs in Title Case: `Sign In`, `Create Project`, `Check Out`. While a request is
  running, the label gets an ellipsis: `Signing in…`.
- If the API sends back an error message, show that. Don't swap in our own text that hides what the backend
  actually said.
- Every input needs a `<label htmlFor>`. The icon glyphs (`◉ ◈ ⇢ ✓ ✕`) are only decoration, so they should
  never be the only thing telling the user something.
- Password fields use `type="password"` and the right `autoComplete` value. Never log or display a password.

## Code conventions

- Components are TypeScript function components in `src/components/`: one per file, default export, file
  named `PascalCase.tsx`.
- Type props with an `interface Props`, and use `import type` for type-only imports (`verbatimModuleSyntax`
  is on).
- All network calls go through `src/api.ts`. Components never call `fetch` directly.
- Make sure `tsc -b` and `npm run lint` pass before you open a PR.

## Adding something new

1. Look for an existing class or token that already does what you need.
2. If there isn't one, add a token or class to `index.css` (using existing tokens), and add a row to the
   tables above in the same PR.
3. Check how it looks at desktop width and under 800px.
