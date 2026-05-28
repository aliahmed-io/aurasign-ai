# AuraSign Design System: Organic Fluid Design

## 1. Brand Identity
**Aesthetic:** Apple-level minimalist, glassmorphism, organic fluidity, non-rigid, floating.
**Vibe:** Calm, precise, advanced, intelligent.

## 2. Color Palette (Monochrome & Fluid Accents)
- **Background:** Deep spatial dark `#050505` to `#0A0A0A` (gradients only, no flat colors).
- **Text Primary:** Off-white `#F5F5F7`
- **Text Secondary:** Soft Gray `#A1A1A6`
- **Risk Aura (Mode A):** Soft organic red `#FF3B30` with 40% opacity blur.
- **Safe Aura (Mode A):** Liquid cool blue `#0A84FF` with 40% opacity blur.
- **Glass Panel:** `rgba(255, 255, 255, 0.05)` with `backdrop-filter: blur(20px) saturate(180%)`.
- **Border:** `rgba(255, 255, 255, 0.1)` (subtle borders to define shape).

## 3. Typography
- **Primary Font:** `Inter` or `SF Pro Display`.
- **Headings:** Tight tracking (`-0.02em`), clean, semi-bold.
- **Body:** Open tracking, high legibility for contract text.
- **Weights:** 400 (Regular), 500 (Medium), 600 (Semi-bold).

## 4. Layout & Spacing (8pt Grid System)
- Strict adherence to 8pt grid (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`).
- No sharp corners. Border radius must be at least `16px` for small elements, `32px` or `50%` for larger panels and buttons.

## 5. UI Elements
- **Buttons:** Pill-shaped, semi-transparent background with a subtle inner glow (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.2)`).
- **Toggle Switch:** Fluid floating switch. Selected state glides smoothly using framer-motion springs.
- **Floating Panels:** UI should feel like it's floating on the Z-axis above the 3D canvas.

## 6. Motion & Animation
- **Curves:** Liquid and springy. Use framer-motion defaults or `type: "spring", stiffness: 100, damping: 20`.
- **Hover States:** Subtle scale (`scale: 1.02`) and increased glow/brightness.
- **3D Transitions:** Morphing between states should feel like liquid rearranging. Use `drei` `MeshDistortMaterial` to give breathing/pulsing effects to risk areas.
