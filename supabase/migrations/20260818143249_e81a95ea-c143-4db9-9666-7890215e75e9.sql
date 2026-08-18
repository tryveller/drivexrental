alter table public.vehicle_models
  add column start_type text not null default 'BOTH'
  check (start_type in ('KICK', 'ELECTRIC', 'BOTH'));

update public.vehicle_models
  set start_type = 'BOTH'
  where name in ('TVS Jupiter', 'TVS Radeon', 'TVS Sport');

update public.vehicle_models
  set start_type = 'ELECTRIC'
  where name = 'TVS Orbiter';
