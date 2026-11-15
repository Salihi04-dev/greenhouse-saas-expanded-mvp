# Expanded MVP verification

The production preview loads the preserved Field Ledger dashboard in demo mode with the existing sidebar, warm paper surfaces, editorial typography, greenhouse cards, irrigation history, and dashboard metrics.

The new management navigation renders for demo mode: Operations, Crop health, Inventory, Harvest, Analytics, and Workspace settings. The Operations view renders five seeded activities, planting records, fertilization records, live/demo provenance, and metrics for activities today, harvest today, low stock, and open alerts.

The Crop health view renders three seeded observations with pest/disease/crop-condition types, severities, affected plants, workers, timestamps, and two linked treatment records with follow-up dates and outcomes.

`pnpm check` and `pnpm build` pass. The browser smoke test exercised demo mode; the live Supabase network path still requires the user's configured project and cannot be executed from this sandbox without those credentials.

The Inventory view renders four seeded input items, threshold-aware statuses, suppliers, and the add-item action. The Harvest view renders 236 kg of seeded history across grades, quality, greenhouse, zone, worker, and rejected quantities, plus the record-harvest action.
