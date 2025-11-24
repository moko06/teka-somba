-- Fix function search_path for update_conversation_timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW(),
      last_message = NEW.content
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;