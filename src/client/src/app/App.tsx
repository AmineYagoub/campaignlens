import { useState } from 'react';
import { clientContext } from '../devvit/client';
import { ActiveDossiersScreen } from '../screens/ActiveDossiersScreen';
import { DossierDetailScreen } from '../screens/DossierDetailScreen';
import { ActionHistoryScreen } from '../screens/ActionHistoryScreen';
import { ReviewQueueScreen } from '../screens/ReviewQueueScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

type Screen = 'dossiers' | 'detail' | 'review' | 'actions' | 'settings';

export function App() {
  const [screen, setScreen] = useState<Screen>('dossiers');
  const [previousScreen, setPreviousScreen] = useState<Screen>('dossiers');
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

  const openDossier = (id: string) => {
    setSelectedDossierId(id);
    setPreviousScreen(screen);
    setScreen('detail');
  };

  const goBack = () => {
    setScreen(previousScreen === 'detail' ? 'dossiers' : previousScreen);
    setSelectedDossierId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">CampaignLens</h1>
        <p className="text-xs text-gray-500">r/{clientContext.subredditName}</p>
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
              screen === 'review'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setScreen('review')}
          >
            Review
          </button>
          <button
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              screen === 'actions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setScreen('actions')}
          >
            Actions
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
      {screen === 'review' && <ReviewQueueScreen onSelectDossier={openDossier} />}
      {screen === 'actions' && <ActionHistoryScreen />}
      {screen === 'detail' && selectedDossierId && (
        <DossierDetailScreen dossierId={selectedDossierId} onBack={goBack} />
      )}
      {screen === 'settings' && <SettingsScreen />}
    </div>
  );
}
