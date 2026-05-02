import type { DossierExample } from '../../../types/dossier';

export function EvidenceCard({ example }: { example: DossierExample }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-100">
      <p className="text-sm text-gray-800 mb-2 line-clamp-3">{example.excerpt}</p>

      <div className="flex flex-wrap gap-1 mb-2">
        {example.matchedFragments.map((f, i) => (
          <span
            key={i}
            className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
          >
            {f}
          </span>
        ))}
        {example.flags.map((f, i) => (
          <span
            key={`flag-${i}`}
            className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded"
          >
            {f}
          </span>
        ))}
      </div>

      <div className="text-xs text-gray-400">
        {new Date(example.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
