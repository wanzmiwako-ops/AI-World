-- =====================================================================
-- A&I WORLD — skema database lengkap
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → paste → Run
-- (atau `supabase db push` kalau memakai Supabase CLI)
-- =====================================================================

-- ---------------------------------------------------------------------
-- PROFIL
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Buat profil otomatis setiap ada user baru
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- PASANGAN (couple) + anggota
-- ---------------------------------------------------------------------
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'A&I',
  anniversary date,
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

-- id pasangan milik user yang sedang login (dipakai di semua policy)
create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select couple_id from public.couple_members where user_id = auth.uid() limit 1;
$$;

-- Membuat ruang pasangan baru + kode undangan
create or replace function public.create_couple(p_anniversary date default null)
returns public.couples
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple public.couples;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Harus login';
  end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Kamu sudah terhubung dengan pasangan';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.couples where invite_code = v_code);
  end loop;

  insert into public.couples (anniversary, invite_code, created_by)
  values (p_anniversary, v_code, auth.uid())
  returning * into v_couple;

  insert into public.couple_members (couple_id, user_id) values (v_couple.id, auth.uid());
  return v_couple;
end;
$$;

-- Bergabung pakai kode undangan dari pasangan
create or replace function public.join_couple(p_code text)
returns public.couples
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple public.couples;
begin
  if auth.uid() is null then
    raise exception 'Harus login';
  end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Kamu sudah terhubung dengan pasangan';
  end if;

  select * into v_couple from public.couples where invite_code = upper(trim(p_code));
  if v_couple.id is null then
    raise exception 'Kode undangan tidak ditemukan';
  end if;
  if (select count(*) from public.couple_members where couple_id = v_couple.id) >= 2 then
    raise exception 'Ruang ini sudah berisi dua orang';
  end if;

  insert into public.couple_members (couple_id, user_id) values (v_couple.id, auth.uid());
  return v_couple;
end;
$$;

-- ---------------------------------------------------------------------
-- KALENDER PERTEMUAN
-- ---------------------------------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  place text,
  note text,
  starts_at timestamptz not null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists meetings_couple_starts_idx on public.meetings (couple_id, starts_at);

-- ---------------------------------------------------------------------
-- MODE KETEMU (check-in berdua)
-- ---------------------------------------------------------------------
create table if not exists public.checkin_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  meeting_id uuid references public.meetings (id) on delete set null,
  place text,
  started_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  together_at timestamptz,          -- terisi saat orang kedua check-in
  ended_at timestamptz,
  mood text,
  note text
);
create index if not exists checkin_sessions_couple_idx on public.checkin_sessions (couple_id, created_at desc);

create table if not exists public.checkin_participants (
  session_id uuid not null references public.checkin_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  checked_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  primary key (session_id, user_id)
);

-- Jarak dua titik GPS dalam kilometer (rumus haversine)
create or replace function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Check-in: buka sesi baru atau gabung sesi pasangan yang masih terbuka
create or replace function public.checkin(
  p_place text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns public.checkin_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple uuid := public.my_couple_id();
  v_session public.checkin_sessions;
  v_count int;
  v_other record;
  v_km double precision;
begin
  if v_couple is null then
    raise exception 'Belum terhubung dengan pasangan';
  end if;

  select * into v_session from public.checkin_sessions
  where couple_id = v_couple and ended_at is null and created_at > now() - interval '12 hours'
  order by created_at desc limit 1;

  if v_session.id is null then
    insert into public.checkin_sessions (couple_id, place, started_by, meeting_id)
    values (
      v_couple, p_place, auth.uid(),
      (select id from public.meetings
        where couple_id = v_couple and starts_at::date = (now() at time zone 'Asia/Jakarta')::date
        order by starts_at limit 1)
    )
    returning * into v_session;
  end if;

  insert into public.checkin_participants (session_id, user_id, lat, lng)
  values (v_session.id, auth.uid(), p_lat, p_lng)
  on conflict (session_id, user_id) do update
    set lat = coalesce(excluded.lat, public.checkin_participants.lat),
        lng = coalesce(excluded.lng, public.checkin_participants.lng);

  -- Check-in berdua hanya sah kalau lokasi kalian berdekatan (maks. 500 m)
  if p_lat is not null and p_lng is not null then
    select lat, lng into v_other from public.checkin_participants
    where session_id = v_session.id and user_id <> auth.uid() and lat is not null and lng is not null
    limit 1;
    if found then
      v_km := public.distance_km(p_lat, p_lng, v_other.lat, v_other.lng);
      if v_km > 0.5 then
        raise exception 'Kalian sepertinya belum di tempat yang sama (jarak % km)', round(v_km::numeric, 1);
      end if;
    end if;
  end if;

  select count(*) into v_count from public.checkin_participants where session_id = v_session.id;
  if v_count >= 2 and v_session.together_at is null then
    update public.checkin_sessions set together_at = now() where id = v_session.id
    returning * into v_session;
  end if;

  return v_session;
end;
$$;

create or replace function public.end_checkin(p_session uuid, p_mood text default null, p_note text default null)
returns public.checkin_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.checkin_sessions;
begin
  update public.checkin_sessions
  set ended_at = coalesce(ended_at, now()),
      mood = coalesce(p_mood, mood),
      note = coalesce(p_note, note)
  where id = p_session and couple_id = public.my_couple_id()
  returning * into v_session;

  if v_session.id is null then
    raise exception 'Sesi tidak ditemukan';
  end if;
  return v_session;
end;
$$;

-- ---------------------------------------------------------------------
-- LOVE METER (mood harian)
-- ---------------------------------------------------------------------
create table if not exists public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null default ((now() at time zone 'Asia/Jakarta')::date),
  mood smallint not null check (mood between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- ---------------------------------------------------------------------
-- RUANG BICARA (masalah & kesepakatan)
-- ---------------------------------------------------------------------
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  category text not null default 'Lainnya',
  feeling text,
  status text not null default 'waiting' check (status in ('waiting', 'discussing', 'resolved')),
  agreement text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists issues_couple_idx on public.issues (couple_id, created_at desc);

create table if not exists public.issue_responses (
  issue_id uuid not null references public.issues (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  feeling text not null,
  created_at timestamptz not null default now(),
  primary key (issue_id, user_id)
);

-- Saat pasangan menulis sisi ceritanya → status "dibahas"
create or replace function public.on_issue_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.issues set status = 'discussing'
  where id = new.issue_id and status = 'waiting';
  return new;
end;
$$;

drop trigger if exists issue_response_status on public.issue_responses;
create trigger issue_response_status
  after insert on public.issue_responses
  for each row execute function public.on_issue_response();

-- ---------------------------------------------------------------------
-- GALERI
-- ---------------------------------------------------------------------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null,
  caption text,
  meeting_id uuid references public.meetings (id) on delete set null,
  checkin_session_id uuid references public.checkin_sessions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists photos_couple_idx on public.photos (couple_id, created_at desc);

-- ---------------------------------------------------------------------
-- CHAT
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'heart', 'photo', 'sticker')),
  body text,
  media_path text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_couple_idx on public.messages (couple_id, created_at desc);

-- Tandai pesan dari pasangan sebagai dibaca
create or replace function public.mark_messages_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages set read_at = now()
  where couple_id = public.my_couple_id()
    and sender_id <> auth.uid()
    and read_at is null;
$$;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY: hanya kalian berdua yang bisa melihat data kalian
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.meetings enable row level security;
alter table public.checkin_sessions enable row level security;
alter table public.checkin_participants enable row level security;
alter table public.mood_checkins enable row level security;
alter table public.issues enable row level security;
alter table public.issue_responses enable row level security;
alter table public.photos enable row level security;
alter table public.messages enable row level security;

-- profiles
drop policy if exists "profil sendiri & pasangan" on public.profiles;
create policy "profil sendiri & pasangan" on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or id in (select user_id from public.couple_members where couple_id = (select public.my_couple_id()))
  );
drop policy if exists "ubah profil sendiri" on public.profiles;
create policy "ubah profil sendiri" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- couples
drop policy if exists "lihat pasangan sendiri" on public.couples;
create policy "lihat pasangan sendiri" on public.couples for select to authenticated
  using (id = (select public.my_couple_id()));
drop policy if exists "ubah pasangan sendiri" on public.couples;
create policy "ubah pasangan sendiri" on public.couples for update to authenticated
  using (id = (select public.my_couple_id())) with check (id = (select public.my_couple_id()));

-- couple_members
drop policy if exists "lihat anggota" on public.couple_members;
create policy "lihat anggota" on public.couple_members for select to authenticated
  using (couple_id = (select public.my_couple_id()));

-- tabel milik pasangan: baca & tulis hanya untuk anggota pasangan
do $$
declare t text;
begin
  foreach t in array array['meetings', 'mood_checkins', 'issues', 'photos', 'messages'] loop
    execute format('drop policy if exists "baca %1$s" on public.%1$I', t);
    execute format('create policy "baca %1$s" on public.%1$I for select to authenticated using (couple_id = (select public.my_couple_id()))', t);
    execute format('drop policy if exists "hapus %1$s" on public.%1$I', t);
    execute format('create policy "hapus %1$s" on public.%1$I for delete to authenticated using (couple_id = (select public.my_couple_id()))', t);
    if t <> 'messages' then
      execute format('drop policy if exists "ubah %1$s" on public.%1$I', t);
      execute format('create policy "ubah %1$s" on public.%1$I for update to authenticated using (couple_id = (select public.my_couple_id())) with check (couple_id = (select public.my_couple_id()))', t);
    end if;
  end loop;
end $$;

drop policy if exists "tambah meetings" on public.meetings;
create policy "tambah meetings" on public.meetings for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and created_by = (select auth.uid()));
drop policy if exists "tambah mood_checkins" on public.mood_checkins;
create policy "tambah mood_checkins" on public.mood_checkins for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and user_id = (select auth.uid()));
drop policy if exists "tambah issues" on public.issues;
create policy "tambah issues" on public.issues for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and created_by = (select auth.uid()));
drop policy if exists "tambah photos" on public.photos;
create policy "tambah photos" on public.photos for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and uploaded_by = (select auth.uid()));
drop policy if exists "tambah messages" on public.messages;
create policy "tambah messages" on public.messages for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and sender_id = (select auth.uid()));

drop policy if exists "ubah pesan sendiri" on public.messages;
create policy "ubah pesan sendiri" on public.messages for update to authenticated
  using (sender_id = (select auth.uid())) with check (sender_id = (select auth.uid()));

-- check-in: hanya baca langsung, tulis lewat fungsi checkin()/end_checkin()
drop policy if exists "baca checkin" on public.checkin_sessions;
create policy "baca checkin" on public.checkin_sessions for select to authenticated
  using (couple_id = (select public.my_couple_id()));
drop policy if exists "ubah checkin" on public.checkin_sessions;
create policy "ubah checkin" on public.checkin_sessions for update to authenticated
  using (couple_id = (select public.my_couple_id())) with check (couple_id = (select public.my_couple_id()));
drop policy if exists "baca peserta" on public.checkin_participants;
create policy "baca peserta" on public.checkin_participants for select to authenticated
  using (session_id in (select id from public.checkin_sessions where couple_id = (select public.my_couple_id())));

-- jawaban ruang bicara
drop policy if exists "baca jawaban" on public.issue_responses;
create policy "baca jawaban" on public.issue_responses for select to authenticated
  using (issue_id in (select id from public.issues where couple_id = (select public.my_couple_id())));
drop policy if exists "tambah jawaban" on public.issue_responses;
create policy "tambah jawaban" on public.issue_responses for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and issue_id in (select id from public.issues where couple_id = (select public.my_couple_id()))
  );

-- ---------------------------------------------------------------------
-- REALTIME (Broadcast di private channel)
-- topic: couple:<id>:chat   → pesan baru, ketik, online
-- topic: couple:<id>:events → check-in & perubahan lain
-- ---------------------------------------------------------------------
create or replace function public.broadcast_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    to_jsonb(new),
    case when tg_op = 'INSERT' then 'message' else 'message_update' end,
    'couple:' || new.couple_id::text || ':chat',
    true
  );
  return null;
end;
$$;

drop trigger if exists messages_broadcast on public.messages;
create trigger messages_broadcast
  after insert or update on public.messages
  for each row execute function public.broadcast_message();

create or replace function public.broadcast_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple uuid;
begin
  if tg_table_name = 'checkin_participants' then
    select couple_id into v_couple from public.checkin_sessions where id = new.session_id;
  else
    v_couple := new.couple_id;
  end if;
  perform realtime.send(
    jsonb_build_object('table', tg_table_name, 'op', tg_op),
    'checkin',
    'couple:' || v_couple::text || ':events',
    true
  );
  return null;
end;
$$;

drop trigger if exists checkin_sessions_broadcast on public.checkin_sessions;
create trigger checkin_sessions_broadcast
  after insert or update on public.checkin_sessions
  for each row execute function public.broadcast_checkin();

drop trigger if exists checkin_participants_broadcast on public.checkin_participants;
create trigger checkin_participants_broadcast
  after insert on public.checkin_participants
  for each row execute function public.broadcast_checkin();

-- Hanya anggota pasangan yang boleh mendengar/mengirim di channel mereka
drop policy if exists "pasangan bisa menerima" on realtime.messages;
create policy "pasangan bisa menerima" on realtime.messages for select to authenticated
  using (split_part((select realtime.topic()), ':', 2) = (select public.my_couple_id())::text);

drop policy if exists "pasangan bisa mengirim" on realtime.messages;
create policy "pasangan bisa mengirim" on realtime.messages for insert to authenticated
  with check (split_part((select realtime.topic()), ':', 2) = (select public.my_couple_id())::text);

-- ---------------------------------------------------------------------
-- STORAGE: foto profil (publik) & galeri (privat per pasangan)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('gallery', 'gallery', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "avatar: upload milik sendiri" on storage.objects;
create policy "avatar: upload milik sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatar: ubah milik sendiri" on storage.objects;
create policy "avatar: ubah milik sendiri" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatar: hapus milik sendiri" on storage.objects;
create policy "avatar: hapus milik sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "galeri: baca pasangan" on storage.objects;
create policy "galeri: baca pasangan" on storage.objects for select to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = (select public.my_couple_id())::text);
drop policy if exists "galeri: upload pasangan" on storage.objects;
create policy "galeri: upload pasangan" on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = (select public.my_couple_id())::text);
drop policy if exists "galeri: hapus pasangan" on storage.objects;
create policy "galeri: hapus pasangan" on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = (select public.my_couple_id())::text);

-- ---------------------------------------------------------------------
-- Hak akses fungsi
-- ---------------------------------------------------------------------
revoke execute on function public.create_couple(date) from public, anon;
revoke execute on function public.join_couple(text) from public, anon;
revoke execute on function public.checkin(text, double precision, double precision) from public, anon;
revoke execute on function public.end_checkin(uuid, text, text) from public, anon;
revoke execute on function public.mark_messages_read() from public, anon;
grant execute on function public.create_couple(date) to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.checkin(text, double precision, double precision) to authenticated;
grant execute on function public.end_checkin(uuid, text, text) to authenticated;
grant execute on function public.mark_messages_read() to authenticated;
grant execute on function public.my_couple_id() to authenticated;
