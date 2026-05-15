import { describe, expect, it } from 'vitest';
import {
  assertModeratorConfirmation,
  assertPreviewPolicy,
} from './enforcement-policy.service';

describe('enforcement policy', () => {
  it('rejects trigger-sourced enforcement', () => {
    expect(() =>
      assertPreviewPolicy({
        source: 'TRIGGER',
        actionKinds: ['REMOVE'],
        selectedContentIds: ['t3_post'],
      })
    ).toThrow('automated scoring or triggers');
  });

  it('rejects score-sourced enforcement', () => {
    expect(() =>
      assertPreviewPolicy({
        source: 'SCORE',
        actionKinds: ['REMOVE'],
        selectedContentIds: ['t3_post'],
      })
    ).toThrow('automated scoring or triggers');
  });

  it('requires selected content', () => {
    expect(() =>
      assertPreviewPolicy({
        source: 'MANUAL_REVIEW',
        actionKinds: ['REMOVE'],
        selectedContentIds: [],
      })
    ).toThrow('selected content');
  });

  it('blocks ban and mute actions until guardrails exist', () => {
    expect(() =>
      assertPreviewPolicy({
        source: 'MANUAL_REVIEW',
        actionKinds: ['BAN_USER'],
        selectedContentIds: ['t3_post'],
      })
    ).toThrow('BAN_USER is disabled');
  });

  it('requires explicit moderator confirmation before execution', () => {
    expect(() =>
      assertModeratorConfirmation({
        source: 'MANUAL_REVIEW',
        actionKinds: ['REMOVE'],
        selectedContentIds: ['t3_post'],
        confirmedByModerator: false,
      })
    ).toThrow('explicit moderator confirmation');
  });
});
