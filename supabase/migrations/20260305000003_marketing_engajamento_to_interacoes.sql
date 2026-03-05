-- Rename engajamento (%) to interacoes (absolute number) for IG and LinkedIn
ALTER TABLE marketing_metrics RENAME COLUMN ig_engajamento TO ig_interacoes;
ALTER TABLE marketing_metrics ALTER COLUMN ig_interacoes TYPE integer USING ig_interacoes::integer;

ALTER TABLE marketing_metrics RENAME COLUMN li_engajamento TO li_interacoes;
ALTER TABLE marketing_metrics ALTER COLUMN li_interacoes TYPE integer USING li_interacoes::integer;
