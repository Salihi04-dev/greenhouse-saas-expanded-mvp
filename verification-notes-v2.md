# Current iteration verification

The latest project remains the existing Field Ledger application. No frontend redesign or replacement was performed.

The existing demo-mode workflow was re-tested from the production preview with no Supabase environment variables. The dashboard loaded with the existing sidebar, warm paper surfaces, editorial typography, greenhouse cards, activity list, and responsive layout. Demo totals remained 10,510 L for the seeded seven-day history, and the existing irrigation workflow remains available.

The live-mode implementation now includes a shared Supabase client using only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, persistent email/password sessions, session-loading state, login error handling, profile/role loading, sign-out, live greenhouse-structure loading, Supabase irrigation reads/inserts, and explicit LIVE SUPABASE DATA versus DEMO DATA labels.

The schema was extended rather than replaced. It now provisions a default worker profile from `auth.users`, adds `farm_memberships` for farm scoping, and tightens greenhouse, zone, crop-cycle, and irrigation reads/inserts with membership and relationship checks. The seed script creates the existing four-greenhouse structure, zones, crop varieties, and crop cycles without inventing sensor data.

`pnpm check` and `pnpm build` pass. A real Supabase network round trip, Auth login, database response, and RLS enforcement could not be executed in the sandbox because no Supabase project URL, anon key, Auth user, or database connection were available. Those limitations are documented in `SUPABASE_SETUP.md`; the implementation does not claim those live behaviors were empirically verified.

The live-mode UI smoke test used placeholder non-secret environment values against a disposable local dev server. It rendered the Field Ledger-styled “Welcome back” email/password login screen with no demo data exposed, confirming the auth gate branch is wired correctly. No real login was attempted because no valid Supabase project credentials were available.
