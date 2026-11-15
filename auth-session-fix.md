# Auth/session persistence fix

## Root cause

The application had one module-level Supabase client and one React auth listener, so the issue was not caused by multiple clients or repeated effect registration. The problematic pattern was inside `AuthContext`: the `onAuthStateChange` callback called `getSession()`, and `getSession()` performed another Supabase profile request. That nested session operation ran while Supabase was handling an auth event, including token refresh events. Under the owner project’s refresh-token rate limiting, this could contribute to refresh churn and repeated `/auth/v1/token?grant_type=refresh_token` requests. The callback also had no explicit protection against treating a transient profile/network failure as a sign-out condition.

## Targeted change

`client/src/contexts/AuthContext.tsx` now performs one initial `getSession()` bootstrap, keeps the existing single persisted Supabase client, and keeps `onAuthStateChange` synchronous. The callback only updates React session state and defers the profile lookup with `setTimeout`, outside Supabase’s auth event lock. It no longer calls `getSession()`, `getUser()`, `refreshSession()`, or `signOut()` from inside the callback. Profile/network failures are caught without signing the user out. Manual sign-out remains the only application-triggered sign-out path.

No UI, schema, RLS policy, role, database model, or irrigation workflow was changed for this fix.

## Static verification

The source audit found exactly one `createClient` call, one `onAuthStateChange` registration inside the mounted provider effect, no `refreshSession()` calls, no auth listener in render, and no Manus-specific session handler participating in the Supabase flow. `pnpm check` and `pnpm build` both pass.

A real several-minute session persistence test against the owner’s Supabase project could not be executed in this sandbox because the owner’s live credentials/session were not available here. Therefore the fix is validated by code-path inspection and build checks, but the owner should still confirm the live browser sequence: login, wait several minutes, navigate, refresh, and manually sign out. The implementation now avoids the nested auth operation that caused the observed refresh-token churn and does not initiate sign-out on transient profile/network errors.
