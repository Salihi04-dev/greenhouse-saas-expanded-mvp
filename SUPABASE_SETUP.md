# Supabase setup for Field Ledger

The application has two explicit modes. With no `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, it stays in the existing local demo mode. When both variables are present, the client uses Supabase Auth and the Supabase data layer; it does not merge demo records into live records.

## Setup sequence

1. Copy `.env.example` to `.env` and set only the public project URL and anon key. Never place a service-role key in frontend variables.
2. Run `supabase/schema.sql` in the Supabase SQL editor. This creates the existing domain tables, the secure Auth-to-profile trigger, farm memberships, and RLS policies.
3. Run `supabase/seed.sql` to create the four-greenhouse demonstration structure, zones, crop varieties, and crop cycles.
4. Create users through Supabase Auth email/password. The `on_auth_user_created` trigger creates a `worker` profile automatically. A normal user cannot choose or change their own role.
5. Add each user to `public.farm_memberships` using an administrator-controlled SQL migration or dashboard workflow. Do not expose this operation to the browser.
6. Assign `manager` or `admin` only through a trusted administrator path. The browser never writes the `profiles.role` field.

## Live workflow

After a user signs in, the app retrieves `public.profiles`, displays the assigned role, loads greenhouse structure and irrigation records through RLS, and submits new irrigation records with `recorded_by = auth.uid()`. The existing dashboard, activity history, and greenhouse detail update from the refreshed Supabase result.

The sandbox used for this iteration did not have a Supabase project URL, anon key, Auth user, or database connection, so the browser verification covered the complete demo-mode path and the live-mode code was validated by typecheck/build only. A real Supabase project is required to verify the network round trip and database-side RLS behavior.
