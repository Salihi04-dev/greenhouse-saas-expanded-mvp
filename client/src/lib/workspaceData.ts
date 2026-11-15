import { supabase } from "@/lib/supabase";
import { GREENHOUSES, isSupabaseConfigured, type Greenhouse } from "@/lib/farmData";
import type { AppRole } from "@/lib/supabase";

export type WorkspaceFarm = { id: string; name: string; createdAt: string | null; source: "supabase" | "demo" };
export type WorkspaceMember = { userId: string; fullName: string; role: AppRole; joinedAt: string; status: "Active" };
export type WorkspaceStructure = { id: string; code: string; name: string; status: string; createdAt: string | null; zones: Array<{ id: string; name: string }>; cropCycles: Array<{ id: string; code: string; stage: string; startedOn: string | null; endedOn: string | null }> };
export type WorkspaceSnapshot = { farm: WorkspaceFarm | null; members: WorkspaceMember[]; structure: WorkspaceStructure[]; availableProfiles: Array<{ id: string; fullName: string; role: AppRole }>; source: "supabase" | "demo" };

const DEMO_FARM: WorkspaceFarm = { id: "demo-farm", name: "GreenFields Demonstration Farm", createdAt: null, source: "demo" };

function asOne<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
function ensureError(error: unknown, fallback: string) { return error instanceof Error ? error : new Error((error as { message?: string } | null)?.message || fallback); }

export async function getWorkspaceSnapshot(userId: string | null): Promise<WorkspaceSnapshot> {
  if (!supabase || !isSupabaseConfigured()) {
    return { farm: DEMO_FARM, members: [{ userId: "demo-admin", fullName: "Mariam Khalid", role: "admin", joinedAt: new Date("2026-01-01").toISOString(), status: "Active" }], structure: GREENHOUSES.map((house, index) => ({ id: `demo-greenhouse-${index + 1}`, code: house.name, name: house.crop, status: house.status, createdAt: null, zones: Array.from({ length: house.zones }, (_, zone) => ({ id: `${house.name}-zone-${zone + 1}`, name: `Zone ${String.fromCharCode(65 + zone)}` })), cropCycles: [{ id: `${house.cycle}-cycle`, code: house.cycle, stage: house.stage, startedOn: null, endedOn: null }] })), availableProfiles: [], source: "demo" };
  }
  if (!userId) throw new Error("No authenticated user is available.");

  const { data: membership, error: membershipError } = await supabase.from("farm_memberships").select("farm_id, created_at, farms(id, name, created_at)").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (membershipError) throw ensureError(membershipError, "The farm membership could not be loaded.");
  const farmRow = asOne((membership as any)?.farms);
  if (!membership || !farmRow) return { farm: null, members: [], structure: [], availableProfiles: [], source: "supabase" };

  const farmId = (membership as any).farm_id as string;
  const [membersResult, structureResult, profilesResult] = await Promise.all([
    supabase.from("farm_memberships").select("user_id, created_at, profiles(id, full_name, role)").eq("farm_id", farmId).order("created_at", { ascending: true }),
    supabase.from("greenhouses").select("id, code, name, status, created_at, zones(id, name), crop_cycles(id, code, stage, started_on, ended_on)").eq("farm_id", farmId).order("code", { ascending: true }),
    supabase.from("profiles").select("id, full_name, role").order("full_name", { ascending: true }),
  ]);
  if (membersResult.error) throw ensureError(membersResult.error, "Farm members could not be loaded.");
  if (structureResult.error) throw ensureError(structureResult.error, "Farm structure could not be loaded.");
  if (profilesResult.error) throw ensureError(profilesResult.error, "Available profiles could not be loaded.");

  const members = ((membersResult.data ?? []) as any[]).map((row) => { const profile = asOne(row.profiles); return { userId: row.user_id, fullName: profile?.full_name ?? "Unnamed user", role: profile?.role ?? "worker", joinedAt: row.created_at, status: "Active" as const }; });
  const memberIds = new Set(members.map((member) => member.userId));
  const availableProfiles = ((profilesResult.data ?? []) as any[]).filter((profile) => !memberIds.has(profile.id)).map((profile) => ({ id: profile.id, fullName: profile.full_name, role: profile.role }));
  const structure = ((structureResult.data ?? []) as any[]).map((row) => ({ id: row.id, code: row.code, name: row.name ?? row.code, status: row.status ?? "Healthy", createdAt: row.created_at ?? null, zones: (row.zones ?? []).map((zone: any) => ({ id: zone.id, name: zone.name })), cropCycles: (row.crop_cycles ?? []).map((cycle: any) => ({ id: cycle.id, code: cycle.code, stage: cycle.stage, startedOn: cycle.started_on ?? null, endedOn: cycle.ended_on ?? null })) }));
  return { farm: { id: farmRow.id, name: farmRow.name, createdAt: farmRow.created_at ?? null, source: "supabase" }, members, structure, availableProfiles, source: "supabase" };
}

export async function addFarmMember(farmId: string, userId: string) {
  if (!supabase) throw new Error("Workspace membership changes require Supabase.");
  const { error } = await supabase.from("farm_memberships").insert({ farm_id: farmId, user_id: userId });
  if (error) throw ensureError(error, "The profile could not be added to this farm.");
}

export async function removeFarmMember(farmId: string, userId: string) {
  if (!supabase) throw new Error("Workspace membership changes require Supabase.");
  const { error } = await supabase.from("farm_memberships").delete().eq("farm_id", farmId).eq("user_id", userId);
  if (error) throw ensureError(error, "The profile could not be removed from this farm.");
}
