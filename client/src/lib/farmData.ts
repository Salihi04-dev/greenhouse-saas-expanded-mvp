import { getSession, supabase } from "@/lib/supabase";

export type MeasurementMethod = "manual" | "estimated_from_flow_rate" | "tank_estimate" | "flow_meter" | "sensor" | "other";
export type RecordInput = {
  greenhouse: string;
  zone: string;
  cropCycle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  waterQuantityLitres: number;
  flowRate?: number;
  measurementMethod: MeasurementMethod;
  notes?: string;
};
export type IrrigationRecord = RecordInput & { id: string; recordedAt: string; recordedBy: string; source: "demo" | "supabase" };
export type Greenhouse = { name: string; crop: string; stage: string; status: "Healthy" | "Attention"; zones: number; tint: string; cycle: string };

const KEY = "field-ledger-irrigation-v1";
const today = new Date("2026-08-21T12:00:00");
const iso = (daysAgo: number, hour: number) => { const d = new Date(today); d.setDate(d.getDate() - daysAgo); d.setHours(hour, 20, 0, 0); return d.toISOString(); };

export const GREENHOUSES: Greenhouse[] = [
  { name: "GH-01", crop: "Tomato · Roma", stage: "Fruiting", status: "Healthy", zones: 3, tint: "leaf", cycle: "2026-TOM-03" },
  { name: "GH-02", crop: "Tomato · Roma", stage: "Fruiting", status: "Healthy", zones: 3, tint: "water", cycle: "2026-TOM-03" },
  { name: "GH-03", crop: "Cucumber · English", stage: "Flowering", status: "Attention", zones: 2, tint: "amber", cycle: "2026-CUC-02" },
  { name: "GH-04", crop: "Pepper · Bell", stage: "Vegetative", status: "Healthy", zones: 2, tint: "slate", cycle: "2026-PEP-01" },
];

const seed: IrrigationRecord[] = [
  { id: "demo-1", greenhouse: "GH-02", zone: "Zone B", cropCycle: "2026-TOM-03", startTime: "07:15", endTime: "07:45", durationMinutes: 30, waterQuantityLitres: 1200, flowRate: 40, measurementMethod: "estimated_from_flow_rate", notes: "Routine morning irrigation.", recordedAt: iso(0, 7), recordedBy: "Ahmed K.", source: "demo" },
  { id: "demo-2", greenhouse: "GH-01", zone: "Zone A", cropCycle: "2026-TOM-03", startTime: "08:50", endTime: "09:16", durationMinutes: 26, waterQuantityLitres: 1050, measurementMethod: "flow_meter", notes: "", recordedAt: iso(0, 9), recordedBy: "Mariam S.", source: "demo" },
  { id: "demo-3", greenhouse: "GH-03", zone: "Zone A", cropCycle: "2026-CUC-02", startTime: "09:40", endTime: "09:58", durationMinutes: 18, waterQuantityLitres: 720, flowRate: 40, measurementMethod: "estimated_from_flow_rate", notes: "", recordedAt: iso(0, 10), recordedBy: "Bilal R.", source: "demo" },
  { id: "demo-4", greenhouse: "GH-04", zone: "Zone B", cropCycle: "2026-PEP-01", startTime: "10:55", endTime: "11:09", durationMinutes: 14, waterQuantityLitres: 560, measurementMethod: "tank_estimate", notes: "", recordedAt: iso(1, 11), recordedBy: "Ahmed K.", source: "demo" },
  ...Array.from({ length: 8 }, (_, i) => ({ id: `demo-history-${i}`, greenhouse: GREENHOUSES[i % 4].name, zone: `Zone ${String.fromCharCode(65 + (i % 3))}`, cropCycle: GREENHOUSES[i % 4].cycle, startTime: "06:40", endTime: "07:00", durationMinutes: 20, waterQuantityLitres: 680 + i * 55, flowRate: 34 + i, measurementMethod: i % 2 ? "flow_meter" as MeasurementMethod : "estimated_from_flow_rate" as MeasurementMethod, notes: "", recordedAt: iso(2 + Math.floor(i / 2), 7), recordedBy: i % 2 ? "Mariam S." : "Ahmed K.", source: "demo" as const })),
];

let records = readLocal();
let listeners: Array<() => void> = [];

function readLocal(): IrrigationRecord[] { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : seed; } catch { return seed; } }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { /* storage is optional */ } }
export function isSupabaseConfigured() { return Boolean(supabase); }
export function getIrrigationRecords() { return [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)); }
export function subscribeFarmData(listener: () => void) { listeners.push(listener); return () => { listeners = listeners.filter((item) => item !== listener); }; }
export function formatMethod(method: MeasurementMethod) { return method === "estimated_from_flow_rate" || method === "tank_estimate" ? "Estimated" : "Measured"; }
export function isEstimated(method: MeasurementMethod) { return method === "estimated_from_flow_rate" || method === "tank_estimate"; }
export function calculateDuration(startTime: string, endTime: string) { const [sh, sm] = startTime.split(":").map(Number); const [eh, em] = endTime.split(":").map(Number); const value = eh * 60 + em - (sh * 60 + sm); return value > 0 ? value : 0; }

export async function refreshFromSupabase() {
  if (!supabase) return false;
  const { data: structure } = await supabase.from("greenhouses").select("code, status, zones(name), crop_cycles(code, stage, crop_varieties(name, crop_types(name)))").order("code");
  if (structure?.length) {
    const tint = ["leaf", "water", "amber", "slate"];
    GREENHOUSES.splice(0, GREENHOUSES.length, ...structure.map((row: any, index) => { const cycle = Array.isArray(row.crop_cycles) ? row.crop_cycles[0] : row.crop_cycles; const variety = Array.isArray(cycle?.crop_varieties) ? cycle.crop_varieties[0] : cycle?.crop_varieties; const cropType = Array.isArray(variety?.crop_types) ? variety.crop_types[0] : variety?.crop_types; return { name: row.code, crop: [cropType?.name, variety?.name].filter(Boolean).join(" · ") || "Crop not assigned", stage: cycle?.stage ?? "Not assigned", status: (row.status === "Attention" ? "Attention" : "Healthy") as Greenhouse["status"], zones: Array.isArray(row.zones) ? row.zones.length : 0, tint: tint[index % tint.length], cycle: cycle?.code ?? "" }; }));
  }
  const { data, error } = await supabase.from("irrigation_records").select("id, greenhouse_id, zone_id, crop_cycle_id, started_at, ended_at, duration_minutes, water_quantity_litres, flow_rate_litres_per_minute, measurement_method, notes, created_at, profiles(full_name), greenhouses(code), zones(name), crop_cycles(code)").order("created_at", { ascending: false });
  if (error || !data) return false;
  records = data.map((row: any) => ({ id: row.id, greenhouse: row.greenhouses?.code ?? "Unknown", zone: row.zones?.name ?? "Unknown zone", cropCycle: row.crop_cycles?.code ?? "", startTime: new Date(row.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }), endTime: new Date(row.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }), durationMinutes: row.duration_minutes, waterQuantityLitres: Number(row.water_quantity_litres), flowRate: row.flow_rate_litres_per_minute ? Number(row.flow_rate_litres_per_minute) : undefined, measurementMethod: row.measurement_method, notes: row.notes ?? "", recordedAt: row.created_at, recordedBy: row.profiles?.full_name ?? "Worker", source: "supabase" }));
  listeners.forEach((listener) => listener()); return true;
}

export async function addIrrigationRecord(input: RecordInput) {
  const session = supabase ? await getSession() : null;
  const record: IrrigationRecord = { ...input, id: crypto.randomUUID(), recordedAt: new Date().toISOString(), recordedBy: session?.profile?.full_name ?? "Demo worker", source: supabase ? "supabase" : "demo" };
  if (supabase) {
    const { data: greenhouse } = await supabase.from("greenhouses").select("id").eq("code", input.greenhouse).single();
    const { data: zone } = await supabase.from("zones").select("id").eq("name", input.zone).eq("greenhouse_id", greenhouse?.id).single();
    const { data: cycle } = await supabase.from("crop_cycles").select("id").eq("code", input.cropCycle).single();
    const { data: sessionData } = await supabase.auth.getSession();
    const { error } = await supabase.from("irrigation_records").insert({ greenhouse_id: greenhouse?.id, zone_id: zone?.id, crop_cycle_id: cycle?.id, recorded_by: sessionData.session?.user.id, started_at: new Date(`${new Date().toDateString()} ${input.startTime}`).toISOString(), ended_at: new Date(`${new Date().toDateString()} ${input.endTime}`).toISOString(), duration_minutes: input.durationMinutes, water_quantity_litres: input.waterQuantityLitres, flow_rate_litres_per_minute: input.flowRate ?? null, measurement_method: input.measurementMethod, notes: input.notes ?? "" });
    if (error) throw error;
    await refreshFromSupabase(); return;
  }
  records = [record, ...records]; persist(); listeners.forEach((listener) => listener());
}
