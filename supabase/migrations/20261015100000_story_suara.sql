-- =====================================================================
-- A&I WORLD: Voice note di chat + Story 24 jam + Sorotan (Highlights)
-- Jalankan SETELAH 20261014260000_status.sql (aman dijalankan ulang).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bucket "gallery" sekarang juga menerima rekaman suara
-- ---------------------------------------------------------------------
update storage.buckets
   set allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
         'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'
       ]
 where id = 'gallery';

-- ---------------------------------------------------------------------
-- 2. STORY (hilang setelah 24 jam, kecuali disimpan ke Sorotan)
-- ---------------------------------------------------------------------
create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 30),
  emoji text check (char_length(emoji) <= 16),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists highlights_couple_idx on public.highlights (couple_id, created_at);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  media_path text not null,
  thumb_path text,
  highlight_id uuid references public.highlights (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index if not exists stories_couple_idx on public.stories (couple_id, created_at desc);
create index if not exists stories_highlight_idx on public.stories (highlight_id) where highlight_id is not null;

create table if not exists public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text check (char_length(reaction) <= 16),
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

alter table public.highlights enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;

-- Sorotan: milik berdua
drop policy if exists "lihat highlights" on public.highlights;
create policy "lihat highlights" on public.highlights for select to authenticated
  using (couple_id = (select public.my_couple_id()));
drop policy if exists "tambah highlights" on public.highlights;
create policy "tambah highlights" on public.highlights for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and created_by = (select auth.uid()));
drop policy if exists "ubah highlights" on public.highlights;
create policy "ubah highlights" on public.highlights for update to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));
drop policy if exists "hapus highlights" on public.highlights;
create policy "hapus highlights" on public.highlights for delete to authenticated
  using (couple_id = (select public.my_couple_id()));
revoke update on public.highlights from anon, authenticated;
grant update (title, emoji) on public.highlights to authenticated;

-- Story: dilihat berdua; dibuat & dihapus oleh pembuatnya; berdua boleh menyimpannya ke Sorotan
drop policy if exists "lihat stories" on public.stories;
create policy "lihat stories" on public.stories for select to authenticated
  using (couple_id = (select public.my_couple_id()));
drop policy if exists "tambah stories" on public.stories;
create policy "tambah stories" on public.stories for insert to authenticated
  with check (couple_id = (select public.my_couple_id()) and author_id = (select auth.uid()));
drop policy if exists "ubah stories" on public.stories;
create policy "ubah stories" on public.stories for update to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));
drop policy if exists "hapus stories" on public.stories;
create policy "hapus stories" on public.stories for delete to authenticated
  using (author_id = (select auth.uid()) and couple_id = (select public.my_couple_id()));
revoke update on public.stories from anon, authenticated;
grant update (highlight_id) on public.stories to authenticated;

-- Siapa yang sudah melihat: hanya bisa dibaca; ditulis lewat story_seen()
drop policy if exists "lihat story_views" on public.story_views;
create policy "lihat story_views" on public.story_views for select to authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.couple_id = (select public.my_couple_id())));
revoke insert, update, delete on public.story_views from anon, authenticated;

-- Alamat file story harus di folder ruang sendiri (pakai penjaga yang sama dengan foto & chat)
drop trigger if exists stories_guard_paths on public.stories;
create trigger stories_guard_paths before insert or update on public.stories
  for each row execute function public.guard_storage_paths();

-- Sorotan yang dipilih harus milik ruang yang sama
create or replace function public.story_highlight_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.highlight_id is not null and not exists (
    select 1 from public.highlights where id = new.highlight_id and couple_id = new.couple_id
  ) then
    raise exception 'Sorotan tidak ditemukan';
  end if;
  return new;
end;
$$;
drop trigger if exists stories_highlight_check on public.stories;
create trigger stories_highlight_check before insert or update of highlight_id on public.stories
  for each row execute function public.story_highlight_check();

-- Tandai story sudah dilihat (+ reaksi opsional). Hanya untuk story pasangan.
create or replace function public.story_seen(p_story uuid, p_reaction text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.stories;
  v_reaction text := nullif(btrim(coalesce(p_reaction, '')), '');
begin
  if auth.uid() is null then raise exception 'Harus login'; end if;
  if char_length(v_reaction) > 16 then raise exception 'Reaksi tidak valid'; end if;
  select * into s from public.stories where id = p_story and couple_id = public.my_couple_id();
  if not found or s.author_id = auth.uid() then return; end if;

  insert into public.story_views (story_id, user_id, reaction)
  values (p_story, auth.uid(), v_reaction)
  on conflict (story_id, user_id) do update
    set reaction = coalesce(excluded.reaction, public.story_views.reaction);

  perform realtime.send(
    jsonb_build_object('kind', 'story_view', 'story_id', p_story, 'reaction', v_reaction, 'by', auth.uid(), 'at', now()),
    'activity', 'couple:' || s.couple_id::text || ':events', true);
end;
$$;

-- Story aktif (24 jam) + siapa yang sudah melihat + daftar Sorotan, sekali panggil
create or replace function public.story_feed()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with c as (select public.my_couple_id() as id)
  select jsonb_build_object(
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'author_id', s.author_id, 'media_path', s.media_path, 'thumb_path', s.thumb_path,
        'highlight_id', s.highlight_id, 'created_at', s.created_at, 'expires_at', s.expires_at,
        'views', coalesce((select jsonb_agg(jsonb_build_object('user_id', v.user_id, 'reaction', v.reaction, 'viewed_at', v.viewed_at))
                           from public.story_views v where v.story_id = s.id), '[]'::jsonb)
      ) order by s.created_at)
      from public.stories s, c
      where s.couple_id = c.id and s.expires_at > now()
    ), '[]'::jsonb),
    'highlights', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'title', h.title, 'emoji', h.emoji, 'created_by', h.created_by, 'created_at', h.created_at,
        'stories', coalesce((select jsonb_agg(jsonb_build_object(
            'id', s.id, 'author_id', s.author_id, 'media_path', s.media_path, 'thumb_path', s.thumb_path,
            'highlight_id', s.highlight_id, 'created_at', s.created_at, 'expires_at', s.expires_at, 'views', '[]'::jsonb
          ) order by s.created_at) from public.stories s where s.highlight_id = h.id), '[]'::jsonb)
      ) order by h.created_at)
      from public.highlights h, c
      where h.couple_id = c.id
    ), '[]'::jsonb)
  );
$$;

-- Bersih-bersih: hapus story kedaluwarsa yang tidak disimpan ke Sorotan.
-- Mengembalikan alamat file supaya aplikasi ikut menghapus filenya dari penyimpanan.
create or replace function public.story_cleanup()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paths text[];
begin
  with gone as (
    delete from public.stories
     where couple_id = public.my_couple_id()
       and expires_at <= now()
       and highlight_id is null
    returning media_path, thumb_path
  )
  select coalesce(array_agg(p), '{}') into v_paths
    from (select media_path as p from gone union all select thumb_path from gone where thumb_path is not null) x;
  return v_paths;
end;
$$;

-- Kabar realtime: story baru/dihapus, sorotan berubah
create or replace function public.broadcast_story()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_couple uuid;
  v_payload jsonb;
begin
  if tg_table_name = 'stories' then
    if tg_op = 'INSERT' then
      v_couple := new.couple_id;
      v_payload := jsonb_build_object('kind', 'story', 'id', new.id);
    elsif tg_op = 'DELETE' then
      v_couple := old.couple_id;
      v_payload := jsonb_build_object('kind', 'story_deleted', 'id', old.id);
    else
      v_couple := new.couple_id;
      v_payload := jsonb_build_object('kind', 'highlight', 'id', new.highlight_id);
    end if;
  else
    v_couple := coalesce(new.couple_id, old.couple_id);
    v_payload := jsonb_build_object('kind', 'highlight', 'id', coalesce(new.id, old.id));
  end if;
  perform realtime.send(
    v_payload || jsonb_build_object('by', auth.uid(), 'at', now()),
    'activity', 'couple:' || v_couple::text || ':events', true);
  return null;
end;
$$;

drop trigger if exists stories_broadcast on public.stories;
create trigger stories_broadcast after insert or delete or update of highlight_id on public.stories
  for each row execute function public.broadcast_story();
drop trigger if exists highlights_broadcast on public.highlights;
create trigger highlights_broadcast after insert or update or delete on public.highlights
  for each row execute function public.broadcast_story();

-- ---------------------------------------------------------------------
-- 3. CHAT: voice note & balasan story
-- ---------------------------------------------------------------------
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('text', 'heart', 'photo', 'sticker', 'voice'));

alter table public.messages add column if not exists duration_ms int;
alter table public.messages drop constraint if exists messages_duration_ms_range;
alter table public.messages add constraint messages_duration_ms_range
  check (duration_ms is null or duration_ms between 0 and 600000);

alter table public.messages add column if not exists story_id uuid references public.stories (id) on delete set null;
create index if not exists messages_story_idx on public.messages (story_id) where story_id is not null;

create or replace function public.message_story_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.story_id is not null and not exists (
    select 1 from public.stories where id = new.story_id and couple_id = new.couple_id
  ) then
    raise exception 'Story tidak ditemukan';
  end if;
  return new;
end;
$$;
drop trigger if exists messages_story_check on public.messages;
create trigger messages_story_check before insert on public.messages
  for each row execute function public.message_story_check();


-- ---------------------------------------------------------------------
-- 4. "Hari ini, tahun lalu": foto di tanggal & bulan yang sama dari tahun-tahun sebelumnya
-- ---------------------------------------------------------------------
create or replace function public.on_this_day()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
  from (
    select id, storage_path, thumb_path, created_at
    from public.photos
    where couple_id = public.my_couple_id()
      and to_char(created_at at time zone 'Asia/Jakarta', 'MM-DD') = to_char(now() at time zone 'Asia/Jakarta', 'MM-DD')
      and (created_at at time zone 'Asia/Jakarta')::date < (now() at time zone 'Asia/Jakarta')::date - 300
    order by created_at desc
    limit 6
  ) x;
$$;

-- ---------------------------------------------------------------------
-- Hak akses fungsi
-- ---------------------------------------------------------------------
revoke all on function public.story_highlight_check() from public, anon, authenticated;
revoke all on function public.message_story_check() from public, anon, authenticated;
revoke all on function public.broadcast_story() from public, anon, authenticated;
revoke all on function public.story_seen(uuid, text) from public, anon;
grant execute on function public.story_seen(uuid, text) to authenticated;
revoke all on function public.story_feed() from public, anon;
grant execute on function public.story_feed() to authenticated;
revoke all on function public.story_cleanup() from public, anon;
grant execute on function public.story_cleanup() to authenticated;
revoke all on function public.on_this_day() from public, anon;
grant execute on function public.on_this_day() to authenticated;
