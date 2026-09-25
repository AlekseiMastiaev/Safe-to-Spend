create extension if not exists pgcrypto;

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'RUB' check (currency = 'RUB'),
  locale text not null default 'ru-RU' check (locale = 'ru-RU'),
  color_scheme text not null default 'system' check (color_scheme in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budget_months (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null check (
    month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' and month_key not like '0000-%'
  ),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (user_id, id),
  unique (user_id, month_key)
);

create table public.obligation_templates (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  default_planned_amount bigint not null check (
    default_planned_amount > 0 and default_planned_amount <= 9007199254740991
  ),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (user_id, id)
);

create table public.incomes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  amount bigint not null check (amount > 0 and amount <= 9007199254740991),
  status text not null check (status in ('planned', 'received')),
  received_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (user_id, month_id) references public.budget_months(user_id, id) on delete cascade,
  check (
    (status = 'planned' and received_at is null)
    or (status = 'received' and received_at is not null)
  )
);

create table public.monthly_obligations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null,
  template_id uuid,
  title text not null check (length(trim(title)) > 0),
  planned_amount bigint not null check (
    planned_amount > 0 and planned_amount <= 9007199254740991
  ),
  sort_order integer not null default 0,
  is_settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (user_id, id),
  foreign key (user_id, month_id) references public.budget_months(user_id, id) on delete cascade,
  foreign key (user_id, template_id) references public.obligation_templates(user_id, id) on delete restrict,
  check (
    (is_settled = false and settled_at is null)
    or (is_settled = true and settled_at is not null)
  )
);

create table public.obligation_payments (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null,
  obligation_id uuid not null,
  amount bigint not null check (amount > 0 and amount <= 9007199254740991),
  paid_at date not null,
  note text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (user_id, month_id) references public.budget_months(user_id, id) on delete cascade,
  foreign key (user_id, obligation_id) references public.monthly_obligations(user_id, id) on delete cascade
);

create table public.free_expenses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  amount bigint not null check (amount > 0 and amount <= 9007199254740991),
  spent_at date not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (user_id, month_id) references public.budget_months(user_id, id) on delete cascade
);

create index incomes_month_idx on public.incomes(user_id, month_id);
create index obligations_month_idx on public.monthly_obligations(user_id, month_id, sort_order);
create index payments_month_idx on public.obligation_payments(user_id, month_id);
create index payments_obligation_idx on public.obligation_payments(user_id, obligation_id, paid_at);
create index expenses_month_idx on public.free_expenses(user_id, month_id, spent_at desc);

alter table public.user_settings enable row level security;
alter table public.budget_months enable row level security;
alter table public.obligation_templates enable row level security;
alter table public.incomes enable row level security;
alter table public.monthly_obligations enable row level security;
alter table public.obligation_payments enable row level security;
alter table public.free_expenses enable row level security;

create policy "Users manage own settings" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own months" on public.budget_months
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own templates" on public.obligation_templates
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own incomes" on public.incomes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own obligations" on public.monthly_obligations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own payments" on public.obligation_payments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own expenses" on public.free_expenses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.user_settings, public.budget_months, public.obligation_templates,
  public.incomes, public.monthly_obligations, public.obligation_payments,
  public.free_expenses from anon;
grant select, insert, update, delete on public.user_settings, public.budget_months,
  public.obligation_templates, public.incomes, public.monthly_obligations,
  public.obligation_payments, public.free_expenses to authenticated;

create or replace function public.initialize_user_budget(
  p_month_id uuid,
  p_month_key text,
  p_timestamp timestamptz
)
returns setof public.budget_months
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  insert into public.user_settings(user_id, created_at, updated_at)
  values (v_user_id, p_timestamp, p_timestamp)
  on conflict (user_id) do nothing;

  select id into v_existing_id
  from public.budget_months
  where user_id = v_user_id
  order by month_key desc
  limit 1;

  if v_existing_id is null then
    insert into public.budget_months(id, user_id, month_key, created_at, updated_at)
    values (p_month_id, v_user_id, p_month_key, p_timestamp, p_timestamp)
    returning id into v_existing_id;
  end if;

  return query select * from public.budget_months where id = v_existing_id and user_id = v_user_id;
end;
$$;

create or replace function public.create_budget_month(
  p_month_id uuid,
  p_month_key text,
  p_timestamp timestamptz,
  p_source_month_id uuid default null
)
returns setof public.monthly_obligations
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  insert into public.budget_months(id, user_id, month_key, created_at, updated_at)
  values (p_month_id, v_user_id, p_month_key, p_timestamp, p_timestamp);

  if p_source_month_id is not null then
    insert into public.monthly_obligations(
      id, user_id, month_id, template_id, title, planned_amount, sort_order,
      is_settled, settled_at, created_at, updated_at
    )
    select gen_random_uuid(), v_user_id, p_month_id, template_id, title,
      planned_amount, row_number() over (order by sort_order, id)::integer - 1,
      false, null, p_timestamp, p_timestamp
    from public.monthly_obligations
    where user_id = v_user_id and month_id = p_source_month_id;
  else
    insert into public.monthly_obligations(
      id, user_id, month_id, template_id, title, planned_amount, sort_order,
      is_settled, settled_at, created_at, updated_at
    )
    select gen_random_uuid(), v_user_id, p_month_id, id, title,
      default_planned_amount, row_number() over (order by sort_order, id)::integer - 1,
      false, null, p_timestamp, p_timestamp
    from public.obligation_templates
    where user_id = v_user_id and is_active = true;
  end if;

  return query
    select * from public.monthly_obligations
    where user_id = v_user_id and month_id = p_month_id
    order by sort_order, id;
end;
$$;

create or replace function public.add_obligation_payments(
  p_obligation_id uuid,
  p_payment_ids uuid[],
  p_amounts bigint[],
  p_paid_at date,
  p_note text,
  p_timestamp timestamptz
)
returns setof public.obligation_payments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_month_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if cardinality(p_payment_ids) = 0 or cardinality(p_payment_ids) <> cardinality(p_amounts) then
    raise exception 'Invalid payment batch';
  end if;
  if exists (select 1 from unnest(p_amounts) amount where amount <= 0) then
    raise exception 'Payment amount must be positive';
  end if;

  select month_id into v_month_id
  from public.monthly_obligations
  where id = p_obligation_id and user_id = v_user_id;
  if v_month_id is null then raise exception 'Obligation not found'; end if;

  insert into public.obligation_payments(
    id, user_id, month_id, obligation_id, amount, paid_at, note, created_at, updated_at
  )
  select p_payment_ids[idx], v_user_id, v_month_id, p_obligation_id,
    p_amounts[idx], p_paid_at, p_note, p_timestamp, p_timestamp
  from generate_subscripts(p_amounts, 1) as idx;

  return query
    select * from public.obligation_payments
    where user_id = v_user_id and id = any(p_payment_ids)
    order by id;
end;
$$;

revoke all on function public.initialize_user_budget(uuid, text, timestamptz) from public, anon;
revoke all on function public.create_budget_month(uuid, text, timestamptz, uuid) from public, anon;
revoke all on function public.add_obligation_payments(uuid, uuid[], bigint[], date, text, timestamptz) from public, anon;
grant execute on function public.initialize_user_budget(uuid, text, timestamptz) to authenticated;
grant execute on function public.create_budget_month(uuid, text, timestamptz, uuid) to authenticated;
grant execute on function public.add_obligation_payments(uuid, uuid[], bigint[], date, text, timestamptz) to authenticated;

alter publication supabase_realtime add table public.user_settings, public.budget_months,
  public.obligation_templates, public.incomes, public.monthly_obligations,
  public.obligation_payments, public.free_expenses;
