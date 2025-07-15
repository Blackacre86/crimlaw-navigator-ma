import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface ProcessingAnalytics {
  volumeTrends: {
    date: string;
    processed: number;
    failed: number;
    successRate: number;
  }[];
  performanceTrends: {
    date: string;
    avgProcessingTime: number;
    avgChunksPerDoc: number;
    avgEmbeddingTime: number;
  }[];
  pipelineStages: {
    stage: string;
    count: number;
    avgTime: number;
    bottleneck: boolean;
  }[];
  errorPatterns: {
    errorType: string;
    count: number;
    lastOccurrence: string;
  }[];
  costAnalysis: {
    totalCost: number;
    costByDay: { date: string; cost: number }[];
    tokensUsed: number;
    apiCallsCount: number;
  };
}

export function useProcessingAnalytics(timeRange: 'day' | 'week' | 'month' = 'week') {
  const [analytics, setAnalytics] = useState<ProcessingAnalytics>({
    volumeTrends: [],
    performanceTrends: [],
    pipelineStages: [],
    errorPatterns: [],
    costAnalysis: {
      totalCost: 0,
      costByDay: [],
      tokensUsed: 0,
      apiCallsCount: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (): Promise<ProcessingAnalytics> => {
    try {
      const now = new Date();
      const daysBack = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      // Fetch processing jobs for the time range
      const { data: jobs, error: jobsError } = await supabase
        .from('processing_jobs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (jobsError) throw jobsError;

      // Fetch API usage logs
      const { data: apiLogs, error: apiError } = await supabase
        .from('api_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (apiError) throw apiError;

      // Calculate volume trends
      const volumeTrends = [];
      for (let i = 0; i < daysBack; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayJobs = jobs?.filter(job => 
          job.created_at.startsWith(dateStr)
        ) || [];
        
        const processed = dayJobs.filter(job => job.status === 'completed').length;
        const failed = dayJobs.filter(job => job.status === 'failed').length;
        const successRate = dayJobs.length > 0 ? (processed / dayJobs.length) * 100 : 0;

        volumeTrends.push({
          date: dateStr,
          processed,
          failed,
          successRate,
        });
      }

      // Calculate performance trends
      const performanceTrends = [];
      for (let i = 0; i < daysBack; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayJobs = jobs?.filter(job => 
          job.created_at.startsWith(dateStr) && job.status === 'completed'
        ) || [];
        
        const avgProcessingTime = dayJobs.length > 0
          ? dayJobs.reduce((sum, job) => {
              if (job.started_at && job.completed_at) {
                const duration = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
                return sum + (duration / 60000); // minutes
              }
              return sum;
            }, 0) / dayJobs.length
          : 0;

        const avgChunksPerDoc = dayJobs.length > 0
          ? dayJobs.reduce((sum, job) => sum + (job.total_chunks || 0), 0) / dayJobs.length
          : 0;

        const avgEmbeddingTime = dayJobs.length > 0
          ? dayJobs.reduce((sum, job) => sum + (job.embedding_time_ms || 0), 0) / dayJobs.length / 1000
          : 0;

        performanceTrends.push({
          date: dateStr,
          avgProcessingTime,
          avgChunksPerDoc,
          avgEmbeddingTime,
        });
      }

      // Calculate pipeline stages
      const allJobs = jobs || [];
      const stages = [
        { stage: 'Queued', status: 'queued' },
        { stage: 'Processing', status: 'processing' },
        { stage: 'Completed', status: 'completed' },
        { stage: 'Failed', status: 'failed' },
      ];

      const pipelineStages = stages.map(({ stage, status }) => {
        const stageJobs = allJobs.filter(job => job.status === status);
        const count = stageJobs.length;
        
        // Calculate average time spent in this stage
        const avgTime = stageJobs.length > 0
          ? stageJobs.reduce((sum, job) => {
              if (job.started_at && (job.completed_at || status === 'processing')) {
                const endTime = job.completed_at ? new Date(job.completed_at) : new Date();
                const duration = endTime.getTime() - new Date(job.started_at).getTime();
                return sum + (duration / 60000); // minutes
              }
              return sum;
            }, 0) / stageJobs.length
          : 0;

        // Simple bottleneck detection (if stage has unusually long avg time)
        const bottleneck = avgTime > 60; // More than 1 hour average

        return {
          stage,
          count,
          avgTime,
          bottleneck,
        };
      });

      // Calculate error patterns
      const errorJobs = allJobs.filter(job => job.status === 'failed' && job.error_message);
      const errorPatterns = errorJobs.reduce((acc, job) => {
        const errorType = job.error_message?.split(':')[0] || 'Unknown Error';
        const existing = acc.find(e => e.errorType === errorType);
        
        if (existing) {
          existing.count++;
          if (new Date(job.created_at) > new Date(existing.lastOccurrence)) {
            existing.lastOccurrence = job.created_at;
          }
        } else {
          acc.push({
            errorType,
            count: 1,
            lastOccurrence: job.created_at,
          });
        }
        
        return acc;
      }, [] as { errorType: string; count: number; lastOccurrence: string }[]);

      // Calculate cost analysis
      const totalCost = allJobs.reduce((sum, job) => sum + (job.cost_estimate || 0), 0);
      const tokensUsed = allJobs.reduce((sum, job) => sum + (job.token_count || 0), 0);
      const apiCallsCount = allJobs.reduce((sum, job) => sum + (job.api_calls || 0), 0);

      const costByDay = volumeTrends.map(trend => ({
        date: trend.date,
        cost: allJobs
          .filter(job => job.created_at.startsWith(trend.date))
          .reduce((sum, job) => sum + (job.cost_estimate || 0), 0),
      }));

      return {
        volumeTrends,
        performanceTrends,
        pipelineStages,
        errorPatterns,
        costAnalysis: {
          totalCost,
          costByDay,
          tokensUsed,
          apiCallsCount,
        },
      };
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      throw err;
    }
  }, [timeRange]);

  // Use React Query for caching and automatic refetching
  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['processing-analytics', timeRange],
    queryFn: fetchAnalytics,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Update local state when data changes
  useEffect(() => {
    if (data) {
      setAnalytics(data);
      setLoading(false);
      setError(null);
    } else if (queryError) {
      setError(queryError.message);
      setLoading(false);
    }
  }, [data, queryError]);

  const refreshAnalytics = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    analytics,
    loading: isLoading,
    error,
    refreshAnalytics,
  };
}