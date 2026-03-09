// src/components/UserList.tsx
import { useEffect, useRef, useState } from 'react';
import { Search, User as UserIcon, Award, Download, ChevronDown, X, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normalizeMissingFields, STATUS_BADGE_COLORS, STATUS_PT, PROFILE_KIND_PT } from '../lib/utils';
import { STATES_LIST } from '../constants/brazilStates';
import type { Onboarding, User as UserType } from '../types/database';

interface UserWithOnboarding extends Onboarding {
  users: (UserType & { role?: string | null } & {
    athlete_commercial_scores?: Array<{
      total_score: number | null;
      tier: string | null;
      updated_at?: string | null;
    }> | null;
    outreach?: Array<{ id: string; next_followup_at: string | null }> | null;
  }) | null;
}

export interface UserListFilters {
  profileKindFilter: string;
  statusFilter: string;
  searchTerm: string;
  missingFieldFilter: string[];
  createdFrom: string;
  createdTo: string;
  nextContactFrom: string;
  nextContactTo: string;
  estadoFilter: string;
  cidadeFilter: string;
}

interface UserListProps {
  onSelectUser: (userId: string) => void;
  filters: UserListFilters;
  onFiltersChange: (filters: UserListFilters) => void;
}

const MUST_HAVE_FIELDS = [
  'foto', 'bio', 'modalidade', 'nivel', 'estado', 'cidade', 'telefone',
  'instagram', 'achievements', 'activations', 'causes', 'education', 'media', 'results',
];

const NICE_TO_HAVE_FIELDS = [
  'ranking', 'partners', 'social_actions', 'youtube', 'tiktok', 'linkedin', 'talks_mentorship',
];

export function UserList({ onSelectUser, filters, onFiltersChange }: UserListProps) {
  const [users, setUsers] = useState<UserWithOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const fieldsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fieldsRef.current && !fieldsRef.current.contains(e.target as Node)) {
        setFieldsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('onboarding')
        .select(`
          *,
          users (
            *,
            athlete_commercial_scores ( total_score, tier, updated_at ),
            outreach ( id, next_followup_at )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const PROFILE_KIND_PRIORITY: Record<string, number> = { athlete: 2, partner: 1, account: 0 };
      const deduped = Object.values(
        ((data as unknown as UserWithOnboarding[]) || []).reduce<Record<string, UserWithOnboarding>>(
          (acc, row) => {
            const existing = acc[row.user_id];
            if (!existing) { acc[row.user_id] = row; return acc; }
            const priorityNew = PROFILE_KIND_PRIORITY[row.profile_kind] ?? -1;
            const priorityOld = PROFILE_KIND_PRIORITY[existing.profile_kind] ?? -1;
            if (
              priorityNew > priorityOld ||
              (priorityNew === priorityOld && (row.completion_score ?? 0) > (existing.completion_score ?? 0))
            ) {
              acc[row.user_id] = row;
            }
            return acc;
          },
          {}
        )
      );
      setUsers(deduped);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const setFilter = (partial: Partial<UserListFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const toggleMissingField = (field: string) => {
    const current = filters.missingFieldFilter;
    const next = current.includes(field)
      ? current.filter(f => f !== field)
      : [...current, field];
    setFilter({ missingFieldFilter: next });
  };

  const filteredUsers = users.filter((user) => {
    // Tipo
    if (filters.profileKindFilter !== 'all' && user.profile_kind !== filters.profileKindFilter) return false;
    // Status
    if (filters.statusFilter !== 'all' && user.completion_status !== filters.statusFilter) return false;
    // Busca
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const email = (user.users?.email || '').toLowerCase();
      const name = (user.users?.full_name || '').toLowerCase();
      if (!email.includes(term) && !name.includes(term)) return false;
    }
    // Campos faltando (AND — todos os selecionados devem estar faltando)
    if (filters.missingFieldFilter.length > 0) {
      const missing = new Set(
        normalizeMissingFields(user.missing_fields).map(f => f.replace(/^must:|^nice:/, ''))
      );
      if (!filters.missingFieldFilter.every(f => missing.has(f))) return false;
    }
    // Data de criação
    if (filters.createdFrom || filters.createdTo) {
      const created = user.users?.created_at_portal;
      if (!created) return false;
      const d = new Date(created);
      if (filters.createdFrom && d < new Date(filters.createdFrom)) return false;
      if (filters.createdTo && d > new Date(filters.createdTo + 'T23:59:59')) return false;
    }
    // Próximo contato
    if (filters.nextContactFrom || filters.nextContactTo) {
      const outreachList = user.users?.outreach || [];
      const upcoming = outreachList
        .map(o => o.next_followup_at)
        .filter(Boolean) as string[];
      if (upcoming.length === 0) return false;
      const inRange = upcoming.some(dt => {
        const d = new Date(dt);
        if (filters.nextContactFrom && d < new Date(filters.nextContactFrom)) return false;
        if (filters.nextContactTo && d > new Date(filters.nextContactTo + 'T23:59:59')) return false;
        return true;
      });
      if (!inRange) return false;
    }
    // Estado
    if (filters.estadoFilter && (user as any).estado_sigla !== filters.estadoFilter) return false;
    // Cidade
    if (filters.cidadeFilter) {
      const cidade = ((user as any).cidade_nome || '').toLowerCase();
      if (!cidade.includes(filters.cidadeFilter.toLowerCase())) return false;
    }
    return true;
  });

  const getProfileKindBadge = (kind: string) => {
    switch (kind) {
      case 'athlete': return 'bg-purple-100 text-purple-800';
      case 'partner': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const labelProfileKind = (kind: string) => PROFILE_KIND_PT[kind] || kind;

  const getCommercial = (u: UserWithOnboarding) => {
    const arr = u.users?.athlete_commercial_scores || [];
    const row = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    return { score: row?.total_score ?? null, tier: row?.tier ?? null };
  };

  const tierBadge = (tier: string) => {
    if (tier === 'Atleta Âncora') return 'bg-emerald-100 text-emerald-800';
    if (tier === 'Atleta Comercial Forte') return 'bg-indigo-100 text-indigo-800';
    if (tier === 'Atleta Comercial Potencial') return 'bg-blue-100 text-blue-800';
    if (tier === 'Ainda não comercializável') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-700';
  };

  // Próximo follow-up mais recente do usuário (para exibir no card)
  const nextFollowup = (u: UserWithOnboarding) => {
    const dates = (u.users?.outreach || [])
      .map(o => o.next_followup_at)
      .filter(Boolean) as string[];
    if (dates.length === 0) return null;
    const sorted = dates.sort();
    return sorted[sorted.length - 1];
  };

  const exportToCSV = () => {
    const headers = [
      'Nome', 'Email', 'Tipo', 'Status', 'Preenchimento (%)', 'Score Comercial', 'Tier', 'Cadastro',
      '', '--- OBRIGATÓRIOS ---', ...MUST_HAVE_FIELDS,
      '', '--- COMPLEMENTARES ---', ...NICE_TO_HAVE_FIELDS,
    ];
    const data = filteredUsers.map((user) => {
      const { score, tier } = user.profile_kind === 'athlete' ? getCommercial(user) : { score: null, tier: null };
      const missing = normalizeMissingFields(user.missing_fields);
      const missingSet = new Set(missing.map(f => f.replace(/^must:|^nice:/, '')));
      return [
        user.users?.full_name || '', user.users?.email || '',
        PROFILE_KIND_PT[user.profile_kind] || user.profile_kind,
        STATUS_PT[user.completion_status] || user.completion_status,
        user.completion_score || '', score ?? '', tier ?? '',
        user.users?.created_at_portal ? new Date(user.users.created_at_portal).toLocaleDateString('pt-BR') : '',
        '', '',
        ...MUST_HAVE_FIELDS.map(f => missingSet.has(f) ? 'Faltando' : 'OK'),
        '', '',
        ...NICE_TO_HAVE_FIELDS.map(f => missingSet.has(f) ? 'Faltando' : 'OK'),
      ];
    });
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        row.map(cell => {
          const s = String(cell ?? '');
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `usuarios-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters =
    filters.profileKindFilter !== 'all' ||
    filters.statusFilter !== 'all' ||
    filters.searchTerm ||
    filters.missingFieldFilter.length > 0 ||
    filters.createdFrom || filters.createdTo ||
    filters.nextContactFrom || filters.nextContactTo ||
    filters.estadoFilter || filters.cidadeFilter;

  const clearAll = () => onFiltersChange({
    profileKindFilter: 'all', statusFilter: 'all', searchTerm: '',
    missingFieldFilter: [], createdFrom: '', createdTo: '',
    nextContactFrom: '', nextContactTo: '',
    estadoFilter: '', cidadeFilter: '',
  });

  if (loading) return <div className="text-center py-8">Carregando...</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Lista de Usuários</h2>
          <span className="text-sm text-gray-500">{filteredUsers.length} de {users.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button onClick={clearAll}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition">
              <X size={14} /> Limpar filtros
            </button>
          )}
          <button onClick={exportToCSV} disabled={filteredUsers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
            <Download size={18} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Buscar por nome ou email..."
            value={filters.searchTerm}
            onChange={e => setFilter({ searchTerm: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md" />
        </div>

        {/* Linha 1: Tipo + Status + Campos faltando */}
        <div className="flex flex-wrap gap-3">
          <select value={filters.profileKindFilter}
            onChange={e => setFilter({ profileKindFilter: e.target.value })}
            className="flex-1 min-w-[130px] px-4 py-2 border border-gray-300 rounded-md text-sm">
            <option value="all">Todos os tipos</option>
            <option value="athlete">Atletas</option>
            <option value="partner">Empresas</option>
            <option value="account">Sem perfil</option>
          </select>

          <select value={filters.statusFilter}
            onChange={e => setFilter({ statusFilter: e.target.value })}
            className="flex-1 min-w-[130px] px-4 py-2 border border-gray-300 rounded-md text-sm">
            <option value="all">Todos os status</option>
            <option value="stalled">Parado</option>
            <option value="incomplete">Incompleto</option>
            <option value="almost">Quase lá</option>
            <option value="acceptable">Aceitável</option>
            <option value="complete">Completo</option>
          </select>

          {/* Multi-select campos faltando */}
          <div ref={fieldsRef} className="relative flex-1 min-w-[180px]">
            <button onClick={() => setFieldsOpen(o => !o)}
              className={`w-full flex items-center justify-between px-4 py-2 border rounded-md text-sm transition ${
                filters.missingFieldFilter.length > 0
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-700'
              }`}>
              <span>
                {filters.missingFieldFilter.length === 0
                  ? 'Campos faltando'
                  : `${filters.missingFieldFilter.length} campo${filters.missingFieldFilter.length > 1 ? 's' : ''} selecionado${filters.missingFieldFilter.length > 1 ? 's' : ''}`}
              </span>
              <ChevronDown size={16} className={`transition-transform ${fieldsOpen ? 'rotate-180' : ''}`} />
            </button>

            {fieldsOpen && (
              <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Obrigatórios</div>
                  <div className="grid grid-cols-2 gap-1">
                    {MUST_HAVE_FIELDS.map(f => (
                      <label key={f} className="flex items-center gap-2 text-sm cursor-pointer hover:text-indigo-600">
                        <input type="checkbox" checked={filters.missingFieldFilter.includes(f)}
                          onChange={() => toggleMissingField(f)}
                          className="accent-indigo-600" />
                        {f}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Complementares</div>
                  <div className="grid grid-cols-2 gap-1">
                    {NICE_TO_HAVE_FIELDS.map(f => (
                      <label key={f} className="flex items-center gap-2 text-sm cursor-pointer hover:text-indigo-600">
                        <input type="checkbox" checked={filters.missingFieldFilter.includes(f)}
                          onChange={() => toggleMissingField(f)}
                          className="accent-indigo-600" />
                        {f}
                      </label>
                    ))}
                  </div>
                </div>
                {filters.missingFieldFilter.length > 0 && (
                  <button onClick={() => setFilter({ missingFieldFilter: [] })}
                    className="w-full text-xs text-gray-400 hover:text-red-500 text-left transition">
                    Limpar seleção
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Linha 2: Data de cadastro + Próximo contato */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Calendar size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 whitespace-nowrap">Cadastro:</span>
            <input type="date" value={filters.createdFrom} max={filters.createdTo || undefined}
              onChange={e => setFilter({ createdFrom: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={filters.createdTo} min={filters.createdFrom || undefined}
              onChange={e => setFilter({ createdTo: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Calendar size={16} className="text-blue-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 whitespace-nowrap">Próximo contato:</span>
            <input type="date" value={filters.nextContactFrom} max={filters.nextContactTo || undefined}
              onChange={e => setFilter({ nextContactFrom: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-blue-300 rounded text-sm" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={filters.nextContactTo} min={filters.nextContactFrom || undefined}
              onChange={e => setFilter({ nextContactTo: e.target.value })}
              className="flex-1 px-2 py-1.5 border border-blue-300 rounded text-sm" />
          </div>
        </div>

        {/* Linha 3: Estado + Cidade */}
        <div className="flex flex-wrap gap-3">
          <select value={filters.estadoFilter}
            onChange={e => setFilter({ estadoFilter: e.target.value, cidadeFilter: '' })}
            className="flex-1 min-w-[130px] px-4 py-2 border border-gray-300 rounded-md text-sm">
            <option value="">Todos os estados</option>
            {STATES_LIST.map(s => (
              <option key={s.id} value={s.sigla}>{s.sigla} — {s.nome}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Buscar cidade..."
              value={filters.cidadeFilter}
              onChange={e => setFilter({ cidadeFilter: e.target.value })}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
        </div>

        {/* Tags dos campos selecionados */}
        {filters.missingFieldFilter.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filters.missingFieldFilter.map(f => (
              <span key={f}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                {f}
                <button onClick={() => toggleMissingField(f)} className="hover:text-indigo-900">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum usuário encontrado</p>
        ) : (
          filteredUsers.map((user) => {
            const missing = normalizeMissingFields((user as any).missing_fields);
            const showMissing = user.completion_status !== 'complete' && missing.length > 0;
            const preview = missing.slice(0, 3);
            const rest = missing.length - preview.length;
            const isAthlete = user.profile_kind === 'athlete';
            const { score, tier } = isAthlete ? getCommercial(user) : { score: null, tier: null };
            const outreachCount = user.users?.outreach?.length ?? 0;
            const followup = nextFollowup(user);

            return (
              <div key={user.id} onClick={() => onSelectUser(user.user_id)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserIcon size={20} className="text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{user.users?.full_name || 'Sem nome'}</h3>
                      <p className="text-sm text-gray-600 truncate">{user.users?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {followup && (
                      <span className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200">
                        <Calendar size={12} />
                        {new Date(followup).toLocaleDateString('pt-BR')}
                      </span>
                    )}

                    {outreachCount > 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        contactado {outreachCount}×
                      </span>
                    )}

                    {isAthlete && (
                      <div className="hidden md:flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                          <Award size={14} />
                          <span className="font-medium">{score ?? '—'}</span>
                        </span>
                        {tier ? (
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${tierBadge(tier)}`}>{tier}</span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-600">sem tier</span>
                        )}
                      </div>
                    )}

                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getProfileKindBadge(user.profile_kind)}`}>
                      {labelProfileKind(user.profile_kind)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[user.completion_status] || STATUS_BADGE_COLORS['incomplete']}`}>
                      {STATUS_PT[user.completion_status] || user.completion_status}
                    </span>
                    <span className="text-sm text-gray-600">{user.completion_score}%</span>
                  </div>
                </div>

                {showMissing && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {preview.map(m => (
                      <span key={m} className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">{m}</span>
                    ))}
                    {rest > 0 && (
                      <span className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">+{rest}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
