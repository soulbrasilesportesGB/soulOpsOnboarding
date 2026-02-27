// src/components/UserList.tsx
import { useEffect, useState } from 'react';
import { Search, User as UserIcon, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Onboarding, User as UserType } from '../types/database';

interface UserWithOnboarding extends Onboarding {
  users: (UserType & { role?: string | null } & {
    athlete_commercial_scores?: Array<{
      total_score: number | null;
      tier: string | null;
      updated_at?: string | null;
    }> | null;
  }) | null;
}

interface UserListProps {
  onSelectUser: (userId: string) => void;
}

export function UserList({ onSelectUser }: UserListProps) {
  const [users, setUsers] = useState<UserWithOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileKindFilter, setProfileKindFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
            athlete_commercial_scores ( total_score, tier, updated_at )
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

  const normalizeMissingFields = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean).map(String);
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) return [];
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch (_) {}
    }
    return [];
  };

  const filteredUsers = users.filter((user) => {
    const matchesProfileKind = profileKindFilter === 'all' || user.profile_kind === profileKindFilter;
    const matchesStatus = statusFilter === 'all' || user.completion_status === statusFilter;

    const email = (user.users?.email || '').toLowerCase();
    const name = (user.users?.full_name || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = !searchTerm || email.includes(term) || name.includes(term);

    return matchesProfileKind && matchesStatus && matchesSearch;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'acceptable':
        return 'bg-indigo-100 text-indigo-800';
      case 'almost':
        return 'bg-blue-100 text-blue-800';
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-800';
      case 'stalled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProfileKindBadge = (kind: string) => {
    switch (kind) {
      case 'athlete':
        return 'bg-purple-100 text-purple-800';
      case 'partner':
        return 'bg-teal-100 text-teal-800';
      case 'account':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const labelProfileKind = (kind: string) => {
    if (kind === 'account') return 'no role';
    return kind;
  };

  // ---------- Score helpers ----------
  const getCommercial = (u: UserWithOnboarding) => {
    const arr = u.users?.athlete_commercial_scores || [];
    // esperando 1 registro por user, mas se vier array, pega o primeiro
    const row = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    const score = row?.total_score ?? null;
    const tier = row?.tier ?? null;
    return { score, tier };
  };

  const tierBadge = (tier: string) => {
    if (tier === 'Atleta Âncora') return 'bg-emerald-100 text-emerald-800';
    if (tier === 'Atleta Comercial Forte') return 'bg-indigo-100 text-indigo-800';
    if (tier === 'Atleta Comercial Potencial') return 'bg-blue-100 text-blue-800';
    if (tier === 'Ainda não comercializável') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">User List</h2>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex gap-4">
          <select
            value={profileKindFilter}
            onChange={(e) => setProfileKindFilter(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Types</option>
            <option value="athlete">Athletes</option>
            <option value="partner">Partners</option>
            <option value="account">No role (account)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="stalled">Stalled</option>
            <option value="incomplete">Incomplete</option>
            <option value="almost">Almost</option>
            <option value="acceptable">Acceptable</option>
            <option value="complete">Complete</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No users found</p>
        ) : (
          filteredUsers.map((user) => {
            const missing = normalizeMissingFields((user as any).missing_fields);

            // Only hide missing when truly complete (must+nice).
            const showMissing = user.completion_status !== 'complete' && missing.length > 0;

            const preview = missing.slice(0, 3);
            const rest = missing.length - preview.length;

            const isAthlete = user.profile_kind === 'athlete';
            const { score, tier } = isAthlete ? getCommercial(user) : { score: null, tier: null };

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
                    {/* Score Comercial (somente atletas) */}
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
                          <span className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-600">
                            sem tier
                          </span>
                        )}
                      </div>
                    )}

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getProfileKindBadge(user.profile_kind)}`}
                      title="Onboarding track"
                    >
                      {labelProfileKind(user.profile_kind)}
                    </span>

                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(user.completion_status)}`}>
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