# UI design system

Direction: quiet Windows workstation; recognizable white A4 invoice, green brand heading, ruled item table and signed footer from v3. Center form is continuous with collapsible secondary sections; 72–184px navigation, right preview at >=1280px, form/preview tabs below. Minimum intended window 1024×640, subject to actual verification.

Spacing 4/8/12/16/24/32px. Controls >=36px, primary action 40px. Radii 6px inputs, 10px cards. Font: bundled Plus Jakarta Sans with system fallback, 13px body/12px helper/20px page title; JetBrains Mono for identifiers. Canvas #f4f6f5, cards #ffffff, ink #172c26, secondary #586a63, borders #dbe4df, primary #176b4b, warning #8a5200, error #b42318. Dark canvas #101b17/cards #182820/ink #edf5f0. Focus 2px #217aef with offset. No meaning conveyed by color alone.

Consistent primary/secondary/destructive hierarchy, visible validation text, named controls, natural tab order, status aria-live, explicit Issue confirmation. No editable computed totals. Issued financial fields disabled in both form and preview. Print CSS removes all editing UI. Every unsupported action visibly disabled with reason. Synthetic TEST watermark on every output.

Settings groups: Business Profile; Invoice & Numbering; Appearance; Taxes & Compliance; Products & Stock; Payments/UPI; Users & Permissions; Backup & Data; Google Sync; Diagnostics. Persist through validated backend; Save/Cancel and validation must work. Reset never changes issued history.

Visual verification remains BLOCKED until the actual Electron app runs and screenshots can be captured and inspected at 1920×1080, 1366×768, 1280×720, minimum size and 125% scaling. This document specifies intent, not verified appearance.
