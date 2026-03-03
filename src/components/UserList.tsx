// src/components/UserList.tsx
import { useEffect, useState } from 'react';
import { Search, User as UserIcon, Award, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normalizeMissingFields, STATUS_BADGE_COLORS } from '../lib/utils';
import type { Onboarding, User as UserType } from '../types/database';

interface UserWithOnboarding extends Onboarding {
  users: (UserType & { role?: string | null } & {
    athlete_commercial_scores?: Array<{
      total_score: number | null;
      tier: string | null;
      updated_at?: string | null;
    }> | null;
    outreach?: Array<{ id: string }> | null;
  }) | null;
}

export interface UserListFilters {
  profileKindFilter: string;
  statusFilter: string;
  searchTerm: string;
  missingFieldFilter: string;
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('onboarding')
        .select(
          `
          *,
          users (
            *,
            athlete_commercial_scores ( total_score, tier, updated_at ),
            outreach ( id )
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as unknown as UserWithOnboarding[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const setFilter = (partial: Partial<UserListFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const filteredUsers = users.filter((user) => {
    const matchesProfileKind =
      filters.profileKindFilter === 'all' || user.profile_kind === filters.profileKindFilter;
    const matchesStatus =
      filters.statusFilter === 'all' || user.completion_status === filters.statusFilter;

    const email = (user.users?.email || '').toLowerCase();
    const name = (user.users?.full_name || '').toLowerCase();
    const term = filters.searchTerm.toLowerCase();
    const matchesSearch = !filters.searchTerm || email.includes(term) || name.includes(term);

    const matchesTag =
      !filters.missingFieldFilter ||
      normalizeMissingFields(user.missing_fields)
        .map((f) => f.replace(/^must:|^nice:/, ''))
        .includes(filters.missingFieldFilter);

    return matchesProfileKind && matchesStatus && matchesSearch && matchesTag;
  });

  const getProfileKindBadge = (kind: string) => {
    switch (kind) {
      case 'athlete': return 'bg-purple-100 text-purple-800';
      case 'partner': return 'bg-teal-100 text-teal-800';
      case 'account': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const labelProfileKind = (kind: string) => {
    if (kind === 'account') return 'no role';
    return kind;
  };

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

  const exportToCSV = () => {
    const mustHaveFields = MUST_HAVE_FIELDS;
    const niceToHaveFields = NICE_TO_HAVE_FIELDS;

    const headers = [
      'Full Name', 'Email', 'Profile Kind', 'Entity Type', 'Completion Status',
      'Completion Score (%)', 'Commercial Score', 'Tier', 'Created At', 'Updated At',
      '', '--- MUST-HAVE FIELDS ---', ...mustHaveFields,
      '', '--- NICE-TO-HAVE FIELDS ---', ...niceToHaveFields,
    ];

    const data = filteredUsers.map((user) => {
      const { score, tier } = user.profile_kind === 'athlete' ? getCommercial(user) : { score: null, tier: null };
      const missing = normalizeMissingFields(user.missing_fields);
      const missingSet = new Set(missing.map((field) => field.replace(/^must:|^nice:/, '')));
      const mustHaveStatus = mustHaveFields.map((field) => (missingSet.has(field) ? 'Missing' : 'Filled'));
      const niceToHaveStatus = niceToHaveFields.map((field) => (missingSet.has(field) ? 'Missing' : 'Filled'));

      return [
        user.users?.full_name || '', user.users?.email || '', user.profile_kind || '',
        user.entity_type || '', user.completion_status || '', user.completion_score || '',
        score ?? '', tier ?? '',
        new Date(user.created_at).toLocaleString(), new Date(user.updated_at).toLocaleString(),
        '', '', ...mustHaveStatus, '', '', ...niceToHaveStatus,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        row.map((cell) => {
          const cellStr = String(cell ?? '');
          return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')
            ? `"${cellStr.replace(/"/g, '""')}"`
            : cellStr;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `athletes-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User List</h2>
        <button
          onClick={exportToCSV}
          disabled={filteredUsers.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          <Download size={18} />
          Export to CSV
        </button>
      </div>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filters.searchTerm}
            onChange={(e) => setFilter({ searchTerm: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={filters.profileKindFilter}
            onChange={(e) => setFilter({ profileKindFilter: e.target.value })}
            className="flex-1 min-w-[130px] px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Types</option>
            <option value="athlete">Athletes</option>
            <option value="partner">Partners</option>
            <option value="account">No role (account)</option>
          </select>

          <select
            value={filters.statusFilter}
            onChange={(e) => setFilter({ statusFilter: e.target.value })}
            className="flex-1 min-w-[130px] px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="stalled">Stalled</option>
            <option value="incomplete">Incomplete</option>
            <option value="almost">Almost</option>
            <option value="acceptable">Acceptable</option>
            <option value="complete">Complete</option>
          </select>

          <select
            value={filters.missingFieldFilter}
            onChange={(e) => setFilter({ missingFieldFilter: e.target.value })}
            className="flex-1 min-w-[160px] px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Fields</option>
            <optgroup label="Must-have">
              {MUST_HAVE_FIELDS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </optgroup>
            <optgroup label="Nice-to-have">
              {NICE_TO_HAVE_FIELDS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No users found</p>
        ) : (
          filteredUsers.map((user) => {
            const missing = normalizeMissingFields((user as any).missing_fields);
            const showMissing = user.completion_status !== 'complete' && missing.length > 0;
            const preview = missing.slice(0, 3);
            const rest = missing.length - preview.length;
            const isAthlete = user.profile_kind === 'athlete';
            const { score, tier } = isAthlete ? getCommercial(user) : { score: null, tier: null };
            const outreachCount = user.users?.outreach?.length ?? 0;

            return (
              <div
                key={user.id}
                onClick={() => onSelectUser(user.user_id)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserIcon size={20} className="text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{user.users?.full_name || 'No name'}</h3>
                      <p className="text-sm text-gray-600 truncate">{user.users?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
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
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${tierBadge(tier)}`}>
                            {tier}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-600">sem tier</span>
                        )}
                      </div>
                    )}

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getProfileKindBadge(user.profile_kind)}`}
                      title="Onboarding track"
                    >
                      {labelProfileKind(user.profile_kind)}
                    </span>

                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[user.completion_status] || STATUS_BADGE_COLORS['incomplete']}`}>
                      {user.completion_status}
                    </span>

                    <span className="text-sm text-gray-600">{user.completion_score}%</span>
                  </div>
                </div>

                {showMissing && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {preview.map((m) => (
                      <span key={m} className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                        {m}
                      </span>
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
