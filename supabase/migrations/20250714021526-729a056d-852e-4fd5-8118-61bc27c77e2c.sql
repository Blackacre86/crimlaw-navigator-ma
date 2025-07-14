-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table with vector support
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Model Jury Instructions', 'Rules of Criminal Procedure', 'MA General Laws')),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is a professional tool with public legal documents)
CREATE POLICY "Documents are viewable by everyone" 
ON public.documents 
FOR SELECT 
USING (true);

-- Create policies for authenticated users to insert/update documents (for future admin functionality)
CREATE POLICY "Authenticated users can insert documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update documents" 
ON public.documents 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Create vector similarity index for efficient cosine similarity search
CREATE INDEX documents_embedding_idx ON public.documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();