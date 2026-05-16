import type { EvidenceDossier } from '../types/dossier';

const DASHBOARD_TITLE = 'campaignlens';
const DASHBOARD_TEXT = 'campaignlens moderator dashboard';
const DASHBOARD_COMBINED_TEXT = `${DASHBOARD_TITLE} ${DASHBOARD_TEXT}`;

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isCampaignLensDashboardPost(title: string, body: string): boolean {
  const normalizedTitle = normalize(title);
  const normalizedBody = normalize(body);

  return (
    normalizedTitle === DASHBOARD_TITLE &&
    (normalizedBody === DASHBOARD_TEXT || normalizedBody === `${DASHBOARD_TEXT}.`)
  );
}

export function isCampaignLensInternalDossier(dossier: EvidenceDossier): boolean {
  if (dossier.examples.length === 0) return false;

  return dossier.examples.every((example) => {
    const excerpt = normalize(example.excerpt);
    return (
      excerpt === DASHBOARD_TEXT ||
      excerpt === `${DASHBOARD_TEXT}.` ||
      excerpt === DASHBOARD_COMBINED_TEXT ||
      excerpt === `${DASHBOARD_COMBINED_TEXT}.` ||
      (excerpt.includes(DASHBOARD_TITLE) && excerpt.includes('moderator dashboard'))
    );
  });
}
