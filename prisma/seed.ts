import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import crypto from "crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function shouldSeedTestData() {
  const flag = process.env.SEED_TEST_DATA?.trim().toLowerCase();
  return flag === "true";
}

// ─────────────────────────────────────────────
// 카테고리 / 키워드 seed 데이터
// ─────────────────────────────────────────────
type CategorySeed = {
  category_code: string;
  name: string;
  selection_type: "single" | "multi";
  max_select_count: number;
  keywords: Array<{ code: string; label: string }>;
};

const categorySeeds: CategorySeed[] = [
  {
    category_code: "lifestyle",
    name: "라이프스타일",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      { code: "active", label: "활동적인 편이에요" },
      { code: "homebody", label: "집에서 쉬는 걸 좋아해요" },
      { code: "balanced", label: "밖과 집이 적당히 좋아요" },
    ],
  },
  {
    category_code: "drinking",
    name: "음주",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      { code: "often", label: "술자리를 좋아해요" },
      { code: "sometimes", label: "가볍게 마셔요" },
      { code: "never", label: "술은 거의 마시지 않아요" },
    ],
  },
  {
    category_code: "smoking",
    name: "흡연",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      { code: "yes", label: "흡연해요" },
      { code: "no", label: "비흡연이에요" },
    ],
  },
  {
    category_code: "mbti",
    name: "MBTI",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      { code: "intj", label: "INTJ" },
      { code: "intp", label: "INTP" },
      { code: "entj", label: "ENTJ" },
      { code: "entp", label: "ENTP" },
      { code: "infj", label: "INFJ" },
      { code: "infp", label: "INFP" },
      { code: "enfj", label: "ENFJ" },
      { code: "enfp", label: "ENFP" },
      { code: "istj", label: "ISTJ" },
      { code: "isfj", label: "ISFJ" },
      { code: "estj", label: "ESTJ" },
      { code: "esfj", label: "ESFJ" },
      { code: "istp", label: "ISTP" },
      { code: "isfp", label: "ISFP" },
      { code: "estp", label: "ESTP" },
      { code: "esfp", label: "ESFP" },
    ],
  },
  {
    category_code: "personality",
    name: "성격 키워드",
    selection_type: "multi",
    max_select_count: 5,
    keywords: [
      { code: "humorous", label: "유머러스해요" },
      { code: "calm", label: "차분한 편이에요" },
      { code: "passionate", label: "열정적인 편이에요" },
      { code: "affectionate", label: "다정한 편이에요" },
      { code: "honest", label: "솔직한 편이에요" },
      { code: "positive", label: "긍정적인 편이에요" },
      { code: "careful", label: "신중한 편이에요" },
      { code: "social", label: "사람 만나는 걸 좋아해요" },
      { code: "independent", label: "혼자만의 시간도 중요해요" },
      { code: "emotional", label: "감수성이 풍부해요" },
      { code: "rational", label: "이성적으로 생각해요" },
      { code: "considerate", label: "배려심이 있어요" },
    ],
  },
  {
    category_code: "conversation",
    name: "대화 스타일",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      { code: "talkative", label: "대화가 자연스럽게 이어져요" },
      { code: "listener", label: "잘 들어주는 편이에요" },
      { code: "depends", label: "상황에 따라 달라요" },
    ],
  },
  {
    category_code: "interests",
    name: "관심사",
    selection_type: "multi",
    max_select_count: 7,
    keywords: [
      { code: "exercise", label: "운동" },
      { code: "music", label: "음악" },
      { code: "movies", label: "영화/드라마" },
      { code: "reading", label: "독서" },
      { code: "travel", label: "여행" },
      { code: "gaming", label: "게임" },
      { code: "food", label: "맛집 탐방" },
      { code: "cafe", label: "카페" },
      { code: "photography", label: "사진" },
      { code: "cooking", label: "요리" },
      { code: "pets", label: "반려동물" },
      { code: "selfdev", label: "자기계발" },
      { code: "fashion", label: "패션" },
      { code: "art", label: "전시/예술" },
    ],
  },
  {
    category_code: "desired_vibe",
    name: "원하는 만남 분위기",
    selection_type: "multi",
    max_select_count: 3,
    keywords: [
      { code: "comfortable", label: "편안한 분위기" },
      { code: "exciting", label: "설레는 분위기" },
      { code: "intellectual", label: "대화가 잘 통하는 분위기" },
      { code: "funny", label: "웃음이 많은 분위기" },
      { code: "serious", label: "진지한 만남도 괜찮아요" },
      { code: "casual", label: "가볍게 알아가고 싶어요" },
    ],
  },
  {
    category_code: "date_style",
    name: "선호하는 데이트",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      { code: "restaurant", label: "맛집 데이트" },
      { code: "cafe", label: "카페 데이트" },
      { code: "movie", label: "영화/공연 데이트" },
      { code: "walk", label: "산책 데이트" },
      { code: "activity", label: "액티비티 데이트" },
      { code: "home", label: "집 근처 가벼운 데이트" },
      { code: "concert", label: "콘서트 데이트" },
      { code: "bookstore", label: "서점 데이트" },
    ],
  },
  {
    category_code: "deal_breakers",
    name: "피하고 싶은 조건",
    selection_type: "multi",
    max_select_count: 3,
    keywords: [
      { code: "slow-replier", label: "답장이 너무 느리면 아쉬워요" },
      { code: "no-plans", label: "약속을 자주 미루면 아쉬워요" },
      { code: "too-fast", label: "너무 빠른 진도는 부담돼요" },
    ],
  },
];

// ─────────────────────────────────────────────
// 정적 taxonomy 계약 검증
// ─────────────────────────────────────────────
const EXPECTED_KEYWORD_COUNTS: Record<string, number> = {
  lifestyle: 3,
  drinking: 3,
  smoking: 2,
  mbti: 16,
  personality: 12,
  conversation: 3,
  interests: 14,
  desired_vibe: 6,
  date_style: 8,
  deal_breakers: 3,
};

function assertTaxonomyContract() {
  const categoryCodes = categorySeeds.map((c) => c.category_code);
  const dupCategory = categoryCodes.find((code, i) => categoryCodes.indexOf(code) !== i);
  if (dupCategory) throw new Error(`[taxonomy] 중복 category_code: ${dupCategory}`);

  for (const cat of categorySeeds) {
    const codes = cat.keywords.map((k) => k.code);
    const dupCode = codes.find((c, i) => codes.indexOf(c) !== i);
    if (dupCode) throw new Error(`[taxonomy] ${cat.category_code}: 중복 keyword_code: ${dupCode}`);

    const expected = EXPECTED_KEYWORD_COUNTS[cat.category_code];
    if (expected !== undefined && cat.keywords.length !== expected) {
      throw new Error(
        `[taxonomy] ${cat.category_code}: keyword 수 불일치 (expected ${expected}, got ${cat.keywords.length})`
      );
    }
  }

  for (const code of Object.keys(EXPECTED_KEYWORD_COUNTS)) {
    if (!categoryCodes.includes(code)) {
      throw new Error(`[taxonomy] 누락된 category_code: ${code}`);
    }
  }

  console.log("[taxonomy] 계약 검증 통과 ✓");
}

// ─────────────────────────────────────────────
// Cleanup 함수
// ─────────────────────────────────────────────
const OBSOLETE_KOREAN_CATEGORY_CODES = ["personality_kr", "hobby_kr", "love_style"];

async function cleanupObsoleteKoreanCategories() {
  for (const categoryCode of OBSOLETE_KOREAN_CATEGORY_CODES) {
    const category = await prisma.category.findUnique({ where: { category_code: categoryCode } });
    if (!category) continue;

    const keywords = await prisma.keyword.findMany({
      where: { category_id: category.category_id },
      select: { keyword_id: true },
    });
    const keywordIds = keywords.map((k) => k.keyword_id);

    if (keywordIds.length > 0) {
      await prisma.userKeywordSelection.deleteMany({ where: { keyword_id: { in: keywordIds } } });
      await prisma.keyword.deleteMany({ where: { keyword_id: { in: keywordIds } } });
    }
    await prisma.category.delete({ where: { category_id: category.category_id } });
    console.log(`[cleanup] 구 테스트 카테고리 삭제: ${categoryCode}`);
  }
}

async function cleanupObsoleteProfileKeywords() {
  for (const categorySeed of categorySeeds) {
    const category = await prisma.category.findUnique({
      where: { category_code: categorySeed.category_code },
    });
    if (!category) continue;

    const currentCodes = new Set(categorySeed.keywords.map((k) => k.code));
    const existingKeywords = await prisma.keyword.findMany({
      where: { category_id: category.category_id },
      select: { keyword_id: true, keyword_code: true },
    });

    const obsolete = existingKeywords.filter((k) => !currentCodes.has(k.keyword_code));
    if (obsolete.length === 0) continue;

    const obsoleteIds = obsolete.map((k) => k.keyword_id);
    await prisma.userKeywordSelection.deleteMany({ where: { keyword_id: { in: obsoleteIds } } });
    await prisma.keyword.deleteMany({ where: { keyword_id: { in: obsoleteIds } } });
    console.log(
      `[cleanup] ${categorySeed.category_code}: 구 keyword 삭제 → ${obsolete.map((k) => k.keyword_code).join(", ")}`
    );
  }
}

// ─────────────────────────────────────────────
// Feed 키워드 seed 데이터
// ─────────────────────────────────────────────
const feedKeywordSeeds = [
  { code: "walk",       name: "산책" },
  { code: "cafe",       name: "카페" },
  { code: "restaurant", name: "맛집" },
  { code: "study",      name: "공부" },
  { code: "movie",      name: "영화" },
  { code: "drive",      name: "드라이브" },
  { code: "exercise",   name: "운동" },
  { code: "exhibition", name: "전시" },
  { code: "drink",      name: "술" },
  { code: "reading",    name: "독서" },
  { code: "chat",       name: "수다" },
  { code: "hobby",      name: "취미" },
  { code: "festival",   name: "축제" },
];

// ─────────────────────────────────────────────
// 장소 카테고리 seed 데이터
// ─────────────────────────────────────────────
const placeCategorySeeds = [
  { code: "cafe",       name: "Cafe" },
  { code: "restaurant", name: "Restaurant" },
  { code: "dessert",    name: "Dessert" },
  { code: "bar",        name: "Bar" },
  { code: "park",       name: "Park" },
  { code: "activity",   name: "Activity" },
  { code: "campus",     name: "Campus" },
  { code: "egg",        name: "플러팅"},
  { code: "coding",     name: "컴공"},
  { code: "gate",        name: "Gate"},

];

const placeSeeds :{
  categoryCode: string;
    places: {
      name: string;
      address?: string;
      description: string;
      image_url?: string;
      tags: string[];
    }[];
  }[] =[
  {
    categoryCode: "campus",
    places: [
      { name: "B동",   description: "인제대학교 B동",    tags: ["b동", "비동"]},
      { name: "C동",   description: "인제대학교 C동",    tags: ["c동", "씨동"], image_url: "/place/place_C.jpg" },
      { name: "E동",   description: "인제대학교 E동",    tags: ["e동", "이동"], image_url: "/place/place_E.jpg" },
      { name: "F동",   description: "인제대학교 F동",    tags: ["f동", "에프동"], image_url: "/place/place_F5.jpg" },
      { name: "H동",   description: "인제대학교 H동",    tags: ["h동", "에이치동"], image_url: "/place/Place_H1.jpg" },
      { name: "G동",   description: "인제대학교 G동",    tags: ["g동", "지동"], image_url: "/place/place_G.jpg" },
      { name: "J동",   description: "인제대학교 j동",    tags: ["j동", "제이동"], image_url: "/place/Place_J1.jpg" },
      { name: "도서관", description: "인제대학교 중앙도서관", tags: ["도서관", "도서", "공부"], image_url: "/place/place_Lib1.jpg" },
      { name: "본관",  description: "인제대학교 본관",    tags: ["본관", "행정관"], image_url: "/place/place_본관1.jpg" },
    ]
  },
  {
    categoryCode:"cafe",
    places:[
      { name: "Cafe_ing",  description: "인제대학교 다인지하카페",    tags: ["카페잉", "카페", "cafeing", "잉", "다인카페"], image_url: "/place/cafe_ing.jpg" },
      { name: "늘빛라운지",  description: "인제대학교 다인늘빛라운지",    tags: ["라운지", "늘빛라운지"], image_url: "/place/neulbitLaunge.jpg" },
    ]
  },
  {
    categoryCode: "park",
    places: [
      { name: "BC파크",      description: "인제대학교 BC공원",    tags: ["공원", "BC파크"], image_url: "/place/BCpark2.jpg" },
      { name: "늘빛파크",     description: "인제대학교 늘빛공원",    tags: ["공원", "늘빛공원"], image_url: "/place/backgom2.jpg" },

    ]
  },
  {
    categoryCode: "restaurant",
    places:[
      { name: "다인",       description: "인제대학교 다인",    tags: ["밥", "학식", "식당", "다인"], image_url: "/place/dine1.jpg" },
      { name: "버거잉",       description: "인제대학교 버거잉",    tags: ["밥", "버거잉", "H동버거", "h동버거"], image_url: "/place/bugering.jpg" },

    ]
  },
  {
    categoryCode: "activity",
    places:[
      { name: "운동장",     description: "인제대학교 운동장",    tags: ["운동", "축구", "달리기"], image_url: "/place/Place_platGround2.jpg" },
    ]
  },
  {
    categoryCode: "egg",
    places:[
      { name: "백곰",       description: "인제대학교 마스코트",    tags: ["백곰이", "백곰", "마스코트"], image_url: "/place/egg.png" },
    ]
  },
  {
    categoryCode: "coding",
    places:[
      { name: "코딩하는 백곰이",       description: "인제대학교 마스코트",    tags: ["코딩", "백곰이", "백곰", "마스코트", "컴공"], image_url: "/place/coding.png" },
    ]
  },
  {
    categoryCode: "gate",
    places:[
      { name: "중문",       description: "인제대학교 중문",    tags: ["중문", "문"], image_url: "/place/Place_middleGate.jpg" },
    ]
  },
];

// ─────────────────────────────────────────────
// 테스트 유저 seed 데이터 (10명)
// ─────────────────────────────────────────────
const testUserSeeds = [
  {
    real_name: "테스트유저A",
    age: 25,
    email: "test_a@inje.ac.kr",
    password_hash: "test_hash_a",
    nickname: "테스트A",
    gender: "male",
    university: "인제대학교",
    department: "컴퓨터공학과",
    student_year: 3,
    status: "active" as const,
    onboarding_completed: true,
    bio: "안녕하세요 컴공 3학년입니다",
  },
  {
    real_name: "테스트유저B",
    age: 24,
    email: "test_b@inje.ac.kr",
    password_hash: "test_hash_b",
    nickname: "테스트B",
    gender: "female",
    university: "인제대학교",
    department: "간호학과",
    student_year: 2,
    status: "active" as const,
    onboarding_completed: true,
    bio: "간호학과 2학년이에요",
  },
  {
    real_name: "테스트유저C",
    age: 23,
    email: "test_c@inje.ac.kr",
    password_hash: "test_hash_c",
    nickname: "테스트C",
    gender: "male",
    university: "인제대학교",
    department: "소프트웨어학과",
    student_year: 1,
    status: "active" as const,
    onboarding_completed: true,
    bio: "소웨 1학년입니다",
  },
  {
    real_name: "테스트유저D",
    age: 25,
    email: "test_d@inje.ac.kr",
    password_hash: "test_hash_d",
    nickname: "테스트D",
    gender: "female",
    university: "인제대학교",
    department: "컴퓨터공학과",
    student_year: 3,
    status: "active" as const,
    onboarding_completed: true,
    bio: "컴공 3학년 여학생입니다",
  },
  {
    real_name: "테스트유저E",
    age: 22,
    email: "test_e@inje.ac.kr",
    password_hash: "test_hash_e",
    nickname: "테스트E",
    gender: "male",
    university: "인제대학교",
    department: "간호학과",
    student_year: 1,
    status: "active" as const,
    onboarding_completed: true,
    bio: "간호학과 1학년 남학생",
  },
  {
    real_name: "테스트유저F",
    age: 23,
    email: "test_f@inje.ac.kr",
    password_hash: "test_hash_f",
    nickname: "테스트F",
    gender: "female",
    university: "인제대학교",
    department: "소프트웨어학과",
    student_year: 2,
    status: "active" as const,
    onboarding_completed: true,
    bio: "소웨 2학년이에요",
  },
  {
    real_name: "테스트유저G",
    age: 24,
    email: "test_g@inje.ac.kr",
    password_hash: "test_hash_g",
    nickname: "테스트G",
    gender: "male",
    university: "인제대학교",
    department: "의학과",
    student_year: 2,
    status: "active" as const,
    onboarding_completed: true,
    bio: "의학과 2학년입니다",
  },
  {
    real_name: "테스트유저H",
    age: 22,
    email: "test_h@inje.ac.kr",
    password_hash: "test_hash_h",
    nickname: "테스트H",
    gender: "female",
    university: "인제대학교",
    department: "의학과",
    student_year: 1,
    status: "active" as const,
    onboarding_completed: true,
    bio: "의학과 1학년이에요",
  },
  {
    real_name: "테스트유저I",
    age: 26,
    email: "test_i@inje.ac.kr",
    password_hash: "test_hash_i",
    nickname: "테스트I",
    gender: "male",
    university: "인제대학교",
    department: "교육학과",
    student_year: 4,
    status: "active" as const,
    onboarding_completed: true,
    bio: "교육학과 4학년",
  },
  {
    real_name: "테스트유저J",
    age: 26,
    email: "test_j@inje.ac.kr",
    password_hash: "test_hash_j",
    nickname: "테스트J",
    gender: "female",
    university: "인제대학교",
    department: "교육학과",
    student_year: 4,
    status: "active" as const,
    onboarding_completed: true,
    bio: "교육학과 4학년 여학생",
  },
];

// ─────────────────────────────────────────────
// 테스트 유저 키워드 할당
// ─────────────────────────────────────────────
const testUserKeywordSeeds: Array<{
  email: string;
  keywords: Array<{ categoryCode: string; keywordCode: string }>;
}> = [
  {
    email: "test_a@inje.ac.kr",
    keywords: [
      { categoryCode: "lifestyle", keywordCode: "active" },
      { categoryCode: "interests", keywordCode: "exercise" },
      { categoryCode: "personality", keywordCode: "affectionate" },
    ],
  },
  {
    email: "test_b@inje.ac.kr",
    keywords: [
      { categoryCode: "lifestyle", keywordCode: "active" },
      { categoryCode: "interests", keywordCode: "travel" },
      { categoryCode: "personality", keywordCode: "affectionate" },
    ],
  },
  {
    email: "test_c@inje.ac.kr",
    keywords: [
      { categoryCode: "lifestyle", keywordCode: "balanced" },
      { categoryCode: "interests", keywordCode: "reading" },
      { categoryCode: "personality", keywordCode: "considerate" },
    ],
  },
  {
    email: "test_d@inje.ac.kr",
    keywords: [
      { categoryCode: "personality", keywordCode: "humorous" },
      { categoryCode: "interests", keywordCode: "gaming" },
      { categoryCode: "personality", keywordCode: "emotional" },
    ],
  },
  {
    email: "test_e@inje.ac.kr",
    keywords: [
      { categoryCode: "lifestyle", keywordCode: "active" },
      { categoryCode: "interests", keywordCode: "exercise" },
      { categoryCode: "personality", keywordCode: "emotional" },
    ],
  },
  {
    email: "test_f@inje.ac.kr",
    keywords: [
      { categoryCode: "lifestyle", keywordCode: "balanced" },
      { categoryCode: "interests", keywordCode: "cooking" },
      { categoryCode: "personality", keywordCode: "considerate" },
    ],
  },
  {
    email: "test_g@inje.ac.kr",
    keywords: [
      { categoryCode: "personality", keywordCode: "calm" },
      { categoryCode: "interests", keywordCode: "reading" },
      { categoryCode: "personality", keywordCode: "affectionate" },
    ],
  },
  {
    email: "test_h@inje.ac.kr",
    keywords: [
      { categoryCode: "lifestyle", keywordCode: "active" },
      { categoryCode: "interests", keywordCode: "travel" },
      { categoryCode: "personality", keywordCode: "affectionate" },
    ],
  },
  {
    email: "test_i@inje.ac.kr",
    keywords: [
      { categoryCode: "personality", keywordCode: "humorous" },
      { categoryCode: "interests", keywordCode: "exercise" },
      { categoryCode: "personality", keywordCode: "emotional" },
    ],
  },
  {
    email: "test_j@inje.ac.kr",
    keywords: [
      { categoryCode: "lifestyle", keywordCode: "balanced" },
      { categoryCode: "interests", keywordCode: "travel" },
      { categoryCode: "personality", keywordCode: "considerate" },
    ],
  },
];

// ─────────────────────────────────────────────
// 테스트 세션 토큰
// ─────────────────────────────────────────────
const testSessionSeeds = [
  { email: "test_a@inje.ac.kr", token: "test_token_a" },
  { email: "test_b@inje.ac.kr", token: "test_token_b" },
  { email: "test_c@inje.ac.kr", token: "test_token_c" },
  { email: "test_d@inje.ac.kr", token: "test_token_d" },
  { email: "test_e@inje.ac.kr", token: "test_token_e" },
  { email: "test_f@inje.ac.kr", token: "test_token_f" },
  { email: "test_g@inje.ac.kr", token: "test_token_g" },
  { email: "test_h@inje.ac.kr", token: "test_token_h" },
  { email: "test_i@inje.ac.kr", token: "test_token_i" },
  { email: "test_j@inje.ac.kr", token: "test_token_j" },
];

// ─────────────────────────────────────────────
// Seed 함수
// ─────────────────────────────────────────────
async function seedCategories() {
  for (const categorySeed of categorySeeds) {
    const category = await prisma.category.upsert({
      where: { category_code: categorySeed.category_code },
      update: {
        name: categorySeed.name,
        selection_type: categorySeed.selection_type,
        max_select_count: categorySeed.max_select_count,
      },
      create: {
        category_code: categorySeed.category_code,
        name: categorySeed.name,
        selection_type: categorySeed.selection_type,
        max_select_count: categorySeed.max_select_count,
      },
    });

    for (const [index, keyword] of categorySeed.keywords.entries()) {
      await prisma.keyword.upsert({
        where: {
          category_id_keyword_code: {
            category_id: category.category_id,
            keyword_code: keyword.code,
          },
        },
        update: { label: keyword.label, sort_order: index + 1 },
        create: {
          category_id: category.category_id,
          keyword_code: keyword.code,
          label: keyword.label,
          sort_order: index + 1,
        },
      });
    }
  }
}

async function seedFeedKeywords() {
  for (const [index, keyword] of feedKeywordSeeds.entries()) {
    await prisma.feedKeyword.upsert({
      where: { code: keyword.code },
      update: { name: keyword.name, sort_order: index + 1, is_active: true },
      create: { code: keyword.code, name: keyword.name, sort_order: index + 1, is_active: true },
    });
  }
}

async function seedPlaceCategories() {
  for (const placeCategory of placeCategorySeeds) {
    await prisma.placeCategory.upsert({
      where: { code: placeCategory.code },
      update: { name: placeCategory.name },
      create: placeCategory,
    });
  }
}

async function seedTestUsers() {
  for (const user of testUserSeeds) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        nickname: user.nickname,
        real_name: user.real_name,
        status: user.status,
        onboarding_completed: user.onboarding_completed,
        bio: user.bio,
      },
      create: user,
    });
  }
}

async function seedTestInterests() {
  // 기존 호감 INSERT 로직 제거
}

async function seedTestFeedAndComment() {
  const userB = await prisma.user.findUnique({ where: { email: "test_b@inje.ac.kr" } });
  const userA = await prisma.user.findUnique({ where: { email: "test_a@inje.ac.kr" } });
  if (!userA || !userB) return;

  const existingFeed = await prisma.selfDateFeed.findFirst({
    where: { author_user_id: userB.id },
  });

  const feed = existingFeed ?? await prisma.selfDateFeed.create({
    data: {
      author_user_id: userB.id,
      text: "테스트 피드입니다",
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const existingComment = await prisma.feedComment.findFirst({
    where: { feed_id: feed.id, commenter_user_id: userA.id },
  });

  if (!existingComment) {
    await prisma.feedComment.create({
      data: {
        feed_id: feed.id,
        commenter_user_id: userA.id,
        content: "테스트 댓글입니다",
      },
    });
  }
}

async function seedTestUserKeywords() {
  const allKeywords = await prisma.keyword.findMany({
    select: {
      keyword_id: true,
      keyword_code: true,
      category_id: true,
      category: { select: { category_code: true } },
    },
  });
  const codeToKeyword = new Map(
    allKeywords.map((k) => [`${k.category.category_code}:${k.keyword_code}`, k])
  );

  for (const seed of testUserKeywordSeeds) {
    const user = await prisma.user.findUnique({ where: { email: seed.email } });
    if (!user) continue;

    for (const ref of seed.keywords) {
      const compositeKey = `${ref.categoryCode}:${ref.keywordCode}`;
      const kw = codeToKeyword.get(compositeKey);
      if (!kw) {
        console.warn(`키워드 없음: "${compositeKey}"`);
        continue;
      }

      await prisma.userKeywordSelection.upsert({
        where: {
          user_id_keyword_id: { user_id: user.id, keyword_id: kw.keyword_id },
        },
        update: {},
        create: {
          user_id: user.id,
          category_id: kw.category_id,
          keyword_id: kw.keyword_id,
        },
      });
    }
  }
}

async function seedTestAuthSessions() {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const lastSeenAt = new Date();

  for (const seed of testSessionSeeds) {
    const user = await prisma.user.findUnique({ where: { email: seed.email } });
    if (!user) continue;

    const tokenHash = crypto.createHash("sha256").update(seed.token).digest("hex");

    await prisma.authSession.upsert({
      where: { token_hash: tokenHash },
      update: { expires_at: expiresAt, last_seen_at: lastSeenAt },
      create: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        last_seen_at: lastSeenAt,
      },
    });
  }
}

async function seedPlaces() {
    await prisma.place.updateMany({
      where: { name: { in: ["A동", "D동"] } },
      data: { is_active: false },
    });

    for (const group of placeSeeds) {
      const category = await prisma.placeCategory.findUnique({
        where: { code: group.categoryCode }
      });
      if (!category) continue;

      for (const seed of group.places) {
        const existing = await prisma.place.findFirst({
          where: { name: seed.name }
        });

        const placeData = {
          category_id: category.id,
          name: seed.name,
          address: seed.address ?? `경남 김해시 인제로 197 ${seed.name}`,
          description: seed.description,
          image_url: seed.image_url ?? null,
          is_active: true,
        };

        const place = existing
          ? await prisma.place.update({
              where: { id: existing.id },
              data: placeData,
            })
          : await prisma.place.create({
              data: placeData,
            });

        for (const tag of seed.tags) {
          await prisma.placeTag.upsert({
            where: { place_id_tag: { place_id: place.id, tag } },
            update: {},
            create: { place_id: place.id, tag },
          });
        }
      }
    }
  }

// ─────────────────────────────────────────────
// main
// ─────────────────────────────────────────────
async function main() {
  const seedTestData = shouldSeedTestData();

  assertTaxonomyContract();
  await cleanupObsoleteKoreanCategories();
  await cleanupObsoleteProfileKeywords();
  await seedCategories();
  await seedFeedKeywords();
  await seedPlaceCategories();
  if (seedTestData) {
    await seedTestUsers();
    await seedTestInterests();
    await seedTestFeedAndComment();
    await seedTestUserKeywords();
    await seedTestAuthSessions();
  } else {
    console.log("[seed] 테스트 유저/세션 seed skipped. Set SEED_TEST_DATA=true to enable.");
  }
  await seedPlaces();

  console.log("Seed baseline data has been prepared.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
