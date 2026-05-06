//Node.js 런타임에서 배치 잡 호출 — src/ 루트 고정


import { runDailyRecommendationJobIfNeeded } from "@/server/jobs/dailyRecommendation.job";

const globalForInstrumentation = globalThis as typeof globalThis & {
  __injeuriDailyRecommendationJobStarted?: boolean;
};

if (!globalForInstrumentation.__injeuriDailyRecommendationJobStarted) {
  globalForInstrumentation.__injeuriDailyRecommendationJobStarted = true;

  void (async () => {
    try {
      await runDailyRecommendationJobIfNeeded();
    } catch (err) {
      console.error("[instrumentation.node] daily recommendation job failed", err);
    }
  })();
}

export {};

//전역 uncaughtException 억제 제거
//dev hot reload 중 중복 실행 방지
//batch job 실패는 로그로 남김
