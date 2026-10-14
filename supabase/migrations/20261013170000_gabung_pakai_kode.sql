-- =====================================================================
-- A&I WORLD — perbaikan: gabung pakai kode walau sudah punya ruang sendiri
--
-- Kasus: kalian berdua sama-sama daftar dan sama-sama menekan
-- "Buat ruang berdua". Sekarang salah satu bisa memasukkan kode
-- pasangannya; ruang kosong miliknya otomatis dilebur ke ruang pasangan
-- (jadwal, chat, mood, foto, dll. ikut pindah, tidak ada yang hilang).
--
-- Jalankan file ini di Supabase SQL Editor SETELAH file migrasi pertama.
-- =====================================================================

create or replace function public.join_couple(p_code text)
returns public.couples
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.couples;
  v_current uuid;
begin
  if auth.uid() is null then
    raise exception 'Harus login';
  end if;

  select * into v_target from public.couples where invite_code = upper(trim(p_code));
  if v_target.id is null then
    raise exception 'Kode undangan tidak ditemukan. Cek lagi hurufnya, ya.';
  end if;

  select couple_id into v_current from public.couple_members where user_id = auth.uid();

  if v_current = v_target.id then
    raise exception 'Itu kode undangan kamu sendiri. Masukkan kode milik pasanganmu, atau kirim kodemu ke dia.';
  end if;

  if (select count(*) from public.couple_members where couple_id = v_target.id) >= 2 then
    raise exception 'Ruang ini sudah berisi dua orang';
  end if;

  if v_current is not null then
    if (select count(*) from public.couple_members where couple_id = v_current) > 1 then
      raise exception 'Kamu sudah terhubung dengan pasangan';
    end if;

    -- Pindahkan semua isi ruang lama ke ruang pasangan
    update public.meetings set couple_id = v_target.id where couple_id = v_current;
    update public.checkin_sessions set couple_id = v_target.id where couple_id = v_current;
    update public.mood_checkins set couple_id = v_target.id where couple_id = v_current;
    update public.issues set couple_id = v_target.id where couple_id = v_current;
    update public.photos set couple_id = v_target.id where couple_id = v_current;
    update public.messages set couple_id = v_target.id where couple_id = v_current;

    -- Pakai tanggal jadian dari ruang lama kalau ruang pasangan belum mengisinya
    update public.couples t
    set anniversary = coalesce(t.anniversary, (select anniversary from public.couples where id = v_current))
    where t.id = v_target.id;

    delete from public.couples where id = v_current;
  end if;

  insert into public.couple_members (couple_id, user_id) values (v_target.id, auth.uid());
  select * into v_target from public.couples where id = v_target.id;
  return v_target;
end;
$$;

revoke execute on function public.join_couple(text) from public, anon;
grant execute on function public.join_couple(text) to authenticated;

-- Foto yang ikut pindah tetap tersimpan di folder ruang lama,
-- jadi izinkan membaca/menghapus file galeri yang tercatat milik pasangan ini.
drop policy if exists "galeri: baca foto tercatat" on storage.objects;
create policy "galeri: baca foto tercatat" on storage.objects for select to authenticated
  using (
    bucket_id = 'gallery'
    and (
      exists (select 1 from public.photos p where p.storage_path = name and p.couple_id = (select public.my_couple_id()))
      or exists (select 1 from public.messages m where m.media_path = name and m.couple_id = (select public.my_couple_id()))
    )
  );

drop policy if exists "galeri: hapus foto tercatat" on storage.objects;
create policy "galeri: hapus foto tercatat" on storage.objects for delete to authenticated
  using (
    bucket_id = 'gallery'
    and exists (select 1 from public.photos p where p.storage_path = name and p.couple_id = (select public.my_couple_id()))
  );
