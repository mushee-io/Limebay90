import { NextResponse } from "next/server";
import { getChainHealth } from "@/lib/ultra/rpc";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getChainHealth());
  } catch (error) {
    return NextResponse.json(
      {
        online: false,
        error: error instanceof Error ? error.message : "Ultra RPC unavailable",
      },
      { status: 502 },
    );
  }
}
