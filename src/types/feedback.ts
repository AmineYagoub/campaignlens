export type ModFeedback =
  | 'BENIGN'
  | 'WATCH'
  | 'IGNORE'
  | 'CONFIRMED_CAMPAIGN'
  | 'FALSE_POSITIVE';

export type FeedbackRecord = {
  dossierId: string;
  action: ModFeedback;
  createdAt: number;
  signalKey: string;
};

export type PrecisionStats = {
  reviewedHighConfidence: number;
  markedFalsePositive: number;
  markedBenign: number;
  confirmedCampaign: number;
};
