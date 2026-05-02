// 추천 api 응답 인터페이스 정의

export interface CandidateProfile {
  nickname: string;
  age: number | null;
  department: string;
  student_year: number;
  bio: string | null;
  primary_image_url: string | null;
  keywords: { category: string; label: string }[];
}

export interface RecommendationCandidate {
  item_id: number;
  candidate_user_id: number;
  rank_order: number;
  is_passed: boolean;
  blocked: boolean;
  profile: CandidateProfile | null; // null when blocked
}

export interface TodayRecommendationResponse {
  recommendation_id: number;
  recommendation_date: string;
  is_selection_made: boolean;
  selected_candidate_user_id: number | null;
  candidates: RecommendationCandidate[];
}

export interface SelectCandidateResponse {
  interest_id: number;
  matched: boolean;
  chat_room_id: number | null;
}

export interface DismissCandidateResponse {
  dismiss_id: number;
  expires_at: string;
}

export interface RecommendationSettingsResponse {
  exclude_same_department: boolean;
  reduce_same_year: boolean;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  updated_at: string | null; // 설정 미생성 시 null
}
