CREATE OR REPLACE FUNCTION public.mutate_action_plan(operation text, task_id text DEFAULT NULL, task_patch jsonb DEFAULT '{}'::jsonb, new_tasks jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rows_json jsonb; next_rows jsonb; stamp text := to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
 IF auth.uid() IS NULL OR NOT (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'manager'::public.app_role) OR private.has_role(auth.uid(), 'analyst'::public.app_role)) THEN RAISE EXCEPTION 'Not authorized to manage action plans' USING ERRCODE = '42501'; END IF;
 IF operation NOT IN ('add','update','delete') THEN RAISE EXCEPTION 'Invalid operation'; END IF;
 INSERT INTO public.shared_datasets(kind,payload,row_count) VALUES ('actionplan','[]',0) ON CONFLICT (kind) DO NOTHING;
 SELECT payload INTO rows_json FROM public.shared_datasets WHERE kind = 'actionplan' FOR UPDATE;
 IF operation = 'add' THEN
  IF jsonb_typeof(new_tasks) <> 'array' OR EXISTS (SELECT 1 FROM jsonb_array_elements(new_tasks) t WHERE coalesce(t->>'id','') = '' OR coalesce(trim(t->>'cluster'),'') = '' OR coalesce(t->>'status','') NOT IN ('planned','onprogress','completed','overdue','reschedule')) THEN RAISE EXCEPTION 'Invalid tasks'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(new_tasks) n JOIN jsonb_array_elements(rows_json) r ON n->>'id' = r->>'id') OR (SELECT count(*) FROM jsonb_array_elements(new_tasks)) <> (SELECT count(DISTINCT t->>'id') FROM jsonb_array_elements(new_tasks) t) THEN RAISE EXCEPTION 'Duplicate task'; END IF;
  SELECT rows_json || coalesce(jsonb_agg(t || jsonb_build_object('updatedAt',stamp)), '[]'::jsonb) INTO next_rows FROM jsonb_array_elements(new_tasks) t;
 ELSE
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(rows_json) t WHERE t->>'id' = task_id) THEN RAISE EXCEPTION 'Task no longer exists'; END IF;
  IF operation = 'update' AND (jsonb_typeof(task_patch) <> 'object' OR task_patch ? 'id' OR (task_patch ? 'status' AND task_patch->>'status' NOT IN ('planned','onprogress','completed','overdue','reschedule'))) THEN RAISE EXCEPTION 'Invalid task patch'; END IF;
  SELECT coalesce(jsonb_agg(CASE WHEN t->>'id' = task_id THEN t || task_patch || jsonb_build_object('updatedAt',stamp) ELSE t END ORDER BY ord), '[]'::jsonb) INTO next_rows FROM jsonb_array_elements(rows_json) WITH ORDINALITY AS a(t,ord) WHERE operation <> 'delete' OR t->>'id' <> task_id;
 END IF;
 UPDATE public.shared_datasets SET payload = next_rows, row_count = jsonb_array_length(next_rows), updated_at = clock_timestamp(), updated_by = auth.uid() WHERE kind = 'actionplan';
 RETURN next_rows;
END $$;
REVOKE ALL ON FUNCTION public.mutate_action_plan(text,text,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutate_action_plan(text,text,jsonb,jsonb) TO authenticated;
