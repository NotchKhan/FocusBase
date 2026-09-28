begin;
create table public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null check (revision between 1 and 9007199254740991),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
revoke all on public.workspaces from public, anon, authenticated;
grant select on public.workspaces to authenticated;
create policy own_workspace_read on public.workspaces for select to authenticated
  using (user_id = (select auth.uid()));

-- No client has direct write grants. Only this function can change its own
-- caller's row, using an expected revision to prevent lost updates.
create function public.save_workspace(p_account_id uuid, p_state jsonb, p_expected_revision bigint)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  result jsonb;
  field text;
begin
  if account_id is null or p_account_id is distinct from account_id then
    raise exception 'account_mismatch' using errcode = '28000';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_revision >= 9007199254740991 then
    raise exception 'invalid_revision' using errcode = '22023';
  end if;
  if p_state is null or pg_catalog.jsonb_typeof(p_state) is distinct from 'object'
     or p_state->'version' is distinct from '1'::jsonb
     or pg_catalog.jsonb_typeof(p_state->'settings') is distinct from 'object'
     or not (p_state ? 'active') then
    raise exception 'invalid_workspace' using errcode = '22023';
  end if;
  if pg_catalog.octet_length(p_state::text) > 8388608 then
    raise exception 'workspace_too_large' using errcode = '22001';
  end if;
  foreach field in array array['tasks','notes','resources','projects','tables','events','sessions','examGoals','calendarEvents','weekTemplates','appliedWeeks'] loop
    if pg_catalog.jsonb_typeof(p_state->field) is distinct from 'array' then
      raise exception 'invalid_collection' using errcode = '22023';
    end if;
  end loop;
  p_state := pg_catalog.jsonb_set(p_state, '{revision}', pg_catalog.to_jsonb(p_expected_revision + 1));
  if p_expected_revision = 0 then
    insert into public.workspaces(user_id, revision, state)
      values(account_id, 1, p_state)
      on conflict (user_id) do nothing returning state into result;
  else
    update public.workspaces set state = p_state, revision = revision + 1, updated_at = pg_catalog.now()
      where user_id = account_id and revision = p_expected_revision returning state into result;
  end if;
  if result is null then
    raise exception 'workspace_conflict' using errcode = '40001';
  end if;
  return result;
end;
$$;
revoke all on function public.save_workspace(uuid, jsonb, bigint) from public, anon;
grant execute on function public.save_workspace(uuid, jsonb, bigint) to authenticated;
comment on table public.workspaces is 'Private study workspace; RLS isolates accounts, RPC enforces optimistic concurrency.';
commit;
