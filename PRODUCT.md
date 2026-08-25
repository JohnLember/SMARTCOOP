# Product

## Register

product

## Users

Three audiences share one system, in very different contexts:

- **Cooperative staff and admins** — the primary users. They work at a desk in the
  cooperative office on wide screens, in long sessions, processing many records at
  once: reviewing membership applications, recording rubber deliveries into loading
  batches, issuing receipts, reviewing loan applications, managing members. Their
  job is throughput and accuracy. Density serves them; whitespace costs them.
- **Farmer-members** — occasional visitors on modest Android phones, frequently
  outdoors in bright daylight. They check what they delivered, what they earned,
  their CBU total, and where their loan application stands. Their pages must be
  mobile-first, high-contrast, and touch-friendly (44px targets).
- **MAO (Municipal Agriculture Office)** — read-only reporting on cooperative
  production and membership by barangay.

## Product Purpose

SMARTCOOP manages a rubber-farming cooperative (San Luis Rubber Producer's
Cooperative): membership applications and approval, member records, rubber delivery
loading batches, official receipts with deductions (CBU, loan repayment, membership
fee, supplies, dayong), loans and loan applications, an agricultural credit scoring
system, and member activity categorization.

It handles members' money. Success is that a staff member can process a loading
batch quickly without a mis-keyed figure, and a farmer can see exactly what they
were paid and why.

## Brand Personality

**Efficient · dense · professional.** A working tool, not a showpiece. It should
read closer to Linear or Stripe than to a consumer app: fast, information-rich,
keyboard-friendly, predictable screen to screen. Quiet confidence around money —
figures are the loudest thing on any screen.

## Anti-references

Explicitly avoid all of the following:

- **Generic AI dashboard** — gradient KPI cards, 32px+ radii, purple/indigo default
  accent, endless identical icon+heading card grids, decorative charts that say
  nothing.
- **Dated enterprise / Bootstrap admin** — bevelled buttons, heavy 2px borders,
  default bootstrap blue, cramped unreadable tables.
- **Consumer-app playfulness** — bounce/elastic easing, emoji in UI labels, mascot
  illustrations, full-pill everything. Wrong register for financial records.
- **Over-minimal / anemic** — light grey body text, borderless tables, huge section
  gaps that push data below the fold, minimalism that hides information staff need.

Stated directly by the product owner: no excessive rounded cards, no unnecessary
gradients, no overly decorative UI, no excessive shadows, and never aesthetics at
the expense of usability and information clarity.

## Design Principles

1. **The figures are the interface.** Money, weight, and dates get the strongest
   typographic treatment and tabular alignment. Everything else recedes.
2. **Density is a feature for staff.** Do not trade rows-per-screen for whitespace.
   Compact is respectful of someone processing 40 deliveries.
3. **Two contexts, one vocabulary.** Member pages are mobile-first and touch-sized;
   staff pages are dense and desktop-first — but a button, badge, or input looks and
   behaves identically in both.
4. **Every state is designed.** Loading, empty, error, disabled, and no-results are
   part of the product, not afterthoughts. Empty states teach the interface.
5. **Motion reports state, never decorates.** 150–250ms, ease-out, and a reduced-
   motion path for everything that moves.

## Accessibility & Inclusion

- Target WCAG 2.1 AA: body text ≥4.5:1, large text ≥3:1, including placeholder and
  helper text.
- Members use phones outdoors in bright sun — contrast is a functional requirement,
  not a checkbox. No light-grey-on-white for anything that carries meaning.
- Touch targets ≥44px on member-facing surfaces.
- Visible keyboard focus on every interactive element; never remove an outline
  without replacing it.
- Honour `prefers-reduced-motion` for all transitions and animations.
- Labels on every form control; errors described in text, never by colour alone.

## Scope note

This document governs the **authenticated app shell** (everything behind
`ProtectedRoute`). The public-facing `Landing.jsx`, `Login.jsx`, and `Apply.jsx`
pages use a separate, deliberate "tapping morning" brand system (`lib/brandTokens.js`
+ `components/brand.jsx`) and are intentionally out of scope for product-register
work.
