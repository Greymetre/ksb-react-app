/**
 * The four rating bands, kept the same as the CRM's rating report so a rating never
 * reads one colour on the phone and another on the dashboard:
 *
 *   85 and above  green
 *   65 to 85      yellow
 *   35 to 65      pink
 *   below 35      red
 *
 * A band carries two shades. `solid` is for a filled pill or bar, `text` is the darker
 * one that stays readable as writing on white - the same pair the CRM uses.
 */
type RatingBand = { solid: string; text: string };

const EXCELLENT: RatingBand = { solid: '#10A66D', text: '#078757' };
const GOOD: RatingBand = { solid: '#F2A51A', text: '#BE7600' };
const ATTENTION: RatingBand = { solid: '#DF6B89', text: '#C54264' };
const CRITICAL: RatingBand = { solid: '#DF334F', text: '#C71F3B' };

export const ratingBand = (value: number): RatingBand =>
  value >= 85 ? EXCELLENT : value >= 65 ? GOOD : value >= 35 ? ATTENTION : CRITICAL;

/** The colour to write a rating in. */
export const ratingTextTone = (value: number) => ratingBand(value).text;

/** The colour to fill a pill or a bar with. */
export const ratingSolidTone = (value: number) => ratingBand(value).solid;
