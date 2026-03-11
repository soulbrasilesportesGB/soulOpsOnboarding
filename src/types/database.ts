export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          created_at_portal: string;
          updated_at_portal: string;
        };
        Insert: {
          user_id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          created_at_portal?: string;
          updated_at_portal?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at_portal?: string;
          updated_at_portal?: string;
        };
      };
      onboarding: {
        Row: {
          id: string;
          user_id: string;
          profile_kind: string;
          entity_type: string | null;
          completion_score: number;
          completion_status: string;
          missing_fields: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_kind: string;
          entity_type?: string | null;
          completion_score?: number;
          completion_status?: string;
          missing_fields?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_kind?: string;
          entity_type?: string | null;
          completion_score?: number;
          completion_status?: string;
          missing_fields?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      outreach: {
        Row: {
          id: string;
          user_id: string;
          channel: string;
          outcome: string | null;
          notes: string | null;
          created_at: string;
          next_followup_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel: string;
          outcome?: string | null;
          notes?: string | null;
          created_at?: string;
          next_followup_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          channel?: string;
          outcome?: string | null;
          notes?: string | null;
          created_at?: string;
          next_followup_at?: string | null;
        };
      };
      ops_metrics: {
        Row: {
          id: string;
          month: string;
          status_geral: string;
          frase_foco: string | null;
          atletas_total: number;
          atletas_novos: number;
          atletas_acceptable: number;
          atletas_complete: number;
          empresas_total: number;
          empresas_novas: number;
          empresas_acceptable: number;
          oportunidades_criadas: number;
          funil_leads: number;
          funil_reunioes: number;
          funil_propostas: number;
          funil_contratos: number;
          ciclo_medio_venda: number | null;
          receita_programa: number;
          receita_aporte: number;
          despesas: number;
          caixa: number;
          runway: number | null;
          proxima_entrada_valor: number | null;
          proxima_entrada_data: string | null;
          proxima_entrada_confianca: string;
          posts_semanais: number | null;
          engajamento_ig: number | null;
          taxa_abertura_email: number | null;
          taxa_clique_email: number | null;
          governanca: string[];
          hipotese: string | null;
          descoberta: string | null;
          decisao: string | null;
          proximos_30: string[];
          como_ajudar: string | null;
          report_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          month: string;
          status_geral?: string;
          frase_foco?: string | null;
          atletas_total?: number;
          atletas_novos?: number;
          atletas_acceptable?: number;
          atletas_complete?: number;
          empresas_total?: number;
          empresas_novas?: number;
          empresas_acceptable?: number;
          oportunidades_criadas?: number;
          funil_leads?: number;
          funil_reunioes?: number;
          funil_propostas?: number;
          funil_contratos?: number;
          ciclo_medio_venda?: number | null;
          receita_programa?: number;
          receita_aporte?: number;
          despesas?: number;
          caixa?: number;
          runway?: number | null;
          proxima_entrada_valor?: number | null;
          proxima_entrada_data?: string | null;
          proxima_entrada_confianca?: string;
          posts_semanais?: number | null;
          engajamento_ig?: number | null;
          taxa_abertura_email?: number | null;
          taxa_clique_email?: number | null;
          governanca?: string[];
          hipotese?: string | null;
          descoberta?: string | null;
          decisao?: string | null;
          proximos_30?: string[];
          como_ajudar?: string | null;
          report_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          month?: string;
          status_geral?: string;
          frase_foco?: string | null;
          atletas_total?: number;
          atletas_novos?: number;
          atletas_acceptable?: number;
          atletas_complete?: number;
          empresas_total?: number;
          empresas_novas?: number;
          empresas_acceptable?: number;
          oportunidades_criadas?: number;
          funil_leads?: number;
          funil_reunioes?: number;
          funil_propostas?: number;
          funil_contratos?: number;
          ciclo_medio_venda?: number | null;
          receita_programa?: number;
          receita_aporte?: number;
          despesas?: number;
          caixa?: number;
          runway?: number | null;
          proxima_entrada_valor?: number | null;
          proxima_entrada_data?: string | null;
          proxima_entrada_confianca?: string;
          posts_semanais?: number | null;
          engajamento_ig?: number | null;
          taxa_abertura_email?: number | null;
          taxa_clique_email?: number | null;
          governanca?: string[];
          hipotese?: string | null;
          descoberta?: string | null;
          decisao?: string | null;
          proximos_30?: string[];
          como_ajudar?: string | null;
          report_text?: string | null;
          updated_at?: string;
        };
      };
      ops_investors: {
        Row: {
          id: string;
          name: string;
          email: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          email?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          sort_order?: number;
        };
      };
    };
  };
}

export type User = Database['public']['Tables']['users']['Row'];
export type Onboarding = Database['public']['Tables']['onboarding']['Row'];
export type Outreach = Database['public']['Tables']['outreach']['Row'];
export type OpsMetrics = Database['public']['Tables']['ops_metrics']['Row'];
export type OpsInvestor = Database['public']['Tables']['ops_investors']['Row'];
