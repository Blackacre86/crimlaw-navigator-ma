import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface ProcessingMetrics {
  currentActiveJobs: number;
  queueLength: number;
  processingRate: number; // docs per hour
  avgProcessingTime: number; // minutes
  avgChunksPerDoc: number;
  avgEmbeddingTime: number; // seconds per chunk
  successRate: number; // percentage
  todayStats: {
    docsProcessed: number;
    chunksGenerated: number;
    embeddingsCreated: number;
    totalTokensUsed: number;
    estimatedCost: number;
  };
  apiStatus: {
    openaiRateLimit: number; // requests remaining
    lastApiResponse: number; // ms
    apiErrors: number; // last 24h
  };
}

export function useMetricsDashboard() {
  const [metrics, setMetrics] = useState<ProcessingMetrics>({
    currentActiveJobs: 0,
    queueLength: 0,
    processingRate: 0,
    avgProcessingTime: 0,
    avgChunksPerDoc: 0,
    avgEmbeddingTime: 0,
    successRate: 0,
    todayStats: {
      docsProcessed: 0,
      chunksGenerated: 0,
      embeddingsCreated: 0,
      totalTokensUsed: 0,
      estimatedCost: 0,
    },
    apiStatus: {
      openaiRateLimit: 0,
      lastApiResponse: 0,
      apiErrors: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (): Promise<ProcessingMetrics> => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Fetch processing jobs data
      const { data: jobs, error: jobsError } = await supabase
        .from('processing_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch API usage logs for today
      const { data: apiLogs, error: apiError } = await supabase
        .from('api_usage_logs')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (apiError) throw apiError;

      // Calculate current status
      const activeJobs = jobs?.filter(job => job.status === 'processing').length || 0;
      const queuedJobs = jobs?.filter(job => job.status === 'queued').length || 0;
      
      // Calculate processing rate (docs per hour)
      const recentJobs = jobs?.filter(job => 
        job.completed_at && 
        new Date(job.completed_at) > new Date(now.getTime() - 60 * 60 * 1000)
      ) || [];
      const processingRate = recentJobs.length;

      // Calculate average processing time for last 10 completed jobs
      const completedJobs = jobs?.filter(job => 
        job.status === 'completed' && job.started_at && job.completed_at
      ).slice(0, 10) || [];
      
      const avgProcessingTime = completedJobs.length > 0 
        ? completedJobs.reduce((sum, job) => {
            const duration = new Date(job.completed_at!).getTime() - new Date(job.started_at!).getTime();
            return sum + (duration / 60000); // convert to minutes
          }, 0) / completedJobs.length
        : 0;

      // Calculate average chunks per document
      const jobsWithChunks = jobs?.filter(job => job.total_chunks && job.total_chunks > 0) || [];
      const avgChunksPerDoc = jobsWithChunks.length > 0
        ? jobsWithChunks.reduce((sum, job) => sum + (job.total_chunks || 0), 0) / jobsWithChunks.length
        : 0;

      // Calculate embedding time (estimated from API logs)
      const embeddingLogs = apiLogs?.filter(log => log.endpoint?.includes('embedding')) || [];
      const avgEmbeddingTime = embeddingLogs.length > 0
        ? embeddingLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / embeddingLogs.length / 1000
        : 0;

      // Calculate success rate for last 24 hours
      const last24hJobs = jobs?.filter(job => 
        new Date(job.created_at) > yesterday
      ) || [];
      const successfulJobs = last24hJobs.filter(job => job.status === 'completed').length;
      const successRate = last24hJobs.length > 0 
        ? (successfulJobs / last24hJobs.length) * 100 
        : 0;

      // Calculate today's stats
      const todayJobs = jobs?.filter(job => 
        new Date(job.created_at) >= today
      ) || [];
      
      const docsProcessed = todayJobs.filter(job => job.status === 'completed').length;
      const chunksGenerated = todayJobs.reduce((sum, job) => sum + (job.chunks_processed || 0), 0);
      const totalTokensUsed = todayJobs.reduce((sum, job) => sum + (job.token_count || 0), 0);
      const estimatedCost = todayJobs.reduce((sum, job) => sum + (job.cost_estimate || 0), 0);

      // API status from logs
      const recentApiLogs = apiLogs?.slice(0, 100) || [];
      const apiErrors = recentApiLogs.filter(log => log.status_code && log.status_code >= 400).length;
      const lastApiResponse = recentApiLogs.length > 0 ? (recentApiLogs[0].response_time_ms || 0) : 0;

      return {
        currentActiveJobs: activeJobs,
        queueLength: queuedJobs,
        processingRate,
        avgProcessingTime,
        avgChunksPerDoc,
        avgEmbeddingTime,
        successRate,
        todayStats: {
          docsProcessed,
          chunksGenerated,
          embeddingsCreated: chunksGenerated, // Assuming 1 embedding per chunk
          totalTokensUsed,
          estimatedCost,
        },
        apiStatus: {
          openaiRateLimit: 10000, // Default value, would need actual API monitoring
          lastApiResponse,
          apiErrors,
        },
      };
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      throw err;
    }
  }, []);

  // Use React Query for caching and automatic refetching
  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['metrics-dashboard'],
    queryFn: fetchMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  // Update local state when data changes
  useEffect(() => {
    if (data) {
      setMetrics(data);
      setLoading(false);
      setError(null);
    } else if (queryError) {
      setError(queryError.message);
      setLoading(false);
    }
  }, [data, queryError]);

  // Set up real-time subscription for processing jobs
  useEffect(() => {
    const channel = supabase
      .channel('metrics_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_jobs'
        },
        () => {
          // Refetch metrics when jobs change
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'api_usage_logs'
        },
        () => {
          // Refetch metrics when API logs change
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const refreshMetrics = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    metrics,
    loading: isLoading,
    error,
    refreshMetrics,
  };
}