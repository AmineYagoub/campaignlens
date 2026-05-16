import { useState, useEffect } from 'react';
import { useConfig } from '../hooks/useConfig';
import { showClientToast } from '../devvit/client';
import type { CampaignLensConfig } from '../../../types/config';
import type { HealthReport } from '../../../types/health';
import { fetchHealth } from '../lib/api';

export function SettingsScreen() {
  const { config, loading, saving, error, save } = useConfig();
  const [draft, setDraft] = useState<CampaignLensConfig>(config);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useEffect(() => {
    void loadHealth();
  }, []);

  const loadHealth = async () => {
    try {
      setHealthError(null);
      setHealth(await fetchHealth());
    } catch (e) {
      setHealthError(e instanceof Error ? e.message : 'Failed to load diagnostics');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Loading settings...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg mx-4 mt-4">
        {error}
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await save(draft);
      showClientToast({ text: 'Settings saved', appearance: 1 });
    } catch (e) {
      showClientToast({
        text: e instanceof Error ? e.message : 'Failed to save settings',
        appearance: 0,
      });
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Detection Thresholds</h3>

        <div className="space-y-4">
          <SliderField
            label="Campaign Threshold"
            value={draft.threshold}
            min={20}
            max={90}
            onChange={(v) => setDraft({ ...draft, threshold: v })}
          />
          <SliderField
            label="High Confidence Threshold"
            value={draft.highConfidenceThreshold}
            min={60}
            max={99}
            onChange={(v) => setDraft({ ...draft, highConfidenceThreshold: v })}
          />
          <SliderField
            label="Required Signal Families"
            value={draft.requiredSignalFamilies}
            min={1}
            max={6}
            onChange={(v) => setDraft({ ...draft, requiredSignalFamilies: v })}
          />
          <SliderField
            label="Window (minutes)"
            value={draft.windowMinutes}
            min={15}
            max={240}
            step={15}
            onChange={(v) => setDraft({ ...draft, windowMinutes: v })}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Scoring Weights</h3>
        <div className="space-y-4">
          <SliderField
            label="Domain Burst"
            value={Math.round(draft.weights.domainBurst * 100)}
            min={5}
            max={40}
            onChange={(v) => setDraft({ ...draft, weights: { ...draft.weights, domainBurst: v / 100 } })}
          />
          <SliderField
            label="Brand Burst"
            value={Math.round(draft.weights.brandBurst * 100)}
            min={5}
            max={40}
            onChange={(v) => setDraft({ ...draft, weights: { ...draft.weights, brandBurst: v / 100 } })}
          />
          <SliderField
            label="Thread Spread"
            value={Math.round(draft.weights.threadSpread * 100)}
            min={5}
            max={40}
            onChange={(v) => setDraft({ ...draft, weights: { ...draft.weights, threadSpread: v / 100 } })}
          />
          <SliderField
            label="SimHash"
            value={Math.round(draft.weights.simhash * 100)}
            min={5}
            max={40}
            onChange={(v) => setDraft({ ...draft, weights: { ...draft.weights, simhash: v / 100 } })}
          />
          <SliderField
            label="Participation Pattern"
            value={Math.round(draft.weights.participationPattern * 100)}
            min={0}
            max={30}
            onChange={(v) => setDraft({ ...draft, weights: { ...draft.weights, participationPattern: v / 100 } })}
          />
          <SliderField
            label="Obfuscation"
            value={Math.round(draft.weights.obfuscation * 100)}
            min={0}
            max={30}
            onChange={(v) => setDraft({ ...draft, weights: { ...draft.weights, obfuscation: v / 100 } })}
          />
          <SliderField
            label="Reports"
            value={Math.round(draft.weights.report * 100)}
            min={0}
            max={30}
            onChange={(v) => setDraft({ ...draft, weights: { ...draft.weights, report: v / 100 } })}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Evidence Limits</h3>
        <div className="space-y-4">
          <SliderField
            label="Evidence Cap"
            value={draft.evidenceCap}
            min={1000}
            max={20000}
            step={500}
            onChange={(v) => setDraft({ ...draft, evidenceCap: v })}
          />
          <SliderField
            label="Per-Signal Cap"
            value={draft.evidenceCapPerSignal}
            min={10}
            max={200}
            step={5}
            onChange={(v) => setDraft({ ...draft, evidenceCapPerSignal: v })}
          />
          <SliderField
            label="Examples Per Dossier"
            value={draft.maxExamplesPerDossier}
            min={1}
            max={10}
            onChange={(v) => setDraft({ ...draft, maxExamplesPerDossier: v })}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Domain Lists</h3>
        <div className="space-y-4">
          <ListField
            label="Allowlist"
            value={draft.allowlist}
            placeholder="trusted.example.com"
            onChange={(allowlist) => setDraft({ ...draft, allowlist })}
          />
          <ListField
            label="Watchlist"
            value={draft.blocklist}
            placeholder="suspicious.example.com"
            onChange={(blocklist) => setDraft({ ...draft, blocklist })}
          />
          <ListField
            label="Harmful Narrative Terms"
            value={draft.harmfulNarrativeWatchlist}
            placeholder={`coded slogan\nviolent call to action`}
            onChange={(harmfulNarrativeWatchlist) => setDraft({ ...draft, harmfulNarrativeWatchlist })}
          />
        </div>
      </div>

      <DiagnosticsCard health={health} error={healthError} onRefresh={loadHealth} />

      <button
        className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black disabled:cursor-wait disabled:opacity-50"
        disabled={saving}
        onClick={handleSave}
        type="button"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function DiagnosticsCard({
  health,
  error,
  onRefresh,
}: {
  health: HealthReport | null;
  error: string | null;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Diagnostics</h3>
          <p className="mt-1 text-xs text-gray-400">No raw content, usernames, or author identity.</p>
        </div>
        <button
          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
          onClick={() => void onRefresh()}
          type="button"
        >
          Refresh
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}

      {!error && !health && (
        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-400">Loading diagnostics...</div>
      )}

      {health && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">System</span>
            <span className={health.status === 'healthy' ? 'text-xs font-semibold text-green-700' : 'text-xs font-semibold text-orange-700'}>
              {health.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <Metric label="Active dossiers" value={health.metrics.activeDossiers} />
            <Metric label="Action records" value={health.metrics.actionHistoryRecords} />
            <Metric label="Baseline" value={health.metrics.baselineMode.replace('_', ' ')} />
            <Metric label="Memory caps" value={health.metrics.memoryPressure ? 'Active' : 'Normal'} />
          </div>

          <div className="space-y-2">
            {Object.entries(health.checks).map(([name, check]) => (
              <div key={name} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium capitalize text-gray-700">{name}</span>
                  <span className={check.status === 'healthy' ? 'text-xs font-semibold text-green-700' : 'text-xs font-semibold text-orange-700'}>
                    {check.status}
                  </span>
                </div>
                {check.message && <p className="mt-1 text-xs text-gray-400">{check.message}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-gray-400">{label}</div>
      <div className="mt-1 font-semibold text-gray-700">{value}</div>
    </div>
  );
}

function ListField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string[];
  placeholder: string;
  onChange: (v: string[]) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-600 mb-1">{label}</span>
      <textarea
        className="w-full min-h-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
        value={value.join('\n')}
        placeholder={placeholder}
        onChange={(e) => onChange(parseList(e.target.value))}
      />
    </label>
  );
}

function parseList(value: string): string[] {
  return [...new Set(
    value
      .split(/[\n,]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  )];
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <input
        type="range"
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
