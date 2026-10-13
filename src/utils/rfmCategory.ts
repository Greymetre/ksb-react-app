/**
 * The five RFM categories and the colours they wear.
 *
 * A retailer's category comes from the server, worked out against the other retailers of
 * its own state: how recently it ordered, how often and for how much, each rated 1 to 5,
 * weighed 20/30/50. A retailer that has never ordered is Bronze - which is most of the
 * book, and the reason the chip is worth showing on the card at all.
 *
 * Each category carries a soft background for the chip and a darker ink that stays
 * readable on it.
 */
export type RfmCategory = 'Platinum' | 'Diamond' | 'Gold' | 'Silver' | 'Bronze';

export const RFM_CATEGORY_COLORS: Record<RfmCategory, { background: string; text: string; dot: string }> = {
  Platinum: { background: '#E7F8F1', text: '#078757', dot: '#10A66D' },
  Diamond: { background: '#EAF2FF', text: '#2B5FAE', dot: '#3B7DD8' },
  Gold: { background: '#FFF7E7', text: '#BE7600', dot: '#F2A51A' },
  Silver: { background: '#FFF0F4', text: '#C54264', dot: '#DF6B89' },
  Bronze: { background: '#F1F2F6', text: '#5C6472', dot: '#8A93A5' },
};

/** The colours for whatever the server sent, falling back to Bronze for anything unknown. */
export const rfmCategoryColors = (category?: string | null) =>
  RFM_CATEGORY_COLORS[(category as RfmCategory) in RFM_CATEGORY_COLORS ? (category as RfmCategory) : 'Bronze'];
