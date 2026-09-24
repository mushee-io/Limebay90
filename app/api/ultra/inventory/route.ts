import { NextRequest, NextResponse } from "next/server";
import { getInventoryUniqs } from "@/lib/ultra/rpc";

export const dynamic = "force-dynamic";

const ACCOUNT_RE = /^[a-z1-5.]{1,12}$/;

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get("account")?.trim() ?? "";

  if (!ACCOUNT_RE.test(account)) {
    return NextResponse.json(
      { items: [], error: "Invalid Ultra account name." },
      { status: 400 },
    );
  }

  try {
    const items = await getInventoryUniqs(account);
    return NextResponse.json({
      network: "Ultra Testnet",
      account,
      source: "eosio.nft.ft::token.b",
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        error: error instanceof Error ? error.message : "Unable to load inventory",
      },
      { status: 502 },
    );
  }
}
