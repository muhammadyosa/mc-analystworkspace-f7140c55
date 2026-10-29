CREATE OR REPLACE FUNCTION public.save_competitor_profile(profile jsonb, expected_row jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_rows jsonb; current_row jsonb; next_rows jsonb; field text;
BEGIN
 IF auth.uid() IS NULL OR NOT (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'manager'::public.app_role)) THEN RAISE EXCEPTION 'Tidak memiliki izin mengubah data kompetitor' USING ERRCODE = '42501'; END IF;
 IF jsonb_typeof(profile) IS DISTINCT FROM 'object' OR coalesce(trim(profile->>'id'),'') = '' OR coalesce(trim(profile->>'cluster'),'') = '' OR coalesce(trim(profile->>'competitor'),'') = '' THEN RAISE EXCEPTION 'Nama kompetitor dan cluster wajib diisi'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_object_keys(profile) k WHERE k NOT IN ('id','cluster','kabupaten','provinsi','competitor','competitorRaw','price','promo','promoCategory','serviceType','speedMbps','installationCost','promoStart','promoEnd','iconnetPrice','iconnetSpeedMbps','iconnetInstallationCost','iconnetPromo','updatedAt')) THEN RAISE EXCEPTION 'Field kompetitor tidak valid'; END IF;
 FOREACH field IN ARRAY ARRAY['price','speedMbps','installationCost','iconnetPrice','iconnetSpeedMbps','iconnetInstallationCost'] LOOP
  IF profile ? field AND profile->field <> 'null'::jsonb AND (jsonb_typeof(profile->field) <> 'number' OR (profile->>field)::numeric < 0 OR (profile->>field)::numeric > 1000000000) THEN RAISE EXCEPTION 'Nilai harga atau kecepatan tidak valid'; END IF;
 END LOOP;
 IF coalesce(profile->>'promoStart','') <> '' THEN PERFORM (profile->>'promoStart')::date; END IF;
 IF coalesce(profile->>'promoEnd','') <> '' THEN PERFORM (profile->>'promoEnd')::date; END IF;
 IF coalesce(profile->>'promoStart','') <> '' AND coalesce(profile->>'promoEnd','') <> '' AND (profile->>'promoEnd')::date < (profile->>'promoStart')::date THEN RAISE EXCEPTION 'Tanggal akhir promo harus setelah tanggal mulai'; END IF;
 INSERT INTO public.shared_datasets(kind,payload,row_count) VALUES ('competitor','[]',0) ON CONFLICT (kind) DO NOTHING;
 SELECT payload INTO current_rows FROM public.shared_datasets WHERE kind = 'competitor' FOR UPDATE;
 SELECT t INTO current_row FROM jsonb_array_elements(current_rows) t WHERE t->>'id' = profile->>'id';
 IF current_row IS DISTINCT FROM expected_row THEN RAISE EXCEPTION 'Data telah diperbarui pengguna lain. Muat ulang sebelum mengedit.'; END IF;
 profile := profile || jsonb_build_object('updatedAt', to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
 IF current_row IS NULL THEN next_rows := current_rows || jsonb_build_array(profile);
 ELSE SELECT jsonb_agg(CASE WHEN t->>'id' = profile->>'id' THEN profile ELSE t END ORDER BY ord) INTO next_rows FROM jsonb_array_elements(current_rows) WITH ORDINALITY AS a(t,ord); END IF;
 UPDATE public.shared_datasets SET payload = next_rows, row_count = jsonb_array_length(next_rows), updated_at = clock_timestamp(), updated_by = auth.uid() WHERE kind = 'competitor';
 RETURN next_rows;
END $$;
REVOKE ALL ON FUNCTION public.save_competitor_profile(jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_competitor_profile(jsonb,jsonb) TO authenticated;