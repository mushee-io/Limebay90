import { NextRequest, NextResponse } from "next/server";
import { resolveUniqMetadata } from "@/lib/ultra/metadata";
import { getUniqDetail } from "@/lib/ultra/rpc";

export const dynamic = "force-dynamic";

const ACCOUNT_RE = /^[a-z1-5.]{1,12}$/;
const UINT_RE = /^\d+$/;

export async function GET(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get("owner")?.trim() ?? "";
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";

  if (!ACCOUNT_RE.test(owner) || !UINT_RE.test(id)) {
    return NextResponse.json(
      { error: "A valid Ultra owner and token ID are required." },
      { status: 400 },
    );
  }

  try {
    const detail = await getUniqDetail(owner, id);
    if (!detail) {
      return NextResponse.json({ error: "Uniq not found for this owner." }, { status: 404 });
    }

    const metadata = detail.factory
      ? await resolveUniqMetadata(detail.token, detail.factory)
      : null;

    return NextResponse.json({ ...detail, metadata });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Uniq." },
      { status: 502 },
    );
  }
}
