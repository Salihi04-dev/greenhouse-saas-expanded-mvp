# GreenFields Farm Operations — Design Direction

## Three stylistic approaches

### Theme Name: Field Ledger
Very Brief Intro: A restrained agricultural operations system with cream paper tones, ink-like typography, and quiet green signals. It makes data feel trustworthy, legible, and close to the physical notebooks it replaces.
Probability: 0.06

### Theme Name: Canopy Control
Very Brief Intro: A polished B2B dashboard with deep forest surfaces, cool water-blue instrumentation, and sharp operational contrast. It treats the greenhouse as a living control room without drifting into cyberpunk styling.
Probability: 0.04

### Theme Name: Glasshouse Utility
Very Brief Intro: A bright, architectural SaaS interface inspired by greenhouse glazing, morning light, and clipped botanical forms. It balances precise tables with subtle spatial cues from growing environments.
Probability: 0.08

## Chosen approach: Field Ledger

### Design Movement
Contemporary editorial utility, influenced by Swiss information design and field-journal notation. The interface should feel like a serious operational instrument translated from paper records into a calm digital system.

### Core Principles
1. Evidence before decoration: every visual element should clarify a record, status, location, or next action.
2. Quiet authority: use restrained color and high-contrast typography rather than noisy gradients or excessive ornament.
3. Tactile continuity: use subtle ruled lines, ledger marks, and compact metadata to connect the digital workflow to the farm's physical routines.
4. Spatial honesty: leave room around important numbers and controls so the interface can be scanned in a busy field or office setting.

### Color Philosophy
Warm off-white and graphite create a paper-and-ink foundation. A single ownable fern green marks action, health, and agriculture; a clear mineral blue is reserved for water and measured quantities. Amber is used sparingly for attention states. The palette should feel grounded, not lush or decorative.

### Layout Paradigm
Use a persistent left rail and asymmetrical editorial content columns. Put the most decision-relevant metric or action on the left edge of each major section, with supporting context offset to the right. Favor horizontal record rows and split panels over centered card grids.

### Signature Elements
1. A vertical green field mark beside page titles and major workflow steps.
2. Small uppercase ledger labels with generous tracking for provenance and location metadata.
3. Fine ruled separators and compact status pills that resemble stamped record states.

### Interaction Philosophy
Interactions should acknowledge the user's action immediately and explain what changed. Forms should progressively reveal only relevant fields, and filters should update in place without theatrical transitions. Touch and keyboard targets must be generous and predictable.

### Animation
Use short 160–220ms ease-out transitions for hover, selection, and drawers. Fade and translate list rows by a few pixels on initial load, staggered subtly. Do not animate charts continuously. Respect prefers-reduced-motion and keep save confirmations concise.

### Typography System
Use Fraunces for display titles and section anchors, paired with Source Sans 3 for body copy, labels, tables, and controls. Headlines are compact but expressive; operational data uses tabular numerals and medium weight. Avoid all-caps for long strings.

### Brand Essence
GreenFields turns daily greenhouse work into reliable operational evidence for farm workers and managers. Personality: grounded, attentive, exact.

### Brand Voice
Headlines should be calm and specific. CTAs should describe the action and its record impact. Microcopy should distinguish estimated, measured, pending, and demo information without hype.

Example lines:
- “Today’s water, accounted for.”
- “Record the work while it is still in your hands.”

### Wordmark & Logo
Use a simple two-leaf ledger mark: two offset leaf forms emerging from a vertical ruled stem, suggesting both plant growth and a marked record. Pair it with a custom-feeling wordmark in Fraunces, but keep the mark usable without text.

### Signature Brand Color
Field Green: #2F6B4F.

## Implementation reminders

This is a frontend MVP demonstration in the initialized static web project. It must be honest about demo mode and must not imply that the static UI is already connected to Supabase unless the user later supplies or enables that backend integration. The web experience will simulate the complete manager-facing workflow with local in-memory state only where necessary for the visual prototype; no service-role credentials or sensitive secrets may be added.

## Style Decisions

- The Field Ledger surface rule is now explicit: primary panels use flat paper-like surfaces, ruled dividers, and stamped states rather than glossy SaaS shadows.
- The vertical Field Green ledger mark is used beside primary page context and workflow headings as a recurring brand signature.
- Top-level views have distinct evidence focus: the dashboard summarizes farm operations, Irrigation centers water provenance, Greenhouses centers growing-space status, and Profile centers account and record provenance.
