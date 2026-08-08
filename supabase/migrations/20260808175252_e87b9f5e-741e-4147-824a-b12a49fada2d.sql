CREATE OR REPLACE FUNCTION public.tg_ratings_strip_pii()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.reviewer_name := btrim(NEW.reviewer_name);
  IF NEW.comment IS NOT NULL THEN
    NEW.comment := btrim(NEW.comment);
  END IF;

  IF NEW.reviewer_name ~* '[[:alnum:]._%%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
     OR COALESCE(NEW.comment,'') ~* '[[:alnum:]._%%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' THEN
    RAISE EXCEPTION 'Reviews cannot contain email addresses';
  END IF;

  IF NEW.reviewer_name ~ '(\+?[0-9][0-9 ()-]{7,}[0-9])'
     OR COALESCE(NEW.comment,'') ~ '(\+?[0-9][0-9 ()-]{9,}[0-9])' THEN
    RAISE EXCEPTION 'Reviews cannot contain phone numbers';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ratings_strip_pii ON public.ratings;
CREATE TRIGGER ratings_strip_pii
BEFORE INSERT OR UPDATE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.tg_ratings_strip_pii();