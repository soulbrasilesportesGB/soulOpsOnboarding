// src/components/TeamDashboard.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Award, Handshake, TrendingUp, ArrowUp, ArrowDown, Sparkles, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { STATUS_CRITERIA } from '../lib/utils';
import { useRole, canEditMarketing } from '../hooks/useRole';
import { supabase } from '../lib/supabase';

interface StatusCount {
  completion_status: string;
  count: number;
}

type Tier =
  | 'Atleta Âncora'
  | 'Atleta Comercial Forte'
  | 'Atleta Comercial Potencial'
  | 'Ainda não comercializável'
  | string;

interface CommercialRow {
  athlete_id: string;
  user_id: string;
  total_score: number | null;
  tier: Tier | null;
  users?: { full_name: string | null; email: string | null } | null;
}

interface DailyProgress {
  newCount: number;
  improved: number;
  unchanged: number;
  regressed: number;
  hasBaseline: boolean;
  hasCurrent: boolean;
}

interface TeamOpsMetrics {
  oportunidadesCriadas: number | null;
  funilLeads: number;
  funilReunioes: number;
  funilPropostas: number;
  funilContratos: number;
  postsSemanais: number | null;
  engajamentoIG: number | null;
  taxaAberturaEmail: number | null;
  taxaCliqueEmail: number | null;
}

interface MarketingMetrics {
  week_start: string;
  ig_seguidores: number | null;
  ig_crescimento: number | null;
  ig_posts: number | null;
  ig_visualizacoes: number | null;
  ig_interacoes: number | null;
  ig_pago_investimento: number | null;
  ig_pago_impressoes: number | null;
  ig_pago_cliques: number | null;
  ig_pago_leads: number | null;
  li_seguidores: number | null;
  li_crescimento: number | null;
  li_posts: number | null;
  li_impressoes: number | null;
  li_interacoes: number | null;
  email_envios: number | null;
  email_abertura: number | null;
  email_clique: number | null;
  email_descadastros: number | null;
  email_novos_assinantes: number | null;
}

type MarketingForm = Omit<MarketingMetrics, 'week_start'>;

const EMPTY_MKT_FORM: MarketingForm = {
  ig_seguidores: null, ig_crescimento: null, ig_posts: null,
  ig_visualizacoes: null, ig_interacoes: null,
  ig_pago_investimento: null, ig_pago_impressoes: null,
  ig_pago_cliques: null, ig_pago_leads: null,
  li_seguidores: null, li_crescimento: null, li_posts: null,
  li_impressoes: null, li_interacoes: null,
  email_envios: null, email_abertura: null, email_clique: null,
  email_descadastros: null, email_novos_assinantes: null,
};

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function addWeeks(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split('T')[0];
}

function weekLabel(weekStart: string): string {
  const from = new Date(weekStart + 'T12:00:00');
  const to = new Date(weekStart + 'T12:00:00');
  to.setDate(to.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  return `${fmt(from)} – ${fmt(to)} ${from.getFullYear()}`;
}

const STATUS_ORDER: Record<string, number> = {
  stalled: 0, incomplete: 1, almost: 2, acceptable: 3, complete: 4,
};

function countByStatus(data: { completion_status: string }[] | null): StatusCount[] {
  if (!data) return [];
  const counts: Record<string, number> = {};
  data.forEach((item) => {
    const s = item.completion_status || 'unknown';
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.entries(counts).map(([status, count]) => ({ completion_status: status, count }));
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function daysAgoISO(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
}

type TeamDashTab = 'usuarios' | 'marketing' | 'comercial';
type ProgressionKind = 'all' | 'athlete' | 'partner';

export function TeamDashboard() {
  const role = useRole();
  const [activeTab, setActiveTab] = useState<TeamDashTab>('usuarios');
  const [athleteCounts, setAthleteCounts] = useState<StatusCount[]>([]);
  const [partnerCounts, setPartnerCounts] = useState<StatusCount[]>([]);
  const [totalAthletes, setTotalAthletes] = useState<number>(0);
  const [totalPartners, setTotalPartners] = useState<number>(0);
  const [newAthletesThisMonth, setNewAthletesThisMonth] = useState<number>(0);
  const [newPartnersThisMonth, setNewPartnersThisMonth] = useState<number>(0);
  const [commercialRows, setCommercialRows] = useState<CommercialRow[]>([]);
  const [teamOps, setTeamOps] = useState<TeamOpsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [progressionLoading, setProgressionLoading] = useState(false);

  // Marketing
  const [mktWeek, setMktWeek] = useState<string>(mondayOf(new Date()));
  const [mktData, setMktData] = useState<MarketingMetrics | null>(null);
  const [mktPrev, setMktPrev] = useState<MarketingMetrics | null>(null);
  const [mktHistory, setMktHistory] = useState<MarketingMetrics[]>([]);
  const [mktLoading, setMktLoading] = useState(false);
  const [mktEditing, setMktEditing] = useState(false);
  const [mktForm, setMktForm] = useState<MarketingForm>(EMPTY_MKT_FORM);
  const [mktSaving, setMktSaving] = useState(false);
  const [mktError, setMktError] = useState<string | null>(null);
  const [progressionKind, setProgressionKind] = useState<ProgressionKind>('all');
  const [progressionRange, setProgressionRange] = useState({
    from: daysAgoISO(1),
    to: todayISO(),
  });

  const fetchMarketing = useCallback(async (week: string) => {
    setMktLoading(true);
    try {
      const prevWeek = addWeeks(week, -1);
      const historyFrom = addWeeks(week, -7); // last 8 weeks including current

      const [currentRes, prevRes, historyRes] = await Promise.all([
        (supabase.from('marketing_metrics') as any).select('*').eq('week_start', week).maybeSingle(),
        (supabase.from('marketing_metrics') as any).select('*').eq('week_start', prevWeek).maybeSingle(),
        (supabase.from('marketing_metrics') as any)
          .select('*')
          .gte('week_start', historyFrom)
          .lte('week_start', week)
          .order('week_start', { ascending: true }),
      ]);

      setMktData(currentRes.data || null);
      setMktPrev(prevRes.data || null);
      setMktHistory(historyRes.data || []);

      if (currentRes.data) {
        const { week_start: _w, updated_by: _u, updated_at: _a, ...rest } = currentRes.data;
        setMktForm(rest as MarketingForm);
      } else {
        setMktForm(EMPTY_MKT_FORM);
      }
    } catch (e) {
      console.error('Error fetching marketing:', e);
    } finally {
      setMktLoading(false);
    }
  }, []);

  const saveMarketing = useCallback(async () => {
    setMktSaving(true);
    setMktError(null);
    try {
      const payload = {
        week_start: mktWeek,
        ...Object.fromEntries(
          Object.entries(mktForm).map(([k, v]) => [k, v == null ? null : Number(v)])
        ),
        updated_by: (await supabase.auth.getUser()).data.user?.email ?? null,
      };
      const { error } = await (supabase.from('marketing_metrics') as any).upsert(payload);
      if (error) throw error;
      await fetchMarketing(mktWeek);
      setMktEditing(false);
    } catch (e: any) {
      console.error('Error saving marketing:', e);
      setMktError(e?.message || 'Erro ao salvar. Verifique se a tabela foi criada no Supabase.');
    } finally {
      setMktSaving(false);
    }
  }, [mktWeek, mktForm, fetchMarketing]);

  const fetchMain = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = todayISO().slice(0, 7);
      const monthStart = `${currentMonth}-01`;

      const [athleteRes, partnerRes, newAthletesRes, newPartnersRes, commercialRes, opsRes] = await Promise.all([
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'athlete'),
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'partner'),
        (supabase.from('users') as any).select('onboarding!inner(profile_kind)', { count: 'exact', head: true }).eq('onboarding.profile_kind', 'athlete').gte('created_at_portal', monthStart),
        (supabase.from('users') as any).select('onboarding!inner(profile_kind)', { count: 'exact', head: true }).eq('onboarding.profile_kind', 'partner').gte('created_at_portal', monthStart),
        supabase
          .from('athlete_commercial_scores')
          .select('athlete_id, user_id, total_score, tier, users:users ( full_name, email )')
          .order('total_score', { ascending: false }),
        (supabase.from('ops_metrics') as any)
          .select('oportunidades_criadas, funil_leads, funil_reunioes, funil_propostas, funil_contratos, posts_semanais, engajamento_ig, taxa_abertura_email, taxa_clique_email')
          .eq('month', currentMonth)
          .maybeSingle(),
      ]);

      setAthleteCounts(countByStatus(athleteRes.data || null));
      setPartnerCounts(countByStatus(partnerRes.data || null));
      setTotalAthletes((athleteRes as any).count ?? (athleteRes.data?.length ?? 0));
      setTotalPartners((partnerRes as any).count ?? (partnerRes.data?.length ?? 0));
      setNewAthletesThisMonth((newAthletesRes as any).count ?? 0);
      setNewPartnersThisMonth((newPartnersRes as any).count ?? 0);
      setCommercialRows((commercialRes.data as any) || []);

      if (opsRes.data) {
        const d = opsRes.data;
        setTeamOps({
          oportunidadesCriadas: d.oportunidades_criadas ?? null,
          funilLeads: d.funil_leads || 0,
          funilReunioes: d.funil_reunioes || 0,
          funilPropostas: d.funil_propostas || 0,
          funilContratos: d.funil_contratos || 0,
          postsSemanais: d.posts_semanais ?? null,
          engajamentoIG: d.engajamento_ig ?? null,
          taxaAberturaEmail: d.taxa_abertura_email ?? null,
          taxaCliqueEmail: d.taxa_clique_email ?? null,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProgression = useCallback(async (from: string, to: string, kind: ProgressionKind) => {
    setProgressionLoading(true);
    try {
      const kinds: string[] = kind === 'all' ? ['athlete', 'partner'] : [kind === 'athlete' ? 'athlete' : 'partner'];

      const baselineQuery = (supabase.from('onboarding_snapshots') as any)
        .select('user_id, profile_kind, completion_status')
        .eq('snapshot_date', from);
      const currentQuery = (supabase.from('onboarding_snapshots') as any)
        .select('user_id, profile_kind, completion_status')
        .eq('snapshot_date', to);

      if (kind !== 'all') {
        baselineQuery.eq('profile_kind', kinds[0]);
        currentQuery.eq('profile_kind', kinds[0]);
      }

      const newUsersQuery = (supabase.from('users') as any)
        .select('onboarding!inner(profile_kind)', { count: 'exact', head: true })
        .in('onboarding.profile_kind', kinds)
        .gt('created_at_portal', from + 'T23:59:59')
        .lte('created_at_portal', to + 'T23:59:59');

      const [baselineRes, currentRes, newUsersRes] = await Promise.all([
        baselineQuery, currentQuery, newUsersQuery,
      ]);

      const baseline: any[] = baselineRes.data || [];
      const current: any[] = currentRes.data || [];

      if (current.length > 0) {
        const bMap = new Map<string, string>();
        baseline.forEach((s: any) => bMap.set(`${s.user_id}:${s.profile_kind}`, s.completion_status));

        let improved = 0, unchanged = 0, regressed = 0;
        current.forEach((s: any) => {
          const key = `${s.user_id}:${s.profile_kind}`;
          const prev = bMap.get(key);
          if (prev) {
            const prevOrd = STATUS_ORDER[prev] ?? 0;
            const currOrd = STATUS_ORDER[s.completion_status] ?? 0;
            if (currOrd > prevOrd) improved++;
            else if (currOrd < prevOrd) regressed++;
            else unchanged++;
          }
        });

        const newCount = (newUsersRes as any).count ?? 0;
        setDailyProgress({ newCount, improved, unchanged, regressed, hasBaseline: baseline.length > 0, hasCurrent: true });
      } else {
        setDailyProgress({ newCount: 0, improved: 0, unchanged: 0, regressed: 0, hasBaseline: false, hasCurrent: false });
      }
    } catch (error) {
      console.error('Error fetching progression:', error);
    } finally {
      setProgressionLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMain(); }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchProgression(progressionRange.from, progressionRange.to, progressionKind); }, [progressionRange.from, progressionRange.to, progressionKind]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMarketing(mktWeek); }, [mktWeek]);

  const getCount = (counts: StatusCount[], status: string) =>
    counts.find((c) => c.completion_status === status)?.count || 0;

  const isActivePreset = (days: number) =>
    progressionRange.from === daysAgoISO(days) && progressionRange.to === todayISO();

  const tierOrder: Tier[] = [
    'Atleta Âncora',
    'Atleta Comercial Forte',
    'Atleta Comercial Potencial',
    'Ainda não comercializável',
  ];

  const commercialStats = useMemo(() => {
    const tierCounts: Record<string, number> = {};
    let sum = 0, n = 0;
    for (const r of commercialRows) {
      const t = (r.tier || 'Sem tier') as string;
      tierCounts[t] = (tierCounts[t] || 0) + 1;
      const s = Number(r.total_score);
      if (!Number.isNaN(s)) { sum += s; n++; }
    }
    const avg = n === 0 ? 0 : Math.round((sum / n) * 10) / 10;
    const sortedTiers = Object.entries(tierCounts)
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => {
        const ia = tierOrder.indexOf(a.tier as Tier);
        const ib = tierOrder.indexOf(b.tier as Tier);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        return b.count - a.count;
      });
    const top = commercialRows
      .slice()
      .sort((a, b) => (Number(b.total_score) || 0) - (Number(a.total_score) || 0))
      .slice(0, 5);
    return { avg, sortedTiers, top, total: commercialRows.length };
  }, [commercialRows]);

  const tierBadge = (tier: string) => {
    if (tier === 'Atleta Âncora') return 'bg-emerald-100 text-emerald-800';
    if (tier === 'Atleta Comercial Forte') return 'bg-indigo-100 text-indigo-800';
    if (tier === 'Atleta Comercial Potencial') return 'bg-blue-100 text-blue-800';
    if (tier === 'Ainda não comercializável') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-700';
  };

  const funnelValues = {
    leads: teamOps?.funilLeads ?? 0,
    reunioes: teamOps?.funilReunioes ?? 0,
    propostas: teamOps?.funilPropostas ?? 0,
    contratos: teamOps?.funilContratos ?? 0,
  };
  const funilMax = funnelValues.leads || 1;

  const noOpsNote = !teamOps ? (
    <p className="text-xs text-gray-400 mt-3 italic">Admin ainda não preencheu os dados comerciais deste mês.</p>
  ) : null;

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Team Dashboard</h2>

      {/* ── Tab nav ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'usuarios', label: 'Usuários' },
          { key: 'marketing', label: 'Marketing' },
          { key: 'comercial', label: 'Comercial' },
        ] as { key: TeamDashTab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Aba: Usuários ───────────────────────────────────────────────── */}
      {activeTab === 'usuarios' && <>

      {/* ── Bloco 1: Visão geral ────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Atletas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-700">Atletas</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">{totalAthletes}</div>
              <div className="text-xs text-gray-500 mt-1">total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{newAthletesThisMonth}</div>
              <div className="text-xs text-gray-500 mt-1">novos este mês</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{getCount(athleteCounts, 'stalled')}</div>
              <div className="text-xs text-gray-500 mt-1">parados</div>
            </div>
          </div>
        </div>

        {/* Empresas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Handshake size={18} className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-700">Empresas</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">{totalPartners}</div>
              <div className="text-xs text-gray-500 mt-1">total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{newPartnersThisMonth}</div>
              <div className="text-xs text-gray-500 mt-1">novas este mês</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{getCount(partnerCounts, 'stalled')}</div>
              <div className="text-xs text-gray-500 mt-1">paradas</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bloco 2: Distribuição por status ────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-5">Distribuição por status</h3>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            { label: 'Atletas', counts: athleteCounts, total: totalAthletes },
            { label: 'Empresas', counts: partnerCounts, total: totalPartners },
          ].map(({ label, counts, total }) => (
            <div key={label}>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{label}</div>
              <div className="space-y-3">
                {STATUS_CRITERIA.map(({ status, label: sLabel, color }) => {
                  const n = getCount(counts, status);
                  const pct = Math.round((n / (total || 1)) * 100);
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{sLabel}</span>
                        <span className="font-semibold text-gray-800">{n} <span className="text-gray-400 font-normal text-xs">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bloco 3: Progressão ─────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-indigo-600" />
          <h3 className="text-xl font-semibold text-gray-700">Progressão</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {([
            { key: 'all', label: 'Todos' },
            { key: 'athlete', label: 'Atletas' },
            { key: 'partner', label: 'Empresas' },
          ] as { key: ProgressionKind; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setProgressionKind(key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                progressionKind === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-gray-300 mx-1">|</span>
          <span className="text-xs text-gray-500">Período:</span>
          {([{ label: 'Hoje vs Ontem', days: 1 }, { label: '7 dias', days: 7 }, { label: '30 dias', days: 30 }] as const).map(({ label, days }) => (
            <button
              key={days}
              onClick={() => setProgressionRange({ from: daysAgoISO(days), to: todayISO() })}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                isActivePreset(days) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input type="date" value={progressionRange.from} max={progressionRange.to}
              onChange={(e) => setProgressionRange((prev) => ({ ...prev, from: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-xs" />
            <span className="text-xs text-gray-400">→</span>
            <input type="date" value={progressionRange.to} min={progressionRange.from} max={todayISO()}
              onChange={(e) => setProgressionRange((prev) => ({ ...prev, to: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-xs" />
            <button onClick={() => fetchProgression(progressionRange.from, progressionRange.to, progressionKind)}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition">
              Buscar
            </button>
          </div>
        </div>

        {progressionLoading ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : !dailyProgress || !dailyProgress.hasCurrent ? (
          <p className="text-sm text-gray-500">Nenhum dado para o período selecionado. Faça a importação do CSV para registrar snapshots.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 rounded-lg bg-indigo-50 border border-indigo-100">
              <Sparkles size={20} className="text-indigo-500 mb-1" />
              <span className="text-3xl font-bold text-indigo-700">{dailyProgress.newCount}</span>
              <span className="text-xs text-indigo-600 mt-1 text-center">novos cadastros</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-green-50 border border-green-100">
              <ArrowUp size={20} className="text-green-500 mb-1" />
              <span className="text-3xl font-bold text-green-700">{dailyProgress.improved}</span>
              <span className="text-xs text-green-600 mt-1 text-center">melhoraram o status</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-red-50 border border-red-100">
              <ArrowDown size={20} className="text-red-400 mb-1" />
              <span className="text-3xl font-bold text-red-600">{dailyProgress.regressed}</span>
              <span className="text-xs text-red-500 mt-1 text-center">regrediram</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Legenda de critérios ─────────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Critérios de classificação</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STATUS_CRITERIA.map(({ status, label, color, desc }) => (
            <div key={status} className="flex items-start gap-2">
              <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
              <div>
                <div className="text-xs font-semibold text-gray-700">{label}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      </> /* fim Usuários */}

      {/* ── Aba: Marketing ──────────────────────────────────────────────── */}
      {activeTab === 'marketing' && <>

      {/* ── Navegação de semana ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMktWeek(w => addWeeks(w, -1)); setMktEditing(false); }}
            className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[180px] text-center">
            {weekLabel(mktWeek)}
          </span>
          <button
            onClick={() => { setMktWeek(w => addWeeks(w, 1)); setMktEditing(false); }}
            disabled={mktWeek >= mondayOf(new Date())}
            className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={18} />
          </button>
        </div>
        {canEditMarketing(role) && !mktEditing && (
          <button onClick={() => setMktEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
            <Pencil size={14} />
            {mktData ? 'Editar semana' : 'Adicionar dados'}
          </button>
        )}
      </div>

      {mktLoading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : mktEditing ? (
        /* ── Formulário de edição ─────────────────────────────────────── */
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-700">Dados da semana — {weekLabel(mktWeek)}</h3>
          </div>

          {/* Instagram Orgânico */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Instagram — Orgânico</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {([
                { key: 'ig_seguidores',    label: 'Seguidores',     placeholder: '12500' },
                { key: 'ig_crescimento',   label: 'Crescimento',    placeholder: '+120' },
                { key: 'ig_posts',         label: 'Posts',          placeholder: '5' },
                { key: 'ig_visualizacoes', label: 'Visualizações',  placeholder: '3200' },
                { key: 'ig_interacoes',   label: 'Interações',      placeholder: '850' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input type="number" placeholder={placeholder}
                    value={mktForm[key] ?? ''}
                    onChange={e => setMktForm(f => ({ ...f, [key]: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Instagram Pago */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Instagram — Pago</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { key: 'ig_pago_investimento', label: 'Investimento (R$)', placeholder: '500' },
                { key: 'ig_pago_impressoes',   label: 'Impressões',        placeholder: '15000' },
                { key: 'ig_pago_cliques',      label: 'Cliques',           placeholder: '320' },
                { key: 'ig_pago_leads',        label: 'Leads gerados',     placeholder: '18' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input type="number" placeholder={placeholder}
                    value={mktForm[key] ?? ''}
                    onChange={e => setMktForm(f => ({ ...f, [key]: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">LinkedIn — Orgânico</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {([
                { key: 'li_seguidores',  label: 'Seguidores',      placeholder: '3400' },
                { key: 'li_crescimento', label: 'Crescimento',     placeholder: '+45' },
                { key: 'li_posts',       label: 'Posts',           placeholder: '3' },
                { key: 'li_impressoes',  label: 'Impressões',  placeholder: '8000' },
                { key: 'li_interacoes', label: 'Interações',  placeholder: '220' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input type="number" placeholder={placeholder}
                    value={mktForm[key] ?? ''}
                    onChange={e => setMktForm(f => ({ ...f, [key]: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Email — ActiveCampaign</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {([
                { key: 'email_envios',           label: 'Envios',          placeholder: '1200' },
                { key: 'email_abertura',         label: 'Abertura (%)',    placeholder: '42' },
                { key: 'email_clique',           label: 'Clique (%)',      placeholder: '8.5' },
                { key: 'email_descadastros',     label: 'Descadastros (%)', placeholder: '0.3' },
                { key: 'email_novos_assinantes', label: 'Novos assinantes', placeholder: '25' },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input type="number" placeholder={placeholder}
                    value={mktForm[key] ?? ''}
                    onChange={e => setMktForm(f => ({ ...f, [key]: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                </div>
              ))}
            </div>
          </div>

          {mktError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {mktError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={saveMarketing} disabled={mktSaving}
              className="px-5 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
              {mktSaving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => { setMktEditing(false); if (mktData) { const { week_start: _w, updated_by: _u, updated_at: _a, ...rest } = mktData as any; setMktForm(rest); } else setMktForm(EMPTY_MKT_FORM); }}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition">
              Cancelar
            </button>
          </div>
        </div>
      ) : !mktData ? (
        /* ── Sem dados ──────────────────────────────────────────────────── */
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <p className="text-gray-500 text-sm">Nenhum dado para esta semana.</p>
          {canEditMarketing(role) && (
            <button onClick={() => setMktEditing(true)}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition">
              Adicionar dados
            </button>
          )}
        </div>
      ) : (
        /* ── Visualização ───────────────────────────────────────────────── */
        (() => {
          // Delta helper
          const delta = (curr: number | null, prev: number | null) => {
            if (curr == null || prev == null || prev === 0) return null;
            const d = curr - prev;
            const pct = ((d / Math.abs(prev)) * 100).toFixed(1);
            return { d, pct, up: d >= 0 };
          };
          const deltaAbs = (curr: number | null, prev: number | null) => {
            if (curr == null || prev == null) return null;
            const d = curr - prev;
            return { d, up: d >= 0 };
          };

          // Chart data (last 8 weeks)
          const chartData = mktHistory.map(w => ({
            week: weekLabel(w.week_start).split('–')[0].trim(),
            ig_seg: w.ig_seguidores,
            ig_int: w.ig_interacoes,
            ig_leads: w.ig_pago_leads,
            li_seg: w.li_seguidores,
            li_int: w.li_interacoes,
            email_ab: w.email_abertura,
          }));

          const MetricCard = ({ label, val, fmt, prevVal, isPercent = false }: {
            label: string; val: number | null; fmt: (v: number) => string;
            prevVal?: number | null; isPercent?: boolean;
          }) => {
            const d = isPercent ? deltaAbs(val, prevVal ?? null) : delta(val, prevVal ?? null);
            return (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-lg font-bold text-gray-800">{val != null ? fmt(val) : '—'}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                {d != null && (
                  <div className={`flex items-center gap-0.5 text-xs mt-1 font-medium ${d.up ? 'text-green-600' : 'text-red-500'}`}>
                    {d.up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                    {isPercent
                      ? `${d.d >= 0 ? '+' : ''}${(d as any).d.toFixed(1)}pp`
                      : `${(d as any).d >= 0 ? '+' : ''}${(d as any).pct}%`}
                  </div>
                )}
              </div>
            );
          };

          const MiniChart = ({ dataKey, color, label, suffix = '' }: {
            dataKey: string; color: string; label: string; suffix?: string;
          }) => (
            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</div>
              {chartData.length < 2 ? (
                <p className="text-xs text-gray-400 italic">Dados insuficientes para tendência (mín. 2 semanas)</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: any) => [`${v}${suffix}`, label]}
                      labelStyle={{ fontSize: 11 }}
                      contentStyle={{ fontSize: 11 }}
                    />
                    <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          );

          const cpl = mktData.ig_pago_investimento != null && mktData.ig_pago_leads
            ? (mktData.ig_pago_investimento / mktData.ig_pago_leads).toFixed(2) : null;
          const prevCpl = mktPrev?.ig_pago_investimento != null && mktPrev?.ig_pago_leads
            ? mktPrev.ig_pago_investimento / mktPrev.ig_pago_leads : null;

          return (
            <div className="space-y-4">
              {/* Métricas da semana */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Instagram orgânico */}
                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Instagram — Orgânico</div>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Seguidores"    val={mktData.ig_seguidores}    fmt={v => v.toLocaleString('pt-BR')}  prevVal={mktPrev?.ig_seguidores} />
                    <MetricCard label="Crescimento"   val={mktData.ig_crescimento}   fmt={v => v >= 0 ? `+${v}` : String(v)} prevVal={mktPrev?.ig_crescimento} />
                    <MetricCard label="Posts"         val={mktData.ig_posts}         fmt={v => String(v)}                   prevVal={mktPrev?.ig_posts} />
                    <MetricCard label="Visualizações" val={mktData.ig_visualizacoes} fmt={v => v.toLocaleString('pt-BR')} prevVal={mktPrev?.ig_visualizacoes} />
                    <MetricCard label="Interações"    val={mktData.ig_interacoes}    fmt={v => v.toLocaleString('pt-BR')} prevVal={mktPrev?.ig_interacoes} />
                  </div>
                </div>

                {/* Instagram pago */}
                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Instagram — Pago</div>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Investimento"  val={mktData.ig_pago_investimento} fmt={v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} prevVal={mktPrev?.ig_pago_investimento} />
                    <MetricCard label="Impressões"    val={mktData.ig_pago_impressoes}   fmt={v => v.toLocaleString('pt-BR')} prevVal={mktPrev?.ig_pago_impressoes} />
                    <MetricCard label="Cliques"       val={mktData.ig_pago_cliques}      fmt={v => v.toLocaleString('pt-BR')} prevVal={mktPrev?.ig_pago_cliques} />
                    <MetricCard label="Leads gerados" val={mktData.ig_pago_leads}        fmt={v => String(v)}                 prevVal={mktPrev?.ig_pago_leads} />
                    <MetricCard label="CPL"           val={cpl != null ? Number(cpl) : null} fmt={v => `R$ ${v.toFixed(2)}`} prevVal={prevCpl} />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* LinkedIn */}
                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">LinkedIn — Orgânico</div>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Seguidores"  val={mktData.li_seguidores}  fmt={v => v.toLocaleString('pt-BR')}  prevVal={mktPrev?.li_seguidores} />
                    <MetricCard label="Crescimento" val={mktData.li_crescimento} fmt={v => v >= 0 ? `+${v}` : String(v)} prevVal={mktPrev?.li_crescimento} />
                    <MetricCard label="Posts"       val={mktData.li_posts}       fmt={v => String(v)}                   prevVal={mktPrev?.li_posts} />
                    <MetricCard label="Impressões"  val={mktData.li_impressoes}  fmt={v => v.toLocaleString('pt-BR')}  prevVal={mktPrev?.li_impressoes} />
                    <MetricCard label="Interações"  val={mktData.li_interacoes}  fmt={v => v.toLocaleString('pt-BR')} prevVal={mktPrev?.li_interacoes} />
                  </div>
                </div>

                {/* Email */}
                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Email — ActiveCampaign</div>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Envios"           val={mktData.email_envios}           fmt={v => v.toLocaleString('pt-BR')} prevVal={mktPrev?.email_envios} />
                    <MetricCard label="Abertura"         val={mktData.email_abertura}         fmt={v => `${v}%`}                   prevVal={mktPrev?.email_abertura} isPercent />
                    <MetricCard label="Clique"           val={mktData.email_clique}           fmt={v => `${v}%`}                   prevVal={mktPrev?.email_clique} isPercent />
                    <MetricCard label="Descadastros"     val={mktData.email_descadastros}     fmt={v => `${v}%`}                   prevVal={mktPrev?.email_descadastros} isPercent />
                    <MetricCard label="Novos assinantes" val={mktData.email_novos_assinantes} fmt={v => String(v)}                 prevVal={mktPrev?.email_novos_assinantes} />
                  </div>
                </div>
              </div>

              {/* Gráficos de tendência */}
              <div className="pt-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tendência — últimas 8 semanas</div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MiniChart dataKey="ig_seg"   color="#6366f1" label="IG Seguidores" />
                  <MiniChart dataKey="ig_int"   color="#f59e0b" label="IG Interações" />
                  <MiniChart dataKey="ig_leads" color="#10b981" label="IG Leads (pago)" />
                  <MiniChart dataKey="li_seg"   color="#0ea5e9" label="LI Seguidores" />
                  <MiniChart dataKey="li_int"   color="#8b5cf6" label="LI Interações" />
                  <MiniChart dataKey="email_ab" color="#ef4444" label="Email Abertura" suffix="%" />
                </div>
              </div>
            </div>
          );
        })()
      )}

      </> /* fim Marketing */}

      {/* ── Aba: Comercial ──────────────────────────────────────────────── */}
      {activeTab === 'comercial' && <>

      {/* ── Funil Comercial ────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Funil Comercial</h3>
        <div className="space-y-3">
          {[
            { label: 'Leads', value: funnelValues.leads },
            { label: 'Reuniões', value: funnelValues.reunioes },
            { label: 'Propostas', value: funnelValues.propostas },
            { label: 'Contratos', value: funnelValues.contratos },
          ].map(({ label, value }) => {
            const pct = funilMax > 0 ? Math.round((value / funilMax) * 100) : 0;
            return (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {noOpsNote}
      </div>

      {/* ── Score Comercial ────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Score Comercial (Atletas)</h3>
            <div className="flex items-center gap-2 text-gray-600">
              <Award size={18} />
              <span className="text-sm">média: <span className="font-semibold">{commercialStats.avg}</span></span>
            </div>
          </div>
          {commercialStats.total === 0 ? (
            <p className="text-gray-500">Sem dados ainda. Rode o import com a geração de scores.</p>
          ) : (
            <div className="space-y-3">
              {commercialStats.sortedTiers.map(({ tier, count }) => (
                <div key={tier} className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 border-gray-200">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${tierBadge(tier)}`}>{tier}</span>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Top atletas (Score)</h3>
          {commercialStats.total === 0 ? (
            <p className="text-gray-500">Sem dados ainda.</p>
          ) : (
            <div className="space-y-3">
              {commercialStats.top.map((r) => (
                <div key={r.athlete_id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{r.users?.full_name || 'Sem nome'}</div>
                      <div className="text-sm text-gray-500 truncate">{r.users?.email || ''}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${tierBadge(String(r.tier || 'Sem tier'))}`}>
                        {r.tier || 'Sem tier'}
                      </span>
                      <span className="text-lg font-bold text-gray-800">{Number(r.total_score) || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      </> /* fim Comercial */}
    </div>
  );
}
