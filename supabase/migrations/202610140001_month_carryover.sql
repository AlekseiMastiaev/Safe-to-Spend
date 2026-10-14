begin;

alter table public.budget_months
  add column if not exists obligations_review_pending boolean not null default false;

-- A single statement snapshot; RLS and explicit user filters both remain in effect.
create or replace function public.read_budget_history(p_month_key text)
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$
  with months as (
    select * from public.budget_months
    where user_id = auth.uid() and month_key <= p_month_key
  )
  select jsonb_build_object(
    'budget_months', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.month_key) from months m
    ), '[]'::jsonb),
    'incomes', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.created_at, i.id)
      from public.incomes i join months m on m.id = i.month_id and m.user_id = i.user_id
    ), '[]'::jsonb),
    'monthly_obligations', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.sort_order, o.id)
      from public.monthly_obligations o join months m on m.id = o.month_id and m.user_id = o.user_id
    ), '[]'::jsonb),
    'obligation_payments', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.paid_at, p.id)
      from public.obligation_payments p join months m on m.id = p.month_id and m.user_id = p.user_id
    ), '[]'::jsonb),
    'free_expenses', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.spent_at desc, e.id)
      from public.free_expenses e join months m on m.id = e.month_id and m.user_id = e.user_id
    ), '[]'::jsonb)
  );
$$;

create or replace function public.ensure_current_budget_month(
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
  v_created_id uuid;
  v_source_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_month_key is null or p_month_key !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
      or p_month_key like '0000-%' then
    raise exception 'Invalid budget month';
  end if;

  if exists (select 1 from public.budget_months where user_id = v_user_id and month_key = p_month_key) then
    return query select * from public.budget_months where user_id = v_user_id and month_key = p_month_key;
    return;
  end if;
  if not exists (select 1 from public.budget_months where user_id = v_user_id) then return; end if;

  insert into public.budget_months(id, user_id, month_key, created_at, updated_at)
  values (p_month_id, v_user_id, p_month_key, p_timestamp, p_timestamp)
  on conflict (user_id, month_key) do nothing
  returning id into v_created_id;

  if v_created_id is null then
    return query select * from public.budget_months where user_id = v_user_id and month_key = p_month_key;
    return;
  end if;

  select id into v_source_id from public.budget_months
  where user_id = v_user_id and month_key < p_month_key
  order by month_key desc limit 1;

  insert into public.monthly_obligations(
    id, user_id, month_id, template_id, title, planned_amount, sort_order,
    is_settled, settled_at, created_at, updated_at
  )
  select gen_random_uuid(), v_user_id, v_created_id, template_id, title, planned_amount,
    row_number() over (order by sort_order, id)::integer - 1, false, null, p_timestamp, p_timestamp
  from public.monthly_obligations
  where user_id = v_user_id and month_id = v_source_id;

  -- Set this after copying: copy inserts must not acknowledge the user's review.
  update public.budget_months
  set obligations_review_pending = exists (
    select 1 from public.monthly_obligations where user_id = v_user_id and month_id = v_created_id
  )
  where user_id = v_user_id and id = v_created_id;

  return query select * from public.budget_months where user_id = v_user_id and id = v_created_id;
end;
$$;

create or replace function public.acknowledge_obligation_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.budget_months set obligations_review_pending = false
    where id = old.month_id and user_id = old.user_id and obligations_review_pending;
  else
    update public.budget_months set obligations_review_pending = false
    where id = new.month_id and user_id = new.user_id and obligations_review_pending;
  end if;
  return null;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'acknowledge_monthly_obligation_review'
      and tgrelid = 'public.monthly_obligations'::regclass) then
    create trigger acknowledge_monthly_obligation_review
      after insert or update or delete on public.monthly_obligations
      for each row execute function public.acknowledge_obligation_review();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'acknowledge_obligation_payment_review'
      and tgrelid = 'public.obligation_payments'::regclass) then
    create trigger acknowledge_obligation_payment_review
      after insert or update or delete on public.obligation_payments
      for each row execute function public.acknowledge_obligation_review();
  end if;
end;
$$;

revoke all on function public.read_budget_history(text) from public, anon;
revoke all on function public.ensure_current_budget_month(uuid, text, timestamptz) from public, anon;
revoke all on function public.acknowledge_obligation_review() from public, anon;
grant execute on function public.read_budget_history(text) to authenticated;
grant execute on function public.ensure_current_budget_month(uuid, text, timestamptz) to authenticated;
grant execute on function public.acknowledge_obligation_review() to authenticated;

commit;
