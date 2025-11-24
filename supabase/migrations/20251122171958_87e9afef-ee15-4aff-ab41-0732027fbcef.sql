-- Remove whatsapp_number column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS whatsapp_number;