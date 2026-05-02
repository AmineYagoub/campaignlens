import { useState, useEffect } from 'react';
import { showToast } from '@devvit/web/client';
import { useConfig } from '../hooks/useConfig';
import type { CampaignLensConfig } from '../../../types/config';

export function SettingsScreen() {
  const { config, loading, error, save } = useConfig();
  const [draft, setDraft] = useState<CampaignLensConfig>(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

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
    await save(draft);
    showToast({ text: 'Settings saved', appearance: 1 });
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
        </div>
      </div>

      <button
        className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        onClick={handleSave}
      >
        Save Settings
      </button>
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
