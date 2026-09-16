-- =========================================================
-- Restock — migration: staff invites
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Additive only — safe to run without affecting existing data.
-- =========================================================

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  email text not null,
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references profiles(id) on delete set null
);

alter table invites enable row level security;

-- Helper, same pattern as auth_shop_id() — avoids RLS recursion.
create or replace function auth_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- Only owners can see/create/revoke invites for their own shop.
create policy "invites_select" on invites
  for select using (shop_id = auth_shop_id());

create policy "invites_insert" on invites
  for insert with check (shop_id = auth_shop_id() and auth_role() = 'owner');

create policy "invites_delete" on invites
  for delete using (shop_id = auth_shop_id() and auth_role() = 'owner' and accepted_at is null);

-- Callable by anyone, even logged out — lets an invite link show
-- "You've been invited to join <Shop>" without exposing anything else.
create or replace function get_invite_info(invite_id uuid)
returns table(shop_name text, email text, accepted boolean)
language sql
security definer
stable
as $$
  select s.name, i.email, (i.accepted_at is not null)
  from invites i join shops s on s.id = i.shop_id
  where i.id = invite_id;
$$;
grant execute on function get_invite_info(uuid) to anon, authenticated;

-- Joins the confirmed account to the invited shop as staff.
-- Verifies the confirming email matches the invited email exactly.
create or replace function accept_invite(invite_id uuid, full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  my_email text;
begin
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'This account is already linked to a shop.';
  end if;

  select * into inv from invites where id = invite_id;
  if inv is null then
    raise exception 'Invite not found.';
  end if;
  if inv.accepted_at is not null then
    raise exception 'This invite has already been used.';
  end if;

  select email into my_email from auth.users where id = auth.uid();
  if my_email is null or lower(my_email) <> lower(inv.email) then
    raise exception 'This invite was sent to a different email address.';
  end if;

  insert into profiles(id, shop_id, role, full_name)
    values (auth.uid(), inv.shop_id, 'staff', full_name);

  update invites set accepted_at = now(), accepted_by = auth.uid() where id = invite_id;

  return inv.shop_id;
end;
$$;
grant execute on function accept_invite(uuid, text) to anon, authenticated;
