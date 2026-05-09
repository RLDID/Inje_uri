import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import crypto from "crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────
// 카테고리 / 키워드 seed 데이터
// ─────────────────────────────────────────────
const categorySeeds = [
  {
    category_code: "mbti",
    name: "MBTI",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      "INTJ", "INTP", "ENTJ", "ENTP",
      "INFJ", "INFP", "ENFJ", "ENFP",
      "ISTJ", "ISFJ", "ESTJ", "ESFJ",
      "ISTP", "ISFP", "ESTP", "ESFP",
    ],
  },
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
      { code: "smoker", label: "흡연은 피하고 싶어요" },
      { code: "heavy-drinker", label: "과한 음주는 부담돼요" },
      { code: "slow-replier", label: "답장이 너무 느리면 아쉬워요" },
      { code: "no-plans", label: "약속을 자주 미루면 아쉬워요" },
      { code: "too-fast", label: "너무 빠른 진도는 부담돼요" },
    ],
  },
];

// ─────────────────────────────────────────────
// 테스트용 한국어 키워드 카테고리
// ─────────────────────────────────────────────
const testKeywordCategorySeeds = [
  {
    category_code: "personality_kr",
    name: "성격",
    selection_type: "multi",
    max_select_count: 3,
    keywords: [
      { code: "active",    label: "활발함" },
      { code: "calm",      label: "차분함" },
      { code: "humorous",  label: "유머러스" },
      { code: "serious",   label: "진지함" },
    ],
  },
  {
    category_code: "hobby_kr",
    name: "취미",
    selection_type: "multi",
    max_select_count: 5,
    keywords: [
      { code: "exercise", label: "운동" },
      { code: "reading",  label: "독서" },
      { code: "gaming",   label: "게임" },
      { code: "cooking",  label: "요리" },
      { code: "travel",   label: "여행" },
    ],
  },
  {
    category_code: "love_style",
    name: "연애스타일",
    selection_type: "multi",
    max_select_count: 3,
    keywords: [
      { code: "caring",       label: "다정함" },
      { code: "independent",  label: "독립적" },
      { code: "expressive",   label: "표현적" },
      { code: "considerate",  label: "배려심" },
    ],
  },
];

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
];

const campusPlaceSeeds = [
  { name: "A동",   description: "인제대학교 A동",    tags: ["a동", "에이동"] },
  { name: "B동",   description: "인제대학교 B동",    tags: ["b동", "비동"] },
  { name: "C동",   description: "인제대학교 C동",    tags: ["c동", "씨동"] },
  { name: "D동",   description: "인제대학교 D동",    tags: ["d동", "디동"] },
  { name: "E동",   description: "인제대학교 E동",    tags: ["e동", "이동"] },
  { name: "F동",   description: "인제대학교 F동",    tags: ["f동", "에프동"] },
  { name: "G동",   description: "인제대학교 G동",    tags: ["g동", "지동"] },
  { name: "도서관", description: "인제대학교 중앙도서관", tags: ["도서관", "도서", "공부"] },
  { name: "본관",  description: "인제대학교 본관",    tags: ["본관", "행정관"] },
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
const testUserKeywordSeeds = [
  {
    email: "test_a@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "active" },
      { categoryCode: "hobby_kr", keywordCode: "exercise" },
      { categoryCode: "love_style", keywordCode: "caring" },
    ],
  },
  {
    email: "test_b@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "active" },
      { categoryCode: "hobby_kr", keywordCode: "travel" },
      { categoryCode: "love_style", keywordCode: "caring" },
    ],
  },
  {
    email: "test_c@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "calm" },
      { categoryCode: "hobby_kr", keywordCode: "reading" },
      { categoryCode: "love_style", keywordCode: "considerate" },
    ],
  },
  {
    email: "test_d@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "humorous" },
      { categoryCode: "hobby_kr", keywordCode: "gaming" },
      { categoryCode: "love_style", keywordCode: "expressive" },
    ],
  },
  {
    email: "test_e@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "active" },
      { categoryCode: "hobby_kr", keywordCode: "exercise" },
      { categoryCode: "love_style", keywordCode: "expressive" },
    ],
  },
  {
    email: "test_f@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "calm" },
      { categoryCode: "hobby_kr", keywordCode: "cooking" },
      { categoryCode: "love_style", keywordCode: "considerate" },
    ],
  },
  {
    email: "test_g@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "serious" },
      { categoryCode: "hobby_kr", keywordCode: "reading" },
      { categoryCode: "love_style", keywordCode: "caring" },
    ],
  },
  {
    email: "test_h@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "active" },
      { categoryCode: "hobby_kr", keywordCode: "travel" },
      { categoryCode: "love_style", keywordCode: "caring" },
    ],
  },
  {
    email: "test_i@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "humorous" },
      { categoryCode: "hobby_kr", keywordCode: "exercise" },
      { categoryCode: "love_style", keywordCode: "expressive" },
    ],
  },
  {
    email: "test_j@inje.ac.kr",
    keywords: [
      { categoryCode: "personality_kr", keywordCode: "calm" },
      { categoryCode: "hobby_kr", keywordCode: "travel" },
      { categoryCode: "love_style", keywordCode: "considerate" },
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
// 헬퍼
// ─────────────────────────────────────────────
function toKeywordCode(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getCategoryKeywordCode(keyword: string | { code: string; label: string }) {
  return typeof keyword === "string" ? toKeywordCode(keyword) : keyword.code;
}

function getCategoryKeywordLabel(keyword: string | { code: string; label: string }) {
  return typeof keyword === "string" ? keyword : keyword.label;
}

type SeedTransaction = Prisma.TransactionClient;
type KeywordSeedInput = string | { code: string; label: string };

const managedProfileCategoryCodes = new Set([
  "lifestyle",
  "drinking",
  "smoking",
  "mbti",
  "personality",
  "conversation",
  "interests",
  "desired_vibe",
  "date_style",
  "deal_breakers",
]);

const legacyProfileKeywordCodeMap: Record<string, Record<string, string>> = {
  lifestyle: {
    outdoor: "active",
    early_bird: "balanced",
    night_owl: "balanced",
  },
  drinking: {
    frequent: "often",
    social: "sometimes",
    occasional: "sometimes",
  },
  smoking: {
    smoker: "yes",
    outside_only: "yes",
    occasional: "yes",
    non_smoker: "no",
  },
  personality: {
    energetic: "passionate",
    romantic: "affectionate",
    warm: "positive",
    thoughtful: "careful",
    ambitious: "independent",
  },
  interests: {
    books: "reading",
    games: "gaming",
  },
  desired_vibe: {
    romantic: "serious",
  },
  date_style: {
    good_food: "restaurant",
    cafe_talk: "cafe",
    drive: "home",
  },
  deal_breakers: {
    smoking: "smoker",
    heavy_drinking: "heavy-drinker",
    late_reply: "slow-replier",
    ghosting: "no-plans",
    rude: "too-fast",
  },
};

function getCanonicalKeywordCodes(keywords: readonly KeywordSeedInput[]) {
  return new Set(keywords.map(getCategoryKeywordCode));
}

async function migrateKeywordSelections(
  tx: SeedTransaction,
  legacyKeywordId: number,
  targetKeyword: { keyword_id: number; category_id: number },
) {
  const legacySelections = await tx.userKeywordSelection.findMany({
    where: { keyword_id: legacyKeywordId },
    select: { user_id: true },
  });

  if (legacySelections.length > 0) {
    await tx.userKeywordSelection.createMany({
      data: legacySelections.map((selection) => ({
        user_id: selection.user_id,
        category_id: targetKeyword.category_id,
        keyword_id: targetKeyword.keyword_id,
      })),
      skipDuplicates: true,
    });

    await tx.userKeywordSelection.deleteMany({
      where: { keyword_id: legacyKeywordId },
    });
  }
}

async function mergeLegacyKeyword(
  tx: SeedTransaction,
  categoryId: number,
  legacyCode: string,
  targetCode: string,
) {
  if (legacyCode === targetCode) return;

  const legacyKeyword = await tx.keyword.findUnique({
    where: {
      category_id_keyword_code: {
        category_id: categoryId,
        keyword_code: legacyCode,
      },
    },
  });
  if (!legacyKeyword) return;

  const targetKeyword = await tx.keyword.findUnique({
    where: {
      category_id_keyword_code: {
        category_id: categoryId,
        keyword_code: targetCode,
      },
    },
  });
  if (!targetKeyword) return;

  await migrateKeywordSelections(tx, legacyKeyword.keyword_id, targetKeyword);
  await tx.keyword.delete({ where: { keyword_id: legacyKeyword.keyword_id } });
}

async function cleanupManagedProfileKeywords(
  tx: SeedTransaction,
  category: { category_id: number; category_code: string },
  keywords: readonly KeywordSeedInput[],
) {
  if (!managedProfileCategoryCodes.has(category.category_code)) return;

  const canonicalKeywordCodes = getCanonicalKeywordCodes(keywords);
  const legacyMap = legacyProfileKeywordCodeMap[category.category_code] ?? {};

  for (const [legacyCode, targetCode] of Object.entries(legacyMap)) {
    if (!canonicalKeywordCodes.has(targetCode)) continue;
    await mergeLegacyKeyword(tx, category.category_id, legacyCode, targetCode);
  }

  const obsoleteKeywords = await tx.keyword.findMany({
    where: {
      category_id: category.category_id,
      keyword_code: { notIn: Array.from(canonicalKeywordCodes) },
    },
    select: { keyword_id: true },
  });

  for (const obsoleteKeyword of obsoleteKeywords) {
    await tx.userKeywordSelection.deleteMany({
      where: { keyword_id: obsoleteKeyword.keyword_id },
    });
    await tx.keyword.delete({ where: { keyword_id: obsoleteKeyword.keyword_id } });
  }
}

// ─────────────────────────────────────────────
// Seed 함수
// ─────────────────────────────────────────────
async function seedCategories() {
  await prisma.$transaction(async (tx) => {
    for (const categorySeed of categorySeeds) {
      const category = await tx.category.upsert({
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
        const keywordCode = getCategoryKeywordCode(keyword);
        const keywordLabel = getCategoryKeywordLabel(keyword);

        await tx.keyword.upsert({
          where: {
            category_id_keyword_code: {
              category_id: category.category_id,
              keyword_code: keywordCode,
            },
          },
          update: { label: keywordLabel, sort_order: index + 1 },
          create: {
            category_id: category.category_id,
            keyword_code: keywordCode,
            label: keywordLabel,
            sort_order: index + 1,
          },
        });
      }

      await cleanupManagedProfileKeywords(tx, category, categorySeed.keywords);
    }
  });
}

async function seedTestKeywordCategories() {
  for (const categorySeed of testKeywordCategorySeeds) {
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

    for (const [index, kw] of categorySeed.keywords.entries()) {
      await prisma.keyword.upsert({
        where: {
          category_id_keyword_code: {
            category_id: category.category_id,
            keyword_code: kw.code,
          },
        },
        update: { label: kw.label, sort_order: index + 1 },
        create: {
          category_id: category.category_id,
          keyword_code: kw.code,
          label: kw.label,
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
  const categoryCodes = Array.from(
    new Set(
      testUserKeywordSeeds.flatMap((seed) =>
        seed.keywords.map((keyword) => keyword.categoryCode),
      ),
    ),
  );
  const categories = await prisma.category.findMany({
    where: { category_code: { in: categoryCodes } },
    include: { keywords: true },
  });
  const keywordByCategoryAndCode = new Map<
    string,
    { keyword_id: number; category_id: number }
  >();

  for (const category of categories) {
    for (const keyword of category.keywords) {
      keywordByCategoryAndCode.set(
        `${category.category_code}:${keyword.keyword_code}`,
        keyword,
      );
    }
  }
  for (const seed of testUserKeywordSeeds) {
    const user = await prisma.user.findUnique({ where: { email: seed.email } });
    if (!user) continue;

    for (const keywordSeed of seed.keywords) {
      const kw = keywordByCategoryAndCode.get(
        `${keywordSeed.categoryCode}:${keywordSeed.keywordCode}`,
      );
      const label = `${keywordSeed.categoryCode}/${keywordSeed.keywordCode}`;
      if (!kw) {
        console.warn(`키워드 없음: "${label}"`);
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

async function seedCampusPlaces() {
  const category = await prisma.placeCategory.findUnique({ where: { code: "campus" } });
  if (!category) return;

  for (const seed of campusPlaceSeeds) {
    const existing = await prisma.place.findFirst({
      where: { category_id: category.id, name: seed.name },
    });

    const place = existing ?? await prisma.place.create({
      data: {
        category_id: category.id,
        name: seed.name,
        address: `경남 김해시 인제로 197 인제대학교 ${seed.name}`,
        description: seed.description,
      },
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

// ─────────────────────────────────────────────
// main
// ─────────────────────────────────────────────
async function main() {
  await seedCategories();
  await seedFeedKeywords();
  await seedPlaceCategories();
  await seedTestKeywordCategories();
  await seedTestUsers();
  await seedTestInterests();
  await seedTestFeedAndComment();
  await seedTestUserKeywords();
  await seedTestAuthSessions();
  await seedCampusPlaces();

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
