-- =====================================================================
-- A&I WORLD: status "Lagi mikirin apa?" di Beranda
-- Jalankan SETELAH 20261014250000_foto_profil.sql (aman dijalankan ulang).
-- =====================================================================

alter table public.profiles add column if not exists status_text text;
alter table public.profiles add column if not exists status_emoji text;
alter table public.profiles add column if not exists status_at timestamptz;

alter table public.profiles drop constraint if exists profiles_status_text_len;
alter table public.profiles add constraint profiles_status_text_len check (char_length(status_text) <= 80) not valid;
alter table public.profiles drop constraint if exists profiles_status_emoji_len;
alter table public.profiles add constraint profiles_status_emoji_len check (char_length(status_emoji) <= 16) not valid;

-- Pasang / hapus status (teks kosong = hapus). Pasangan langsung dikabari lewat realtime.
create or replace function public.set_status(p_text text, p_emoji text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
  v_emoji text := nullif(btrim(coalesce(p_emoji, '')), '');
  v_couple uuid := public.my_couple_id();
  v_at timestamptz := case when v_text is null and v_emoji is null then null else now() end;
begin
  if auth.uid() is null then raise exception 'Harus login'; end if;
  if char_length(v_text) > 80 then raise exception 'Status maksimal 80 karakter'; end if;
  if char_length(v_emoji) > 16 then raise exception 'Emoji tidak valid'; end if;

  update public.profiles
     set status_text = v_text, status_emoji = v_emoji, status_at = v_at, updated_at = now()
   where id = auth.uid();

  if v_couple is not null then
    perform realtime.send(
      jsonb_build_object('kind', 'status', 'by', auth.uid(), 'text', v_text, 'emoji', v_emoji, 'at', v_at),
      'activity',
      'couple:' || v_couple::text || ':events',
      true
    );
  end if;
  return jsonb_build_object('text', v_text, 'emoji', v_emoji, 'at', v_at);
end;
$$;

revoke all on function public.set_status(text, text) from public, anon;
grant execute on function public.set_status(text, text) to authenticated;

-- app_context ikut mengirim status (milik sendiri & pasangan)
create or replace function public.app_context(p_unlock text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mem as (
    select couple_id from public.couple_members where user_id = auth.uid()
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'profile', (select to_jsonb(p) from (
        select id, display_name, avatar_url, status_text, status_emoji, status_at
        from public.profiles where id = auth.uid()) p),
    'couple', (select to_jsonb(c) from (select id, name, anniversary, invite_code, created_at, theme from public.couples where id = (select couple_id from mem)) c),
    'partner', (
      select to_jsonb(p) from (
        select pr.id, pr.display_name, pr.avatar_url, pr.last_active_at, pr.status_text, pr.status_emoji, pr.status_at
        from public.couple_members cm
        join public.profiles pr on pr.id = cm.user_id
        where cm.couple_id = (select couple_id from mem) and cm.user_id <> auth.uid()
        limit 1
      ) p
    ),
    'unread', (select count(*) from public.messages m
               where m.couple_id = (select couple_id from mem) and m.sender_id <> auth.uid() and m.read_at is null),
    'pin_enabled', coalesce((select pin_hash is not null from public.user_secrets where user_id = auth.uid()), false),
    'lock_minutes', coalesce((select lock_minutes from public.user_secrets where user_id = auth.uid()), 5),
    'unlocked', public._is_unlocked(p_unlock)
  ) end;
$$;
