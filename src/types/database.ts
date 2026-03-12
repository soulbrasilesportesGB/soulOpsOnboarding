export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      athlete_commercial_scores: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          notes: string | null
          p1_performance: number
          p2_narrative: number
          p3_maturity: number
          p4_activation: number
          p5_fit: number
          tier: string
          total_score: number
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          notes?: string | null
          p1_performance?: number
          p2_narrative?: number
          p3_maturity?: number
          p4_activation?: number
          p5_fit?: number
          tier?: string
          total_score?: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          p1_performance?: number
          p2_narrative?: number
          p3_maturity?: number
          p4_activation?: number
          p5_fit?: number
          tier?: string
          total_score?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_commercial_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marketing_metrics: {
        Row: {
          email_abertura: number | null
          email_clique: number | null
          email_descadastros: number | null
          email_envios: number | null
          email_novos_assinantes: number | null
          ig_crescimento: number | null
          ig_interacoes: number | null
          ig_pago_cliques: number | null
          ig_pago_impressoes: number | null
          ig_pago_investimento: number | null
          ig_pago_leads: number | null
          ig_posts: number | null
          ig_seguidores: number | null
          ig_visualizacoes: number | null
          li_crescimento: number | null
          li_impressoes: number | null
          li_interacoes: number | null
          li_posts: number | null
          li_seguidores: number | null
          updated_at: string
          updated_by: string | null
          week_start: string
        }
        Insert: {
          email_abertura?: number | null
          email_clique?: number | null
          email_descadastros?: number | null
          email_envios?: number | null
          email_novos_assinantes?: number | null
          ig_crescimento?: number | null
          ig_interacoes?: number | null
          ig_pago_cliques?: number | null
          ig_pago_impressoes?: number | null
          ig_pago_investimento?: number | null
          ig_pago_leads?: number | null
          ig_posts?: number | null
          ig_seguidores?: number | null
          ig_visualizacoes?: number | null
          li_crescimento?: number | null
          li_impressoes?: number | null
          li_interacoes?: number | null
          li_posts?: number | null
          li_seguidores?: number | null
          updated_at?: string
          updated_by?: string | null
          week_start: string
        }
        Update: {
          email_abertura?: number | null
          email_clique?: number | null
          email_descadastros?: number | null
          email_envios?: number | null
          email_novos_assinantes?: number | null
          ig_crescimento?: number | null
          ig_interacoes?: number | null
          ig_pago_cliques?: number | null
          ig_pago_impressoes?: number | null
          ig_pago_investimento?: number | null
          ig_pago_leads?: number | null
          ig_posts?: number | null
          ig_seguidores?: number | null
          ig_visualizacoes?: number | null
          li_crescimento?: number | null
          li_impressoes?: number | null
          li_interacoes?: number | null
          li_posts?: number | null
          li_seguidores?: number | null
          updated_at?: string
          updated_by?: string | null
          week_start?: string
        }
        Relationships: []
      }
      marketplace_cupons: {
        Row: {
          atleta_cpf: string | null
          atleta_email: string | null
          codigo: string
          criado_em: string
          id: string
          parceiro_id: string
        }
        Insert: {
          atleta_cpf?: string | null
          atleta_email?: string | null
          codigo: string
          criado_em?: string
          id?: string
          parceiro_id: string
        }
        Update: {
          atleta_cpf?: string | null
          atleta_email?: string | null
          codigo?: string
          criado_em?: string
          id?: string
          parceiro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_cupons_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "marketplace_parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_parceiros: {
        Row: {
          ativo: boolean
          beneficio: string | null
          categoria: string
          contato: string | null
          criado_em: string
          descricao: string | null
          id: string
          logo_url: string | null
          nome: string
          registro_profissional: string | null
        }
        Insert: {
          ativo?: boolean
          beneficio?: string | null
          categoria: string
          contato?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          registro_profissional?: string | null
        }
        Update: {
          ativo?: boolean
          beneficio?: string | null
          categoria?: string
          contato?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          registro_profissional?: string | null
        }
        Relationships: []
      }
      marketplace_transacoes: {
        Row: {
          atleta_email: string | null
          comissao_percent: number
          criado_em: string
          id: string
          parceiro_id: string
          status_repasse: string
          valor_bruto: number
          valor_liquido: number | null
        }
        Insert: {
          atleta_email?: string | null
          comissao_percent: number
          criado_em?: string
          id?: string
          parceiro_id: string
          status_repasse?: string
          valor_bruto: number
          valor_liquido?: number | null
        }
        Update: {
          atleta_email?: string | null
          comissao_percent?: number
          criado_em?: string
          id?: string
          parceiro_id?: string
          status_repasse?: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_transacoes_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "marketplace_parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding: {
        Row: {
          cidade_nome: string | null
          completion_score: number | null
          completion_status: string | null
          created_at: string | null
          entity_type: string | null
          estado_sigla: string | null
          id: string
          missing_fields: Json | null
          profile_kind: string | null
          user_id: string | null
        }
        Insert: {
          cidade_nome?: string | null
          completion_score?: number | null
          completion_status?: string | null
          created_at?: string | null
          entity_type?: string | null
          estado_sigla?: string | null
          id?: string
          missing_fields?: Json | null
          profile_kind?: string | null
          user_id?: string | null
        }
        Update: {
          cidade_nome?: string | null
          completion_score?: number | null
          completion_status?: string | null
          created_at?: string | null
          entity_type?: string | null
          estado_sigla?: string | null
          id?: string
          missing_fields?: Json | null
          profile_kind?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      onboarding_snapshots: {
        Row: {
          completion_score: number
          completion_status: string
          created_at: string | null
          id: string
          profile_kind: string
          snapshot_date: string
          user_id: string
        }
        Insert: {
          completion_score?: number
          completion_status: string
          created_at?: string | null
          id?: string
          profile_kind: string
          snapshot_date: string
          user_id: string
        }
        Update: {
          completion_score?: number
          completion_status?: string
          created_at?: string | null
          id?: string
          profile_kind?: string
          snapshot_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ops_investors: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ops_metrics: {
        Row: {
          aportes_diretos_fechados: number | null
          atletas_acceptable: number | null
          atletas_complete: number | null
          atletas_novos: number | null
          atletas_total: number | null
          caixa: number | null
          ciclo_medio_venda: number | null
          como_ajudar: string | null
          created_at: string | null
          decisao: string | null
          descoberta: string | null
          despesas: number | null
          empresas_acceptable: number | null
          empresas_novas: number | null
          empresas_total: number | null
          engajamento_ig: number | null
          frase_foco: string | null
          funil_contratos: number | null
          funil_leads: number | null
          funil_propostas: number | null
          funil_reunioes: number | null
          governanca: Json | null
          hipotese: string | null
          id: string
          month: string
          oportunidades_criadas: number | null
          posts_semanais: number | null
          proxima_entrada_confianca: string | null
          proxima_entrada_data: string | null
          proxima_entrada_valor: number | null
          proximos_30: Json | null
          receita_aporte: number | null
          receita_programa: number | null
          report_text: string | null
          runway: number | null
          status_geral: string
          taxa_abertura_email: number | null
          taxa_clique_email: number | null
          updated_at: string | null
        }
        Insert: {
          aportes_diretos_fechados?: number | null
          atletas_acceptable?: number | null
          atletas_complete?: number | null
          atletas_novos?: number | null
          atletas_total?: number | null
          caixa?: number | null
          ciclo_medio_venda?: number | null
          como_ajudar?: string | null
          created_at?: string | null
          decisao?: string | null
          descoberta?: string | null
          despesas?: number | null
          empresas_acceptable?: number | null
          empresas_novas?: number | null
          empresas_total?: number | null
          engajamento_ig?: number | null
          frase_foco?: string | null
          funil_contratos?: number | null
          funil_leads?: number | null
          funil_propostas?: number | null
          funil_reunioes?: number | null
          governanca?: Json | null
          hipotese?: string | null
          id?: string
          month: string
          oportunidades_criadas?: number | null
          posts_semanais?: number | null
          proxima_entrada_confianca?: string | null
          proxima_entrada_data?: string | null
          proxima_entrada_valor?: number | null
          proximos_30?: Json | null
          receita_aporte?: number | null
          receita_programa?: number | null
          report_text?: string | null
          runway?: number | null
          status_geral?: string
          taxa_abertura_email?: number | null
          taxa_clique_email?: number | null
          updated_at?: string | null
        }
        Update: {
          aportes_diretos_fechados?: number | null
          atletas_acceptable?: number | null
          atletas_complete?: number | null
          atletas_novos?: number | null
          atletas_total?: number | null
          caixa?: number | null
          ciclo_medio_venda?: number | null
          como_ajudar?: string | null
          created_at?: string | null
          decisao?: string | null
          descoberta?: string | null
          despesas?: number | null
          empresas_acceptable?: number | null
          empresas_novas?: number | null
          empresas_total?: number | null
          engajamento_ig?: number | null
          frase_foco?: string | null
          funil_contratos?: number | null
          funil_leads?: number | null
          funil_propostas?: number | null
          funil_reunioes?: number | null
          governanca?: Json | null
          hipotese?: string | null
          id?: string
          month?: string
          oportunidades_criadas?: number | null
          posts_semanais?: number | null
          proxima_entrada_confianca?: string | null
          proxima_entrada_data?: string | null
          proxima_entrada_valor?: number | null
          proximos_30?: Json | null
          receita_aporte?: number | null
          receita_programa?: number | null
          report_text?: string | null
          runway?: number | null
          status_geral?: string
          taxa_abertura_email?: number | null
          taxa_clique_email?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      outreach: {
        Row: {
          channel: string | null
          created_at: string | null
          id: string
          next_followup_at: string | null
          notes: string | null
          outcome: string | null
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          id?: string
          next_followup_at?: string | null
          notes?: string | null
          outcome?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          id?: string
          next_followup_at?: string | null
          notes?: string | null
          outcome?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          created_at_portal: string | null
          email: string | null
          excluded: boolean
          full_name: string | null
          instagram: string | null
          last_activity_at: string | null
          phone: string | null
          role: string | null
          updated_at_portal: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_at_portal?: string | null
          email?: string | null
          excluded?: boolean
          full_name?: string | null
          instagram?: string | null
          last_activity_at?: string | null
          phone?: string | null
          role?: string | null
          updated_at_portal?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_at_portal?: string | null
          email?: string | null
          excluded?: boolean
          full_name?: string | null
          instagram?: string | null
          last_activity_at?: string | null
          phone?: string | null
          role?: string | null
          updated_at_portal?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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

// ─── Legacy type aliases (used throughout the app) ────────────────────────────
export type User = Tables<'users'>
export type Onboarding = Tables<'onboarding'>
export type Outreach = Tables<'outreach'>
export type OpsMetrics = Tables<'ops_metrics'>
export type OpsInvestor = Tables<'ops_investors'>
