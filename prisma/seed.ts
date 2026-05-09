import { PrismaClient } from "../src/generated/prisma/client";
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
    name: "Lifestyle",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Homebody", "Outdoor", "Early Bird", "Night Owl"],
  },
  {
    category_code: "drinking",
    name: "Drinking",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Never", "Social", "Occasional", "Frequent"],
  },
  {
    category_code: "smoking",
    name: "Smoking",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Non Smoker", "Outside Only", "Occasional", "Smoker"],
  },
  {
    category_code: "personality",
    name: "Personality",
    selection_type: "multi",
    max_select_count: 3,
    keywords: [
      "Warm", "Calm", "Humorous", "Energetic",
      "Honest", "Thoughtful", "Ambitious", "Romantic",
    ],
  },
  {
    category_code: "interests",
    name: "Interests",
    selection_type: "multi",
    max_select_count: 5,
    keywords: ["Movies", "Music", "Cafe", "Travel", "Exercise", "Games", "Books", "Food"],
  },
  {
    category_code: "desired_vibe",
    name: "Desired Vibe",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Comfortable", "Exciting", "Serious", "Casual", "Romantic"],
  },
  {
    category_code: "date_style",
    name: "Date Style",
    selection_type: "single",
    max_select_count: 1,
    keywords: ["Cafe Talk", "Good Food", "Walk", "Activity", "Drive"],
  },
  {
    category_code: "deal_breakers",
    name: "Deal Breakers",
    selection_type: "multi",
    max_select_count: 3,
    keywords: ["Rude", "Smoking", "Heavy Drinking", "Ghosting", "Late Reply"],
  },
];

// ─────────────────────────────────────────────
// 기존 테스트용 한국어 키워드 카테고리
// ─────────────────────────────────────────────
// const testKeywordCategorySeeds = [
//   {
//     category_code: "personality_kr",
//     name: "성격",
//     selection_type: "multi",
//     max_select_count: 3,
//     keywords: [
//       { code: "active",    label: "활발함" },
//       { code: "calm",      label: "차분함" },
//       { code: "humorous",  label: "유머러스" },
//       { code: "serious",   label: "진지함" },
//     ],
//   },
//   {
//     category_code: "hobby_kr",
//     name: "취미",
//     selection_type: "multi",
//     max_select_count: 5,
//     keywords: [
//       { code: "exercise", label: "운동" },
//       { code: "reading",  label: "독서" },
//       { code: "gaming",   label: "게임" },
//       { code: "cooking",  label: "요리" },
//       { code: "travel",   label: "여행" },
//     ],
//   },
//   {
//     category_code: "love_style",
//     name: "연애스타일",
//     selection_type: "multi",
//     max_select_count: 3,
//     keywords: [
//       { code: "caring",       label: "다정함" },
//       { code: "independent",  label: "독립적" },
//       { code: "expressive",   label: "표현적" },
//       { code: "considerate",  label: "배려심" },
//     ],
//   },
// ];

// ─────────────────────────────────────────────
// 테스트용 추천 매칭 키워드 카테고리
// ─────────────────────────────────────────────
const testKeywordCategorySeeds = [
  {
    category_code: "desired_vibe",
    name: "Desired Vibe",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      { code: "comfortable", label: "Comfortable" },
      { code: "exciting", label: "Exciting" },
      { code: "serious", label: "Serious" },
      { code: "casual", label: "Casual" },
      { code: "romantic", label: "Romantic" },
    ],
  },
  {
    category_code: "date_style",
    name: "Date Style",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      { code: "cafe_talk", label: "Cafe Talk" },
      { code: "good_food", label: "Good Food" },
      { code: "walk", label: "Walk" },
      { code: "activity", label: "Activity" },
      { code: "drive", label: "Drive" },
    ],
  },
  {
    category_code: "deal_breakers",
    name: "Deal Breakers",
    selection_type: "multi",
    max_select_count: 3,
    keywords: [
      { code: "rude", label: "Rude" },
      { code: "smoking", label: "Smoking" },
      { code: "heavy_drinking", label: "Heavy Drinking" },
      { code: "ghosting", label: "Ghosting" },
      { code: "late_reply", label: "Late Reply" },
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
// 기존 테스트 유저 키워드 할당
// ─────────────────────────────────────────────
// const testUserKeywordSeeds = [
//   { email: "test_a@inje.ac.kr", keywords: ["활발함", "운동", "다정함"] },
//   { email: "test_b@inje.ac.kr", keywords: ["활발함", "여행", "다정함"] },
//   { email: "test_c@inje.ac.kr", keywords: ["차분함", "독서", "배려심"] },
//   { email: "test_d@inje.ac.kr", keywords: ["유머러스", "게임", "표현적"] },
//   { email: "test_e@inje.ac.kr", keywords: ["활발함", "운동", "표현적"] },
//   { email: "test_f@inje.ac.kr", keywords: ["차분함", "요리", "배려심"] },
//   { email: "test_g@inje.ac.kr", keywords: ["진지함", "독서", "다정함"] },
//   { email: "test_h@inje.ac.kr", keywords: ["활발함", "여행", "다정함"] },
//   { email: "test_i@inje.ac.kr", keywords: ["유머러스", "운동", "표현적"] },
//   { email: "test_j@inje.ac.kr", keywords: ["차분함", "여행", "배려심"] },
// ];

// ─────────────────────────────────────────────
// 테스트 유저 키워드 할당 (추천 로직 기준)
// ─────────────────────────────────────────────
const testUserKeywordSeeds = [
  { email: "test_a@inje.ac.kr", keywords: ["Romantic", "Walk", "Smoking"] },
  { email: "test_b@inje.ac.kr", keywords: ["Romantic", "Walk", "Smoking"] },
  { email: "test_c@inje.ac.kr", keywords: ["Comfortable", "Cafe Talk"] },
  { email: "test_d@inje.ac.kr", keywords: ["Exciting", "Activity"] },
  { email: "test_e@inje.ac.kr", keywords: ["Serious", "Drive"] },
  { email: "test_f@inje.ac.kr", keywords: ["Casual", "Good Food"] },
  { email: "test_g@inje.ac.kr", keywords: ["Comfortable", "Rude"] },
  { email: "test_h@inje.ac.kr", keywords: ["Exciting", "Late Reply"] },
  { email: "test_i@inje.ac.kr", keywords: ["Serious", "Ghosting"] },
  { email: "test_j@inje.ac.kr", keywords: ["Casual", "Heavy Drinking"] },
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

    for (const [index, label] of categorySeed.keywords.entries()) {
      await prisma.keyword.upsert({
        where: {
          category_id_keyword_code: {
            category_id: category.category_id,
            keyword_code: toKeywordCode(label),
          },
        },
        update: { label, sort_order: index + 1 },
        create: {
          category_id: category.category_id,
          keyword_code: toKeywordCode(label),
          label,
          sort_order: index + 1,
        },
      });
    }
  }
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
  const allKeywords = await prisma.keyword.findMany({
    select: { keyword_id: true, label: true, category_id: true },
  });
  const labelToKeyword = new Map(allKeywords.map((k) => [k.label, k]));

  for (const seed of testUserKeywordSeeds) {
    const user = await prisma.user.findUnique({ where: { email: seed.email } });
    if (!user) continue;

    for (const label of seed.keywords) {
      const kw = labelToKeyword.get(label);
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
