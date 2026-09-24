import { NextResponse } from "next/server";
import { getExploreUniqs } from "@/lib/ultra/rpc";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getExploreUniqs(12);
    return NextResponse.json({
      network: "Ultra Testnet",
      source: "eosio.nft.ft::resale.a + token.b + factory.b",
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        error: error instanceof Error ? error.message : "Unable to load Uniqs",
      },
      { status: 502 },
    );
  }
}
