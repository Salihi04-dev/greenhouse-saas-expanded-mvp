-- Field Ledger demo seed. Run after schema.sql.
-- This seeds operational structure only. Auth users/profiles are provisioned by Supabase Auth + the trigger in schema.sql.

insert into public.farms (id, name) values ('10000000-0000-0000-0000-000000000001', 'GreenFields Demonstration Farm') on conflict (id) do update set name = excluded.name;
insert into public.crop_types (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Tomato'),
  ('20000000-0000-0000-0000-000000000002', 'Cucumber'),
  ('20000000-0000-0000-0000-000000000003', 'Pepper')
on conflict (id) do update set name = excluded.name;
insert into public.crop_varieties (id, crop_type_id, name) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Roma'),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'English'),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Bell')
on conflict (id) do update set name = excluded.name;

insert into public.greenhouses (id, farm_id, code, name, status) values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'GH-01', 'North tomato house', 'Healthy'),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'GH-02', 'East tomato house', 'Healthy'),
  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'GH-03', 'Cucumber house', 'Attention'),
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'GH-04', 'Pepper house', 'Healthy')
on conflict (id) do update set name = excluded.name, status = excluded.status;
insert into public.zones (greenhouse_id, name) select g.id, z.name from public.greenhouses g cross join (values ('Zone A'), ('Zone B'), ('Zone C')) z(name) where g.code in ('GH-01','GH-02') on conflict (greenhouse_id, name) do nothing;
insert into public.zones (greenhouse_id, name) select g.id, z.name from public.greenhouses g cross join (values ('Zone A'), ('Zone B')) z(name) where g.code in ('GH-03','GH-04') on conflict (greenhouse_id, name) do nothing;
insert into public.crop_cycles (greenhouse_id, crop_variety_id, code, stage, started_on) values
  ('11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '2026-TOM-03', 'Fruiting', '2026-05-01'),
  ('11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '2026-TOM-03-GH02', 'Fruiting', '2026-05-01'),
  ('11000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', '2026-CUC-02', 'Flowering', '2026-06-01'),
  ('11000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000003', '2026-PEP-01', 'Vegetative', '2026-06-15')
on conflict (code) do update set stage = excluded.stage;

-- After creating Auth users, add their UUIDs to farm_memberships. Never paste passwords or service-role keys into this file.
-- insert into public.farm_memberships (farm_id, user_id) values ('10000000-0000-0000-0000-000000000001', '<AUTH_USER_UUID>') on conflict do nothing;

-- Optional lifecycle seed. It uses the first existing profile as the demo recorder and skips cleanly until an Auth user/profile exists.
do $$
declare
  seed_user uuid;
  farm uuid := '10000000-0000-0000-0000-000000000001';
  gh1 uuid := '11000000-0000-0000-0000-000000000001';
  gh2 uuid := '11000000-0000-0000-0000-000000000002';
  gh3 uuid := '11000000-0000-0000-0000-000000000003';
  gh4 uuid := '11000000-0000-0000-0000-000000000004';
  z1 uuid; z2 uuid; z3 uuid; c1 uuid; c2 uuid; c3 uuid; c4 uuid; stock1 uuid; stock2 uuid;
begin
  select id into seed_user from public.profiles order by created_at limit 1;
  if seed_user is null then
    raise notice 'Skipping operational seed: create at least one Auth user first.';
    return;
  end if;
  select id into z1 from public.zones where greenhouse_id = gh1 and name = 'Zone A';
  select id into z2 from public.zones where greenhouse_id = gh2 and name = 'Zone B';
  select id into z3 from public.zones where greenhouse_id = gh3 and name = 'Zone A';
  select id into c1 from public.crop_cycles where code = '2026-TOM-03';
  select id into c2 from public.crop_cycles where code = '2026-TOM-03-GH02';
  select id into c3 from public.crop_cycles where code = '2026-CUC-02';
  select id into c4 from public.crop_cycles where code = '2026-PEP-01';

  insert into public.planting_records (id, farm_id, greenhouse_id, zone_id, crop_cycle_id, variety, quantity, unit, planted_on, nursery_location, recorded_by, notes) values
    ('31000000-0000-0000-0000-000000000001', farm, gh1, z1, c1, 'Roma', 480, 'plants', '2026-04-18', 'Nursery 1', seed_user, 'Seedlings passed establishment check.'),
    ('31000000-0000-0000-0000-000000000002', farm, gh3, z3, c3, 'English', 360, 'plants', '2026-05-02', 'Nursery 2', seed_user, 'Uniform transplant batch.')
  on conflict (id) do nothing;

  insert into public.activities (id, farm_id, activity_type, greenhouse_id, zone_id, crop_cycle_id, occurred_at, duration_hours, quantity, unit, recorded_by, notes) values
    ('32000000-0000-0000-0000-000000000001', farm, 'Transplanting', gh1, z1, c1, '2026-07-28T08:20:00Z', 3, 420, 'plants', seed_user, 'Established tomato seedlings moved from nursery.'),
    ('32000000-0000-0000-0000-000000000002', farm, 'Pruning', gh2, z2, c2, '2026-08-18T10:20:00Z', 2, null, null, seed_user, 'Lower leaves removed during routine pass.'),
    ('32000000-0000-0000-0000-000000000003', farm, 'Crop scouting', gh3, z3, c3, '2026-08-21T10:20:00Z', 1, null, null, seed_user, 'Scouting follow-up logged.')
  on conflict (id) do nothing;

  insert into public.fertilization_records (id, farm_id, greenhouse_id, zone_id, crop_cycle_id, applied_at, product, quantity, unit, concentration, application_method, recorded_by, notes) values
    ('33000000-0000-0000-0000-000000000001', farm, gh1, z1, c1, '2026-08-19T07:20:00Z', 'Calcium nitrate', 5, 'kg', '2.5 g/L', 'Fertigation', seed_user, 'Linked to morning irrigation cycle.'),
    ('33000000-0000-0000-0000-000000000002', farm, gh3, z3, c3, '2026-08-16T08:20:00Z', 'NPK 15-5-30', 3, 'kg', '2 g/L', 'Fertigation', seed_user, 'Flowering-stage feed.')
  on conflict (id) do nothing;

  insert into public.crop_observations (id, farm_id, greenhouse_id, zone_id, crop_cycle_id, observed_at, observation_type, issue, symptoms, severity, affected_plants, recorded_by, notes) values
    ('34000000-0000-0000-0000-000000000001', farm, gh3, z3, c3, '2026-08-21T10:20:00Z', 'Pest', 'Aphids', 'Clusters on lower leaves.', 'High', 23, seed_user, 'Scouting follow-up required.'),
    ('34000000-0000-0000-0000-000000000002', farm, gh2, z2, c2, '2026-08-17T11:20:00Z', 'Disease', 'Powdery mildew', 'White patches on older leaves.', 'Medium', 9, seed_user, 'Monitor after treatment.')
  on conflict (id) do nothing;

  insert into public.treatment_records (id, farm_id, observation_id, greenhouse_id, zone_id, crop_cycle_id, treated_at, problem, treatment_type, product, quantity, unit, follow_up_date, outcome, recorded_by, notes) values
    ('35000000-0000-0000-0000-000000000001', farm, '34000000-0000-0000-0000-000000000002', gh2, z2, c2, '2026-08-18T13:20:00Z', 'Powdery mildew', 'Approved fungicide', 'Sulfur wettable powder', 1.2, 'kg', '2026-08-24', 'Follow-up pending', seed_user, 'Applied according to farm protocol.'),
    ('35000000-0000-0000-0000-000000000002', farm, '34000000-0000-0000-0000-000000000001', gh3, z3, c3, '2026-08-21T12:20:00Z', 'Aphids', 'Targeted biological control', 'Beneficial insects', null, null, '2026-08-23', 'Follow-up pending', seed_user, 'Release recorded for affected row.')
  on conflict (id) do nothing;

  insert into public.harvest_records (id, farm_id, greenhouse_id, zone_id, crop_cycle_id, harvested_at, quantity, unit, grade, quality, rejected_quantity, recorded_by, notes) values
    ('36000000-0000-0000-0000-000000000001', farm, gh1, z1, c1, '2026-08-21T08:20:00Z', 86, 'kg', 'Grade A', 'Firm, export-ready', 0, seed_user, 'Morning harvest.'),
    ('36000000-0000-0000-0000-000000000002', farm, gh1, z1, c1, '2026-08-21T08:20:00Z', 14, 'kg', 'Grade B', 'Minor cosmetic marks', 0, seed_user, 'Sorted at packhouse.'),
    ('36000000-0000-0000-0000-000000000003', farm, gh3, z3, c3, '2026-08-20T09:20:00Z', 62, 'kg', 'Grade A', 'Good uniformity', 4, seed_user, 'Cucumber harvest.')
  on conflict (id) do nothing;

  insert into public.inventory_items (id, farm_id, name, category, unit, current_quantity, minimum_threshold, supplier, unit_cost, status, notes) values
    ('37000000-0000-0000-0000-000000000001', farm, 'Calcium nitrate', 'Fertilizers', 'kg', 18, 20, 'Agri Inputs Co.', 2.4, 'Low stock', 'Reorder before next crop cycle.'),
    ('37000000-0000-0000-0000-000000000002', farm, 'NPK 15-5-30', 'Fertilizers', 'kg', 42, 15, 'Agri Inputs Co.', 3.1, 'Healthy', 'Stored in dry room.'),
    ('37000000-0000-0000-0000-000000000003', farm, 'Beneficial insects', 'Pesticides', 'packs', 2, 3, 'BioCrop Supply', 18, 'Critical', 'Order for next scouting round.')
  on conflict (id) do update set current_quantity = excluded.current_quantity, minimum_threshold = excluded.minimum_threshold, status = excluded.status, notes = excluded.notes;

  select id into stock1 from public.inventory_items where farm_id = farm and name = 'Calcium nitrate';
  select id into stock2 from public.inventory_items where farm_id = farm and name = 'NPK 15-5-30';
  insert into public.inventory_transactions (id, farm_id, inventory_item_id, transaction_type, quantity, related_activity_id, occurred_at, recorded_by, notes) values
    ('38000000-0000-0000-0000-000000000001', farm, stock1, 'Stock consumed', 5, '32000000-0000-0000-0000-000000000003', '2026-08-19T07:20:00Z', seed_user, 'Consumed by fertigation.'),
    ('38000000-0000-0000-0000-000000000002', farm, stock2, 'Stock consumed', 3, null, '2026-08-16T08:20:00Z', seed_user, 'Consumed by flowering-stage feed.')
  on conflict (id) do nothing;

  insert into public.alerts (id, farm_id, title, severity, status, triggered_at, source_table, source_id, context) values
    ('39000000-0000-0000-0000-000000000001', farm, 'GH-03 needs a scouting follow-up', 'High', 'Open', '2026-08-21T10:20:00Z', 'crop_observations', '34000000-0000-0000-0000-000000000001', 'High-severity pest observation · Zone A'),
    ('39000000-0000-0000-0000-000000000002', farm, 'Beneficial insects are below threshold', 'Critical', 'Open', '2026-08-20T15:20:00Z', 'inventory_items', '37000000-0000-0000-0000-000000000003', 'Inventory item has 2 packs remaining')
  on conflict (id) do nothing;
end $$;
