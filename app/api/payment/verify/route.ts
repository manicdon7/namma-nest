import { NextRequest, NextResponse } from "next/server";
import { isSessionPaidOnChain, getOnChainPayment } from "@/lib/payment/contract";
import {
  getPaymentByOrderId,
  updatePaymentStatus,
  updateSessionStatus,
  logError,
} from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (!process.env.PAYMENT_CONTRACT_ADDRESS) {
      return NextResponse.json(
        { error: "Payment contract not configured" },
        { status: 503 }
      );
    }

    // Check the smart contract on-chain
    const paid = await isSessionPaidOnChain(sessionId);

    if (paid) {
      const info = await getOnChainPayment(sessionId);

      // Sync MongoDB state
      const payment = await getPaymentByOrderId(`contract_${sessionId}`);
      if (payment && payment.status !== "confirmed") {
        await updatePaymentStatus(
          payment._id.toString(),
          "confirmed",
          undefined // no tx hash returned from view call; captured in event
        );
      }
      await updateSessionStatus(sessionId, "paid");

      return NextResponse.json({
        success: true,
        sessionStatus: "paid",
        paid: true,
        verification: {
          payer: info.payer,
          amountWei: info.amount.toString(),
          paidAt: info.timestamp,
          chainId: 48816,
          network: "GOAT Testnet3",
        },
      });
    }

    // Not yet confirmed — client should keep polling
    return NextResponse.json({
      success: false,
      pending: true,
      message: "Payment not yet confirmed on-chain. Keep polling.",
    });
  } catch (error) {
    await logError("payment_verify", String(error));
    return NextResponse.json(
      { error: "Payment verification error" },
      { status: 500 }
    );
  }
}
