// src/components/UserDetail.tsx
import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Calendar, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normalizeMissingFields } from '../lib/utils';
import type { Onboarding, Outreach, User } from '../types/database';

interface UserDetailProps {
  userId: string;
  onBack: () => void;
}

export function UserDetail({ userId, onBack }: UserDetailProps) {
  const [user, setUser] = useState<(User & { role?: string | null }) | null>(null);
  const [onboardingRecords, setOnboardingRecords] = useState<Onboarding[]>([]);
  const [outreachRecords, setOutreachRecords] = useState<Outreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOutreachForm, setShowOutreachForm] = useState(false);
  const [outreachForm, setOutreachForm] = useState({
    channel: '',
    outcome: '',
    notes: '',
    next_followup_at: '',
  });

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('*').eq('user_id', userId).maybeSingle();

      const { data: onboardingData } = await supabase.from('onboarding').select('*').eq('user_id', userId);

      const { data: outreachData } = await supabase
        .from('outreach')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setUser(userData as any);
      setOnboardingRecords(onboardingData || []);
      setOutreachRecords(outreachData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOutreach = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await (supabase.from('outreach') as any).insert({
        user_id: userId,
        channel: outreachForm.channel,
        outcome: outreachForm.outcome || null,
        notes: outreachForm.notes || null,
        next_followup_at: outreachForm.next_followup_at || null,
      });

      if (error) throw error;

      setOutreachForm({
        channel: '',
        outcome: '',
        notes: '',
        next_followup_at: '',
      });
      setShowOutreachForm(false);
      fetchUserData();
    } catch (error) {
      console.error('Error creating outreach:', error);
    }
  };

  const kindBadge = (kind: string) => {
    if (kind === 'athlete') return 'bg-purple-100 text-purple-800';
    if (kind === 'partner') return 'bg-teal-100 text-teal-800';
    if (kind === 'account') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  };

  const statusBadge = (status: string) => {
    if (status === 'complete') return 'bg-green-100 text-green-800';
    if (status === 'acceptable') return 'bg-indigo-100 text-indigo-800';
    if (status === 'almost') return 'bg-blue-100 text-blue-800';
    if (status === 'incomplete') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const safeDate = (v: any) => {
    if (!v) return '-';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
  };

  if (loading) return <div className="text-center py-8">Loading user details...</div>;
  if (!user) return <div className="text-center py-8">User not found</div>;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
        <ArrowLeft size={20} />
        Back to list
      </button>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">{user.full_name || 'No name'}</h2>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-gray-600">{user.email}</p>
          {user.role && (
            <span className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">role: {user.role}</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created:</span> <span className="font-medium">{safeDate(user.created_at_portal)}</span>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span> <span className="font-medium">{safeDate(user.updated_at_portal)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Onboarding Status</h3>

        <div className="space-y-4">
          {onboardingRecords.length === 0 ? (
            <p className="text-gray-500">No onboarding records</p>
          ) : (
            onboardingRecords.map((record: any) => {
              const missing = normalizeMissingFields(record.missing_fields);

              const mustMissing = missing
                .filter((x) => x.startsWith('must:'))
                .map((x) => x.replace(/^must:/, ''));
              const niceMissing = missing
                .filter((x) => x.startsWith('nice:'))
                .map((x) => x.replace(/^nice:/, ''));

              const showMissing = record.completion_status !== 'complete' && (mustMissing.length > 0 || niceMissing.length > 0);

              return (
                <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${kindBadge(record.profile_kind)}`}>
                        {record.profile_kind === 'account' ? 'no role' : record.profile_kind}
                      </span>

                      {record.entity_type && (
                        <span className="ml-2 text-sm text-gray-600">({String(record.entity_type).toUpperCase()})</span>
                      )}
                    </div>

                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(record.completion_status)}`}>
                      {record.completion_status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">Completion: {record.completion_score}%</div>

                  {showMissing && (
                    <div className="mt-3">
                      <div className="text-sm text-gray-700 font-medium mb-2">Missing fields</div>

                      <div className="text-sm text-gray-700 font-medium mb-1">Must-have</div>
                      {mustMissing.length === 0 ? (
                        <div className="text-sm text-gray-500 mb-3">—</div>
                      ) : (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {mustMissing.map((m: string) => (
                            <span key={`must-${m}`} className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-sm text-gray-700 font-medium mb-1">Nice-to-have</div>
                      {niceMissing.length === 0 ? (
                        <div className="text-sm text-gray-500">—</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {niceMissing.map((m: string) => (
                            <span key={`nice-${m}`} className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Outreach History</h3>
          <button
            onClick={() => setShowOutreachForm(!showOutreachForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus size={20} />
            New Outreach
          </button>
        </div>

        {showOutreachForm && (
          <form onSubmit={handleSubmitOutreach} className="mb-6 p-4 border border-gray-200 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select
                value={outreachForm.channel}
                onChange={(e) => setOutreachForm({ ...outreachForm, channel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select channel</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
              <input
                type="text"
                value={outreachForm.outcome}
                onChange={(e) => setOutreachForm({ ...outreachForm, outcome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Responded, No answer, Interested"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={outreachForm.notes}
                onChange={(e) => setOutreachForm({ ...outreachForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-up</label>
              <input
                type="datetime-local"
                value={outreachForm.next_followup_at}
                onChange={(e) => setOutreachForm({ ...outreachForm, next_followup_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                Save Outreach
              </button>
              <button
                type="button"
                onClick={() => setShowOutreachForm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {outreachRecords.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No outreach records yet</p>
          ) : (
            outreachRecords.map((record) => (
              <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-gray-600" />
                    <span className="font-medium">{record.channel}</span>
                  </div>
                  <span className="text-sm text-gray-500">{new Date(record.created_at).toLocaleDateString()}</span>
                </div>
                {record.outcome && (
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Outcome:</span> {record.outcome}
                  </p>
                )}
                {record.notes && <p className="text-sm text-gray-600 mb-2">{record.notes}</p>}
                {record.next_followup_at && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Calendar size={14} />
                    Follow-up: {new Date(record.next_followup_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}