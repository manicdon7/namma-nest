import { NextRequest, NextResponse } from "next/server";
import {
  findOrCreateUser,
  createSearchSession,
  createPayment,
  getSearchSession,
  logError,
} from "@/lib/db/queries";
import { getContractAddressPublic } from "@/lib/payment/contract";

const SEARCH_FEE_WEI = process.env.SEARCH_FEE_WEI || "100000000000";
const CONTRACT_ADDRESS = process.env.PAYMENT_CONTRACT_ADDRESS || "";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: "Database not configured", debug: "MONGODB_URI must be set" },
        { status: 503 }
      );
    }

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json(
        {
          error: "Payment contract not deployed",
          debug: "Set PAYMENT_CONTRACT_ADDRESS after running: cd contracts && npm run deploy:goat",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { walletAddress, location, latitude, longitude, preferences, sessionId, skipCreate } =
      body;

    const contractAddress = getContractAddressPublic() || CONTRACT_ADDRESS;
    const searchFeeWei = SEARCH_FEE_WEI;

    // ── Bot-pay page: just return contract info for existing session ──
    if (skipCreate && sessionId) {
      const existing = await getSearchSession(sessionId);
      return NextResponse.json({
        sessionId,
        contractAddress,
        searchFeeWei,
        chainId: 48816,
        status: existing?.status || "pending",
      });
    }

    // ── Web flow: create new session ──────────────────────────────────
    if (!location) {
      return NextResponse.json({ error: "Location is required" }, { status: 400 });
    }
    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const user = await findOrCreateUser({ walletAddress });

    const session = await createSearchSession({
      userId: user._id.toString(),
      locationText: location,
      latitude,
      longitude,
      preferences: preferences || {},
    });

    const newSessionId = session._id.toString();

    await createPayment({
      sessionId: newSessionId,
      userId: user._id.toString(),
      amountTokens: Number(process.env.SEARCH_FEE_TOKENS) || 0.0000001,
      orderId: `contract_${newSessionId}`,
    });

    return NextResponse.json({
      sessionId: newSessionId,
      contractAddress,
      searchFeeWei,
      chainId: 48816,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logError("payment_initiate", message);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { error: "Failed to initiate payment", ...(isDev && { debug: message }) },
      { status: 500 }
    );
  }
}
