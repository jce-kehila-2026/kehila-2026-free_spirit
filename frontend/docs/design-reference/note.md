# Design Direction — Free Spirit

## Goal

Create a unified visual language across the whole app, inspired by the nonprofit website screenshots, logo, and color palette in this folder.

The app should feel like one consistent product, not separate pages designed differently.

## Visual Mood

The design should feel:

- Calm
- Clean
- Friendly
- Professional
- Modern nonprofit
- Community-oriented
- Trustworthy
- Light and welcoming

Avoid:

- Strong orange/coral colors
- Overly colorful UI
- Childish styling
- Heavy shadows
- Harsh contrast unless required for accessibility
- Inconsistent buttons/cards between pages

## Preferred Colors

Use calm tones inspired by the provided light green to light blue palette.

Preferred colors:

- Light green
- Light blue
- White
- Soft gray
- Gentle accent colors only

The final color system should include:

- Primary color
- Secondary color
- Background color
- Surface/card color
- Border color
- Main text color
- Muted text color
- Success/warning/error/info colors

## Layout and Components

Use consistent styling across:

- Navbar
- Page containers
- Section headers
- Cards
- Dashboard cards
- Buttons
- Forms and inputs
- Tables and lists
- Modals/popups
- Empty states
- Loading states
- Error states

General preferences:

- Clean spacing
- Soft rounded cards
- Subtle shadows only
- Clear readable text
- Consistent button styles
- Consistent page width and section spacing
- Good responsive behavior

## Logo Usage

Use the logo carefully and consistently.

Recommended usage:

- Navbar / app header
- Auth pages
- Public-facing pages
- Optional subtle brand mark in empty states or landing areas

Do not overuse the logo.
Do not stretch or distort the logo.
Keep enough whitespace around it.

## Pages to Redesign

The redesign should eventually cover:

- Public pages
- Login
- Signup
- Forgot Password
- Reset Password
- Navbar and shared layout
- Personal Area dashboards
- Admin Dashboard
- Programs pages
- Clients pages
- Events/calendar pages

Recommended implementation order:

1. Design tokens and shared visual primitives
2. Navbar and shared layout
3. Auth pages
4. Personal Area dashboards
5. Admin/internal pages
6. Events, clients, and programs pages

## Technical Constraints

Do not change:

- Business logic
- Routing
- Auth behavior
- Firebase behavior
- Firestore/Storage/API calls
- Database-related code

Do not add new libraries unless absolutely necessary.

Prefer:

- Tailwind classes
- `globals.css` design tokens
- Reusable visual primitives
- Consistent shared styles instead of one-off page styling

Keep all code, comments, logs, labels, and UI strings in English.

Do not use native `alert()` or `confirm()`.

## Planning Requirement

Before editing files, first propose:

1. A short design audit summary
2. A mini design system
3. A phased implementation plan
4. A list of files/components likely to change
5. Any open questions

Do not edit files until the plan is approved.