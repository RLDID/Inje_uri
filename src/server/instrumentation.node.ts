//Node.js 런타임에서 배치 잡 호출 — src/ 루트 고정


import { runDailyRecommendationJobIfNeeded } from "@/server/jobs/dailyRecommendation.job";

// pg 라이브러리가 Windows에서 Unix 소켓 경로 탐색 시 발생하는 ENOENT 에러 억제
process.on("uncaughtException", (err: NodeJS.ErrnoException) => {
  if (err.code === "ENOENT") return;
  console.error("[uncaughtException]", err);
});

(async () => {
  try {
    await runDailyRecommendationJobIfNeeded();
  } catch (err) {
    console.error("[instrumentation.node]", err);
  }
})();
export {};
