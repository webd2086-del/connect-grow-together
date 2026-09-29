CREATE OR REPLACE FUNCTION public.record_email_open(_recipient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  p record;
BEGIN
  SELECT id, user_id, campaign_id, prospect_id, opened_at, state INTO r
  FROM public.campaign_recipients WHERE id = _recipient_id;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.campaign_recipients
  SET open_count = open_count + 1,
      opened_at = COALESCE(opened_at, now()),
      state = CASE WHEN state = 'replied' THEN state ELSE 'opened' END
  WHERE id = _recipient_id;

  IF r.opened_at IS NULL THEN
    SELECT id, company, status, category_id INTO p FROM public.prospects WHERE id = r.prospect_id;
    IF FOUND THEN
      IF p.status IN ('new','contacted') THEN
        UPDATE public.prospects SET status = 'opened' WHERE id = p.id;
      END IF;
      INSERT INTO public.activities (user_id, type, title, prospect_id, campaign_id, category_id)
      VALUES (r.user_id, 'email_opened', p.company || ' opened your email', p.id, r.campaign_id, p.category_id);
    END IF;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_email_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_email_open(uuid) TO anon, authenticated, service_role;