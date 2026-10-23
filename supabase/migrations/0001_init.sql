-- Garagem: esquema inicial (Fase 1). Valores monetários em centavos (bigint).

create type public.workspace_kind as enum ('pf', 'pj');
create type public.tax_regime     as enum ('pf', 'mei', 'simples');
create type public.member_role    as enum ('owner', 'partner', 'accountant');
create type public.tx_kind        as enum ('in', 'out', 'transfer');
create type public.tx_status      as enum ('paid', 'scheduled');

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table public.workspaces (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  kind                  public.workspace_kind not null,
  regime                public.tax_regime not null default 'pf',
  runway_target_months  int  not null default 3  check (runway_target_months between 1 and 24),
  tax_rate              numeric(5,4) not null default 0.0600 check (tax_rate between 0 and 0.6),
  tax_provisioned       boolean not null default false,
  created_by            uuid references auth.users,
  created_at            timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  role         public.member_role not null default 'owner',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index on public.workspace_members (user_id);

create table public.accounts (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces on delete cascade,
  name                  text not null,
  kind                  text not null default 'bank' check (kind in ('cash', 'bank', 'card', 'wallet')),
  opening_balance_cents bigint not null default 0,
  archived              boolean not null default false,
  created_at            timestamptz not null default now()
);

create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name         text not null,
  system_key   text,               -- ex.: 'pro_labore', 'imposto'
  is_operational boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.recurrences (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  description  text not null,
  kind         public.tx_kind not null check (kind in ('in', 'out')),
  amount_cents bigint not null check (amount_cents > 0),
  day_of_month int not null check (day_of_month between 1 and 31),
  account_id   uuid references public.accounts,
  category_id  uuid references public.categories,
  starts_on    date not null,
  ends_on      date,
  active       boolean not null default true
);

create table public.transactions (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references public.workspaces on delete cascade,
  account_id              uuid references public.accounts,
  category_id             uuid references public.categories,
  kind                    public.tx_kind not null,
  amount_cents            bigint not null check (amount_cents > 0),
  occurred_on             date not null,
  status                  public.tx_status not null default 'paid',
  description             text,
  counterpart_workspace_id uuid references public.workspaces,  -- transferência PJ <-> PF
  recurrence_id           uuid references public.recurrences,
  installment_no          int,
  installments_total      int,
  source                  text not null default 'manual',
  created_by              uuid references auth.users default auth.uid(),
  created_at              timestamptz not null default now()
);
create index on public.transactions (workspace_id, occurred_on desc);

create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name         text not null,
  target_cents bigint not null check (target_cents > 0),
  due_on       date,
  created_at   timestamptz not null default now()
);

create table public.goal_contributions (
  id             uuid primary key default gen_random_uuid(),
  goal_id        uuid not null references public.goals on delete cascade,
  workspace_id   uuid not null references public.workspaces on delete cascade,
  amount_cents   bigint not null check (amount_cents > 0),
  contributed_on date not null default current_date
);

create table public.forecast_snapshots (
  workspace_id uuid not null references public.workspaces on delete cascade,
  as_of        date not null,
  payload      jsonb not null,
  primary key (workspace_id, as_of)
);

create table public.board_alerts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  code         text not null,
  severity     text not null check (severity in ('info', 'warning', 'critical')),
  message      text not null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- Funções de acesso (security definer evita recursão de RLS em workspace_members)
create or replace function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m where m.workspace_id = ws and m.user_id = auth.uid());
$$;

create or replace function public.can_write(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m
                 where m.workspace_id = ws and m.user_id = auth.uid() and m.role in ('owner', 'partner'));
$$;

create or replace function public.is_owner(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m
                 where m.workspace_id = ws and m.user_id = auth.uid() and m.role = 'owner');
$$;

revoke execute on function public.is_member(uuid), public.can_write(uuid), public.is_owner(uuid) from public, anon;
grant  execute on function public.is_member(uuid), public.can_write(uuid), public.is_owner(uuid) to authenticated;

-- RLS
alter table public.profiles           enable row level security;
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy ws_select on public.workspaces for select to authenticated using (public.is_member(id));
create policy ws_update on public.workspaces for update to authenticated using (public.is_owner(id)) with check (public.is_owner(id));
create policy ws_delete on public.workspaces for delete to authenticated using (public.is_owner(id));
-- criação só via create_workspace(): não há policy de insert

create policy members_select on public.workspace_members for select to authenticated using (public.is_member(workspace_id));
create policy members_manage on public.workspace_members for all to authenticated
  using (public.is_owner(workspace_id)) with check (public.is_owner(workspace_id));

do $$
declare t text;
begin
  foreach t in array array['accounts', 'categories', 'recurrences', 'transactions', 'goals',
                           'goal_contributions', 'forecast_snapshots', 'board_alerts']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(workspace_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_write(workspace_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_write(workspace_id)) with check (public.can_write(workspace_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_write(workspace_id))', t || '_delete', t);
  end loop;
end $$;

-- Perfil automático para cada usuário novo
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Criação de workspace: cria, vincula o dono e semeia categorias de sistema
create or replace function public.create_workspace(p_name text, p_kind public.workspace_kind, p_regime public.tax_regime default 'pf')
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  insert into public.workspaces (name, kind, regime, created_by) values (p_name, p_kind, p_regime, auth.uid()) returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, auth.uid(), 'owner');
  insert into public.categories (workspace_id, name, system_key, is_operational) values
    (ws, 'Pró-labore', 'pro_labore', true),
    (ws, 'Imposto', 'imposto', true),
    (ws, 'Aporte', 'aporte', false);
  return ws;
end $$;

revoke execute on function public.create_workspace(text, public.workspace_kind, public.tax_regime) from public, anon;
grant  execute on function public.create_workspace(text, public.workspace_kind, public.tax_regime) to authenticated;
