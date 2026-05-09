import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * dealbreaker 로직을 테스트하기 위해 수동으로 키워드를 할당합니다.
 * - User A: dealbreaker "Smoking" 할당
 * - User B: smoking "Smoker" 할당 (이미 있으므로 검증만)
 * - User D: dealbreaker "Heavy Drinking" 할당
 * - User E: drinking "Social" 할당 (이미 있으므로 검증만)
 */

async function setupTestData() {
  console.log("=== Setting up test data for dealbreaker validation ===\n");

  try {
    // 사용자 조회
    const userA = await prisma.user.findFirst({ where: { email: "test_a@inje.ac.kr" } });
    const userB = await prisma.user.findFirst({ where: { email: "test_b@inje.ac.kr" } });
    const userD = await prisma.user.findFirst({ where: { email: "test_d@inje.ac.kr" } });
    const userE = await prisma.user.findFirst({ where: { email: "test_e@inje.ac.kr" } });

    if (!userA || !userB || !userD || !userE) {
      console.error("Test users not found");
      return;
    }

    console.log(`User A ID: ${userA.id} (${userA.nickname})`);
    console.log(`User B ID: ${userB.id} (${userB.nickname})`);
    console.log(`User D ID: ${userD.id} (${userD.nickname})`);
    console.log(`User E ID: ${userE.id} (${userE.nickname})\n`);

    // 키워드 조회
    const smokingDealbreaker = await prisma.keyword.findFirst({
      where: { label: "Smoking", category: { category_code: "deal_breakers" } },
    });
    const smoker = await prisma.keyword.findFirst({
      where: { label: "Smoker", category: { category_code: "smoking" } },
    });
    const heavyDrinkingDealbreaker = await prisma.keyword.findFirst({
      where: { label: "Heavy Drinking", category: { category_code: "deal_breakers" } },
    });
    const socialDrinking = await prisma.keyword.findFirst({
      where: { label: "Social", category: { category_code: "drinking" } },
    });

    if (!smokingDealbreaker || !smoker || !heavyDrinkingDealbreaker || !socialDrinking) {
      console.error("Required keywords not found");
      console.log(`Smoking dealbreaker: ${smokingDealbreaker?.keyword_id}`);
      console.log(`Smoker: ${smoker?.keyword_id}`);
      console.log(`Heavy Drinking dealbreaker: ${heavyDrinkingDealbreaker?.keyword_id}`);
      console.log(`Social: ${socialDrinking?.keyword_id}`);
      return;
    }

    // User A: dealbreaker "Smoking" 할당
    console.log(`✓ Assigning "Smoking" dealbreaker to User A...`);
    await prisma.userKeywordSelection.upsert({
      where: {
        user_id_keyword_id: { user_id: userA.id, keyword_id: smokingDealbreaker.keyword_id },
      },
      update: {},
      create: {
        user_id: userA.id,
        category_id: smokingDealbreaker.category_id,
        keyword_id: smokingDealbreaker.keyword_id,
      },
    });

    // User B: smoking "Smoker" 확인
    console.log(`✓ Verifying "Smoker" keyword for User B...`);
    const bSmokerSelection = await prisma.userKeywordSelection.findFirst({
      where: { user_id: userB.id, keyword_id: smoker.keyword_id },
    });
    if (!bSmokerSelection) {
      await prisma.userKeywordSelection.create({
        data: {
          user_id: userB.id,
          category_id: smoker.category_id,
          keyword_id: smoker.keyword_id,
        },
      });
    }

    // User D: dealbreaker "Heavy Drinking" 할당
    console.log(`✓ Assigning "Heavy Drinking" dealbreaker to User D...`);
    await prisma.userKeywordSelection.upsert({
      where: {
        user_id_keyword_id: { user_id: userD.id, keyword_id: heavyDrinkingDealbreaker.keyword_id },
      },
      update: {},
      create: {
        user_id: userD.id,
        category_id: heavyDrinkingDealbreaker.category_id,
        keyword_id: heavyDrinkingDealbreaker.keyword_id,
      },
    });

    // User E: drinking "Social" 확인
    console.log(`✓ Verifying "Social" drinking keyword for User E...`);
    const eSocialSelection = await prisma.userKeywordSelection.findFirst({
      where: { user_id: userE.id, keyword_id: socialDrinking.keyword_id },
    });
    if (!eSocialSelection) {
      await prisma.userKeywordSelection.create({
        data: {
          user_id: userE.id,
          category_id: socialDrinking.category_id,
          keyword_id: socialDrinking.keyword_id,
        },
      });
    }

    console.log("\n✓ Test data setup complete!\n");

    // 할당된 키워드 확인
    console.log("=== Current keyword assignments ===\n");

    console.log("User A dealbreakers:");
    const aDealbreakers = await prisma.$queryRaw<any[]>`
      SELECT k.label, c.category_code
      FROM user_keyword_selections uks
      JOIN keywords k ON uks.keyword_id = k.keyword_id
      JOIN categories c ON k.category_id = c.category_id
      WHERE uks.user_id = ${userA.id} AND c.category_code = 'deal_breakers'
    `;
    aDealbreakers.forEach((kw) => console.log(`  - ${kw.label}`));

    console.log("\nUser B smoking/drinking:");
    const bLifestyle = await prisma.$queryRaw<any[]>`
      SELECT k.label, c.category_code
      FROM user_keyword_selections uks
      JOIN keywords k ON uks.keyword_id = k.keyword_id
      JOIN categories c ON k.category_id = c.category_id
      WHERE uks.user_id = ${userB.id} AND c.category_code IN ('smoking', 'drinking')
    `;
    bLifestyle.forEach((kw) => console.log(`  - ${kw.category_code}: ${kw.label}`));

    console.log("\nUser D dealbreakers:");
    const dDealbreakers = await prisma.$queryRaw<any[]>`
      SELECT k.label, c.category_code
      FROM user_keyword_selections uks
      JOIN keywords k ON uks.keyword_id = k.keyword_id
      JOIN categories c ON k.category_id = c.category_id
      WHERE uks.user_id = ${userD.id} AND c.category_code = 'deal_breakers'
    `;
    dDealbreakers.forEach((kw) => console.log(`  - ${kw.label}`));

    console.log("\nUser E drinking:");
    const eDrinking = await prisma.$queryRaw<any[]>`
      SELECT k.label, c.category_code
      FROM user_keyword_selections uks
      JOIN keywords k ON uks.keyword_id = k.keyword_id
      JOIN categories c ON k.category_id = c.category_id
      WHERE uks.user_id = ${userE.id} AND c.category_code = 'drinking'
    `;
    eDrinking.forEach((kw) => console.log(`  - ${kw.label}`));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();
