-- =========================================================
-- Restock — production database schema (Supabase/Postgres)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to run on a fresh project OR re-run to reset everything.
-- =========================================================

-- ---------- CLEAN SLATE ----------
-- Drops old versions first, in dependency order, so this script
-- can be re-run anytime without manual cleanup.

drop function if exists create_shop_with_owner(text, text);
drop function if exists auth_shop_id();
drop table if exists movements;
drop table if exists items;
drop table if exists profiles;
drop table if exists shops;

create extension if not exists pgcrypto;

-- ---------- TABLES ----------

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  full_name text default '',
  created_at timestamptz not null default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  qty numeric not null default 0,
  unit text not null default 'ea',
  cost numeric not null default 0,
  threshold numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  item_id uuid references items(id) on delete set null,
  item_name text not null,
  category text not null,
  type text not null check (type in ('Restock','Used','Waste','Correction','Added','Removed')),
  delta numeric not null,
  qty_after numeric not null,
  note text default '',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- HELPER FUNCTION (avoids RLS recursion) ----------

create or replace function auth_shop_id()
returns uuid
language sql
security definer
stable
as $$
  select shop_id from profiles where id = auth.uid();
$$;

-- ---------- SIGNUP FUNCTION ----------
-- Creates a shop + owner profile together, atomically.
-- Called from the frontend right after a new user signs up.

create or replace function create_shop_with_owner(shop_name text, owner_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_shop_id uuid;
begin
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'This account is already linked to a shop.';
  end if;

  insert into shops(name) values (shop_name) returning id into new_shop_id;
  insert into profiles(id, shop_id, role, full_name)
    values (auth.uid(), new_shop_id, 'owner', owner_name);

  return new_shop_id;
end;
$$;

-- ---------- ROW LEVEL SECURITY ----------

alter table shops enable row level security;
alter table profiles enable row level security;
alter table items enable row level security;
alter table movements enable row level security;

-- shops: can only see your own shop; no direct insert/update from clients
create policy "shops_select_own" on shops
  for select using (id = auth_shop_id());

-- profiles: can see everyone in your own shop (for a staff list later)
create policy "profiles_select_same_shop" on profiles
  for select using (shop_id = auth_shop_id());

-- items: full CRUD, scoped to your shop only
create policy "items_select" on items for select using (shop_id = auth_shop_id());
create policy "items_insert" on items for insert with check (shop_id = auth_shop_id());
create policy "items_update" on items for update using (shop_id = auth_shop_id());
create policy "items_delete" on items for delete using (shop_id = auth_shop_id());

-- movements: append-only audit log — select + insert, no update/delete, ever
create policy "movements_select" on movements for select using (shop_id = auth_shop_id());
create policy "movements_insert" on movements for insert with check (shop_id = auth_shop_id());
