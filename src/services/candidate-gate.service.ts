import type { InteractionSketch, CandidateGateResult } from '../types/sketch';

export function isCandidate(interaction: InteractionSketch): CandidateGateResult {
  const reasons: string[] = [];

  if (interaction.hasDomain) {
    reasons.push('contains_domain');
  }

  if (interaction.hasBrand) {
    reasons.push('contains_brand');
  }

  if (interaction.hasObfuscation) {
    reasons.push('obfuscated');
  }

  return {
    isCandidate: reasons.length > 0,
    reasons,
  };
}
