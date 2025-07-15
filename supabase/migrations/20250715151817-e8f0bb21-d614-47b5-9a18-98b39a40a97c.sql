-- Create processing_metrics table for detailed performance tracking
CREATE TABLE public.processing_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processing_job_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create api_usage_logs table for OpenAI API call monitoring
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processing_job_id UUID,
  api_provider TEXT NOT NULL DEFAULT 'openai',
  endpoint TEXT NOT NULL,
  request_tokens INTEGER,
  response_tokens INTEGER,
  total_tokens INTEGER,
  cost_estimate NUMERIC(10,6),
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to processing_jobs table
ALTER TABLE public.processing_jobs 
ADD COLUMN token_count INTEGER DEFAULT 0,
ADD COLUMN cost_estimate NUMERIC(10,6) DEFAULT 0,
ADD COLUMN api_calls INTEGER DEFAULT 0,
ADD COLUMN embedding_time_ms INTEGER,
ADD COLUMN chunk_size_avg INTEGER,
ADD COLUMN processing_rate NUMERIC(10,2);

-- Enable Row Level Security
ALTER TABLE public.processing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for processing_metrics
CREATE POLICY "Authenticated users can view processing metrics" 
ON public.processing_metrics 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Service role can manage processing metrics" 
ON public.processing_metrics 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Create policies for api_usage_logs
CREATE POLICY "Authenticated users can view api usage logs" 
ON public.api_usage_logs 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Service role can manage api usage logs" 
ON public.api_usage_logs 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Add indexes for better performance
CREATE INDEX idx_processing_metrics_job_id ON public.processing_metrics(processing_job_id);
CREATE INDEX idx_processing_metrics_type_timestamp ON public.processing_metrics(metric_type, timestamp);
CREATE INDEX idx_api_usage_logs_job_id ON public.api_usage_logs(processing_job_id);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at);

-- Create function to calculate processing rates
CREATE OR REPLACE FUNCTION public.calculate_processing_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.started_at IS NOT NULL THEN
    NEW.processing_rate = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60.0; -- minutes
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update processing rates
CREATE TRIGGER update_processing_rate
  BEFORE UPDATE ON public.processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_processing_rate();