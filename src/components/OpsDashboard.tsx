import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

// ─── SOUL BRASIL PALETTE ──────────────────────────────────────────────────────
const C = {
  bg: '#0A1628',
  surface: '#0F1E38',
  surfaceHigh: '#16284A',
  surfaceMid: '#1C3260',
  border: '#1E3A6E',
  accent: '#00C896',
  accentDim: '#00C89615',
  accentMid: '#00C89630',
  secondary: '#F0A500',
  secondaryDim: '#F0A50015',
  warn: '#F0A500',
  danger: '#E85555',
  text: '#FFFFFF',
  textMid: '#8BA5CC',
  textDim: '#4A6590',
  green: '#00C896',
  yellow: '#F0A500',
  red: '#E85555',
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
type OpsTab = 'dashboard' | 'inserir' | 'relatório' | 'investidores';

interface Investor {
  id: string;
  name: string;
  email: string;
  sort_order: number;
}

interface Metrics {
  month: string;
  statusGeral: string;
  fraseFoco: string;
  atletasTotal: string;
  atletasNovos: string;
  atletasAcceptable: string;
  atletasComplete: string;
  empresasTotal: string;
  empresasNovas: string;
  empresasAcceptable: string;
  oportunidadesCriadas: string;
  funilLeads: string;
  funilReunioes: string;
  funilPropostas: string;
  funilContratos: string;
  cicloMedioVenda: string;
  receitaPrograma: string;
  receitaAporte: string;
  despesas: string;
  caixa: string;
  runway: string;
  proximaEntradaValor: string;
  proximaEntradaData: string;
  proximaEntradaConfianca: string;
  postsSemanais: string;
  engajamentoIG: string;
  taxaAberturaEmail: string;
  taxaCliqueEmail: string;
  governanca: string[];
  hipotese: string;
  descoberta: string;
  decisao: string;
  proximos30: string[];
  comoAjudar: string;
}

function defaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function emptyMetrics(): Metrics {
  return {
    month: defaultMonth(),
    statusGeral: 'yellow',
    fraseFoco: '',
    atletasTotal: '',
    atletasNovos: '',
    atletasAcceptable: '',
    atletasComplete: '',
    empresasTotal: '',
    empresasNovas: '',
    empresasAcceptable: '',
    oportunidadesCriadas: '',
    funilLeads: '',
    funilReunioes: '',
    funilPropostas: '',
    funilContratos: '',
    cicloMedioVenda: '',
    receitaPrograma: '',
    receitaAporte: '',
    despesas: '',
    caixa: '',
    runway: '',
    proximaEntradaValor: '',
    proximaEntradaData: '',
    proximaEntradaConfianca: 'media',
    postsSemanais: '',
    engajamentoIG: '',
    taxaAberturaEmail: '',
    taxaCliqueEmail: '',
    governanca: ['', '', ''],
    hipotese: '',
    descoberta: '',
    decisao: '',
    proximos30: ['', '', '', '', ''],
    comoAjudar: '',
  };
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const s: any = {
  wrap: { minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: 13 },
  inner: { padding: '28px 32px', maxWidth: 1100, margin: '0 auto' },
  topBar: { borderBottom: `1px solid ${C.border}`, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surface },
  logo: { fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, color: C.text },
  nav: { display: 'flex', gap: 4 },
  navBtn: (active: boolean) => ({
    padding: '6px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11,
    fontFamily: 'inherit', letterSpacing: 1, textTransform: 'uppercase' as const,
    background: active ? C.accent : 'transparent', color: active ? C.bg : C.textMid, transition: 'all 0.15s',
  }),
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' as const, color: C.textDim, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  sectionLine: { flex: 1, height: 1, background: C.border },
  grid: (cols: number) => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }),
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px' },
  cardLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.textDim, marginBottom: 6 },
  cardValue: { fontSize: 26, fontWeight: 700, color: C.text, lineHeight: '1' },
  cardSub: { fontSize: 11, color: C.textMid, marginTop: 4 },
  input: { background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: 'inherit', fontSize: 13, padding: '8px 12px', width: '100%', outline: 'none', boxSizing: 'border-box' as const },
  inputLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: C.textMid, marginBottom: 4, display: 'block' },
  field: { marginBottom: 12 },
  btn: (variant = 'primary') => ({
    padding: '10px 20px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11,
    fontFamily: 'inherit', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const,
    background: variant === 'primary' ? C.accent : variant === 'danger' ? C.danger : C.surfaceHigh,
    color: variant === 'primary' ? C.bg : C.text, transition: 'opacity 0.15s',
  }),
  textarea: { background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: 'inherit', fontSize: 13, padding: '8px 12px', width: '100%', outline: 'none', boxSizing: 'border-box' as const, resize: 'vertical' as const, minHeight: 64 },
  select: { background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: 'inherit', fontSize: 13, padding: '8px 12px', width: '100%', outline: 'none' },
  tag: (color: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 100,
    fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const,
    background: color === 'green' ? '#00C89620' : color === 'yellow' ? '#F0A50020' : '#E8555520',
    color: color === 'green' ? C.green : color === 'yellow' ? C.yellow : C.red,
    border: `1px solid ${color === 'green' ? '#00C89640' : color === 'yellow' ? '#F0A50040' : '#E8555540'}`,
  }),
  divider: { height: 1, background: C.border, margin: '24px 0' },
  reportBox: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, whiteSpace: 'pre-wrap' as const, fontFamily: 'inherit', fontSize: 13, lineHeight: '1.7', color: C.text, maxHeight: 500, overflowY: 'auto' as const },
  badge: (v: number) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const,
    background: v > 0 ? '#00E5A015' : '#FF4D4D15', color: v > 0 ? C.green : C.red,
  }),
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.textMid, letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value || 0}</span>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={s.card}>
      <div style={s.cardLabel}>{label}</div>
      <div style={{ ...s.cardValue, color: accent || C.text }}>{value ?? '—'}</div>
      {sub && <div style={s.cardSub}>{sub}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={s.field}>
      <label style={s.inputLabel}>{label}</label>
      {children}
    </div>
  );
}

// Untyped supabase client for ops tables (not yet in generated types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function OpsDashboard() {
  const { session } = useAuth();
  const [tab, setTab] = useState<OpsTab>('dashboard');
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics());
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [report, setReport] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [fetchingOnboarding, setFetchingOnboarding] = useState(false);
  const [fetchMsg, setFetchMsg] = useState('');

  // ── Load from Supabase ────────────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      const month = defaultMonth();

      const [metricsRes, investorsRes, athleteRes, partnerRes] = await Promise.all([
        db.from('ops_metrics').select('*').eq('month', month).maybeSingle(),
        db.from('ops_investors').select('*').order('sort_order'),
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'athlete'),
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'partner'),
      ]);

      // Auto-derived fields — always reflect live DB state
      const countByStatus = (data: { completion_status: string }[] | null) => {
        const counts: Record<string, number> = {};
        (data || []).forEach((item) => {
          const s = item.completion_status || 'unknown';
          counts[s] = (counts[s] || 0) + 1;
        });
        return counts;
      };
      const athleteCounts = countByStatus(athleteRes.data);
      const partnerCounts = countByStatus(partnerRes.data);
      const totalAthletes = (athleteRes as any).count ?? (athleteRes.data?.length ?? 0);
      const totalPartners = (partnerRes as any).count ?? (partnerRes.data?.length ?? 0);
      const liveOnboarding = {
        atletasTotal: String(totalAthletes),
        atletasAcceptable: String(athleteCounts['acceptable'] || 0),
        atletasComplete: String(athleteCounts['complete'] || 0),
        empresasTotal: String(totalPartners),
        empresasAcceptable: String(partnerCounts['acceptable'] || 0),
      };

      if (metricsRes.data) {
        const d = metricsRes.data;
        setMetrics({
          month: d.month,
          statusGeral: d.status_geral,
          fraseFoco: d.frase_foco || '',
          // live auto-populated (override saved values)
          ...liveOnboarding,
          // manually entered fields kept from saved row
          atletasNovos: String(d.atletas_novos || ''),
          empresasNovas: String(d.empresas_novas || ''),
          oportunidadesCriadas: String(d.oportunidades_criadas || ''),
          funilLeads: String(d.funil_leads || ''),
          funilReunioes: String(d.funil_reunioes || ''),
          funilPropostas: String(d.funil_propostas || ''),
          funilContratos: String(d.funil_contratos || ''),
          cicloMedioVenda: String(d.ciclo_medio_venda || ''),
          receitaPrograma: String(d.receita_programa || ''),
          receitaAporte: String(d.receita_aporte || ''),
          despesas: String(d.despesas || ''),
          caixa: String(d.caixa || ''),
          runway: String(d.runway || ''),
          proximaEntradaValor: String(d.proxima_entrada_valor || ''),
          proximaEntradaData: d.proxima_entrada_data || '',
          proximaEntradaConfianca: d.proxima_entrada_confianca || 'media',
          postsSemanais: String(d.posts_semanais || ''),
          engajamentoIG: String(d.engajamento_ig || ''),
          taxaAberturaEmail: String(d.taxa_abertura_email || ''),
          taxaCliqueEmail: String(d.taxa_clique_email || ''),
          governanca: Array.isArray(d.governanca) ? d.governanca as string[] : ['', '', ''],
          hipotese: d.hipotese || '',
          descoberta: d.descoberta || '',
          decisao: d.decisao || '',
          proximos30: Array.isArray(d.proximos_30) ? d.proximos_30 as string[] : ['', '', '', '', ''],
          comoAjudar: d.como_ajudar || '',
        });
        if (d.report_text) setReport(d.report_text);
      } else {
        // No saved row yet — start with live onboarding counts pre-filled
        setMetrics({ ...emptyMetrics(), ...liveOnboarding });
      }

      if (investorsRes.data && investorsRes.data.length > 0) {
        setInvestors(investorsRes.data as Investor[]);
      }

      setLoaded(true);
    };

    loadAll();
  }, []);

  const setM = (key: keyof Metrics, val: string | string[]) =>
    setMetrics((prev) => ({ ...prev, [key]: val }));

  const setGov = (i: number, val: string) => {
    const arr = [...metrics.governanca];
    arr[i] = val;
    setM('governanca', arr);
  };

  const setProx = (i: number, val: string) => {
    const arr = [...metrics.proximos30];
    arr[i] = val;
    setM('proximos30', arr);
  };

  // ── Save metrics to Supabase ──────────────────────────────────────────────
  const saveMetrics = useCallback(async (reportText?: string) => {
    const row = {
      month: metrics.month,
      status_geral: metrics.statusGeral,
      frase_foco: metrics.fraseFoco || null,
      atletas_total: parseInt(metrics.atletasTotal) || 0,
      atletas_novos: parseInt(metrics.atletasNovos) || 0,
      atletas_acceptable: parseInt(metrics.atletasAcceptable) || 0,
      atletas_complete: parseInt(metrics.atletasComplete) || 0,
      empresas_total: parseInt(metrics.empresasTotal) || 0,
      empresas_novas: parseInt(metrics.empresasNovas) || 0,
      empresas_acceptable: parseInt(metrics.empresasAcceptable) || 0,
      oportunidades_criadas: parseInt(metrics.oportunidadesCriadas) || 0,
      funil_leads: parseInt(metrics.funilLeads) || 0,
      funil_reunioes: parseInt(metrics.funilReunioes) || 0,
      funil_propostas: parseInt(metrics.funilPropostas) || 0,
      funil_contratos: parseInt(metrics.funilContratos) || 0,
      ciclo_medio_venda: parseInt(metrics.cicloMedioVenda) || null,
      receita_programa: parseFloat(metrics.receitaPrograma) || 0,
      receita_aporte: parseFloat(metrics.receitaAporte) || 0,
      despesas: parseFloat(metrics.despesas) || 0,
      caixa: parseFloat(metrics.caixa) || 0,
      runway: parseFloat(metrics.runway) || null,
      proxima_entrada_valor: parseFloat(metrics.proximaEntradaValor) || null,
      proxima_entrada_data: metrics.proximaEntradaData || null,
      proxima_entrada_confianca: metrics.proximaEntradaConfianca,
      posts_semanais: parseInt(metrics.postsSemanais) || null,
      engajamento_ig: parseFloat(metrics.engajamentoIG) || null,
      taxa_abertura_email: parseFloat(metrics.taxaAberturaEmail) || null,
      taxa_clique_email: parseFloat(metrics.taxaCliqueEmail) || null,
      governanca: metrics.governanca,
      hipotese: metrics.hipotese || null,
      descoberta: metrics.descoberta || null,
      decisao: metrics.decisao || null,
      proximos_30: metrics.proximos30,
      como_ajudar: metrics.comoAjudar || null,
      report_text: reportText !== undefined ? reportText : report || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await db.from('ops_metrics').upsert(row, { onConflict: 'month' });
    if (error) {
      setSaveStatus('Erro ao salvar');
    } else {
      setSaveStatus('✓ Salvo');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  }, [metrics, report]);

  // ── Auto-fetch onboarding counts from Supabase ────────────────────────────
  const fetchOnboarding = async () => {
    setFetchingOnboarding(true);
    setFetchMsg('');

    try {
      const [athleteRes, partnerRes] = await Promise.all([
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'athlete'),
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'partner'),
      ]);

      const countByStatus = (data: { completion_status: string }[] | null) => {
        const counts: Record<string, number> = {};
        (data || []).forEach((item) => {
          const s = item.completion_status || 'unknown';
          counts[s] = (counts[s] || 0) + 1;
        });
        return counts;
      };

      const athleteCounts = countByStatus(athleteRes.data);
      const partnerCounts = countByStatus(partnerRes.data);
      const totalAthletes = (athleteRes as { count?: number }).count ?? (athleteRes.data?.length ?? 0);
      const totalPartners = (partnerRes as { count?: number }).count ?? (partnerRes.data?.length ?? 0);

      setMetrics((prev) => ({
        ...prev,
        atletasTotal: String(totalAthletes),
        atletasAcceptable: String(athleteCounts['acceptable'] || 0),
        atletasComplete: String(athleteCounts['complete'] || 0),
        empresasTotal: String(totalPartners),
        empresasAcceptable: String(partnerCounts['acceptable'] || 0),
      }));

      setFetchMsg('✓ Dados importados com sucesso.');
    } catch {
      setFetchMsg('Erro ao buscar dados. Tente novamente.');
    }

    setFetchingOnboarding(false);
  };

  // ── Generate report via Edge Function ────────────────────────────────────
  const generateReport = async () => {
    setGenerating(true);
    setReport('');

    const m = metrics;
    const receitaTotal = (parseFloat(m.receitaPrograma) || 0) + (parseFloat(m.receitaAporte) || 0);
    const txL2R = parseInt(m.funilLeads) > 0 ? Math.round((parseInt(m.funilReunioes) / parseInt(m.funilLeads)) * 100) : 0;
    const txR2P = parseInt(m.funilReunioes) > 0 ? Math.round((parseInt(m.funilPropostas) / parseInt(m.funilReunioes)) * 100) : 0;
    const txP2C = parseInt(m.funilPropostas) > 0 ? Math.round((parseInt(m.funilContratos) / parseInt(m.funilPropostas)) * 100) : 0;

    const prompt = `Você é a ferramenta de geração de relatórios da Soul Brasil Esportes. Gere um relatório mensal profissional para os investidores com base nos dados abaixo.

TOM: direto, honesto, sem linguagem motivacional ou de coach. Mostre os números com clareza. Seja transparente sobre o que não avançou. Não romantize.

DADOS DO MÊS: ${m.month}
Status geral: ${m.statusGeral === 'green' ? '🟢 Operando — execução normal' : m.statusGeral === 'yellow' ? '🟡 Em validação — testando modelo' : '🔴 Requer atenção — bloqueio relevante'}
Frase de foco: ${m.fraseFoco || 'não informado'}

ATLETAS:
- Total cadastros: ${m.atletasTotal || 0}
- Novos no período: ${m.atletasNovos || 0}
- Perfil acceptable: ${m.atletasAcceptable || 0}
- Perfil complete: ${m.atletasComplete || 0}

EMPRESAS:
- Total cadastros: ${m.empresasTotal || 0}
- Novas no período: ${m.empresasNovas || 0}
- Perfil acceptable: ${m.empresasAcceptable || 0}
- Oportunidades criadas: ${m.oportunidadesCriadas || 0}

FUNIL COMERCIAL:
- Leads qualificados: ${m.funilLeads || 0}
- Reuniões realizadas: ${m.funilReunioes || 0} (tx: ${txL2R}%)
- Propostas enviadas: ${m.funilPropostas || 0} (tx: ${txR2P}%)
- Contratos fechados: ${m.funilContratos || 0} (tx: ${txP2C}%)
- Ciclo médio de venda: ${m.cicloMedioVenda || 'não informado'} dias

FINANCEIRO:
- Receita Programa Soul Atleta em Foco: R$ ${m.receitaPrograma || 0}
- Receita Aporte Direto: R$ ${m.receitaAporte || 0}
- Receita total: R$ ${receitaTotal}
- Despesas: R$ ${m.despesas || 0}
- Caixa atual: R$ ${m.caixa || 0}
- Runway: ${m.runway || '?'} meses
- Próxima entrada prevista: R$ ${m.proximaEntradaValor || '?'} em ${m.proximaEntradaData || '?'} (confiança: ${m.proximaEntradaConfianca})

GOVERNANÇA E OPERAÇÃO:
${m.governanca.filter(Boolean).map((g, i) => `${i + 1}. ${g}`).join('\n') || 'Não informado'}

DECISÃO DO MÊS:
Hipótese testada: ${m.hipotese || 'não informado'}
O que descobrimos: ${m.descoberta || 'não informado'}
Decisão tomada: ${m.decisao || 'não informado'}

PRÓXIMOS 30 DIAS:
${m.proximos30.filter(Boolean).map((p, i) => `${i + 1}. ${p}`).join('\n') || 'Não informado'}

COMO A REDE PODE AJUDAR:
${m.comoAjudar || 'Nenhum pedido específico este mês.'}

---

Gere o relatório completo seguindo EXATAMENTE esta estrutura:

📄 RELATÓRIO MENSAL — SOUL BRASIL ESPORTES
Mês: [mês/ano]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 SNAPSHOT DO MÊS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[status, receita, pipeline, runway, frase de foco em 3-4 linhas diretas]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 ATLETAS & EMPRESAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[dados de cadastro, perfis e oportunidades com análise curta]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 FUNIL COMERCIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[funil com taxas de conversão e interpretação de 2-3 linhas]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 SAÚDE FINANCEIRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[receita, despesas, caixa, runway com comentário direto]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ GOVERNANÇA & OPERAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[3 itens de avanço operacional]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 DECISÃO DO MÊS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hipótese: [...]
Descoberta: [...]
Decisão: [...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PRÓXIMOS 30 DIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[lista com critérios de sucesso verificáveis]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤝 COMO VOCÊS PODEM AJUDAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[pedido específico ou "nenhum pedido específico este mês"]

Atenciosamente,
Maria Teresa Publio Dias
Fundadora, Soul Brasil Esportes`;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

      const text: string = data.text || 'Erro ao gerar relatório.';
      setReport(text);
      await saveMetrics(text);
    } catch (e) {
      setReport('Erro ao gerar relatório. Verifique se a Edge Function está deployada.');
    }
    setGenerating(false);
  };

  // ── Send via mailto ───────────────────────────────────────────────────────
  const sendReports = () => {
    if (!report) { setSendStatus('Gere o relatório primeiro.'); return; }
    const validInvestors = investors.filter((i) => i.email);
    if (validInvestors.length === 0) { setSendStatus('Nenhum e-mail cadastrado.'); return; }
    setSending(true);

    const subject = encodeURIComponent(`Soul Brasil Esportes — Relatório ${metrics.month}`);
    const body = encodeURIComponent(report);
    const bcc = encodeURIComponent(validInvestors.map((i) => i.email).join(','));
    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
    setSendStatus(`✓ Abrindo cliente de e-mail com ${validInvestors.length} destinatário(s).`);
    setSending(false);
  };

  // ── Investor persistence ──────────────────────────────────────────────────
  const saveInvestors = async (list: Investor[]) => {
    await db.from('ops_investors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (list.length > 0) {
      await db.from('ops_investors').insert(
        list.map((inv, i) => ({ id: inv.id, name: inv.name, email: inv.email, sort_order: i }))
      );
    }
    setInvestors(list);
  };

  if (!loaded) {
    return (
      <div style={{ ...s.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: C.accent, letterSpacing: 3, textTransform: 'uppercase', fontSize: 12 }}>Carregando...</span>
      </div>
    );
  }

  const receitaTotal = (parseFloat(metrics.receitaPrograma) || 0) + (parseFloat(metrics.receitaAporte) || 0);
  const funilMax = parseInt(metrics.funilLeads) || 1;

  return (
    <div style={s.wrap}>
      {/* TOP BAR */}
      <div style={s.topBar}>
        <div>
          <div style={s.logo}>
            <span style={{ color: C.accent }}>●</span>{' '}
            Soul Brasil <span style={{ color: C.accent }}>Esportes</span>
          </div>
          <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 2, marginTop: 2 }}>DASHBOARD DE METAS & RELATÓRIOS</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {saveStatus && (
            <span style={{ fontSize: 11, letterSpacing: 1, color: saveStatus.startsWith('✓') ? C.accent : C.warn, background: saveStatus.startsWith('✓') ? C.accentDim : C.secondaryDim, padding: '4px 12px', borderRadius: 4, border: `1px solid ${saveStatus.startsWith('✓') ? C.accentMid : '#F0A50040'}` }}>
              {saveStatus}
            </span>
          )}
          <div style={s.nav}>
            {(['dashboard', 'inserir', 'relatório', 'investidores'] as OpsTab[]).map((t) => (
              <button key={t} style={s.navBtn(tab === t)} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={s.inner}>

        {/* ══ TAB: DASHBOARD ════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <>
            <div style={{ ...s.card, marginBottom: 24, borderColor: C.accent + '40' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>Período atual</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{metrics.month}</div>
                  {metrics.fraseFoco && <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>{metrics.fraseFoco}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={s.tag(metrics.statusGeral)}>
                    {metrics.statusGeral === 'green' ? '● Operando' : metrics.statusGeral === 'yellow' ? '● Em validação' : '● Requer atenção'}
                  </span>
                  <button style={s.btn('secondary')} onClick={() => setTab('inserir')}>Atualizar dados</button>
                </div>
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}><span>Financeiro</span><div style={s.sectionLine} /></div>
              <div style={s.grid(4)}>
                <MetricCard label="Receita Total" value={`R$ ${receitaTotal.toLocaleString('pt-BR')}`} sub={`Programa: R$${metrics.receitaPrograma || 0} · Aporte: R$${metrics.receitaAporte || 0}`} accent={C.accent} />
                <MetricCard label="Despesas" value={`R$ ${parseInt(metrics.despesas || '0').toLocaleString('pt-BR')}`} />
                <MetricCard label="Caixa Atual" value={`R$ ${parseInt(metrics.caixa || '0').toLocaleString('pt-BR')}`} />
                <MetricCard label="Runway" value={`${metrics.runway || '?'} meses`} accent={parseInt(metrics.runway) <= 3 ? C.danger : parseInt(metrics.runway) <= 6 ? C.warn : C.accent} />
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}><span>Funil Comercial</span><div style={s.sectionLine} /></div>
              <div style={{ ...s.card, padding: '20px 24px' }}>
                <FunnelBar label="Leads qualificados" value={parseInt(metrics.funilLeads) || 0} max={funilMax} color={C.accent} />
                <FunnelBar label="Reuniões realizadas" value={parseInt(metrics.funilReunioes) || 0} max={funilMax} color="#00B880" />
                <FunnelBar label="Propostas enviadas" value={parseInt(metrics.funilPropostas) || 0} max={funilMax} color={C.warn} />
                <FunnelBar label="Contratos fechados" value={parseInt(metrics.funilContratos) || 0} max={funilMax} color={C.danger} />
                {metrics.cicloMedioVenda && (
                  <div style={{ marginTop: 12, fontSize: 11, color: C.textMid }}>
                    Ciclo médio de venda: <span style={{ color: C.text, fontWeight: 700 }}>{metrics.cicloMedioVenda} dias</span>
                  </div>
                )}
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}><span>Atletas & Empresas</span><div style={s.sectionLine} /></div>
              <div style={s.grid(2)}>
                <div style={s.card}>
                  <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.textDim, marginBottom: 12 }}>Atletas</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><div style={s.cardLabel}>Total</div><div style={s.cardValue}>{metrics.atletasTotal || '—'}</div></div>
                    <div><div style={s.cardLabel}>Novos</div><div style={{ ...s.cardValue, color: C.accent }}>{metrics.atletasNovos || '—'}</div></div>
                    <div><div style={s.cardLabel}>Acceptable</div><div style={s.cardValue}>{metrics.atletasAcceptable || '—'}</div></div>
                    <div><div style={s.cardLabel}>Complete</div><div style={{ ...s.cardValue, color: C.accent }}>{metrics.atletasComplete || '—'}</div></div>
                  </div>
                </div>
                <div style={s.card}>
                  <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.textDim, marginBottom: 12 }}>Empresas</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><div style={s.cardLabel}>Total</div><div style={s.cardValue}>{metrics.empresasTotal || '—'}</div></div>
                    <div><div style={s.cardLabel}>Novas</div><div style={{ ...s.cardValue, color: C.accent }}>{metrics.empresasNovas || '—'}</div></div>
                    <div><div style={s.cardLabel}>Acceptable</div><div style={s.cardValue}>{metrics.empresasAcceptable || '—'}</div></div>
                    <div><div style={s.cardLabel}>Oportunidades</div><div style={{ ...s.cardValue, color: C.warn }}>{metrics.oportunidadesCriadas || '—'}</div></div>
                  </div>
                </div>
              </div>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}><span>Social & Email — Interno</span><div style={s.sectionLine} /></div>
              <div style={s.grid(4)}>
                <MetricCard label="Posts/semana" value={metrics.postsSemanais || '—'} />
                <MetricCard label="Engaj. IG" value={metrics.engajamentoIG ? `${metrics.engajamentoIG}%` : '—'} />
                <MetricCard label="Abertura email" value={metrics.taxaAberturaEmail ? `${metrics.taxaAberturaEmail}%` : '—'} />
                <MetricCard label="Clique email" value={metrics.taxaCliqueEmail ? `${metrics.taxaCliqueEmail}%` : '—'} />
              </div>
            </div>
          </>
        )}

        {/* ══ TAB: INSERIR ══════════════════════════════════════════════════ */}
        {tab === 'inserir' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Inserir dados do mês</div>
              <button style={s.btn('primary')} onClick={() => saveMetrics()}>Salvar dados</button>
            </div>

            {/* Geral */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Geral</span><div style={s.sectionLine} /></div>
              <div style={s.grid(3)}>
                <Field label="Mês/Ano (YYYY-MM)">
                  <input style={s.input} value={metrics.month} onChange={(e) => setM('month', e.target.value)} placeholder="2026-03" />
                </Field>
                <Field label="Status geral">
                  <select style={s.select} value={metrics.statusGeral} onChange={(e) => setM('statusGeral', e.target.value)}>
                    <option value="green">🟢 Operando — execução normal</option>
                    <option value="yellow">🟡 Em validação — testando modelo</option>
                    <option value="red">🔴 Requer atenção — bloqueio relevante</option>
                  </select>
                </Field>
                <Field label="Frase de foco do mês">
                  <input style={s.input} value={metrics.fraseFoco} onChange={(e) => setM('fraseFoco', e.target.value)} placeholder="O que a Soul fez de mais importante" />
                </Field>
              </div>
            </div>

            {/* Atletas */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Atletas</span><div style={s.sectionLine} /></div>
              <div style={{ ...s.card, marginBottom: 16, padding: '12px 16px', borderColor: C.accent + '30', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textMid }}>Sincronizar com base de onboarding</div>
                  {fetchMsg && <div style={{ fontSize: 11, marginTop: 4, color: fetchMsg.startsWith('✓') ? C.accent : C.warn }}>{fetchMsg}</div>}
                </div>
                <button style={{ ...s.btn('secondary'), fontSize: 10, padding: '6px 14px' }} onClick={fetchOnboarding} disabled={fetchingOnboarding}>
                  {fetchingOnboarding ? 'Buscando...' : '↻ Importar dados'}
                </button>
              </div>
              <div style={s.grid(4)}>
                {([['atletasTotal', 'Total cadastros'], ['atletasNovos', 'Novos no período'], ['atletasAcceptable', 'Perfil acceptable'], ['atletasComplete', 'Perfil complete']] as [keyof Metrics, string][]).map(([k, l]) => (
                  <Field key={k} label={l}><input style={s.input} type="number" value={metrics[k] as string} onChange={(e) => setM(k, e.target.value)} placeholder="0" /></Field>
                ))}
              </div>
            </div>

            {/* Empresas */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Empresas</span><div style={s.sectionLine} /></div>
              <div style={s.grid(4)}>
                {([['empresasTotal', 'Total cadastros'], ['empresasNovas', 'Novas no período'], ['empresasAcceptable', 'Perfil acceptable'], ['oportunidadesCriadas', 'Oportunidades criadas']] as [keyof Metrics, string][]).map(([k, l]) => (
                  <Field key={k} label={l}><input style={s.input} type="number" value={metrics[k] as string} onChange={(e) => setM(k, e.target.value)} placeholder="0" /></Field>
                ))}
              </div>
            </div>

            {/* Funil */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Funil Comercial</span><div style={s.sectionLine} /></div>
              <div style={s.grid(5)}>
                {([['funilLeads', 'Leads qualificados'], ['funilReunioes', 'Reuniões realizadas'], ['funilPropostas', 'Propostas enviadas'], ['funilContratos', 'Contratos fechados'], ['cicloMedioVenda', 'Ciclo médio (dias)']] as [keyof Metrics, string][]).map(([k, l]) => (
                  <Field key={k} label={l}><input style={s.input} type="number" value={metrics[k] as string} onChange={(e) => setM(k, e.target.value)} placeholder="0" /></Field>
                ))}
              </div>
            </div>

            {/* Financeiro */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Financeiro</span><div style={s.sectionLine} /></div>
              <div style={s.grid(3)}>
                {([['receitaPrograma', 'Receita — Programa Soul'], ['receitaAporte', 'Receita — Aporte Direto'], ['despesas', 'Despesas totais'], ['caixa', 'Caixa atual'], ['runway', 'Runway (meses)'], ['proximaEntradaValor', 'Próxima entrada (R$)']] as [keyof Metrics, string][]).map(([k, l]) => (
                  <Field key={k} label={l}><input style={s.input} type="number" value={metrics[k] as string} onChange={(e) => setM(k, e.target.value)} placeholder="0" /></Field>
                ))}
              </div>
              <div style={s.grid(2)}>
                <Field label="Data da próxima entrada">
                  <input style={s.input} value={metrics.proximaEntradaData} onChange={(e) => setM('proximaEntradaData', e.target.value)} placeholder="ex: março/2026" />
                </Field>
                <Field label="Confiança">
                  <select style={s.select} value={metrics.proximaEntradaConfianca} onChange={(e) => setM('proximaEntradaConfianca', e.target.value)}>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* Social/Email */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Social & Email (interno)</span><div style={s.sectionLine} /></div>
              <div style={s.grid(4)}>
                {([['postsSemanais', 'Posts/semana'], ['engajamentoIG', 'Engajamento IG (%)'], ['taxaAberturaEmail', 'Abertura email (%)'], ['taxaCliqueEmail', 'Clique email (%)']] as [keyof Metrics, string][]).map(([k, l]) => (
                  <Field key={k} label={l}><input style={s.input} type="number" value={metrics[k] as string} onChange={(e) => setM(k, e.target.value)} placeholder="0" /></Field>
                ))}
              </div>
            </div>

            {/* Governança */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Governança & Operação</span><div style={s.sectionLine} /></div>
              {[0, 1, 2].map((i) => (
                <Field key={i} label={`Item ${i + 1}`}>
                  <input style={s.input} value={metrics.governanca[i]} onChange={(e) => setGov(i, e.target.value)} placeholder="O que avançou em estrutura, processo, plataforma..." />
                </Field>
              ))}
            </div>

            {/* Decisão */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Decisão do mês</span><div style={s.sectionLine} /></div>
              <Field label="Hipótese testada"><textarea style={s.textarea} value={metrics.hipotese} onChange={(e) => setM('hipotese', e.target.value)} placeholder="O que achávamos que seria verdade..." /></Field>
              <Field label="O que descobrimos"><textarea style={s.textarea} value={metrics.descoberta} onChange={(e) => setM('descoberta', e.target.value)} placeholder="O que o mercado respondeu..." /></Field>
              <Field label="Decisão tomada"><textarea style={s.textarea} value={metrics.decisao} onChange={(e) => setM('decisao', e.target.value)} placeholder="O que mudou na rota..." /></Field>
            </div>

            {/* Próximos 30 dias */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Próximos 30 dias</span><div style={s.sectionLine} /></div>
              {[0, 1, 2, 3, 4].map((i) => (
                <Field key={i} label={`Item ${i + 1}`}>
                  <input style={s.input} value={metrics.proximos30[i]} onChange={(e) => setProx(i, e.target.value)} placeholder="Ação específica com critério de sucesso verificável" />
                </Field>
              ))}
            </div>

            {/* Como ajudar */}
            <div style={s.section}>
              <div style={s.sectionTitle}><span>Como a rede pode ajudar</span><div style={s.sectionLine} /></div>
              <Field label="Pedido específico">
                <textarea style={s.textarea} value={metrics.comoAjudar} onChange={(e) => setM('comoAjudar', e.target.value)} placeholder="Indicação de empresa, conexão com decisor..." />
              </Field>
            </div>

            <button style={{ ...s.btn('primary'), width: '100%' }} onClick={() => saveMetrics()}>Salvar todos os dados</button>
          </>
        )}

        {/* ══ TAB: RELATÓRIO ════════════════════════════════════════════════ */}
        {tab === 'relatório' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Gerar & Enviar Relatório</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.btn('secondary')} onClick={generateReport} disabled={generating}>
                  {generating ? 'Gerando...' : 'Gerar relatório'}
                </button>
                {report && (
                  <button style={s.btn('primary')} onClick={sendReports} disabled={sending}>
                    {sending ? 'Abrindo...' : `Abrir no e-mail (${investors.filter((i) => i.email).length})`}
                  </button>
                )}
              </div>
            </div>

            {sendStatus && (
              <div style={{ ...s.card, borderColor: sendStatus.startsWith('✓') ? C.accent + '60' : C.warn + '60', marginBottom: 16, color: sendStatus.startsWith('✓') ? C.accent : C.warn, fontSize: 12 }}>
                {sendStatus}
              </div>
            )}

            {!report && !generating && (
              <div style={{ ...s.card, textAlign: 'center', padding: 48, color: C.textDim }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 12, letterSpacing: 1 }}>Clique em "Gerar relatório" para criar o relatório do mês.</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>O texto é gerado com base nos dados inseridos na aba "Inserir".</div>
              </div>
            )}

            {generating && (
              <div style={{ ...s.card, textAlign: 'center', padding: 48, color: C.textMid }}>
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Gerando relatório...</div>
              </div>
            )}

            {report && !generating && (
              <>
                <div style={s.reportBox}>{report}</div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button style={s.btn('secondary')} onClick={() => navigator.clipboard.writeText(report)}>Copiar texto</button>
                  <button style={s.btn('secondary')} onClick={generateReport}>Regenerar</button>
                </div>
              </>
            )}
          </>
        )}

        {/* ══ TAB: INVESTIDORES ═════════════════════════════════════════════ */}
        {tab === 'investidores' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Lista de Investidores</div>
              <button style={s.btn('secondary')} onClick={() => {
                const newList = [...investors, { id: crypto.randomUUID(), name: '', email: '', sort_order: investors.length }];
                setInvestors(newList);
              }}>+ Adicionar</button>
            </div>

            <div style={s.card}>
              {investors.map((inv, idx) => (
                <div key={inv.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: C.textDim, width: 20, textAlign: 'right' }}>{idx + 1}</div>
                  <input style={{ ...s.input, flex: 1 }} placeholder="Nome" value={inv.name}
                    onChange={(e) => setInvestors(investors.map((i) => i.id === inv.id ? { ...i, name: e.target.value } : i))} />
                  <input style={{ ...s.input, flex: 2 }} placeholder="email@exemplo.com" type="email" value={inv.email}
                    onChange={(e) => setInvestors(investors.map((i) => i.id === inv.id ? { ...i, email: e.target.value } : i))} />
                  <button style={{ ...s.btn('danger'), padding: '8px 12px', fontSize: 12 }}
                    onClick={() => setInvestors(investors.filter((i) => i.id !== inv.id))}>✕</button>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <button style={s.btn('primary')} onClick={() => saveInvestors(investors)}>Salvar lista</button>
              </div>
            </div>

            <div style={{ ...s.card, marginTop: 16, fontSize: 12, color: C.textMid }}>
              <span style={{ color: C.accent, fontWeight: 700 }}>{investors.filter((i) => i.email).length}</span> e-mails cadastrados · Os relatórios serão enviados via BCC.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
