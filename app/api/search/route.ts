import { NextRequest, NextResponse } from "next/server";
import { runNammaNestAgent } from "@/lib/openclaw/agent";
import {
  getSearchSession,
  updateSessionStatus,
  saveListings,
  getListingsBySession,
  logError,
} from "@/lib/db/queries";
import type { SearchParams, SearchPropertyType } from "@/types/search";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, location, latitude, longitude, type, budgetMin, budgetMax, preferences } =
      body;

    if (!sessionId || !location) {
      return NextResponse.json(
        { error: "sessionId and location are required" },
        { status: 400 }
      );
    }

    const session = await getSearchSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "completed") {
      const existingListings = await getListingsBySession(sessionId);
      return NextResponse.json({
        listings: existingListings,
        sessionId,
        cached: true,
      });
    }

    // Payment must be confirmed on-chain before agent runs
    if (session.status !== "paid") {
      return NextResponse.json(
        { error: "Payment required. Please complete the BTC payment on GOAT Testnet3 first." },
        { status: 402 }
      );
    }

    const searchParams: SearchParams = {
      location,
      latitude,
      longitude,
      type: (type as SearchPropertyType) || "any",
      budgetMin: Number(budgetMin) || 5000,
      budgetMax: Number(budgetMax) || 50000,
      preferences: preferences || {},
    };

    let rawListings;
    try {
      rawListings = await runNammaNestAgent(searchParams);
    } catch {
      // Retry once on failure
      try {
        rawListings = await runNammaNestAgent(searchParams);
      } catch (retryError) {
        await logError("openclaw_search", String(retryError), {
          sessionId,
          location,
        });
        await updateSessionStatus(sessionId, "failed");
        return NextResponse.json(
          { error: "AI search failed. Please try again or contact support." },
          { status: 500 }
        );
      }
    }

    if (!rawListings || rawListings.length === 0) {
      await updateSessionStatus(sessionId, "completed");
      return NextResponse.json({
        listings: [],
        sessionId,
        message: "No listings found. Try a broader area or adjust your budget.",
      });
    }

    const savedResults = await saveListings(sessionId, rawListings);
    await updateSessionStatus(sessionId, "completed");

    return NextResponse.json({ listings: savedResults, sessionId });
  } catch (error) {
    await logError("api_search", String(error));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
