-- Fix storage access for document processor Edge Function
-- Update RLS policies to allow service role access to documents bucket

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;

-- Create new policies that allow service role access for Edge Functions
CREATE POLICY "Service role can access documents" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'documents' AND auth.role() = 'service_role');

-- Allow admins to upload documents
CREATE POLICY "Admins can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Allow admins to view uploaded documents  
CREATE POLICY "Admins can view documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));