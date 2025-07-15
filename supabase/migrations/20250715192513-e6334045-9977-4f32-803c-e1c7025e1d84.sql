-- Add parsed_content column to documents table for storing extracted text
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS parsed_content TEXT;

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests in cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run document processor every 30 seconds
SELECT cron.schedule(
  'process-documents',
  '*/30 * * * * *', -- every 30 seconds
  $$
  SELECT
    net.http_post(
        url:='https://lzssqygnetvznmfubwmr.supabase.co/functions/v1/document-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6c3NxeWduZXR2em5tZnVid21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTU5NTAsImV4cCI6MjA2ODAzMTk1MH0.9cdpPSRYspKvbDAlCsnzczuJmUW7D-4tJIkVVf6vnok"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);