-- Create query_logs table for tracking legal queries and responses
CREATE TABLE public.query_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    query TEXT NOT NULL,
    answer TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    response_time_ms INTEGER,
    chunks_processed INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.query_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own query logs" 
ON public.query_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert query logs" 
ON public.query_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Service role can manage all query logs" 
ON public.query_logs 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Create indexes for performance
CREATE INDEX idx_query_logs_user_id ON public.query_logs(user_id);
CREATE INDEX idx_query_logs_created_at ON public.query_logs(created_at);
CREATE INDEX idx_query_logs_sources ON public.query_logs USING GIN(sources);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_query_logs_updated_at
BEFORE UPDATE ON public.query_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();