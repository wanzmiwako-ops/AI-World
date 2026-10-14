-- =====================================================================
-- A&I WORLD — biar lebih cepat
-- Menggabungkan banyak query kecil jadi satu panggilan, plus index.
-- Jalankan di Supabase SQL Editor setelah dua file migrasi sebelumnya.
-- =====================================================================

-- Index untuk query yang sering dipakai
create index if not exists messages_unread_idx on public.messages (couple_id, sender_id) where read_at is null;
create index if not exists messages_media_idx on public.messages (media_path) where media_path is not null;
create index if not exists mood_checkins_couple_day_idx on public.mood_checkins (couple_id, day);
create index if not exists photos_storage_path_idx on public.photos (storage_path);
create index if not exists photos_session_idx on public.photos (checkin_session_id) where checkin_session_id is not null;
create index if not exists checkin_sessions_meeting_idx on public.checkin_sessions (meeting_id) where meeting_id is not null;
create index if not exists issues_open_idx on public.issues (couple_id) where status <> 'resolved';
create index if not exists meetings_created_by_idx on public.meetings (created_by);

-- Thumbnail foto (versi kecil untuk grid, foto penuh hanya saat dibuka)
alter table public.photos add column if not exists thumb_path text;
alter table public.messages add column if not exists thumb_path text;

-- ---------------------------------------------------------------------
-- Satu panggilan: siapa saya, ruang pasangan, dan profil pasangan
-- ---------------------------------------------------------------------
create or replace function public.app_context()
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
    'profile', (select to_jsonb(p) from (select id, display_name, avatar_url from public.profiles where id = auth.uid()) p),
    'couple', (select to_jsonb(c) from (select id, name, anniversary, invite_code, created_at from public.couples where id = (select couple_id from mem)) c),
    'partner', (
      select to_jsonb(p) from (
        select pr.id, pr.display_name, pr.avatar_url
        from public.couple_members cm
        join public.profiles pr on pr.id = cm.user_id
        where cm.couple_id = (select couple_id from mem) and cm.user_id <> auth.uid()
        limit 1
      ) p
    )
  ) end;
$$;

-- ---------------------------------------------------------------------
-- Angka mentah untuk Love Meter dalam satu panggilan
-- ---------------------------------------------------------------------
create or replace function public.love_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couple uuid := public.my_couple_id();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if v_couple is null then
    return null;
  end if;
  return jsonb_build_object(
    'meets', (select count(*) from public.checkin_sessions
              where couple_id = v_couple and together_at is not null and created_at > now() - interval '30 days'),
    'messages', (select count(*) from public.messages
                 where couple_id = v_couple and created_at > now() - interval '7 days'),
    'moods', coalesce((select jsonb_agg(jsonb_build_object('mood', mood, 'day', day, 'user_id', user_id))
                       from public.mood_checkins where couple_id = v_couple and day >= v_today - 6), '[]'::jsonb),
    'issues_total', (select count(*) from public.issues
                     where couple_id = v_couple and created_at > now() - interval '90 days'),
    'issues_resolved', (select count(*) from public.issues
                        where couple_id = v_couple and status = 'resolved' and created_at > now() - interval '90 days')
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Semua isi Beranda dalam satu panggilan
-- ---------------------------------------------------------------------
create or replace function public.dashboard_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_couple uuid := public.my_couple_id();
begin
  if v_couple is null then
    return null;
  end if;
  return jsonb_build_object(
    'next_meeting', (select to_jsonb(m) from (
        select id, title, place, starts_at from public.meetings
        where couple_id = v_couple and starts_at >= now()
        order by starts_at limit 1) m),
    'open_issues', (select count(*) from public.issues where couple_id = v_couple and status <> 'resolved'),
    'unread', (select count(*) from public.messages
               where couple_id = v_couple and sender_id <> auth.uid() and read_at is null),
    'photos', coalesce((select jsonb_agg(to_jsonb(x)) from (
        select id, storage_path, thumb_path, created_at from public.photos
        where couple_id = v_couple order by created_at desc limit 4) x), '[]'::jsonb),
    'love', public.love_stats()
  );
end;
$$;

revoke execute on function public.app_context() from public, anon;
revoke execute on function public.love_stats() from public, anon;
revoke execute on function public.dashboard_data() from public, anon;
grant execute on function public.app_context() to authenticated;
grant execute on function public.love_stats() to authenticated;
grant execute on function public.dashboard_data() to authenticated;

-- Thumbnail ikut boleh dibaca/dihapus seperti foto aslinya (untuk foto yang pindah ruang)
drop policy if exists "galeri: baca foto tercatat" on storage.objects;
create policy "galeri: baca foto tercatat" on storage.objects for select to authenticated
  using (
    bucket_id = 'gallery'
    and (
      exists (select 1 from public.photos p
              where (p.storage_path = name or p.thumb_path = name) and p.couple_id = (select public.my_couple_id()))
      or exists (select 1 from public.messages m
                 where (m.media_path = name or m.thumb_path = name) and m.couple_id = (select public.my_couple_id()))
    )
  );
create index if not exists photos_thumb_path_idx on public.photos (thumb_path) where thumb_path is not null;
create index if not exists messages_thumb_path_idx on public.messages (thumb_path) where thumb_path is not null;
