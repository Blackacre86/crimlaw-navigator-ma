import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface AdminAnalytics {
  statsCards: {
    totalQueries: { today: number; week: number; month: number };
    activeUsers: number;
    avgResponseTime: number;
    processingQueue: number;
  };
  charts: {
    queryVolume: Array<{date: string; queries: number}>;
    topTopics: Array<{topic: string; count: number}>;
    responseTimes: Array<{date: string; avgTime: number}>;
    userGrowth: Array<{date: string; newUsers: number; activeUsers: number}>;
  };
  recentActivity: Array<{
    id: string;
    userId: string;
    query: string;
    confidence: number;
    createdAt: string;
    responseTime: number;
    answer: string;
  }>;
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    openaiApi: 'healthy' | 'warning' | 'error';
    storage: { used: number; total: number };
    errorRate: number;
  };
}

export function useAdminAnalytics() {
  const fetchAnalytics = useCallback(async (): Promise<AdminAnalytics> => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch query logs for stats
      const { data: queryLogs, error: queryError } = await supabase
        .from('query_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      // Fetch processing jobs for queue length
      const { data: processingJobs, error: jobsError } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('status', 'queued');

      if (jobsError) throw jobsError;

      // Fetch API usage logs for system health
      const { data: apiLogs, error: apiError } = await supabase
        .from('api_usage_logs')
        .select('*')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      if (apiError) throw apiError;

      // Fetch documents for storage info
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('id');

      if (docsError) throw docsError;

      const logs = queryLogs || [];

      // Calculate stats cards
      const todayQueries = logs.filter(log => new Date(log.created_at) >= today).length;
      const weekQueries = logs.filter(log => new Date(log.created_at) >= weekAgo).length;
      const monthQueries = logs.filter(log => new Date(log.created_at) >= monthAgo).length;

      const uniqueUsers = new Set(logs.filter(log => new Date(log.created_at) >= today && log.user_id).map(log => log.user_id)).size;

      const logsWithResponseTime = logs.filter(log => log.response_time_ms);
      const avgResponseTime = logsWithResponseTime.length > 0
        ? logsWithResponseTime.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / logsWithResponseTime.length
        : 0;

      // Generate query volume chart data (last 7 days)
      const queryVolume = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const queries = logs.filter(log => log.created_at.startsWith(dateStr)).length;
        queryVolume.push({ date: dateStr, queries });
      }

      // Extract top topics from queries
      const topicCounts: Record<string, number> = {};
      logs.slice(0, 100).forEach(log => {
        const words = log.query.toLowerCase().split(/\s+/).filter(word => word.length > 4);
        words.forEach(word => {
          topicCounts[word] = (topicCounts[word] || 0) + 1;
        });
      });

      const topTopics = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));

      // Generate response time trends
      const responseTimes = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayLogs = logs.filter(log => log.created_at.startsWith(dateStr) && log.response_time_ms);
        const avgTime = dayLogs.length > 0
          ? dayLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / dayLogs.length
          : 0;
        responseTimes.push({ date: dateStr, avgTime });
      }

      // Generate user growth data
      const userGrowth = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayLogs = logs.filter(log => log.created_at.startsWith(dateStr));
        const activeUsers = new Set(dayLogs.map(log => log.user_id).filter(Boolean)).size;
        const newUsers = activeUsers; // Simplified - would need user creation date for actual new users
        userGrowth.push({ date: dateStr, newUsers, activeUsers });
      }

      // Recent activity (last 20 queries)
      const recentActivity = logs.slice(0, 20).map(log => ({
        id: log.id,
        userId: log.user_id ? log.user_id.substring(0, 8) + '...' : 'Anonymous',
        query: log.query.length > 50 ? log.query.substring(0, 50) + '...' : log.query,
        confidence: log.confidence || 0,
        createdAt: log.created_at,
        responseTime: log.response_time_ms || 0,
        answer: log.answer,
      }));

      // System health
      const recentApiErrors = (apiLogs || []).filter(log => log.status_code && log.status_code >= 400).length;
      const totalApiCalls = (apiLogs || []).length;
      const errorRate = totalApiCalls > 0 ? (recentApiErrors / totalApiCalls) * 100 : 0;

      const systemHealth = {
        database: 'healthy' as const,
        openaiApi: errorRate > 10 ? 'error' as const : errorRate > 5 ? 'warning' as const : 'healthy' as const,
        storage: { used: documents?.length || 0, total: 1000 },
        errorRate,
      };

      return {
        statsCards: {
          totalQueries: {
            today: todayQueries,
            week: weekQueries,
            month: monthQueries,
          },
          activeUsers: uniqueUsers,
          avgResponseTime,
          processingQueue: processingJobs?.length || 0,
        },
        charts: {
          queryVolume,
          topTopics,
          responseTimes,
          userGrowth,
        },
        recentActivity,
        systemHealth,
      };
    } catch (error: any) {
      console.error('Error fetching admin analytics:', error);
      throw error;
    }
  }, []);

  return useQuery({
    queryKey: ['admin-analytics'],
    queryFn: fetchAnalytics,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}