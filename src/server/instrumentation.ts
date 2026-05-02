//Next.js 서버 시작 훅 — src/ 루트 고정

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
