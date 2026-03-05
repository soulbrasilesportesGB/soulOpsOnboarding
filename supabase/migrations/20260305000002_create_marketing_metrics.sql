/*
  # Create marketing_metrics table

  Stores weekly marketing KPIs filled manually by the marketing team.
  Key: week_start (Monday of the week, ISO date).

  ## Channels
  - Instagram orgânico: seguidores, crescimento, posts, alcance médio, engajamento
  - Instagram pago: investimento, impressões, cliques, leads (CPL calculated client-side)
  - LinkedIn orgânico: seguidores, crescimento, posts, impressões, engajamento
  - Email (ActiveCampaign): envios, abertura, clique, descadastros, novos assinantes
*/

CREATE TABLE IF NOT EXISTS marketing_metrics (
  week_start              date        PRIMARY KEY,

  -- Instagram orgânico
  ig_seguidores           integer,
  ig_crescimento          integer,
  ig_posts                integer,
  ig_alcance_medio        integer,
  ig_engajamento          numeric(5,2),

  -- Instagram pago
  ig_pago_investimento    numeric(10,2),
  ig_pago_impressoes      integer,
  ig_pago_cliques         integer,
  ig_pago_leads           integer,

  -- LinkedIn orgânico
  li_seguidores           integer,
  li_crescimento          integer,
  li_posts                integer,
  li_impressoes           integer,
  li_engajamento          numeric(5,2),

  -- Email
  email_envios            integer,
  email_abertura          numeric(5,2),
  email_clique            numeric(5,2),
  email_descadastros      numeric(5,2),
  email_novos_assinantes  integer,

  updated_by              text,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER marketing_metrics_updated_at
  BEFORE UPDATE ON marketing_metrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE marketing_metrics ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Team read: marketing_metrics"
  ON marketing_metrics FOR SELECT
  TO authenticated
  USING (true);

-- super_admin (admin), editor, mkt_editor can write
CREATE POLICY "Mkt write: marketing_metrics insert"
  ON marketing_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'editor', 'mkt_editor')
  );

CREATE POLICY "Mkt write: marketing_metrics update"
  ON marketing_metrics FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'editor', 'mkt_editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'editor', 'mkt_editor')
  );
