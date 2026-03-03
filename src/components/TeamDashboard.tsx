// src/components/TeamDashboard.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Award, Handshake, TrendingUp, ArrowUp, ArrowDown, Minus, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getStatusIcon, STATUS_COLORS } from '../lib/utils';

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
  atletasNovos: number | null;
  empresasNovas: number | null;
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

export function TeamDashboard() {
  const [athleteCounts, setAthleteCounts] = useState<StatusCount[]>([]);
  const [partnerCounts, setPartnerCounts] = useState<StatusCount[]>([]);
  const [totalAthletes, setTotalAthletes] = useState<number>(0);
  const [totalPartners, setTotalPartners] = useState<number>(0);
  const [commercialRows, setCommercialRows] = useState<CommercialRow[]>([]);
  const [teamOps, setTeamOps] = useState<TeamOpsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progressionRange, setProgressionRange] = useState({
    from: daysAgoISO(1),
    to: todayISO(),
  });

  const fetchMain = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = todayISO().slice(0, 7);

      const [athleteRes, partnerRes, commercialRes, opsRes] = await Promise.all([
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'athlete'),
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'partner'),
        supabase
          .from('athlete_commercial_scores')
          .select('athlete_id, user_id, total_score, tier, users:users ( full_name, email )')
          .order('total_score', { ascending: false }),
        (supabase.from('ops_metrics') as any)
          .select('atletas_novos, empresas_novas, oportunidades_criadas, funil_leads, funil_reunioes, funil_propostas, funil_contratos, posts_semanais, engajamento_ig, taxa_abertura_email, taxa_clique_email')
          .eq('month', currentMonth)
          .maybeSingle(),
      ]);

      setAthleteCounts(countByStatus(athleteRes.data || null));
      setPartnerCounts(countByStatus(partnerRes.data || null));
      setTotalAthletes((athleteRes as any).count ?? (athleteRes.data?.length ?? 0));
      setTotalPartners((partnerRes as any).count ?? (partnerRes.data?.length ?? 0));
      setCommercialRows((commercialRes.data as any) || []);

      if (opsRes.data) {
        const d = opsRes.data;
        setTeamOps({
          atletasNovos: d.atletas_novos ?? null,
          empresasNovas: d.empresas_novas ?? null,
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

  const fetchProgression = useCallback(async (from: string, to: string) => {
    setProgressionLoading(true);
    try {
      const [baselineRes, currentRes] = await Promise.all([
        (supabase.from('onboarding_snapshots') as any)
          .select('user_id, profile_kind, completion_status')
          .eq('snapshot_date', from),
        (supabase.from('onboarding_snapshots') as any)
          .select('user_id, profile_kind, completion_status')
          .eq('snapshot_date', to),
      ]);

      const baseline: any[] = baselineRes.data || [];
      const current: any[] = currentRes.data || [];

      if (current.length > 0) {
        const bMap = new Map<string, string>();
        baseline.forEach((s: any) => bMap.set(`${s.user_id}:${s.profile_kind}`, s.completion_status));

        let newCount = 0, improved = 0, unchanged = 0, regressed = 0;
        current.forEach((s: any) => {
          const key = `${s.user_id}:${s.profile_kind}`;
          const prev = bMap.get(key);
          if (!prev) {
            newCount++;
          } else {
            const prevOrd = STATUS_ORDER[prev] ?? 0;
            const currOrd = STATUS_ORDER[s.completion_status] ?? 0;
            if (currOrd > prevOrd) improved++;
            else if (currOrd < prevOrd) regressed++;
            else unchanged++;
          }
        });

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
  useEffect(() => { fetchProgression(progressionRange.from, progressionRange.to); }, [progressionRange.from, progressionRange.to]);

  const getCount = (counts: StatusCount[], status: string) =>
    counts.find((c) => c.completion_status === status)?.count || 0;

  const abandonedTotal = getCount(athleteCounts, 'stalled') + getCount(partnerCounts, 'stalled');

  const isActivePreset = (days: number) =>
    progressionRange.from === daysAgoISO(days) && progressionRange.to === todayISO();

  const renderStatusCards = (counts: StatusCount[]) => {
    if (counts.length === 0) return <p className="text-gray-500">No data available</p>;
    const order = ['stalled', 'incomplete', 'almost', 'acceptable', 'complete'];
    const sorted = [...counts].sort(
      (a, b) => order.indexOf(a.completion_status) - order.indexOf(b.completion_status)
    );
    return (
      <div className="space-y-3">
        {sorted.map(({ completion_status, count }) => (
          <div
            key={completion_status}
            className={`flex items-center justify-between p-4 rounded-lg border ${STATUS_COLORS[completion_status] || STATUS_COLORS['incomplete']}`}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(completion_status)}
              <span className="font-medium capitalize">{completion_status}</span>
            </div>
            <span className="text-2xl font-bold">{count}</span>
          </div>
        ))}
      </div>
    );
  };

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
    <p className="text-xs text-gray-400 mt-3 italic">Admin ainda não preencheu os dados deste mês.</p>
  ) : null;

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Team Dashboard</h2>

      {/* ── Progressão ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-indigo-600" />
          <h3 className="text-xl font-semibold text-gray-700">Progressão</h3>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-gray-500 mr-1">Período:</span>
          {([{ label: 'Hoje vs Ontem', days: 1 }, { label: '7 dias', days: 7 }, { label: '30 dias', days: 30 }] as const).map(({ label, days }) => (
            <button
              key={days}
              onClick={() => setProgressionRange({ from: daysAgoISO(days), to: todayISO() })}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                isActivePreset(days)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <input
              type="date"
              value={progressionRange.from}
              max={progressionRange.to}
              onChange={(e) => setProgressionRange((prev) => ({ ...prev, from: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            />
            <span className="text-xs text-gray-400">→</span>
            <input
              type="date"
              value={progressionRange.to}
              min={progressionRange.from}
              max={todayISO()}
              onChange={(e) => setProgressionRange((prev) => ({ ...prev, to: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            />
            <button
              onClick={() => fetchProgression(progressionRange.from, progressionRange.to)}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition"
            >
              Buscar
            </button>
          </div>
        </div>

        {progressionLoading ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : !dailyProgress || !dailyProgress.hasCurrent ? (
          <p className="text-sm text-gray-500">
            Nenhum dado para o período selecionado. Faça a importação do CSV para registrar snapshots.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-4 rounded-lg bg-indigo-50 border border-indigo-100">
              <Sparkles size={20} className="text-indigo-500 mb-1" />
              <span className="text-3xl font-bold text-indigo-700">{dailyProgress.newCount}</span>
              <span className="text-xs text-indigo-600 mt-1 text-center">
                {dailyProgress.hasBaseline ? 'novos (não estavam antes)' : 'registros no período'}
              </span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-green-50 border border-green-100">
              <ArrowUp size={20} className="text-green-500 mb-1" />
              <span className="text-3xl font-bold text-green-700">{dailyProgress.improved}</span>
              <span className="text-xs text-green-600 mt-1 text-center">melhoraram o status</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-gray-50 border border-gray-200">
              <Minus size={20} className="text-gray-400 mb-1" />
              <span className="text-3xl font-bold text-gray-600">{dailyProgress.unchanged}</span>
              <span className="text-xs text-gray-500 mt-1 text-center">sem mudança</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-red-50 border border-red-100">
              <ArrowDown size={20} className="text-red-400 mb-1" />
              <span className="text-3xl font-bold text-red-600">{dailyProgress.regressed}</span>
              <span className="text-xs text-red-500 mt-1 text-center">regrediram</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Atletas & Empresas ─────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-700">Atletas</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-gray-800">{totalAthletes}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-center">
              <div className="text-2xl font-bold text-indigo-700">{teamOps?.atletasNovos ?? '—'}</div>
              <div className="text-xs text-indigo-600 mt-1">Novos este mês</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-gray-800">{getCount(athleteCounts, 'acceptable')}</div>
              <div className="text-xs text-gray-500 mt-1">Acceptable</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center">
              <div className="text-2xl font-bold text-green-700">{getCount(athleteCounts, 'complete')}</div>
              <div className="text-xs text-green-600 mt-1">Complete</div>
            </div>
          </div>
          {noOpsNote}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Handshake size={18} className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-700">Empresas</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-gray-800">{totalPartners}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
              <div className="text-2xl font-bold text-emerald-700">{teamOps?.empresasNovas ?? '—'}</div>
              <div className="text-xs text-emerald-600 mt-1">Novas este mês</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-gray-800">{getCount(partnerCounts, 'acceptable')}</div>
              <div className="text-xs text-gray-500 mt-1">Acceptable</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-center">
              <div className="text-2xl font-bold text-amber-700">{teamOps?.oportunidadesCriadas ?? '—'}</div>
              <div className="text-xs text-amber-600 mt-1">Oportunidades</div>
            </div>
          </div>
          {noOpsNote}
        </div>
      </div>

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

      {/* ── Onboarding por Status ──────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Stalled (total)</h3>
          <div className={`flex items-center justify-between p-4 rounded-lg border ${STATUS_COLORS['stalled']}`}>
            <div className="flex items-center gap-3">
              {getStatusIcon('stalled')}
              <span className="font-medium">Stalled</span>
            </div>
            <span className="text-2xl font-bold">{abandonedTotal}</span>
          </div>
          <p className="text-sm text-gray-500 mt-3">Sum of stalled in Athletes + Partners.</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Athletes</h3>
          {renderStatusCards(athleteCounts)}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Partners</h3>
          {renderStatusCards(partnerCounts)}
        </div>
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

      {/* ── Critérios ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Critérios de Classificação</h3>
        <div className="text-sm text-gray-700 space-y-3">
          <div>
            <div className="font-medium">Must-have (obrigatório)</div>
            <div className="text-gray-600">
              • Foto • Bio • Modalidade • Nível • Estado e Cidade • Telefone • Instagram
              • Achievements • Activations • Causes • Education • Media • Results
            </div>
          </div>
          <div>
            <div className="font-medium">Nice-to-have (complementar)</div>
            <div className="text-gray-600">
              • Ranking • Partners • Social Actions • YouTube • TikTok • LinkedIn
            </div>
          </div>
          <hr />
          <div>
            <div><span className="font-medium">Stalled:</span> criou login e não iniciou perfil.</div>
            <div><span className="font-medium">Incomplete:</span> must-have abaixo de 80%.</div>
            <div><span className="font-medium">Almost:</span> must-have entre 80% e 99%.</div>
            <div><span className="font-medium">Acceptable:</span> 100% do must-have, faltam itens complementares.</div>
            <div><span className="font-medium">Complete:</span> 100% do must-have + 100% do nice-to-have.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
