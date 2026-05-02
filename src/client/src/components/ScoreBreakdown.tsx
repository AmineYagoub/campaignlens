import type { CampaignShapeScore } from '../../../types/dossier';

const LABELS: Array<{ key: keyof CampaignShapeScore; label: string }> = [
  { key: 'domainBurst', label: 'Domain Burst' },
  { key: 'brandBurst', label: 'Brand Burst' },
  { key: 'threadSpread', label: 'Thread Spread' },
  { key: 'simhash', label: 'Near Duplicates' },
  { key: 'participationPattern', label: 'Participation' },
  { key: 'obfuscation', label: 'Obfuscation' },
  { key: 'report', label: 'Reports' },
];

function barColor(score: number): string {
  if (score >= 70) return 'bg-red-400';
  if (score >= 40) return 'bg-yellow-400';
  return 'bg-green-400';
}

export function ScoreBreakdown({ score }: { score: CampaignShapeScore }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Total Score</span>
        <span className="text-lg font-bold text-gray-900">{Math.round(score.total)}</span>
      </div>

      {LABELS.map(({ key, label }) => {
        const val = score[key] as number;
        if (typeof val !== 'number') return null;
        return (
          <div key={key}>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
              <span>{label}</span>
              <span>{Math.round(val)}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor(val)}`}
                style={{ width: `${Math.min(val, 100)}%` }}
              />
            </div>
          </div>
        );
      })}

      <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
        {score.independentSignalFamilies} signal families
      </div>
    </div>
  );
}
