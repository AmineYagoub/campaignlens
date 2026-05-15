import type { CampaignCategory } from '../../../types/dossier';

export const CATEGORY_STYLES: Record<CampaignCategory, string> = {
  COMMERCIAL_PROMOTION: 'bg-sky-50 text-sky-700',
  POSSIBLE_HARMFUL_NARRATIVE: 'bg-rose-50 text-rose-700',
  UNKNOWN: 'bg-gray-100 text-gray-600',
};

export function categoryLabel(category: CampaignCategory): string {
  return category.replaceAll('_', ' ').toLowerCase();
}
