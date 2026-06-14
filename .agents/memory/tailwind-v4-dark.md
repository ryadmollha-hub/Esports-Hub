---
name: Tailwind v4 @apply dark
description: Using `@apply dark` in CSS causes a build error in Tailwind v4 — dark is a variant selector, not a utility class.
---

**Rule:** Never write `@apply ... dark` in a CSS `@layer base` block. The `dark` modifier is a variant (e.g., `dark:bg-gray-900`), not a standalone utility class.

**Why:** Tailwind v4 throws "Cannot apply unknown utility class `dark`" at build time. The `.dark` selector must be set on `<html>` or `<body>` via className in JS, or via the `darkMode: 'class'` selector in CSS — not via @apply.

**How to apply:** To force dark mode globally, add `dark` to the `<html>` element in index.html, or set `document.documentElement.classList.add('dark')` in JS. In CSS, just write `.dark { ... }` as a selector block.
