// src/components/TeamDashboard.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Award, Handshake, TrendingUp, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { STATUS_CRITERIA } from '../lib/utils';
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
  const [progressionKind, setProgressionKind] = useState<ProgressionKind>('all');
  const [progressionRange, setProgressionRange] = useState({
    from: daysAgoISO(1),
    to: todayISO(),
  });

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

      {/* ── Social & Email ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">Social & Email</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-800">{teamOps?.postsSemanais ?? '—'}</div>
            <div className="text-xs text-gray-500 mt-1">posts/semana</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-800">
              {teamOps?.engajamentoIG != null ? `${teamOps.engajamentoIG}%` : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">engaj. Instagram</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-800">
              {teamOps?.taxaAberturaEmail != null ? `${teamOps.taxaAberturaEmail}%` : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">abertura email</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-800">
              {teamOps?.taxaCliqueEmail != null ? `${teamOps.taxaCliqueEmail}%` : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">clique email</div>
          </div>
        </div>
        {noOpsNote}
      </div>

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
