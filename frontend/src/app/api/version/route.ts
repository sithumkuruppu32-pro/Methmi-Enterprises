import { NextResponse } from "next/server";

// Return the immutable commit SHA of the production deployment.
// This route must remain uncached so it reflects the active deployment.
export const dynamic = "force-dynamic";

export function GET() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;

  if (!commitSha) {
    return NextResponse.json(
      { error: "Deployment commit SHA unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { commit: commitSha },
    { headers: { "Cache-Control": "no-store" } },
  );
}
