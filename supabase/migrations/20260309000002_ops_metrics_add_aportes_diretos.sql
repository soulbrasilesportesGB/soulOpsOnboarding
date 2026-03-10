-- Add aportes_diretos_fechados to ops_metrics for Mar-Apr goals tracking
ALTER TABLE ops_metrics
  ADD COLUMN IF NOT EXISTS aportes_diretos_fechados INTEGER DEFAULT 0;
