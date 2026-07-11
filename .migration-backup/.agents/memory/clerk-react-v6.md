---
name: Clerk React v6 exports
description: @clerk/react v6 does not export SignedIn/SignedOut components — use useAuth() hook instead.
---

In @clerk/react v6.x, the `SignedIn` and `SignedOut` conditional wrapper components are NOT exported.

**Rule:** Use `const { isSignedIn } = useAuth()` and conditionally render with `{isSignedIn && ...}` / `{!isSignedIn && ...}`.

**Why:** The v6 package exports `Show`, `ClerkLoaded`, `ClerkLoading`, etc. but removed the `SignedIn`/`SignedOut` named exports. Using them causes a runtime error: "does not provide an export named 'SignedIn'".

**How to apply:** Any component importing `SignedIn` or `SignedOut` from `@clerk/react` must be refactored to use `useAuth()`.
