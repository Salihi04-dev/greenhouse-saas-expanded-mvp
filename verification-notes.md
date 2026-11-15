# Verification notes

The existing Field Ledger dashboard loads successfully at the local Vite server and retains the original sidebar, warm paper surfaces, editorial typography, ruled separators, greenhouse cards, activity list, and responsive drawer pattern.

The irrigation screen renders 12 seeded records spanning seven days. The record drawer supports greenhouse, zone, crop cycle, start/end times, estimated flow-rate calculation, measured quantity, and explicit estimated/measured provenance.

A default estimated record was submitted successfully. The toast confirmed the save, the visible irrigation count increased from 12 to 13, and the new record appeared at the top of the activity table with `Estimated · estimated` provenance. Returning to the dashboard changed the 7-day total from 10,510 L to 11,710 L and the latest activity list showed the new record, confirming state propagation through the existing UI.

The app is currently in local demo mode because no Supabase environment variables were present in the sandbox. When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured, the data layer switches to Supabase reads/inserts. Authentication UI and profile provisioning still require the Supabase project to be configured and are not falsely represented as complete.
