import axiosClient from './AxiosClient';

/** One month's score for an employee, keyed "YYYY-MM" in the API. */
export type RatingMonth = {
  key: string;
  label: string;
  fullLabel: string;
  inProgress: boolean;
};

/** One scored driver behind a month's rating, as the detail popup lists it. */
export type RatingComponent = {
  key: string;
  label: string;
  percentage: number;
  actual: number;
  target: number;
  weight: number;
  weightedScore: number;
  description: string;
};

export type RatingMonthDetail = {
  finalRating: number;
  components: RatingComponent[];
};

export type RatingRow = {
  userId: number;
  employeeName: string;
  employeeCode: string;
  branch: string;
  zone: string;
  reportingManager: string;
  averageRating: number;
  averageMonthCount: number;
  /** First month this person is rated for - blank months before it are not their fault. */
  ratingStartMonth: string;
  monthlyRatings: Record<string, number>;
  monthlyDetails: Record<string, RatingMonthDetail>;
};

export type RatingDashboard = {
  periodLabel: string;
  months: RatingMonth[];
  totalEmployees: number;
  averageRating: number;
  rows: RatingRow[];
};

export type TopPerformer = {
  userId: number;
  name: string;
  employeeCode: string;
  branch: string;
  zone: string;
  /** Stored path, resolved against the app's own origin. Empty for most people today. */
  profileImage: string;
  rating: number;
};

export type ZoneTopPerformers = {
  zone: string;
  asr: TopPerformer | null;
  dsr: TopPerformer | null;
};

export type TopPerformers = {
  monthLabel: string;
  allIndia: { asr: TopPerformer | null; dsr: TopPerformer | null };
  zones: ZoneTopPerformers[];
};

const num = (value: any) => Number(value ?? 0) || 0;
const str = (value: any) => String(value ?? '');

const toPerformer = (raw: any): TopPerformer | null =>
  raw
    ? {
        userId: num(raw.user_id),
        name: str(raw.name),
        employeeCode: str(raw.employee_code),
        branch: str(raw.branch),
        zone: str(raw.zone),
        profileImage: str(raw.profile_image),
        rating: num(raw.rating),
      }
    : null;

export const ratingApi = {
  /** The listing. What comes back is already cut to what this user may see - a manager
   *  gets their whole downline, a field user just themselves. The app does not filter. */
  async dashboard(designationId?: number | null, search = ''): Promise<RatingDashboard> {
    const params: any = {};
    if (designationId) params.designation_id = designationId;
    if (search.trim()) params.search = search.trim();
    const response = await axiosClient.get('api/ratings/dashboard', { params });
    const data: any = response.data || {};
    return {
      periodLabel: str(data.period?.label),
      months: (data.period?.months || []).map((m: any) => ({
        key: str(m.key),
        label: str(m.label),
        fullLabel: str(m.full_label),
        inProgress: m.in_progress === true,
      })),
      totalEmployees: num(data.summary?.total_employees),
      averageRating: num(data.summary?.average_rating),
      rows: (data.rows || []).map((r: any) => ({
        userId: num(r.user_id),
        employeeName: str(r.employee_name),
        employeeCode: str(r.employee_code),
        branch: str(r.branch),
        zone: str(r.zone),
        reportingManager: str(r.reporting_manager),
        averageRating: num(r.average_rating),
        averageMonthCount: num(r.average_month_count),
        ratingStartMonth: str(r.rating_start_month),
        monthlyRatings: r.monthly_ratings || {},
        monthlyDetails: Object.fromEntries(
          Object.entries(r.monthly_details || {}).map(([key, value]: [string, any]) => [
            key,
            {
              finalRating: num(value?.final_rating),
              components: (value?.components || []).map((c: any) => ({
                key: str(c.key),
                label: str(c.label),
                percentage: num(c.percentage),
                actual: num(c.actual),
                target: num(c.target),
                weight: num(c.weight),
                weightedScore: num(c.weighted_score),
                description: str(c.description),
              })),
            },
          ]),
        ),
      })),
    };
  },

  /** Last month's leaders. Deliberately the same for everybody - "all India" would mean
   *  nothing if it were cut to the caller's own people. */
  async topPerformers(): Promise<TopPerformers> {
    const response = await axiosClient.get('api/ratings/top-performers');
    const data: any = response.data || {};
    return {
      monthLabel: str(data.month?.full_label),
      allIndia: {
        asr: toPerformer(data.all_india?.asr),
        dsr: toPerformer(data.all_india?.dsr),
      },
      zones: (data.zones || []).map((z: any) => ({
        zone: str(z.zone),
        asr: toPerformer(z.asr),
        dsr: toPerformer(z.dsr),
      })),
    };
  },
};
