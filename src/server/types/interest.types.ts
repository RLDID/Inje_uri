//호감 api 응답 인터페이스 정의

export interface InterestProfile {
  nickname: string;
  age: number | null;
  department: string;
  student_year: number;
  bio: string | null;
  primary_image_url: string | null;
}

export interface ReceivedInterestItem {
  interest_id: number;
  from_user_id: number;
  created_at: string;
  profile: InterestProfile;
}

export interface ReceivedInterestsResponse {
  interests: ReceivedInterestItem[];
  total_count: number;
}

export interface AcceptInterestResponse {
  interest_id: number;
  matched: boolean;
  chat_room_id: number | null;
}

export interface DeclineInterestResponse {
  interest_id: number;
  declined_at: string;
  rejection_notify_at: string;
}

export interface SendInterestResponse {
  interest_id: number;
  matched: boolean;
  chat_room_id: number | null;
}
