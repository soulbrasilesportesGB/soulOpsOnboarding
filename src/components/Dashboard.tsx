// src/components/Dashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { Users, TrendingUp, Clock, CheckCircle, Award, Handshake } from 'lucide-react';
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

export function Dashboard() {
  const [athleteCounts, setAthleteCounts] = useState<StatusCount[]>([]);
  const [partnerCounts, setPartnerCounts] = useState<StatusCount[]>([]);
  const [totalAthletes, setTotalAthletes] = useState<number>(0);
  const [totalPartners, setTotalPartners] = useState<number>(0);
  const [commercialRows, setCommercialRows] = useState<CommercialRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const countByStatus = (data: { completion_status: string }[] | null) => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.forEach((item) => {
      const s = item.completion_status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      completion_status: status,
      count,
    }));
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [athleteRes, partnerRes, commercialRes] = await Promise.all([
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'athlete'),
        supabase.from('onboarding').select('completion_status', { count: 'exact' }).eq('profile_kind', 'partner'),
        supabase
          .from('athlete_commercial_scores')
          .select(
            `
            athlete_id,
            user_id,
            total_score,
            tier,
            users:users ( full_name, email )
          `
          )
          .order('total_score', { ascending: false }),
      ]);
      
      setAthleteCounts(countByStatus(athleteRes.data || null));
      setPartnerCounts(countByStatus(partnerRes.data || null));
      setTotalAthletes((athleteRes as any).count ?? (athleteRes.data?.length ?? 0));
      setTotalPartners((partnerRes as any).count ?? (partnerRes.data?.length ?? 0));
      setCommercialRows((commercialRes.data as any) || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="text-green-600" size={24} />;
      case 'acceptable':
        return <CheckCircle className="text-indigo-600" size={24} />;
      case 'almost':
        return <TrendingUp className="text-blue-600" size={24} />;
      case 'incomplete':
        return <Clock className="text-yellow-600" size={24} />;
      case 'stalled':
        return <Users className="text-red-600" size={24} />;
      default:
        return <Users className="text-gray-600" size={24} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-50 border-green-200';
      case 'acceptable':
        return 'bg-indigo-50 border-indigo-200';
      case 'almost':
        return 'bg-blue-50 border-blue-200';
      case 'incomplete':
        return 'bg-yellow-50 border-yellow-200';
      case 'stalled':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

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
            className={`flex items-center justify-between p-4 rounded-lg border ${getStatusColor(completion_status)}`}
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

  const getCount = (counts: StatusCount[], status: string) =>
    counts.find((c) => c.completion_status === status)?.count || 0;

  const abandonedTotal = getCount(athleteCounts, 'stalled') + getCount(partnerCounts, 'stalled');

  // --------- Commercial score derived data ----------
  const tierOrder: Tier[] = [
    'Atleta Âncora',
    'Atleta Comercial Forte',
    'Atleta Comercial Potencial',
    'Ainda não comercializável',
  ];

  const commercialStats = useMemo(() => {
    const tierCounts: Record<string, number> = {};
    let sum = 0;
    let n = 0;

    for (const r of commercialRows) {
      const t = (r.tier || 'Sem tier') as string;
      tierCounts[t] = (tierCounts[t] || 0) + 1;

      const s = Number(r.total_score);
      if (!Number.isNaN(s)) {
        sum += s;
        n += 1;
      }
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

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Onboarding Dashboard</h2>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between border border-gray-200">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Athletes</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{totalAthletes}</div>
            <div className="text-xs text-gray-400 mt-1">All athletes in onboarding table</div>
          </div>
          <div className="p-3 rounded-full bg-indigo-50">
            <Users size={28} className="text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between border border-gray-200">
          <div>
            <div className="text-sm font-medium text-gray-500">Total Partners</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{totalPartners}</div>
            <div className="text-xs text-gray-400 mt-1">All partners in onboarding table</div>
          </div>
          <div className="p-3 rounded-full bg-emerald-50">
            <Handshake size={28} className="text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Abandoned (Stalled total)</h3>
          <div className={`flex items-center justify-between p-4 rounded-lg border ${getStatusColor('stalled')}`}>
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

      {/* Score Comercial */}
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
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${tierBadge(tier)}`}>{tier}</span>
                  </div>
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
                      <div className="font-semibold text-gray-800 truncate">
                        {r.users?.full_name || 'Sem nome'}
                      </div>
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

      {/* Critérios */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Critérios de Classificação</h3>

        <div className="text-sm text-gray-700 space-y-3">
          <div>
            <div className="font-medium">Must-have (obrigatório)</div>
            <div className="text-gray-600">
              • Foto<br />
              • Bio<br />
              • Modalidade<br />
              • Nível<br />
              • Estado e Cidade<br />
              • Telefone<br />
              • Instagram<br />
              • Achievements<br />
              • Activations<br />
              • Causes<br />
              • Education<br />
              • Media<br />
              • Results
            </div>
          </div>

          <div>
            <div className="font-medium">Nice-to-have (complementar)</div>
            <div className="text-gray-600">
              • Ranking<br />
              • Partners<br />
              • Social Actions<br />
              • YouTube<br />
              • TikTok<br />
              • LinkedIn
            </div>
          </div>

          <hr />

          <div>
            <div>
              <span className="font-medium">Stalled:</span> criou login e não iniciou perfil.
            </div>
            <div>
              <span className="font-medium">Incomplete:</span> must-have abaixo de 80%.
            </div>
            <div>
              <span className="font-medium">Almost:</span> must-have entre 80% e 99%.
            </div>
            <div>
              <span className="font-medium">Acceptable:</span> 100% do must-have, faltam itens complementares.
            </div>
            <div>
              <span className="font-medium">Complete:</span> 100% do must-have + 100% do nice-to-have.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}