import { NextRequest, NextResponse } from "next/server";
import { getFactoriesByManager } from "@/lib/ultra/rpc";

export const dynamic = "force-dynamic";

const ACCOUNT_RE = /^[a-z1-5.]{1,12}$/;

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get("account")?.trim() ?? "";

  if (!ACCOUNT_RE.test(account)) {
    return NextResponse.json({ error: "Invalid Ultra account." }, { status: 400 });
  }

  try {
    const factories = await getFactoriesByManager(account);
    return NextResponse.json({ account, factories });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load factories." },
      { status: 502 },
    );
  }
}
