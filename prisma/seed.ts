import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const categorySeeds = [
  {
    category_code: "mbti",
    name: "MBTI",
    selection_type: "single",
    max_select_count: 1,
    keywords: [
      "INTJ",
      "INTP",
      "ENTJ",
      "ENTP",
      "INFJ",
      "INFP",
      "ENFJ",
      "ENFP",
      "ISTJ",
      "ISFJ",
      "ESTJ",
      "ESFJ",
      "ISTP",
      "ISFP",
      "ESTP",
      "ESFP",
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
      "Warm",
      "Calm",
      "Humorous",
      "Energetic",
      "Honest",
      "Thoughtful",
      "Ambitious",
      "Romantic",
    ],
  },
  {
    category_code: "interests",
    name: "Interests",
    selection_type: "multi",
    max_select_count: 5,
    keywords: [
      "Movies",
      "Music",
      "Cafe",
      "Travel",
      "Exercise",
      "Games",
      "Books",
      "Food",
    ],
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

const feedKeywordSeeds = [
  { code: "walk", name: "산책" },
  { code: "cafe", name: "카페" },
  { code: "restaurant", name: "맛집" },
  { code: "study", name: "공부" },
  { code: "movie", name: "영화" },
  { code: "drive", name: "드라이브" },
  { code: "exercise", name: "운동" },
  { code: "exhibition", name: "전시" },
  { code: "drink", name: "술" },
  { code: "reading", name: "독서" },
  { code: "chat", name: "수다" },
  { code: "hobby", name: "취미" },
];

const placeCategorySeeds = [
  { code: "cafe", name: "Cafe" },
  { code: "restaurant", name: "Restaurant" },
  { code: "dessert", name: "Dessert" },
  { code: "bar", name: "Bar" },
  { code: "park", name: "Park" },
  { code: "activity", name: "Activity" },
  { code: "campus", name: "Campus" },
];

const campusPlaceSeeds = [
  { name: "A동", description: "인제대학교 A동", tags: ["a동", "에이동"] },
  { name: "B동", description: "인제대학교 B동", tags: ["b동", "비동"] },
  { name: "C동", description: "인제대학교 C동", tags: ["c동", "씨동"] },
  { name: "D동", description: "인제대학교 D동", tags: ["d동", "디동"] },
  { name: "E동", description: "인제대학교 E동", tags: ["e동", "이동"] },
  { name: "F동", description: "인제대학교 F동", tags: ["f동", "에프동"] },
  { name: "G동", description: "인제대학교 G동", tags: ["g동", "지동"] },
  { name: "도서관", description: "인제대학교 중앙도서관", tags: ["도서관", "도서", "공부"] },
  { name: "본관", description: "인제대학교 본관", tags: ["본관", "행정관"] },
];

function toKeywordCode(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

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
        update: {
          label,
          sort_order: index + 1,
        },
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

async function seedFeedKeywords() {
  for (const [index, keyword] of feedKeywordSeeds.entries()) {
    await prisma.feedKeyword.upsert({
      where: { code: keyword.code },
      update: {
        name: keyword.name,
        sort_order: index + 1,
        is_active: true,
      },
      create: {
        code: keyword.code,
        name: keyword.name,
        sort_order: index + 1,
        is_active: true,
      },
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
  },
];

async function seedTestUsers() {
  for (const user of testUserSeeds) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        nickname: user.nickname,
        real_name: user.real_name,
      },
      create: user,
    });
  }
}

async function seedTestInterests() {
  const userA = await prisma.user.findUnique({ where: { email: "test_a@inje.ac.kr" } });
  const userB = await prisma.user.findUnique({ where: { email: "test_b@inje.ac.kr" } });
  if (!userA || !userB) return;

  const existing = await prisma.interest.findFirst({
    where: { from_user_id: userA.id, to_user_id: userB.id },
  });
  if (!existing) {
    await prisma.interest.create({
      data: { from_user_id: userA.id, to_user_id: userB.id, status: "accepted" },
    });
  }
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

async function main() {
  await seedCategories();
  await seedFeedKeywords();
  await seedPlaceCategories();
  await seedTestUsers();
  await seedTestInterests();
  await seedTestFeedAndComment();
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
