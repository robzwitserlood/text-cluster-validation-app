# PBL House-Style Design Tokens (US4 / FR-010)

**Purpose**: Self-contained record of the PBL house-style tokens for the house-style alignment
(US4, FR-010). These values were extracted once from the researcher-provided reference and are the
durable source for implementation — the reference archive is intentionally **not** kept in the repo
and can be deleted.

**Ground-truth reference**: the live public site **https://startanalyse.pbl.nl/**. The tokens below
are a verified starting point; confirm exact values against the live site's computed CSS during
implementation, as the extracted source was an older revision (2019–2020) with some inconsistencies.

> This is a PBL / Rijksoverheid (Rijkshuisstijl) visual identity. All alignment is presentation-only
> and MUST NOT change task mechanics, copy meaning, keyboard accessibility, or recorded data
> (FR-010).

## Typography

| Token | Value |
| --- | --- |
| Sans family (body/UI) | `"RijksoverheidSans", Verdana, sans-serif` |
| Serif family (headings/display) | `"RijksoverheidSerif", serif` |

**Font licensing (action required):** RO Sans / RO Serif are official Rijkshuisstijl fonts,
licensed for use by/on behalf of the Dutch government. **Do not commit the `.woff`/`.ttf` binaries
into this repo.** Either (a) load them from the PBL-hosted path the live site uses
(`//data.pbl.nl/webresources/fonts/…`), or (b) rely on the `Verdana, sans-serif` / `serif` fallback
stack. Confirm redistribution rights before self-hosting the font files.

## Colour palette

### Primary / accent

| Token | Hex | Usage |
| --- | --- | --- |
| Rijkshuisstijl link-blue | `#007bc7` | Primary accent: links, progress bar, interactive accents |
| Accent-blue tint | `#d9ebf7` | Light informational surface |

### Text

| Token | Hex | Usage |
| --- | --- | --- |
| Body text | `#242424` | Default body copy |
| Muted text | `#535353` | Secondary text |
| Inverse text | `#FFFFFF` | Text on dark/accent surfaces |
| Pure black | `#000000` | Focus outline / max-contrast text |

### Surfaces / greys

| Token | Hex | Usage |
| --- | --- | --- |
| Body background | `#fbfbfb` | Page background |
| Surface white | `#FFFFFF` | Cards / boxes |
| Warm grey | `#eeece8` | Panel background |
| Light grey | `#f5f5f5` | Progress-bar track / subtle fills |
| Dark grey | `#373637` | Dark UI text / bars |
| Mid grey | `#444444` | Borders / secondary UI |

### Secondary category accents (use sparingly, non-primary)

| Hex | Note |
| --- | --- |
| `#672a8c` | purple |
| `#0070BA` | deep blue |
| `#d20e8c` | magenta |
| `#f28227` | orange |
| `#FECD33` | yellow |
| `#7CCFF2` | light blue |

## Spacing & effects

| Token | Value |
| --- | --- |
| Nav/header height | `40px` |
| Menu item padding | `30px` |
| Chapter image height | `400px` |
| Standard box-shadow | `0 -1px 0 #e5e5e5, 0 0 2px rgba(0,0,0,.12), 0 2px 4px rgba(0,0,0,.24)` |
| Focus colour | `#000000` |

## Applying to this app's screens

Map the above onto the existing screens (welcome, per-task instructions, task, completion) via the
app's existing theme/token layer — not by copying the legacy SCSS. Keep the same components and
behaviour; only colours, typography, and spacing change. Verify contrast (text `#242424` on
`#fbfbfb`, white on `#007bc7`) meets accessibility expectations, since accessibility must be
unchanged/preserved (FR-010).
