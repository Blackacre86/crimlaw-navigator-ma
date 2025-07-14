-- Fix document category constraint to allow 'Legal Document' category
-- This resolves the constraint violation that prevents document processing

-- Drop the existing check constraint
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_category_check;

-- Add new check constraint that includes 'Legal Document'
ALTER TABLE public.documents ADD CONSTRAINT documents_category_check 
CHECK (category IN ('Model Jury Instructions', 'Rules of Criminal Procedure', 'MA General Laws', 'Legal Document'));