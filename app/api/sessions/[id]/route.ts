import { NextRequest, NextResponse } from "next/server";
import { getSearchSession, getListingsBySession, logError } from "@/lib/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const session = await getSearchSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const listings = await getListingsBySession(id);

    return NextResponse.json({
      session,
      listings,
      listingCount: listings.length,
    });
  } catch (error) {
    await logError("get_session", String(error));
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
