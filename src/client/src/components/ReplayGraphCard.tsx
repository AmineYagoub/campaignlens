import type { ReplayGraph, ReplayNode } from '../../../types/dossier';

type Props = {
  replay: ReplayGraph;
};

const NODE_STYLES: Record<ReplayNode['kind'], string> = {
  domain: 'bg-blue-600 text-white border-blue-700',
  thread: 'bg-white text-gray-800 border-gray-200',
  phrase: 'bg-indigo-50 text-indigo-800 border-indigo-100',
  obfuscation: 'bg-orange-50 text-orange-800 border-orange-100',
  report: 'bg-rose-50 text-rose-800 border-rose-100',
};

export function ReplayGraphCard({ replay }: Props) {
  const sortedNodes = [...replay.nodes].sort((a, b) => a.timestamp - b.timestamp);
  const durationMinutes = Math.max(
    1,
    Math.round((replay.timeRange.end - replay.timeRange.start) / 60_000)
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="text-sm font-medium text-gray-700">Campaign Replay</h3>
        <span className="text-xs text-gray-500">{durationMinutes} min window</span>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-3 min-h-48">
        <div className="absolute left-5 top-6 bottom-6 w-px bg-gray-200" />
        <div className="space-y-3">
          {sortedNodes.map((node) => (
            <div key={node.id} className="relative flex items-center gap-3">
              <div className="z-10 h-3 w-3 rounded-full border-2 border-white bg-gray-400 shadow-sm" />
              <div className={`min-w-0 rounded-lg border px-3 py-2 text-xs ${NODE_STYLES[node.kind]}`}>
                <div className="font-medium truncate">{node.label}</div>
                <div className="opacity-75 capitalize">{node.kind}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {replay.edges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {replay.edges.slice(0, 8).map((edge, index) => (
            <span
              key={`${edge.source}-${edge.target}-${index}`}
              className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
            >
              {edge.kind.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
