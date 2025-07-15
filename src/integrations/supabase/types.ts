export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_usage_logs: {
        Row: {
          api_provider: string
          cost_estimate: number | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          processing_job_id: string | null
          request_tokens: number | null
          response_time_ms: number | null
          response_tokens: number | null
          status_code: number | null
          total_tokens: number | null
        }
        Insert: {
          api_provider?: string
          cost_estimate?: number | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          processing_job_id?: string | null
          request_tokens?: number | null
          response_time_ms?: number | null
          response_tokens?: number | null
          status_code?: number | null
          total_tokens?: number | null
        }
        Update: {
          api_provider?: string
          cost_estimate?: number | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          processing_job_id?: string | null
          request_tokens?: number | null
          response_time_ms?: number | null
          response_tokens?: number | null
          status_code?: number | null
          total_tokens?: number | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          content: string
          content_hash: string | null
          created_at: string
          document_source: string | null
          document_title: string | null
          embedding: string | null
          file_path: string | null
          fts: unknown | null
          id: string
          ingestion_status: string | null
          parsed_content: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          content_hash?: string | null
          created_at?: string
          document_source?: string | null
          document_title?: string | null
          embedding?: string | null
          file_path?: string | null
          fts?: unknown | null
          id?: string
          ingestion_status?: string | null
          parsed_content?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          content_hash?: string | null
          created_at?: string
          document_source?: string | null
          document_title?: string | null
          embedding?: string | null
          file_path?: string | null
          fts?: unknown | null
          id?: string
          ingestion_status?: string | null
          parsed_content?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_data: Json
          job_type: string
          max_retries: number
          next_retry_at: string | null
          priority: number
          retry_count: number
          status: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_data: Json
          job_type: string
          max_retries?: number
          next_retry_at?: string | null
          priority?: number
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_data?: Json
          job_type?: string
          max_retries?: number
          next_retry_at?: string | null
          priority?: number
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          api_calls: number | null
          chunk_ms: number | null
          chunk_size_avg: number | null
          chunks_processed: number | null
          completed_at: string | null
          cost_estimate: number | null
          created_at: string
          document_id: string | null
          document_name: string
          embed_ms: number | null
          embedding_time_ms: number | null
          error_message: string | null
          id: string
          original_name: string
          parse_ms: number | null
          pginsert_ms: number | null
          processing_method: string | null
          processing_rate: number | null
          started_at: string | null
          status: string
          token_count: number | null
          total_chunks: number | null
          total_ms: number | null
          updated_at: string
          upload_ms: number | null
        }
        Insert: {
          api_calls?: number | null
          chunk_ms?: number | null
          chunk_size_avg?: number | null
          chunks_processed?: number | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          document_id?: string | null
          document_name: string
          embed_ms?: number | null
          embedding_time_ms?: number | null
          error_message?: string | null
          id?: string
          original_name: string
          parse_ms?: number | null
          pginsert_ms?: number | null
          processing_method?: string | null
          processing_rate?: number | null
          started_at?: string | null
          status?: string
          token_count?: number | null
          total_chunks?: number | null
          total_ms?: number | null
          updated_at?: string
          upload_ms?: number | null
        }
        Update: {
          api_calls?: number | null
          chunk_ms?: number | null
          chunk_size_avg?: number | null
          chunks_processed?: number | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          document_id?: string | null
          document_name?: string
          embed_ms?: number | null
          embedding_time_ms?: number | null
          error_message?: string | null
          id?: string
          original_name?: string
          parse_ms?: number | null
          pginsert_ms?: number | null
          processing_method?: string | null
          processing_rate?: number | null
          started_at?: string | null
          status?: string
          token_count?: number | null
          total_chunks?: number | null
          total_ms?: number | null
          updated_at?: string
          upload_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          processing_job_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          processing_job_id: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          processing_job_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      claim_next_job: {
        Args: { p_worker_id: string; p_job_types?: string[] }
        Returns: {
          id: string
          job_type: string
          job_data: Json
        }[]
      }
      complete_job: {
        Args: { p_job_id: string; p_result?: Json }
        Returns: boolean
      }
      enqueue_job: {
        Args: {
          p_job_type: string
          p_job_data: Json
          p_priority?: number
          p_max_retries?: number
        }
        Returns: string
      }
      fail_job: {
        Args: { p_job_id: string; p_error_message: string }
        Returns: boolean
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      hybrid_search: {
        Args: {
          query_text: string
          query_embedding: string
          match_count?: number
          rrf_k?: number
        }
        Returns: {
          id: string
          title: string
          category: string
          content: string
          created_at: string
          rrf_score: number
        }[]
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      match_documents: {
        Args: {
          query_embedding: string
          similarity_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          title: string
          category: string
          content: string
          created_at: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
