-- Field Ledger greenhouse SaaS MVP schema. Run in Supabase SQL editor.
create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('worker','manager','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.measurement_method as enum ('manual','estimated_from_flow_rate','tank_estimate','flow_meter','sensor','other'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null, role public.app_role not null default 'worker', created_at timestamptz not null default now());
create table if not exists public.farms (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table if not exists public.greenhouses (id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, code text not null, name text, status text not null default 'Healthy', created_at timestamptz not null default now(), unique(farm_id, code));
create table if not exists public.zones (id uuid primary key default gen_random_uuid(), greenhouse_id uuid not null references public.greenhouses(id) on delete cascade, name text not null, created_at timestamptz not null default now(), unique(greenhouse_id, name));
create table if not exists public.crop_types (id uuid primary key default gen_random_uuid(), name text not null unique);
create table if not exists public.crop_varieties (id uuid primary key default gen_random_uuid(), crop_type_id uuid not null references public.crop_types(id) on delete cascade, name text not null);
create table if not exists public.crop_cycles (id uuid primary key default gen_random_uuid(), greenhouse_id uuid not null references public.greenhouses(id) on delete cascade, crop_variety_id uuid references public.crop_varieties(id), code text not null unique, stage text not null, started_on date, ended_on date);
create table if not exists public.irrigation_records (id uuid primary key default gen_random_uuid(), greenhouse_id uuid not null references public.greenhouses(id), zone_id uuid not null references public.zones(id), crop_cycle_id uuid references public.crop_cycles(id), recorded_by uuid not null references public.profiles(id), started_at timestamptz not null, ended_at timestamptz not null, duration_minutes numeric(8,2) not null check (duration_minutes > 0), water_quantity_litres numeric(12,2) not null check (water_quantity_litres >= 0), flow_rate_litres_per_minute numeric(10,2), measurement_method public.measurement_method not null, notes text, created_at timestamptz not null default now(), check (ended_at > started_at), check (measurement_method <> 'estimated_from_flow_rate' or flow_rate_litres_per_minute is not null));
create index if not exists irrigation_records_created_at_idx on public.irrigation_records(created_at desc);
create index if not exists irrigation_records_greenhouse_idx on public.irrigation_records(greenhouse_id, created_at desc);
create index if not exists irrigation_records_zone_idx on public.irrigation_records(zone_id, created_at desc);

create or replace function public.current_user_role() returns public.app_role language sql stable security definer set search_path = public as $$ select role from public.profiles where id = auth.uid() $$;
create or replace function public.is_manager_or_admin() returns boolean language sql stable security definer set search_path = public as $$ select coalesce(public.current_user_role() in ('manager','admin'), false) $$;

alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.greenhouses enable row level security;
alter table public.zones enable row level security;
alter table public.crop_types enable row level security;
alter table public.crop_varieties enable row level security;
alter table public.crop_cycles enable row level security;
alter table public.irrigation_records enable row level security;

drop policy if exists profiles_self_or_manager on public.profiles;
create policy profiles_self_or_manager on public.profiles for select using (id = auth.uid() or public.is_manager_or_admin());
drop policy if exists farm_authenticated_read on public.farms;
create policy farm_authenticated_read on public.farms for select to authenticated using (true);
drop policy if exists greenhouse_authenticated_read on public.greenhouses;
create policy greenhouse_authenticated_read on public.greenhouses for select to authenticated using (true);
drop policy if exists zones_authenticated_read on public.zones;
create policy zones_authenticated_read on public.zones for select to authenticated using (true);
drop policy if exists cycles_authenticated_read on public.crop_cycles;
create policy cycles_authenticated_read on public.crop_cycles for select to authenticated using (true);
drop policy if exists irrigation_read on public.irrigation_records;
create policy irrigation_read on public.irrigation_records for select to authenticated using (recorded_by = auth.uid() or public.is_manager_or_admin());
drop policy if exists irrigation_worker_insert on public.irrigation_records;
create policy irrigation_worker_insert on public.irrigation_records for insert to authenticated with check (recorded_by = auth.uid());

-- Create profiles from a trusted Edge Function or dashboard trigger after user signup.

-- Secure provisioning: every Auth user receives a worker profile; role is never client-assigned.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1), 'Field worker'), 'worker')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Memberships scope users to farms and prevent arbitrary location inserts.
create table if not exists public.farm_memberships (farm_id uuid not null references public.farms(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key (farm_id, user_id));
create index if not exists farm_memberships_user_idx on public.farm_memberships(user_id);
alter table public.farm_memberships enable row level security;

create or replace function public.has_farm_access(target_farm_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_manager_or_admin() or exists (select 1 from public.farm_memberships where farm_id = target_farm_id and user_id = auth.uid()) $$;

-- Replace broad authenticated reads with membership-scoped reads.
drop policy if exists farm_authenticated_read on public.farms;
create policy farm_membership_read on public.farms for select to authenticated using (public.has_farm_access(id));
drop policy if exists greenhouse_authenticated_read on public.greenhouses;
create policy greenhouse_membership_read on public.greenhouses for select to authenticated using (public.has_farm_access(farm_id));
drop policy if exists zones_authenticated_read on public.zones;
create policy zones_membership_read on public.zones for select to authenticated using (exists (select 1 from public.greenhouses g where g.id = greenhouse_id and public.has_farm_access(g.farm_id)));
drop policy if exists cycles_authenticated_read on public.crop_cycles;
create policy cycles_membership_read on public.crop_cycles for select to authenticated using (exists (select 1 from public.greenhouses g where g.id = greenhouse_id and public.has_farm_access(g.farm_id)));
drop policy if exists irrigation_read on public.irrigation_records;
create policy irrigation_membership_read on public.irrigation_records for select to authenticated using (public.has_farm_access((select g.farm_id from public.greenhouses g where g.id = greenhouse_id)) and (recorded_by = auth.uid() or public.is_manager_or_admin()));
drop policy if exists irrigation_worker_insert on public.irrigation_records;
create policy irrigation_membership_insert on public.irrigation_records for insert to authenticated with check (
  recorded_by = auth.uid()
  and public.has_farm_access((select g.farm_id from public.greenhouses g where g.id = greenhouse_id))
  and exists (select 1 from public.zones z where z.id = zone_id and z.greenhouse_id = greenhouse_id)
  and (crop_cycle_id is null or exists (select 1 from public.crop_cycles c where c.id = crop_cycle_id and c.greenhouse_id = greenhouse_id))
);
drop policy if exists farm_membership_self_read on public.farm_memberships;
create policy farm_membership_self_read on public.farm_memberships for select to authenticated using (user_id = auth.uid() or public.is_manager_or_admin());

-- Workspace Settings mutations remain database-authorized; frontend role checks are only for presentation.
drop policy if exists farm_membership_admin_insert on public.farm_memberships;
create policy farm_membership_admin_insert on public.farm_memberships for insert to authenticated with check (public.is_manager_or_admin() and public.has_farm_access(farm_id));
drop policy if exists farm_membership_admin_delete on public.farm_memberships;
create policy farm_membership_admin_delete on public.farm_memberships for delete to authenticated using (public.is_manager_or_admin() and public.has_farm_access(farm_id));

-- Phase 1–2 operational expansion. Existing core tables remain authoritative.
alter table public.crop_cycles add column if not exists expected_harvest_on date;
alter table public.crop_cycles add column if not exists actual_harvest_started_on date;
alter table public.crop_cycles add column if not exists actual_harvest_ended_on date;
alter table public.crop_cycles add column if not exists quantity_planted numeric(12,2);
alter table public.crop_cycles add column if not exists quantity_transplanted numeric(12,2);
alter table public.crop_cycles add column if not exists status text not null default 'Active';
alter table public.crop_cycles add column if not exists notes text;

create table if not exists public.planting_records (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
  greenhouse_id uuid not null references public.greenhouses(id), zone_id uuid references public.zones(id), crop_cycle_id uuid not null references public.crop_cycles(id),
  variety text not null, quantity numeric(12,2) not null check (quantity >= 0), unit text not null default 'plants', planted_on date not null,
  nursery_location text, germination_on date, germination_quantity numeric(12,2), germination_rate numeric(5,2) check (germination_rate is null or (germination_rate >= 0 and germination_rate <= 100)),
  recorded_by uuid not null references public.profiles(id), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
  activity_type text not null check (activity_type in ('Irrigation','Fertilization','Fertigation','Planting','Transplanting','Pruning','Trellising','Weeding','Thinning','Crop scouting','Disease scouting','Treatment','Harvest','Maintenance','Cleaning','Other')),
  greenhouse_id uuid references public.greenhouses(id), zone_id uuid references public.zones(id), crop_cycle_id uuid references public.crop_cycles(id),
  occurred_at timestamptz not null default now(), duration_hours numeric(8,2) check (duration_hours is null or duration_hours >= 0), quantity numeric(12,2) check (quantity is null or quantity >= 0), unit text, recorded_by uuid not null references public.profiles(id), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.fertilization_records (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
  greenhouse_id uuid not null references public.greenhouses(id), zone_id uuid references public.zones(id), crop_cycle_id uuid references public.crop_cycles(id),
  applied_at timestamptz not null default now(), product text not null, quantity numeric(12,2) not null check (quantity >= 0), unit text not null, concentration text, application_method text not null,
  recorded_by uuid not null references public.profiles(id), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.crop_observations (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
  greenhouse_id uuid not null references public.greenhouses(id), zone_id uuid references public.zones(id), crop_cycle_id uuid references public.crop_cycles(id),
  observed_at timestamptz not null default now(), observation_type text not null check (observation_type in ('Pest','Disease','Crop condition')), issue text not null, symptoms text, severity text not null check (severity in ('Low','Medium','High','Critical')), affected_plants numeric(12,2) check (affected_plants is null or affected_plants >= 0), affected_area text,
  recorded_by uuid not null references public.profiles(id), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.treatment_records (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
  observation_id uuid references public.crop_observations(id), greenhouse_id uuid not null references public.greenhouses(id), zone_id uuid references public.zones(id), crop_cycle_id uuid references public.crop_cycles(id),
  treated_at timestamptz not null default now(), problem text not null, treatment_type text not null, product text not null, quantity numeric(12,2) check (quantity is null or quantity >= 0), unit text, follow_up_date date, outcome text,
  recorded_by uuid not null references public.profiles(id), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.harvest_records (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
  greenhouse_id uuid not null references public.greenhouses(id), zone_id uuid references public.zones(id), crop_cycle_id uuid references public.crop_cycles(id),
  harvested_at timestamptz not null default now(), quantity numeric(12,2) not null check (quantity >= 0), unit text not null default 'kg', grade text not null check (grade in ('Grade A','Grade B','Rejected')), quality text, rejected_quantity numeric(12,2) not null default 0 check (rejected_quantity >= 0),
  recorded_by uuid not null references public.profiles(id), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, name text not null, category text not null, unit text not null, current_quantity numeric(12,2) not null default 0 check (current_quantity >= 0), minimum_threshold numeric(12,2) not null default 0 check (minimum_threshold >= 0), supplier text, unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0), status text not null default 'Healthy', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(farm_id, name)
);
create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, inventory_item_id uuid not null references public.inventory_items(id) on delete cascade, transaction_type text not null check (transaction_type in ('Stock received','Stock consumed','Stock adjustment')), quantity numeric(12,2) not null check (quantity > 0), related_activity_id uuid references public.activities(id), occurred_at timestamptz not null default now(), recorded_by uuid not null references public.profiles(id), notes text, created_at timestamptz not null default now()
);
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, title text not null, severity text not null check (severity in ('Low','Medium','High','Critical')), status text not null default 'Open' check (status in ('Open','Resolved')), triggered_at timestamptz not null default now(), source_table text, source_id uuid, context text, created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), farm_id uuid references public.farms(id) on delete cascade, table_name text not null, record_id uuid not null, action text not null, changed_by uuid references public.profiles(id), changed_at timestamptz not null default now(), previous_value jsonb, new_value jsonb, reason text
);
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade, record_table text not null, record_id uuid not null, storage_path text not null, mime_type text, uploaded_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);

create index if not exists activities_farm_date_idx on public.activities(farm_id, occurred_at desc);
create index if not exists planting_farm_date_idx on public.planting_records(farm_id, planted_on desc);
create index if not exists fertilization_farm_date_idx on public.fertilization_records(farm_id, applied_at desc);
create index if not exists observations_farm_date_idx on public.crop_observations(farm_id, observed_at desc);
create index if not exists treatments_farm_date_idx on public.treatment_records(farm_id, treated_at desc);
create index if not exists harvest_farm_date_idx on public.harvest_records(farm_id, harvested_at desc);
create index if not exists inventory_farm_name_idx on public.inventory_items(farm_id, name);
create index if not exists alerts_farm_status_idx on public.alerts(farm_id, status, triggered_at desc);

alter table public.planting_records enable row level security;
alter table public.activities enable row level security;
alter table public.fertilization_records enable row level security;
alter table public.crop_observations enable row level security;
alter table public.treatment_records enable row level security;
alter table public.harvest_records enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.attachments enable row level security;

do $$ declare table_name text; begin
  foreach table_name in array array['planting_records','activities','fertilization_records','crop_observations','treatment_records','harvest_records','inventory_items','inventory_transactions','alerts','audit_logs','attachments'] loop
    execute format('drop policy if exists %I_farm_read on public.%I', table_name, table_name);
    execute format('create policy %I_farm_read on public.%I for select to authenticated using (public.has_farm_access(farm_id))', table_name, table_name);
  end loop;
end $$;

drop policy if exists planting_records_insert on public.planting_records;
create policy planting_records_insert on public.planting_records for insert to authenticated with check (recorded_by = auth.uid() and public.has_farm_access(farm_id));
drop policy if exists activities_insert on public.activities;
create policy activities_insert on public.activities for insert to authenticated with check (recorded_by = auth.uid() and public.has_farm_access(farm_id));
drop policy if exists fertilization_records_insert on public.fertilization_records;
create policy fertilization_records_insert on public.fertilization_records for insert to authenticated with check (recorded_by = auth.uid() and public.has_farm_access(farm_id));
drop policy if exists crop_observations_insert on public.crop_observations;
create policy crop_observations_insert on public.crop_observations for insert to authenticated with check (recorded_by = auth.uid() and public.has_farm_access(farm_id));
drop policy if exists treatment_records_insert on public.treatment_records;
create policy treatment_records_insert on public.treatment_records for insert to authenticated with check (recorded_by = auth.uid() and public.has_farm_access(farm_id));
drop policy if exists harvest_records_insert on public.harvest_records;
create policy harvest_records_insert on public.harvest_records for insert to authenticated with check (recorded_by = auth.uid() and public.has_farm_access(farm_id));
drop policy if exists inventory_transactions_insert on public.inventory_transactions;
create policy inventory_transactions_insert on public.inventory_transactions for insert to authenticated with check (recorded_by = auth.uid() and public.has_farm_access(farm_id));

do $$ declare table_name text; begin
  foreach table_name in array array['planting_records','activities','fertilization_records','crop_observations','treatment_records','harvest_records','inventory_transactions','attachments'] loop
    execute format('drop policy if exists %I_manager_update on public.%I', table_name, table_name);
    execute format('create policy %I_manager_update on public.%I for update to authenticated using (public.is_manager_or_admin() and public.has_farm_access(farm_id)) with check (public.is_manager_or_admin() and public.has_farm_access(farm_id))', table_name, table_name);
  end loop;
  foreach table_name in array array['inventory_items','alerts','audit_logs'] loop
    execute format('drop policy if exists %I_manager_insert on public.%I', table_name, table_name);
    execute format('create policy %I_manager_insert on public.%I for insert to authenticated with check (public.is_manager_or_admin() and public.has_farm_access(farm_id))', table_name, table_name);
    execute format('drop policy if exists %I_manager_update on public.%I', table_name, table_name);
    execute format('create policy %I_manager_update on public.%I for update to authenticated using (public.is_manager_or_admin() and public.has_farm_access(farm_id)) with check (public.is_manager_or_admin() and public.has_farm_access(farm_id))', table_name, table_name);
  end loop;
end $$;
