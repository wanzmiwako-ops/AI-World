-- =====================================================================
-- A&I WORLD: Tag pasangan, #hashtag, dan 📍lokasi (di Story & Chat)
-- Jalankan SETELAH 20261015100000_story_suara.sql (aman dijalankan ulang).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. STORY: siapa yang ditandai, hashtag, dan lokasi
-- ---------------------------------------------------------------------
alter table public.stories add column if not exists mentions uuid[] not null default '{}';
alter table public.stories add column if not exists hashtags text[] not null default '{}';
alter table public.stories add column if not exists location jsonb;

alter table public.stories drop constraint if exists stories_hashtags_check;
alter table public.stories add constraint stories_hashtags_check
  check (cardinality(hashtags) <= 10 and cardinality(mentions) <= 2);
alter table public.stories drop constraint if exists stories_location_check;
alter table public.stories add constraint stories_location_check
  check (location is null or (jsonb_typeof(location) = 'object' and pg_column_size(location) <= 2000));

create index if not exists stories_hashtags_idx on public.stories using gin (hashtags);

-- Rapikan hashtag (huruf kecil, tanpa #, tanpa spasi) & pastikan yang ditandai anggota ruang ini
create or replace function public.story_meta_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tag text;
  v_clean text[] := '{}';
begin
  foreach v_tag in array coalesce(new.hashtags, '{}') loop
    v_tag := lower(regexp_replace(v_tag, '[^[:alnum:]_]', '', 'g'));
    if char_length(v_tag) between 1 and 40 and not (v_tag = any(v_clean)) then
      v_clean := v_clean || v_tag;
    end if;
  end loop;
  new.hashtags := v_clean;

  if exists (
    select 1 from unnest(coalesce(new.mentions, '{}')) m
    where not exists (select 1 from public.couple_members cm where cm.couple_id = new.couple_id and cm.user_id = m)
  ) then
    raise exception 'Yang ditandai harus pasanganmu';
  end if;

  if new.location is not null then
    if char_length(coalesce(new.location ->> 'name', '')) not between 1 and 120 then
      raise exception 'Nama lokasi tidak valid';
    end if;
    if (new.location ? 'lat' and jsonb_typeof(new.location -> 'lat') <> 'number')
       or (new.location ? 'lng' and jsonb_typeof(new.location -> 'lng') <> 'number') then
      raise exception 'Koordinat lokasi tidak valid';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists stories_meta_check on public.stories;
create trigger stories_meta_check before insert or update of hashtags, mentions, location on public.stories
  for each row execute function public.story_meta_check();

-- story_feed ikut mengirim tag, hashtag, dan lokasi
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
        'mentions', s.mentions, 'hashtags', s.hashtags, 'location', s.location,
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
            'highlight_id', s.highlight_id, 'created_at', s.created_at, 'expires_at', s.expires_at,
            'mentions', s.mentions, 'hashtags', s.hashtags, 'location', s.location, 'views', '[]'::jsonb
          ) order by s.created_at) from public.stories s where s.highlight_id = h.id), '[]'::jsonb)
      ) order by h.created_at)
      from public.highlights h, c
      where h.couple_id = c.id
    ), '[]'::jsonb)
  );
$$;


-- Kabar realtime story baru ikut membawa siapa yang ditandai & lokasinya
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
      v_payload := jsonb_build_object('kind', 'story', 'id', new.id, 'mentions', new.mentions, 'place', new.location ->> 'name');
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
revoke all on function public.broadcast_story() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. CHAT: kirim lokasi ("Lagi di sini 📍")
-- ---------------------------------------------------------------------
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('text', 'heart', 'photo', 'sticker', 'voice', 'location'));

alter table public.messages add column if not exists meta jsonb;
alter table public.messages drop constraint if exists messages_meta_check;
alter table public.messages add constraint messages_meta_check
  check (meta is null or (jsonb_typeof(meta) = 'object' and pg_column_size(meta) <= 2000));

-- Pesan lokasi wajib punya nama tempat & koordinat yang masuk akal
create or replace function public.message_location_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'location' then
    if new.meta is null
       or char_length(coalesce(new.meta ->> 'name', '')) not between 1 and 120
       or coalesce(jsonb_typeof(new.meta -> 'lat'), '') <> 'number'
       or coalesce(jsonb_typeof(new.meta -> 'lng'), '') <> 'number'
       or coalesce(abs((new.meta ->> 'lat')::numeric) > 90, true)
       or coalesce(abs((new.meta ->> 'lng')::numeric) > 180, true) then
      raise exception 'Lokasi tidak valid';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists messages_location_check on public.messages;
create trigger messages_location_check before insert on public.messages
  for each row execute function public.message_location_check();

revoke all on function public.story_meta_check() from public, anon, authenticated;
revoke all on function public.message_location_check() from public, anon, authenticated;
revoke all on function public.story_feed() from public, anon;
grant execute on function public.story_feed() to authenticated;
