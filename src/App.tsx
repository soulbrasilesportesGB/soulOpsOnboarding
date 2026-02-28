import { useState } from 'react';
import { useAuth } from './hooks/useAuth';

import { CSVImport } from './components/CSVImport';
import { Dashboard } from './components/Dashboard';
import { UserList } from './components/UserList';
import { UserDetail } from './components/UserDetail';
import { Auth } from './components/Auth';

import { FileSpreadsheet, LayoutDashboard, Users, LogOut } from 'lucide-react';
import type { View } from './types/common';

function App() {
  const { session, loading: authLoading, signOut } = useAuth();

  const [currentView, setCurrentView] = useState<View>('import');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportComplete = () => {
    setRefreshKey((prev) => prev + 1);
    setCurrentView('dashboard');
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
    setCurrentView('import');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow text-gray-800">Checking session...</div>
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
            <button
              onClick={() => setCurrentView('import')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                currentView === 'import'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileSpreadsheet size={20} />
              Import
            </button>

            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                currentView === 'dashboard'
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
              Users
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentView === 'import' && <CSVImport onImportComplete={handleImportComplete} />}
        {currentView === 'dashboard' && <Dashboard key={refreshKey} />}
        {currentView === 'list' && <UserList onSelectUser={handleSelectUser} />}
        {currentView === 'detail' && selectedUserId && (
          <UserDetail userId={selectedUserId} onBack={handleBackToList} />
        )}
      </main>
    </div>
  );
}

export default App;