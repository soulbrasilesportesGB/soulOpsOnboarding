import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useRole, canImport, isSuperAdmin } from './hooks/useRole';

import { CSVImport } from './components/CSVImport';
import { TeamDashboard } from './components/TeamDashboard';
import { UserList } from './components/UserList';
import { UserDetail } from './components/UserDetail';
import { Auth } from './components/Auth';
import { OpsDashboard } from './components/OpsDashboard';
import type { UserListFilters } from './components/UserList';

import { FileSpreadsheet, LayoutDashboard, Users, LogOut, BarChart3 } from 'lucide-react';
import type { View } from './types/common';

function App() {
  const { session, loading: authLoading, signOut } = useAuth();
  const role = useRole();

  const [currentView, setCurrentView] = useState<View>('team');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userListFilters, setUserListFilters] = useState<UserListFilters>({
    profileKindFilter: 'all',
    statusFilter: 'all',
    searchTerm: '',
    missingFieldFilter: [],
    createdFrom: '',
    createdTo: '',
    nextContactFrom: '',
    nextContactTo: '',
  });

  const handleImportComplete = () => {
    setRefreshKey((prev) => prev + 1);
    setCurrentView('team');
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentView('detail');
  };

  const handleBackToList = () => {
    setSelectedUserId(null);
    setCurrentView('list');
  };

  const handleSignOut = async () => {
    await signOut();
    setSelectedUserId(null);
    setCurrentView('team');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow text-gray-800">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Soul Ops – Onboarding</h1>
            <p className="text-sm text-gray-600">{session.user?.email}</p>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm"
            title="Sair"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {canImport(role) && (
              <button
                onClick={() => setCurrentView('import')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                  currentView === 'import'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileSpreadsheet size={20} />
                Importar
              </button>
            )}

            <button
              onClick={() => setCurrentView('team')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                currentView === 'team'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard size={20} />
              Dashboard
            </button>

            <button
              onClick={() => setCurrentView('list')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                currentView === 'list' || currentView === 'detail'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={20} />
              Usuários
            </button>

            {isSuperAdmin(role) && (
              <button
                onClick={() => setCurrentView('ops')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                  currentView === 'ops'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 size={20} />
                Ops
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className={currentView === 'ops' ? '' : 'max-w-7xl mx-auto px-4 py-8'}>
        {currentView === 'import' && canImport(role) && <CSVImport onImportComplete={handleImportComplete} />}
        {currentView === 'team' && <TeamDashboard key={refreshKey} />}
        {currentView === 'list' && (
          <UserList
            onSelectUser={handleSelectUser}
            filters={userListFilters}
            onFiltersChange={setUserListFilters}
          />
        )}
        {currentView === 'detail' && selectedUserId && (
          <UserDetail userId={selectedUserId} onBack={handleBackToList} />
        )}
        {currentView === 'ops' && isSuperAdmin(role) && <OpsDashboard />}
      </main>
    </div>
  );
}

export default App;
