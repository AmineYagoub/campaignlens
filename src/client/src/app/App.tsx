import { useState } from 'react';
import { context } from '@devvit/web/client';
import { ActiveDossiersScreen } from '../screens/ActiveDossiersScreen';
import { DossierDetailScreen } from '../screens/DossierDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

type Screen = 'dossiers' | 'detail' | 'settings';

export function App() {
  const [screen, setScreen] = useState<Screen>('dossiers');
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

  const openDossier = (id: string) => {
    setSelectedDossierId(id);
    setScreen('detail');
  };

  const goBack = () => {
    setScreen('dossiers');
    setSelectedDossierId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">CampaignLens Atlas</h1>
        <p className="text-xs text-gray-500">r/{context.subredditName}</p>
      </header>

      {screen !== 'detail' && (
        <nav className="flex border-b border-gray-200 bg-white">
          <button
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              screen === 'dossiers'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setScreen('dossiers')}
          >
            Dossiers
          </button>
          <button
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              screen === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setScreen('settings')}
          >
            Settings
          </button>
        </nav>
      )}

      {screen === 'dossiers' && <ActiveDossiersScreen onSelectDossier={openDossier} />}
      {screen === 'detail' && selectedDossierId && (
        <DossierDetailScreen dossierId={selectedDossierId} onBack={goBack} />
      )}
      {screen === 'settings' && <SettingsScreen />}
    </div>
  );
}
