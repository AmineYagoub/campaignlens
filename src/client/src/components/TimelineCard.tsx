import type { DossierTimelineItem } from '../../../types/dossier';

const KIND_STYLES: Record<DossierTimelineItem['kind'], string> = {
  mention: 'bg-blue-400',
  report: 'bg-orange-400',
  obfuscation: 'bg-red-400',
  duplicate: 'bg-purple-400',
};

export function TimelineCard({ items }: { items: DossierTimelineItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-1 bottom-1 w-px bg-gray-200" />
      {items.map((item, i) => (
        <div key={i} className="relative mb-3 last:mb-0">
          <div
            className={`absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full ${KIND_STYLES[item.kind]}`}
          />
          <div className="text-sm text-gray-700">{item.label}</div>
          <div className="text-xs text-gray-400">
            {new Date(item.timestamp).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
