/*
  # Soul Ops — Ops Dashboard Tables

  ## New Tables

  ### `ops_metrics`
  - One row per month (YYYY-MM). Stores all financial, funnel, and narrative data
    for the monthly investor report. Admin-only access.

  ### `ops_investors`
  - Investor name + email list used for report distribution. Admin-only access.

  ## Security
  - RLS enabled on both tables
  - Only users with user_metadata.role = 'admin' can read/write
*/

-- ─── ops_metrics ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ops_metrics (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month                     text NOT NULL UNIQUE,   -- YYYY-MM
  status_geral              text NOT NULL DEFAULT 'yellow',
  frase_foco                text,

  -- Atletas (auto-populated from onboarding table)
  atletas_total             int DEFAULT 0,
  atletas_novos             int DEFAULT 0,
  atletas_acceptable        int DEFAULT 0,
  atletas_complete          int DEFAULT 0,

  -- Empresas / Partners
  empresas_total            int DEFAULT 0,
  empresas_novas            int DEFAULT 0,
  empresas_acceptable       int DEFAULT 0,
  oportunidades_criadas     int DEFAULT 0,

  -- Funil comercial
  funil_leads               int DEFAULT 0,
  funil_reunioes            int DEFAULT 0,
  funil_propostas           int DEFAULT 0,
  funil_contratos           int DEFAULT 0,
  ciclo_medio_venda         int,

  -- Financeiro
  receita_programa          numeric DEFAULT 0,
  receita_aporte            numeric DEFAULT 0,
  despesas                  numeric DEFAULT 0,
  caixa                     numeric DEFAULT 0,
  runway                    numeric,
  proxima_entrada_valor     numeric,
  proxima_entrada_data      text,
  proxima_entrada_confianca text DEFAULT 'media',

  -- Social / Email (interno)
  posts_semanais            int,
  engajamento_ig            numeric,
  taxa_abertura_email       numeric,
  taxa_clique_email         numeric,

  -- Narrativa
  governanca                jsonb DEFAULT '["","",""]'::jsonb,
  hipotese                  text,
  descoberta                text,
  decisao                   text,
  proximos_30               jsonb DEFAULT '["","","","",""]'::jsonb,
  como_ajudar               text,

  -- Relatório gerado
  report_text               text,

  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- ─── ops_investors ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ops_investors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE ops_metrics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_investors ENABLE ROW LEVEL SECURITY;

-- Only admin users can access ops_metrics
CREATE POLICY "Admin only: ops_metrics"
  ON ops_metrics FOR ALL
  TO authenticated
  USING     ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Only admin users can access ops_investors
CREATE POLICY "Admin only: ops_investors"
  ON ops_investors FOR ALL
  TO authenticated
  USING     ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
