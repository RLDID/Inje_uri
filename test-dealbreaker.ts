import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDealbreakerLogic() {
  try {
    // 테스트 유저 조회
    const userA = await prisma.user.findFirst({
      where: { email: "test_a@inje.ac.kr" },
    });
    const userB = await prisma.user.findFirst({
      where: { email: "test_b@inje.ac.kr" },
    });

    console.log("=== Test Dealbreaker Logic ===");
    console.log(`User A ID: ${userA?.id} (${userA?.nickname})`);
    console.log(`User B ID: ${userB?.id} (${userB?.nickname})`);

    if (!userA || !userB) {
      console.log("Test users not found");
      return;
    }

    // User A의 dealbreaker 조회
    console.log("\n--- User A's dealbreakers ---");
    const aDealbreakers = await prisma.$queryRaw<
      { label: string; category_code: string }[]
    >`
      SELECT k.label, c.category_code
      FROM user_keyword_selections uks
      JOIN keywords k ON uks.keyword_id = k.keyword_id
      JOIN categories c ON k.category_id = c.category_id
      WHERE uks.user_id = ${userA.id} AND c.category_code = 'deal_breakers'
    `;
    console.log("A의 dealbreakers:", aDealbreakers);

    // User B의 smoking/drinking 키워드 조회
    console.log("\n--- User B's lifestyle keywords ---");
    const bLifestyle = await prisma.$queryRaw<
      { label: string; category_code: string }[]
    >`
      SELECT k.label, c.category_code
      FROM user_keyword_selections uks
      JOIN keywords k ON uks.keyword_id = k.keyword_id
      JOIN categories c ON k.category_id = c.category_id
      WHERE uks.user_id = ${userB.id} AND c.category_code IN ('smoking', 'drinking')
    `;
    console.log("B의 smoking/drinking keywords:", bLifestyle);

    // User A의 preferred keywords 조회 (desired_vibe, date_style)
    console.log("\n--- User A's preferred keywords (matching basis) ---");
    const aPreferred = await prisma.$queryRaw<
      { label: string; category_code: string }[]
    >`
      SELECT k.label, c.category_code
      FROM user_keyword_selections uks
      JOIN keywords k ON uks.keyword_id = k.keyword_id
      JOIN categories c ON k.category_id = c.category_id
      WHERE uks.user_id = ${userA.id} AND c.category_code IN ('desired_vibe', 'date_style', 'personality', 'interests')
    `;
    console.log("A의 preferred keywords:", aPreferred);

    // recommendation_items 조회 (A의 오늘 추천)
    console.log("\n--- Today's recommendations for User A ---");
    const today = new Date().toISOString().split("T")[0];
    const recommendations = await prisma.$queryRaw<
      { rank_order: number; selected_candidate_user_id: string | null }[]
    >`
      SELECT 
        di.rank_order,
        di.selected_candidate_user_id,
        di.candidate_user_id
      FROM daily_recommendations dr
      JOIN recommendation_items di ON dr.recommendation_id = di.recommendation_id
      WHERE dr.user_id = ${userA.id} 
        AND DATE(dr.generated_at) = ${today}
      ORDER BY di.rank_order
      LIMIT 10
    `;

    console.log(`Found ${recommendations.length} recommendations for user A today`);
    for (const rec of recommendations) {
      const candidateInfo = await prisma.$queryRaw<
        { nickname: string }[]
      >`
        SELECT nickname FROM users WHERE id = ${rec.selected_candidate_user_id || "(unknown)"}
      `;
      console.log(
        `Rank ${rec.rank_order}: User ${candidateInfo[0]?.nickname || "Unknown"} (ID: ${rec.selected_candidate_user_id})`
      );
    }

    // B가 A의 추천에 포함되어 있는지 확인
    const isBInRecommendations = recommendations.some(
      (r) => r.selected_candidate_user_id === userB.id
    );
    console.log(
      `\n✓ User B in A's recommendations: ${isBInRecommendations ? "YES (SHOULD BE NO!)" : "NO (CORRECT)"}`
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDealbreakerLogic();
