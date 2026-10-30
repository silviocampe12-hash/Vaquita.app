do $$
begin
  if to_regclass('public.vaquita_groups') is not null
    and to_regclass('public.yuntiva_groups') is null then
    alter table public.vaquita_groups rename to yuntiva_groups;
  end if;

  if to_regclass('public.vaquita_groups_updated_at_idx') is not null
    and to_regclass('public.yuntiva_groups_updated_at_idx') is null then
    alter index public.vaquita_groups_updated_at_idx rename to yuntiva_groups_updated_at_idx;
  end if;
end
$$;
