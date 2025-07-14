import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type ProcessingJob = Tables<'processing_jobs'>;

export function useProcessingJobs() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('processing_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setJobs(data || []);
    } catch (err: any) {
      console.error('Error fetching processing jobs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    // Initial fetch
    fetchJobs();

    // Set up real-time subscription
    const channel = supabase
      .channel('processing_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_jobs'
        },
        (payload) => {
          console.log('Processing job change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            setJobs(prev => [payload.new as ProcessingJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => 
              prev.map(job => 
                job.id === payload.new.id ? payload.new as ProcessingJob : job
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobs]);

  const refreshJobs = useCallback(() => {
    fetchJobs();
  }, [fetchJobs]);

  const getStats = useCallback(() => {
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const failedJobs = jobs.filter(job => job.status === 'failed').length;
    const processingJobs = jobs.filter(job => job.status === 'processing').length;
    const queuedJobs = jobs.filter(job => job.status === 'queued').length;
    
    return {
      total: totalJobs,
      completed: completedJobs,
      failed: failedJobs,
      processing: processingJobs,
      queued: queuedJobs,
      successRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
    };
  }, [jobs]);

  return {
    jobs,
    loading,
    error,
    refreshJobs,
    stats: getStats()
  };
}