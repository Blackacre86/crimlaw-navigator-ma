-- Step 1: Fix database constraint to include all categories the document-processor can generate
-- Drop the existing constraint
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_category_check;

-- Add new constraint with all required categories
ALTER TABLE public.documents ADD CONSTRAINT documents_category_check 
CHECK (category IN (
    'Model Jury Instructions',
    'Rules of Criminal Procedure', 
    'MA General Laws',
    'Legal Document',
    'statute',
    'case_law',
    'procedural_rule',
    'regulation',
    'general'
));

-- Step 3: Clean up failed processing jobs to start fresh
DELETE FROM public.processing_jobs WHERE status = 'failed';