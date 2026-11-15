import { supabase } from "@/lib/supabase";
import { GREENHOUSES, isSupabaseConfigured } from "@/lib/farmData";

export type Source = "demo" | "supabase";
export type ActivityType = "Irrigation" | "Fertilization" | "Fertigation" | "Planting" | "Transplanting" | "Pruning" | "Trellising" | "Weeding" | "Thinning" | "Crop scouting" | "Disease scouting" | "Treatment" | "Harvest" | "Maintenance" | "Cleaning" | "Other";
export type OperationActivity = { id: string; activityType: ActivityType; occurredAt: string; greenhouse: string; zone: string; cropCycle: string; worker: string; durationHours: number | null; quantity: number | null; unit: string | null; notes: string; source: Source };
export type CropCycleRecord = { id: string; code: string; crop: string; variety: string; greenhouse: string; zone: string; stage: string; status: string; startedOn: string | null; expectedHarvestOn: string | null; actualHarvestStartedOn: string | null; actualHarvestEndedOn: string | null; quantityPlanted: number | null; quantityTransplanted: number | null; notes: string; source: Source };
export type PlantingRecord = { id: string; plantedOn: string; greenhouse: string; zone: string; cropCycle: string; variety: string; quantity: number; unit: string; nurseryLocation: string; worker: string; notes: string; source: Source };
export type FertilizationRecord = { id: string; appliedAt: string; greenhouse: string; zone: string; cropCycle: string; product: string; quantity: number; unit: string; concentration: string; method: string; worker: string; notes: string; source: Source };
export type CropObservation = { id: string; observedAt: string; greenhouse: string; zone: string; cropCycle: string; observationType: "Pest" | "Disease" | "Crop condition"; issue: string; symptoms: string; severity: "Low" | "Medium" | "High" | "Critical"; affectedPlants: number | null; worker: string; notes: string; source: Source };
export type TreatmentRecord = { id: string; treatedAt: string; greenhouse: string; zone: string; cropCycle: string; problem: string; treatmentType: string; product: string; quantity: number | null; unit: string | null; worker: string; followUpDate: string | null; outcome: string; notes: string; source: Source };
export type HarvestRecord = { id: string; harvestedAt: string; greenhouse: string; zone: string; cropCycle: string; quantity: number; unit: string; grade: "Grade A" | "Grade B" | "Rejected"; quality: string; rejectedQuantity: number; worker: string; notes: string; source: Source };
export type InventoryItem = { id: string; name: string; category: string; unit: string; currentQuantity: number; minimumThreshold: number; supplier: string; unitCost: number | null; status: "Healthy" | "Low stock" | "Critical"; notes: string; source: Source };
export type AlertRecord = { id: string; title: string; severity: "Low" | "Medium" | "High" | "Critical"; status: "Open" | "Resolved"; triggeredAt: string; context: string; source: Source };
export type OperationsSnapshot = { cropCycles: CropCycleRecord[]; activities: OperationActivity[]; planting: PlantingRecord[]; fertilization: FertilizationRecord[]; observations: CropObservation[]; treatments: TreatmentRecord[]; harvest: HarvestRecord[]; inventory: InventoryItem[]; alerts: AlertRecord[]; source: Source };

const now = new Date("2026-08-21T12:00:00Z");
const daysAgo = (days: number, hour = 9) => { const date = new Date(now); date.setUTCDate(date.getUTCDate() - days); date.setUTCHours(hour, 20, 0, 0); return date.toISOString(); };
const cycle = (index: number) => GREENHOUSES[index % GREENHOUSES.length].cycle;
const house = (index: number) => GREENHOUSES[index % GREENHOUSES.length].name;

const demoCropCycles: CropCycleRecord[] = GREENHOUSES.map((item, index) => ({ id: `demo-cycle-${index + 1}`, code: item.cycle, crop: item.crop, variety: item.crop === "Tomato" ? "Roma" : item.crop === "Cucumber" ? "English" : "Bell", greenhouse: item.name, zone: "Zone A", stage: item.stage, status: "Active", startedOn: index < 2 ? "2026-05-01" : "2026-06-01", expectedHarvestOn: "2026-09-15", actualHarvestStartedOn: index === 0 ? "2026-08-12" : null, actualHarvestEndedOn: null, quantityPlanted: 480, quantityTransplanted: 420, notes: "Demo crop cycle.", source: "demo" }));
const demoActivities: OperationActivity[] = [
  { id: "demo-activity-1", activityType: "Transplanting", occurredAt: daysAgo(24, 8), greenhouse: "GH-01", zone: "Zone A", cropCycle: cycle(0), worker: "Mariam S.", durationHours: 3, quantity: 420, unit: "plants", notes: "Established tomato seedlings moved from nursery.", source: "demo" },
  { id: "demo-activity-2", activityType: "Pruning", occurredAt: daysAgo(3, 10), greenhouse: "GH-02", zone: "Zone B", cropCycle: cycle(1), worker: "Ahmed K.", durationHours: 2, quantity: null, unit: null, notes: "Lower leaves removed during routine pass.", source: "demo" },
  { id: "demo-activity-3", activityType: "Fertigation", occurredAt: daysAgo(2, 7), greenhouse: "GH-01", zone: "Zone A", cropCycle: cycle(0), worker: "Bilal R.", durationHours: 1, quantity: 850, unit: "L solution", notes: "Morning nutrient application.", source: "demo" },
  { id: "demo-activity-4", activityType: "Crop scouting", occurredAt: daysAgo(0, 10), greenhouse: "GH-03", zone: "Zone A", cropCycle: cycle(2), worker: "Bilal R.", durationHours: 1, quantity: null, unit: null, notes: "Scouting follow-up logged.", source: "demo" },
  { id: "demo-activity-5", activityType: "Maintenance", occurredAt: daysAgo(1, 14), greenhouse: "GH-04", zone: "Zone B", cropCycle: cycle(3), worker: "Mariam S.", durationHours: 1.5, quantity: null, unit: null, notes: "Checked pump connections.", source: "demo" },
];
const demoPlanting: PlantingRecord[] = [
  { id: "demo-planting-1", plantedOn: "2026-04-18", greenhouse: "GH-01", zone: "Zone A", cropCycle: cycle(0), variety: "Roma", quantity: 480, unit: "plants", nurseryLocation: "Nursery 1", worker: "Mariam S.", notes: "Seedlings passed establishment check.", source: "demo" },
  { id: "demo-planting-2", plantedOn: "2026-05-02", greenhouse: "GH-03", zone: "Zone A", cropCycle: cycle(2), variety: "English", quantity: 360, unit: "plants", nurseryLocation: "Nursery 2", worker: "Ahmed K.", notes: "Uniform transplant batch.", source: "demo" },
];
const demoFertilization: FertilizationRecord[] = [
  { id: "demo-fert-1", appliedAt: daysAgo(2, 7), greenhouse: "GH-01", zone: "Zone A", cropCycle: cycle(0), product: "Calcium nitrate", quantity: 5, unit: "kg", concentration: "2.5 g/L", method: "Fertigation", worker: "Bilal R.", notes: "Linked to morning irrigation cycle.", source: "demo" },
  { id: "demo-fert-2", appliedAt: daysAgo(5, 8), greenhouse: "GH-03", zone: "Zone B", cropCycle: cycle(2), product: "NPK 15-5-30", quantity: 3, unit: "kg", concentration: "2 g/L", method: "Fertigation", worker: "Ahmed K.", notes: "Flowering-stage feed.", source: "demo" },
];
const demoObservations: CropObservation[] = [
  { id: "demo-observation-1", observedAt: daysAgo(0, 10), greenhouse: "GH-03", zone: "Zone A", cropCycle: cycle(2), observationType: "Pest", issue: "Aphids", symptoms: "Clusters on lower leaves.", severity: "High", affectedPlants: 23, worker: "Bilal R.", notes: "Scouting follow-up required.", source: "demo" },
  { id: "demo-observation-2", observedAt: daysAgo(4, 11), greenhouse: "GH-02", zone: "Zone C", cropCycle: cycle(1), observationType: "Disease", issue: "Powdery mildew", symptoms: "White patches on older leaves.", severity: "Medium", affectedPlants: 9, worker: "Mariam S.", notes: "Monitor after treatment.", source: "demo" },
  { id: "demo-observation-3", observedAt: daysAgo(6, 9), greenhouse: "GH-01", zone: "Zone B", cropCycle: cycle(0), observationType: "Crop condition", issue: "Healthy canopy", symptoms: "Even growth and good colour.", severity: "Low", affectedPlants: null, worker: "Ahmed K.", notes: "No action required.", source: "demo" },
];
const demoTreatments: TreatmentRecord[] = [
  { id: "demo-treatment-1", treatedAt: daysAgo(3, 13), greenhouse: "GH-02", zone: "Zone C", cropCycle: cycle(1), problem: "Powdery mildew", treatmentType: "Approved fungicide", product: "Sulfur wettable powder", quantity: 1.2, unit: "kg", worker: "Mariam S.", followUpDate: "2026-08-24", outcome: "Follow-up pending", notes: "Applied according to farm protocol.", source: "demo" },
  { id: "demo-treatment-2", treatedAt: daysAgo(0, 12), greenhouse: "GH-03", zone: "Zone A", cropCycle: cycle(2), problem: "Aphids", treatmentType: "Targeted biological control", product: "Beneficial insects", quantity: null, unit: null, worker: "Bilal R.", followUpDate: "2026-08-23", outcome: "Follow-up pending", notes: "Release recorded for affected row.", source: "demo" },
];
const demoHarvest: HarvestRecord[] = [
  { id: "demo-harvest-1", harvestedAt: daysAgo(0, 8), greenhouse: "GH-01", zone: "Zone A", cropCycle: cycle(0), quantity: 86, unit: "kg", grade: "Grade A", quality: "Firm, export-ready", rejectedQuantity: 0, worker: "Mariam S.", notes: "Morning harvest.", source: "demo" },
  { id: "demo-harvest-2", harvestedAt: daysAgo(0, 8), greenhouse: "GH-01", zone: "Zone A", cropCycle: cycle(0), quantity: 14, unit: "kg", grade: "Grade B", quality: "Minor cosmetic marks", rejectedQuantity: 0, worker: "Mariam S.", notes: "Sorted at packhouse.", source: "demo" },
  { id: "demo-harvest-3", harvestedAt: daysAgo(1, 9), greenhouse: "GH-03", zone: "Zone A", cropCycle: cycle(2), quantity: 62, unit: "kg", grade: "Grade A", quality: "Good uniformity", rejectedQuantity: 4, worker: "Bilal R.", notes: "Cucumber harvest.", source: "demo" },
  { id: "demo-harvest-4", harvestedAt: daysAgo(4, 9), greenhouse: "GH-02", zone: "Zone B", cropCycle: cycle(1), quantity: 74, unit: "kg", grade: "Grade A", quality: "Firm fruit", rejectedQuantity: 2, worker: "Ahmed K.", notes: "Routine harvest.", source: "demo" },
];
const demoInventory: InventoryItem[] = [
  { id: "demo-stock-1", name: "Calcium nitrate", category: "Fertilizers", unit: "kg", currentQuantity: 18, minimumThreshold: 20, supplier: "Agri Inputs Co.", unitCost: 2.4, status: "Low stock", notes: "Reorder before next crop cycle.", source: "demo" },
  { id: "demo-stock-2", name: "NPK 15-5-30", category: "Fertilizers", unit: "kg", currentQuantity: 42, minimumThreshold: 15, supplier: "Agri Inputs Co.", unitCost: 3.1, status: "Healthy", notes: "Stored in dry room.", source: "demo" },
  { id: "demo-stock-3", name: "Beneficial insects", category: "Pesticides", unit: "packs", currentQuantity: 2, minimumThreshold: 3, supplier: "BioCrop Supply", unitCost: 18, status: "Critical", notes: "Order for next scouting round.", source: "demo" },
  { id: "demo-stock-4", name: "Seedling trays", category: "Tools", unit: "units", currentQuantity: 95, minimumThreshold: 30, supplier: "Farm Store", unitCost: null, status: "Healthy", notes: "Reusable.", source: "demo" },
];
const demoAlerts: AlertRecord[] = [
  { id: "demo-alert-1", title: "GH-03 needs a scouting follow-up", severity: "High", status: "Open", triggeredAt: daysAgo(0, 10), context: "High-severity pest observation · Zone A", source: "demo" },
  { id: "demo-alert-2", title: "Beneficial insects are below threshold", severity: "Critical", status: "Open", triggeredAt: daysAgo(1, 15), context: "Inventory item has 2 packs remaining", source: "demo" },
];

const demoSnapshot: OperationsSnapshot = { cropCycles: demoCropCycles, activities: demoActivities, planting: demoPlanting, fertilization: demoFertilization, observations: demoObservations, treatments: demoTreatments, harvest: demoHarvest, inventory: demoInventory, alerts: demoAlerts, source: "demo" };
const value = (row: any, key: string) => row?.[key] ?? null;
const related = (row: any, key: string) => { const item = row?.[key]; return Array.isArray(item) ? item[0] ?? null : item ?? null; };
const sourceMap = (rows: any[], mapper: (row: any) => any) => rows.map((row) => mapper(row));
const safeError = (error: unknown, fallback: string) => error instanceof Error ? error : new Error((error as { message?: string } | null)?.message || fallback);

export async function getOperationsSnapshot(userId: string | null): Promise<OperationsSnapshot> {
  if (!supabase || !isSupabaseConfigured()) return demoSnapshot;
  if (!userId) throw new Error("No authenticated user is available.");
  const membership = await supabase.from("farm_memberships").select("farm_id").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (membership.error) throw safeError(membership.error, "Farm membership could not be loaded.");
  if (!membership.data?.farm_id) return { cropCycles: [], activities: [], planting: [], fertilization: [], observations: [], treatments: [], harvest: [], inventory: [], alerts: [], source: "supabase" };
  const farmId = membership.data.farm_id;
  const greenhouseResult = await supabase.from("greenhouses").select("id").eq("farm_id", farmId);
  if (greenhouseResult.error) throw safeError(greenhouseResult.error, "Greenhouse structure could not be loaded.");
  const greenhouseIds = (greenhouseResult.data ?? []).map((row) => row.id);
  const cropCyclesResult = greenhouseIds.length ? await supabase.from("crop_cycles").select("id, code, stage, status, started_on, expected_harvest_on, actual_harvest_started_on, actual_harvest_ended_on, quantity_planted, quantity_transplanted, notes, greenhouse_id, crop_varieties(name, crop_types(name)), greenhouses(code)").in("greenhouse_id", greenhouseIds).order("started_on", { ascending: false }) : { data: [], error: null };
  if (cropCyclesResult.error) throw safeError(cropCyclesResult.error, "Crop cycles could not be loaded.");
  const results = await Promise.all([
    supabase.from("activities").select("id, activity_type, occurred_at, greenhouse_id, zone_id, crop_cycle_id, duration_hours, quantity, unit, notes, profiles(full_name), greenhouses(code), zones(name), crop_cycles(code)").eq("farm_id", farmId).order("occurred_at", { ascending: false }),
    supabase.from("planting_records").select("id, planted_on, greenhouse_id, zone_id, crop_cycle_id, variety, quantity, unit, nursery_location, notes, profiles(full_name), greenhouses(code), zones(name), crop_cycles(code)").eq("farm_id", farmId).order("planted_on", { ascending: false }),
    supabase.from("fertilization_records").select("id, applied_at, greenhouse_id, zone_id, crop_cycle_id, product, quantity, unit, concentration, application_method, notes, profiles(full_name), greenhouses(code), zones(name), crop_cycles(code)").eq("farm_id", farmId).order("applied_at", { ascending: false }),
    supabase.from("crop_observations").select("id, observed_at, greenhouse_id, zone_id, crop_cycle_id, observation_type, issue, symptoms, severity, affected_plants, notes, profiles(full_name), greenhouses(code), zones(name), crop_cycles(code)").eq("farm_id", farmId).order("observed_at", { ascending: false }),
    supabase.from("treatment_records").select("id, treated_at, greenhouse_id, zone_id, crop_cycle_id, problem, treatment_type, product, quantity, unit, follow_up_date, outcome, notes, profiles(full_name), greenhouses(code), zones(name), crop_cycles(code)").eq("farm_id", farmId).order("treated_at", { ascending: false }),
    supabase.from("harvest_records").select("id, harvested_at, greenhouse_id, zone_id, crop_cycle_id, quantity, unit, grade, quality, rejected_quantity, notes, profiles(full_name), greenhouses(code), zones(name), crop_cycles(code)").eq("farm_id", farmId).order("harvested_at", { ascending: false }),
    supabase.from("inventory_items").select("id, name, category, unit, current_quantity, minimum_threshold, supplier, unit_cost, status, notes").eq("farm_id", farmId).order("name"),
    supabase.from("alerts").select("id, title, severity, status, triggered_at, context").eq("farm_id", farmId).order("triggered_at", { ascending: false }),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw safeError(failed.error, "Operational data could not be loaded.");
  const [activities, planting, fertilization, observations, treatments, harvest, inventory, alerts] = results.map((result) => result.data ?? []);
  const cropCycles = (cropCyclesResult.data ?? []).map((row: any) => { const variety = related(row, "crop_varieties"); const crop = related(variety, "crop_types"); return { id: row.id, code: row.code, crop: crop?.name ?? "Crop", variety: variety?.name ?? "Variety", greenhouse: related(row, "greenhouses")?.code ?? "", zone: "", stage: row.stage, status: row.status ?? "Active", startedOn: row.started_on ?? null, expectedHarvestOn: row.expected_harvest_on ?? null, actualHarvestStartedOn: row.actual_harvest_started_on ?? null, actualHarvestEndedOn: row.actual_harvest_ended_on ?? null, quantityPlanted: row.quantity_planted == null ? null : Number(row.quantity_planted), quantityTransplanted: row.quantity_transplanted == null ? null : Number(row.quantity_transplanted), notes: row.notes ?? "", source: "supabase" as const }; });
  return {
    cropCycles,
    activities: sourceMap(activities as any[], (row) => ({ id: row.id, activityType: row.activity_type, occurredAt: row.occurred_at, greenhouse: related(row, "greenhouses")?.code ?? "", zone: related(row, "zones")?.name ?? "", cropCycle: related(row, "crop_cycles")?.code ?? "", worker: related(row, "profiles")?.full_name ?? "Worker", durationHours: value(row, "duration_hours"), quantity: value(row, "quantity"), unit: value(row, "unit"), notes: row.notes ?? "", source: "supabase" })),
    planting: sourceMap(planting as any[], (row) => ({ id: row.id, plantedOn: row.planted_on, greenhouse: related(row, "greenhouses")?.code ?? "", zone: related(row, "zones")?.name ?? "", cropCycle: related(row, "crop_cycles")?.code ?? "", variety: row.variety, quantity: Number(row.quantity), unit: row.unit, nurseryLocation: row.nursery_location ?? "", worker: related(row, "profiles")?.full_name ?? "Worker", notes: row.notes ?? "", source: "supabase" })),
    fertilization: sourceMap(fertilization as any[], (row) => ({ id: row.id, appliedAt: row.applied_at, greenhouse: related(row, "greenhouses")?.code ?? "", zone: related(row, "zones")?.name ?? "", cropCycle: related(row, "crop_cycles")?.code ?? "", product: row.product, quantity: Number(row.quantity), unit: row.unit, concentration: row.concentration ?? "", method: row.application_method, worker: related(row, "profiles")?.full_name ?? "Worker", notes: row.notes ?? "", source: "supabase" })),
    observations: sourceMap(observations as any[], (row) => ({ id: row.id, observedAt: row.observed_at, greenhouse: related(row, "greenhouses")?.code ?? "", zone: related(row, "zones")?.name ?? "", cropCycle: related(row, "crop_cycles")?.code ?? "", observationType: row.observation_type, issue: row.issue, symptoms: row.symptoms ?? "", severity: row.severity, affectedPlants: row.affected_plants, worker: related(row, "profiles")?.full_name ?? "Worker", notes: row.notes ?? "", source: "supabase" })),
    treatments: sourceMap(treatments as any[], (row) => ({ id: row.id, treatedAt: row.treated_at, greenhouse: related(row, "greenhouses")?.code ?? "", zone: related(row, "zones")?.name ?? "", cropCycle: related(row, "crop_cycles")?.code ?? "", problem: row.problem, treatmentType: row.treatment_type, product: row.product, quantity: row.quantity, unit: row.unit, worker: related(row, "profiles")?.full_name ?? "Worker", followUpDate: row.follow_up_date, outcome: row.outcome ?? "", notes: row.notes ?? "", source: "supabase" })),
    harvest: sourceMap(harvest as any[], (row) => ({ id: row.id, harvestedAt: row.harvested_at, greenhouse: related(row, "greenhouses")?.code ?? "", zone: related(row, "zones")?.name ?? "", cropCycle: related(row, "crop_cycles")?.code ?? "", quantity: Number(row.quantity), unit: row.unit, grade: row.grade, quality: row.quality ?? "", rejectedQuantity: Number(row.rejected_quantity ?? 0), worker: related(row, "profiles")?.full_name ?? "Worker", notes: row.notes ?? "", source: "supabase" })),
    inventory: sourceMap(inventory as any[], (row) => ({ id: row.id, name: row.name, category: row.category, unit: row.unit, currentQuantity: Number(row.current_quantity), minimumThreshold: Number(row.minimum_threshold), supplier: row.supplier ?? "", unitCost: row.unit_cost == null ? null : Number(row.unit_cost), status: row.status, notes: row.notes ?? "", source: "supabase" })),
    alerts: sourceMap(alerts as any[], (row) => ({ id: row.id, title: row.title, severity: row.severity, status: row.status, triggeredAt: row.triggered_at, context: row.context ?? "", source: "supabase" })),
    source: "supabase",
  };
}

async function resolveLocation(farmId: string, greenhouseCode: string, zoneName: string, cropCycleCode: string) { const greenhouse = await supabase!.from("greenhouses").select("id").eq("farm_id", farmId).eq("code", greenhouseCode).single(); if (greenhouse.error) throw greenhouse.error; const zone = await supabase!.from("zones").select("id").eq("greenhouse_id", greenhouse.data.id).eq("name", zoneName).single(); if (zone.error) throw zone.error; const cycle = cropCycleCode ? await supabase!.from("crop_cycles").select("id").eq("greenhouse_id", greenhouse.data.id).eq("code", cropCycleCode).single() : { data: null, error: null }; if (cycle.error) throw cycle.error; return { greenhouseId: greenhouse.data.id, zoneId: zone.data.id, cropCycleId: cycle.data?.id ?? null }; }

export async function addActivity(input: Omit<OperationActivity, "id" | "worker" | "source">, userId: string | null) {
  if (!supabase || !userId) throw new Error("Live activity records require an authenticated Supabase user.");
  const membership = await supabase.from("farm_memberships").select("farm_id").eq("user_id", userId).limit(1).maybeSingle();
  if (membership.error || !membership.data?.farm_id) throw safeError(membership.error, "No farm membership is available for this activity.");
  const location = await resolveLocation(membership.data.farm_id, input.greenhouse, input.zone, input.cropCycle);
  const { error } = await supabase.from("activities").insert({ farm_id: membership.data.farm_id, recorded_by: userId, activity_type: input.activityType, occurred_at: input.occurredAt, greenhouse_id: location.greenhouseId, zone_id: location.zoneId, crop_cycle_id: location.cropCycleId, duration_hours: input.durationHours, quantity: input.quantity, unit: input.unit, notes: input.notes });
  if (error) throw safeError(error, "The activity could not be saved.");
}

export async function addPlanting(input: Omit<PlantingRecord, "id" | "worker" | "source">, userId: string | null) {
  if (!supabase || !userId) throw new Error("Live planting records require an authenticated Supabase user.");
  const membership = await supabase.from("farm_memberships").select("farm_id").eq("user_id", userId).limit(1).maybeSingle();
  if (membership.error || !membership.data?.farm_id) throw safeError(membership.error, "No farm membership is available for this planting.");
  const location = await resolveLocation(membership.data.farm_id, input.greenhouse, input.zone, input.cropCycle);
  const { error } = await supabase.from("planting_records").insert({ farm_id: membership.data.farm_id, recorded_by: userId, planted_on: input.plantedOn, greenhouse_id: location.greenhouseId, zone_id: location.zoneId, crop_cycle_id: location.cropCycleId, variety: input.variety, quantity: input.quantity, unit: input.unit, nursery_location: input.nurseryLocation, notes: input.notes });
  if (error) throw safeError(error, "The planting record could not be saved.");
}

export async function addObservation(input: Omit<CropObservation, "id" | "worker" | "source">, userId: string | null) {
  if (!supabase || !userId) throw new Error("Live crop-health records require an authenticated Supabase user.");
  const membership = await supabase.from("farm_memberships").select("farm_id").eq("user_id", userId).limit(1).maybeSingle();
  if (membership.error || !membership.data?.farm_id) throw safeError(membership.error, "No farm membership is available for this observation.");
  const location = await resolveLocation(membership.data.farm_id, input.greenhouse, input.zone, input.cropCycle);
  const { error } = await supabase.from("crop_observations").insert({ farm_id: membership.data.farm_id, recorded_by: userId, observed_at: input.observedAt, greenhouse_id: location.greenhouseId, zone_id: location.zoneId, crop_cycle_id: location.cropCycleId, observation_type: input.observationType, issue: input.issue, symptoms: input.symptoms, severity: input.severity, affected_plants: input.affectedPlants, notes: input.notes });
  if (error) throw safeError(error, "The crop observation could not be saved.");
}

export async function addInventoryItem(input: Omit<InventoryItem, "id" | "source" | "status">, userId: string | null) {
  if (!supabase || !userId) throw new Error("Live inventory changes require an authenticated Supabase user.");
  const membership = await supabase.from("farm_memberships").select("farm_id").eq("user_id", userId).limit(1).maybeSingle();
  if (membership.error || !membership.data?.farm_id) throw safeError(membership.error, "No farm membership is available for this inventory item.");
  const status = input.currentQuantity <= 0 ? "Critical" : input.currentQuantity <= input.minimumThreshold ? "Low stock" : "Healthy";
  const { error } = await supabase.from("inventory_items").insert({ ...input, farm_id: membership.data.farm_id, status });
  if (error) throw safeError(error, "The inventory item could not be saved.");
}

export async function addHarvest(input: Omit<HarvestRecord, "id" | "worker" | "source">, userId: string | null) {
  if (!supabase || !userId) throw new Error("Live harvest records require an authenticated Supabase user.");
  const membership = await supabase.from("farm_memberships").select("farm_id").eq("user_id", userId).limit(1).maybeSingle();
  if (membership.error || !membership.data?.farm_id) throw safeError(membership.error, "No farm membership is available for this harvest.");
  const location = await resolveLocation(membership.data.farm_id, input.greenhouse, input.zone, input.cropCycle);
  const { error } = await supabase.from("harvest_records").insert({ farm_id: membership.data.farm_id, recorded_by: userId, harvested_at: input.harvestedAt, greenhouse_id: location.greenhouseId, zone_id: location.zoneId, crop_cycle_id: location.cropCycleId, quantity: input.quantity, unit: input.unit, grade: input.grade, quality: input.quality, rejected_quantity: input.rejectedQuantity, notes: input.notes });
  if (error) throw safeError(error, "The harvest could not be saved.");
}
