---
name: High-Performance Monolith
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c9c6c5'
  primary: '#c9c6c5'
  on-primary: '#313030'
  primary-container: '#0b0b0b'
  on-primary-container: '#7b7979'
  inverse-primary: '#5f5e5e'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#add500'
  on-tertiary: '#293500'
  tertiary-container: '#080d00'
  on-tertiary-container: '#6a8300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#c8f232'
  tertiary-fixed-dim: '#add500'
  on-tertiary-fixed: '#171e00'
  on-tertiary-fixed-variant: '#3d4d00'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 80px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system embodies "Athletic Luxury"—a synthesis of technical precision and high-end minimalism. It targets a discerning male demographic that values performance as much as aesthetics. The interface must feel expensive, quiet, and powerful.

The style is **Premium Minimalism** with a focus on high-contrast photography and immense negative space. It utilizes a layered approach to depth, combining the cleanliness of Apple’s industrial design with the aggressive energy of elite sportswear. Visual rhythm is achieved through "the luxury of space," ensuring no element feels crowded or incidental.

## Colors
The palette is rooted in a "Deep Dark" philosophy to accentuate the premium nature of the brand. 

- **Primary & Neutral:** The core interface relies on shades of black and dark gray (`#0B0B0B`, `#111111`) to create a sophisticated, low-light environment. Pure white is reserved for high-impact typography and essential icons.
- **Accent (Vibrant Volt):** Use `#D4FF3F` sparingly. It is a functional tool for high-priority calls to action, active states, or technical data highlights. It should never exceed 5% of the total screen real estate.
- **Surface Strategy:** Use subtle tonal shifts between `#000000` (background) and `#0B0B0B` (cards/containers) to define structure without relying on borders.

## Typography
The system uses **Inter** exclusively to maintain a systematic, technical feel. 

- **Display & Headlines:** Large-scale headings must use tight tracking (negative letter spacing) and heavy weights to evoke strength.
- **Labels:** Small labels and "Overlines" should be in all-caps with generous tracking to provide an editorial, organized feel.
- **Body Text:** Keep body copy weights light (400) or medium (500) to ensure the interface feels breathable despite the dark theme.

## Layout & Spacing
This design system operates on a strict **8px grid**. All dimensions, padding, and margins must be multiples of 8.

- **Grid:** Use a 12-column fluid grid for desktop with 24px gutters. For mobile, shift to a 4-column grid.
- **Whitespace:** Prioritize `xxl` (80px) spacing between major sections to emphasize the "luxury" aspect. Avoid clutter at all costs.
- **Reflow:** On mobile, sidebars should collapse into a bottom-anchored navigation bar or a full-screen modal menu to maintain accessibility for one-handed use.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Soft Ambient Shadows**. 

1. **Base Layer:** `#000000` (The void).
2. **Surface Layer:** `#0B0B0B` (Cards and navigation bars).
3. **Elevated Layer:** `#111111` (Active states, tooltips, or floated elements).

Shadows should be virtually invisible: use a 24px-48px blur with 40% opacity, but tint the shadow color to `#000000`. This creates a subtle "lift" from the black background without introducing gray halos. Use a 1px inner border (stroke) with 10% white opacity on cards to define edges against the dark background.

## Shapes
The shape language is "Softened Geometric." 

Standard components (buttons, input fields) use a **0.5rem (8px)** radius. Larger containers like product cards or dashboard modules use **1rem (16px)** to feel more approachable and modern. Avoid sharp corners except for decorative dividers or technical data lines.

## Components
- **Buttons:** 
  - *Primary:* Solid White text on `#0B0B0B` with a 1px white border. 
  - *Accent:* Black text on `#D4FF3F` (Volt). 
  - *Ghost:* White text with no background, underlining on hover.
- **Product Cards:** Use a 4:5 aspect ratio for imagery. Text is placed below the image in a clean stack: Category (Label-Caps), Product Name (Headline-LG), and Price (Body-MD).
- **Inputs:** Dark backgrounds (`#111111`) with 1px borders that transition to `#D4FF3F` on focus.
- **Navbar:** Sticky, 80px height, with a blurred background (back-drop filter: blur 20px) at 80% opacity of `#000000`.
- **Dashboard Elements:** Use thin, 1px `#1F1F1F` dividers. Data visualizations should exclusively use the Volt accent color for lines and bars to ensure they pop against the monochrome base.
- **Footer:** Minimalist with 4 columns. Social links should be icon-only, using high-quality SVG paths.