export interface KeywordCategory {
  id: string;
  label: string;
  type: 'single' | 'multi';
  maxSelections?: number;
  belongsTo: 'aboutMe' | 'desiredPartner';
  options: KeywordOption[];
}

export interface KeywordOption {
  id: string;
  label: string;
  emoji?: string;
}

export const LIFESTYLE_OPTIONS: KeywordOption[] = [
  { id: 'active', label: '활동적인 편이에요', emoji: '🏃' },
  { id: 'homebody', label: '집에서 쉬는 걸 좋아해요', emoji: '🏠' },
  { id: 'balanced', label: '밖과 집이 적당히 좋아요', emoji: '⚖️' },
];

export const DRINKING_OPTIONS: KeywordOption[] = [
  { id: 'often', label: '술자리를 좋아해요', emoji: '🍻' },
  { id: 'sometimes', label: '가볍게 마셔요', emoji: '🍷' },
  { id: 'never', label: '술은 거의 마시지 않아요', emoji: '🥤' },
];

export const SMOKING_OPTIONS: KeywordOption[] = [
  { id: 'yes', label: '흡연해요', emoji: '🚬' },
  { id: 'no', label: '비흡연이에요', emoji: '🌿' },
];

export const MBTI_OPTIONS: KeywordOption[] = [
  { id: 'INTJ', label: 'INTJ' }, { id: 'INTP', label: 'INTP' },
  { id: 'ENTJ', label: 'ENTJ' }, { id: 'ENTP', label: 'ENTP' },
  { id: 'INFJ', label: 'INFJ' }, { id: 'INFP', label: 'INFP' },
  { id: 'ENFJ', label: 'ENFJ' }, { id: 'ENFP', label: 'ENFP' },
  { id: 'ISTJ', label: 'ISTJ' }, { id: 'ISFJ', label: 'ISFJ' },
  { id: 'ESTJ', label: 'ESTJ' }, { id: 'ESFJ', label: 'ESFJ' },
  { id: 'ISTP', label: 'ISTP' }, { id: 'ISFP', label: 'ISFP' },
  { id: 'ESTP', label: 'ESTP' }, { id: 'ESFP', label: 'ESFP' },
];

export const PERSONALITY_OPTIONS: KeywordOption[] = [
  { id: 'humorous', label: '유머러스해요', emoji: '😄' },
  { id: 'calm', label: '차분한 편이에요', emoji: '🌿' },
  { id: 'passionate', label: '열정적인 편이에요', emoji: '🔥' },
  { id: 'affectionate', label: '다정한 편이에요', emoji: '💗' },
  { id: 'honest', label: '솔직한 편이에요', emoji: '🫶' },
  { id: 'positive', label: '긍정적인 편이에요', emoji: '☀️' },
  { id: 'careful', label: '신중한 편이에요', emoji: '🧐' },
  { id: 'social', label: '사람 만나는 걸 좋아해요', emoji: '🗣️' },
  { id: 'independent', label: '혼자만의 시간도 중요해요', emoji: '🛋️' },
  { id: 'emotional', label: '감수성이 풍부해요', emoji: '🎧' },
  { id: 'rational', label: '이성적으로 생각해요', emoji: '🧠' },
  { id: 'considerate', label: '배려심이 있어요', emoji: '🤝' },
];

export const CONVERSATION_OPTIONS: KeywordOption[] = [
  { id: 'talkative', label: '대화가 자연스럽게 이어져요', emoji: '💬' },
  { id: 'listener', label: '잘 들어주는 편이에요', emoji: '👂' },
  { id: 'depends', label: '상황에 따라 달라요', emoji: '🙂' },
];

export const INTEREST_OPTIONS: KeywordOption[] = [
  { id: 'exercise', label: '운동', emoji: '🏃' },
  { id: 'music', label: '음악', emoji: '🎵' },
  { id: 'movies', label: '영화/드라마', emoji: '🎬' },
  { id: 'reading', label: '독서', emoji: '📚' },
  { id: 'travel', label: '여행', emoji: '✈️' },
  { id: 'gaming', label: '게임', emoji: '🎮' },
  { id: 'food', label: '맛집 탐방', emoji: '🍽️' },
  { id: 'cafe', label: '카페', emoji: '☕' },
  { id: 'photography', label: '사진', emoji: '📷' },
  { id: 'cooking', label: '요리', emoji: '🍳' },
  { id: 'pets', label: '반려동물', emoji: '🐶' },
  { id: 'selfdev', label: '자기계발', emoji: '✍️' },
  { id: 'fashion', label: '패션', emoji: '🧥' },
  { id: 'art', label: '전시/예술', emoji: '🎨' },
];

export const VIBE_OPTIONS: KeywordOption[] = [
  { id: 'comfortable', label: '편안한 분위기', emoji: '🌿' },
  { id: 'exciting', label: '설레는 분위기', emoji: '✨' },
  { id: 'intellectual', label: '대화가 잘 통하는 분위기', emoji: '🧠' },
  { id: 'funny', label: '웃음이 많은 분위기', emoji: '😄' },
  { id: 'serious', label: '진지한 만남도 괜찮아요', emoji: '🤍' },
  { id: 'casual', label: '가볍게 알아가고 싶어요', emoji: '🍃' },
];

export const DATE_STYLE_OPTIONS: KeywordOption[] = [
  { id: 'restaurant', label: '맛집 데이트', emoji: '🍽️' },
  { id: 'cafe', label: '카페 데이트', emoji: '☕' },
  { id: 'movie', label: '영화/공연 데이트', emoji: '🎬' },
  { id: 'walk', label: '산책 데이트', emoji: '🚶' },
  { id: 'activity', label: '액티비티 데이트', emoji: '🏃' },
  { id: 'home', label: '집 근처 가벼운 데이트', emoji: '🏡' },
  { id: 'concert', label: '콘서트 데이트', emoji: '🎵' },
  { id: 'bookstore', label: '서점 데이트', emoji: '📚' },
];

export const DEALBREAKER_OPTIONS: KeywordOption[] = [
  { id: 'smoker', label: '흡연은 피하고 싶어요', emoji: '🚭' },
  { id: 'heavy-drinker', label: '과한 음주는 부담돼요', emoji: '🥃' },
  { id: 'slow-replier', label: '답장이 너무 느리면 아쉬워요', emoji: '⏳' },
  { id: 'no-plans', label: '약속을 자주 미루면 아쉬워요', emoji: '🗓️' },
  { id: 'too-fast', label: '너무 빠른 진도는 부담돼요', emoji: '🐢' },
];

export const PROFILE_CATEGORIES: KeywordCategory[] = [
  { id: 'lifestyle', label: '라이프스타일', type: 'single', belongsTo: 'aboutMe', options: LIFESTYLE_OPTIONS },
  { id: 'drinking', label: '음주', type: 'single', belongsTo: 'aboutMe', options: DRINKING_OPTIONS },
  { id: 'smoking', label: '흡연', type: 'single', belongsTo: 'aboutMe', options: SMOKING_OPTIONS },
  { id: 'mbti', label: 'MBTI', type: 'single', belongsTo: 'aboutMe', options: MBTI_OPTIONS },
  { id: 'personality', label: '성격 키워드', type: 'multi', maxSelections: 5, belongsTo: 'aboutMe', options: PERSONALITY_OPTIONS },
  { id: 'conversation', label: '대화 스타일', type: 'single', belongsTo: 'aboutMe', options: CONVERSATION_OPTIONS },
  { id: 'interests', label: '관심사', type: 'multi', maxSelections: 7, belongsTo: 'aboutMe', options: INTEREST_OPTIONS },
  { id: 'vibe', label: '원하는 만남 분위기', type: 'multi', maxSelections: 3, belongsTo: 'desiredPartner', options: VIBE_OPTIONS },
  { id: 'dateStyle', label: '선호하는 데이트', type: 'single', belongsTo: 'desiredPartner', options: DATE_STYLE_OPTIONS },
  { id: 'dealBreakers', label: '피하고 싶은 조건', type: 'multi', maxSelections: 3, belongsTo: 'desiredPartner', options: DEALBREAKER_OPTIONS },
];
