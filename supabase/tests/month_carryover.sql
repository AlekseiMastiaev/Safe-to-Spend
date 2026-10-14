-- Run after both migrations in a disposable PostgreSQL instance.
begin;
insert into auth.users(id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_month uuid := '20000000-0000-0000-0000-000000000002';
  v_obligation uuid;
  v_history jsonb;
begin
  if exists (select 1 from public.ensure_current_budget_month(v_month, '2026-10', now())) then
    raise exception 'Auto creation bypassed onboarding';
  end if;

  insert into public.budget_months(id, user_id, month_key, created_at, updated_at)
  values ('20000000-0000-0000-0000-000000000001', auth.uid(), '2026-08', now(), now());
  insert into public.monthly_obligations(
    id, user_id, month_id, template_id, title, planned_amount, sort_order,
    is_settled, settled_at, created_at, updated_at
  ) values (
    '30000000-0000-0000-0000-000000000001', auth.uid(),
    '20000000-0000-0000-0000-000000000001', null, 'Test plan', 4000, 0, true, now(), now(), now()
  );
  insert into public.obligation_payments(id, user_id, month_id, obligation_id, amount, paid_at, created_at, updated_at)
  values ('40000000-0000-0000-0000-000000000001', auth.uid(),
    '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
    1000, '2026-08-02', now(), now());
  perform public.ensure_current_budget_month(v_month, '2026-10', now());
  perform public.ensure_current_budget_month('20000000-0000-0000-0000-000000000099', '2026-10', now());
  if (select count(*) from public.budget_months) <> 2 then raise exception 'Duplicate month'; end if;
  if not (select obligations_review_pending from public.budget_months where id = v_month) then
    raise exception 'Copy acknowledged review too soon';
  end if;
  select id into strict v_obligation from public.monthly_obligations where month_id = v_month;
  if (select is_settled from public.monthly_obligations where id = v_obligation) then
    raise exception 'Copied settled state';
  end if;
  if exists (select 1 from public.obligation_payments where month_id = v_month) then
    raise exception 'Copied payment history';
  end if;
  begin
    update public.monthly_obligations set planned_amount = 0 where id = v_obligation;
    raise exception 'Invalid write succeeded';
  exception when check_violation then null;
  end;
  if not (select obligations_review_pending from public.budget_months where id = v_month) then
    raise exception 'Failed edit acknowledged review';
  end if;
  update public.monthly_obligations set title = 'Reviewed' where id = v_obligation;
  if (select obligations_review_pending from public.budget_months where id = v_month) then
    raise exception 'Successful edit did not acknowledge review';
  end if;
  update public.budget_months set obligations_review_pending = true where id = v_month;
  insert into public.obligation_payments(id, user_id, month_id, obligation_id, amount, paid_at, created_at, updated_at)
  values ('40000000-0000-0000-0000-000000000002', auth.uid(), v_month, v_obligation,
    1000, '2026-10-02', now(), now());
  if (select obligations_review_pending from public.budget_months where id = v_month) then
    raise exception 'Payment did not acknowledge review';
  end if;
  update public.budget_months set obligations_review_pending = true where id = v_month;
  delete from public.obligation_payments where month_id = v_month;
  if (select obligations_review_pending from public.budget_months where id = v_month) then
    raise exception 'Payment deletion did not acknowledge review';
  end if;
  v_history := public.read_budget_history('2026-10');
  if jsonb_array_length(v_history->'budget_months') <> 2 then raise exception 'Incomplete snapshot'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
do $$
begin
  if jsonb_array_length(public.read_budget_history('2026-10')->'budget_months') <> 0 then
    raise exception 'Another user can read the first user budget';
  end if;
  if exists (select 1 from public.ensure_current_budget_month(
    '20000000-0000-0000-0000-000000000003', '2026-10', now()
  )) then raise exception 'Another user can copy the first user budget'; end if;
end;
$$;
rollback;
