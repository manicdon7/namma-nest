import { NextRequest, NextResponse } from "next/server";
import { isSessionPaidOnChain, getOnChainPayment } from "@/lib/payment/contract";
import {
  getPaymentByOrderId,
  updatePaymentStatus,
  updateSessionStatus,
  logError,
} from "@/lib/db/queries";

const GOAT_EXPLORER = "https://explorer.testnet3.goat.network";

const X402_CONFIGURED =
  !!process.env.GOATX402_API_URL &&
  !!process.env.GOATX402_API_KEY &&
  !!process.env.GOATX402_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, orderId, txHash: clientTxHash } = body || {};

    if (!sessionId && !orderId) {
      return NextResponse.json(
        { error: "sessionId or orderId is required" },
        { status: 400 }
      );
    }

    const sid = sessionId || (orderId?.startsWith("contract_") ? orderId.replace("contract_", "") : null);

    // ── x402 flow: orderId provided and not contract_* ─────────────────────
    if (X402_CONFIGURED && orderId && !orderId.startsWith("contract_")) {
      try {
        const { getOrderStatus } = await import("@/lib/payment/x402");
        const status = await getOrderStatus(orderId);
        if (status.status === "PAYMENT_CONFIRMED" || status.txHash) {
          const payment = await getPaymentByOrderId(orderId);
          if (payment) {
            await updatePaymentStatus(payment._id.toString(), "confirmed", status.txHash);
            await updateSessionStatus(payment.sessionId.toString(), "paid");
          }
          return NextResponse.json({
            success: true,
            paid: true,
            sessionStatus: "paid",
            verification: {
              txHash: status.txHash,
              txUrl: status.txHash ? `${GOAT_EXPLORER}/tx/${status.txHash}` : null,
              payer: null,
              amountWei: null,
              paidAt: status.confirmedAt ? Math.floor(new Date(status.confirmedAt).getTime() / 1000) : null,
              chainId: 48816,
              network: "GOAT Testnet3",
              paymentType: "x402",
            },
          });
        }
        return NextResponse.json({
          success: false,
          pending: true,
          orderStatus: status.status,
          message: "Payment not yet confirmed. Keep polling.",
        });
      } catch (x402Err) {
        await logError("payment_verify_x402", String(x402Err));
      }
    }

    // ── Contract (GOAT) flow ────────────────────────────────────────────
    if (!sid || !process.env.PAYMENT_CONTRACT_ADDRESS) {
      return NextResponse.json(
        { error: "Payment contract not configured or sessionId required" },
        { status: 503 }
      );
    }

    const paid = await isSessionPaidOnChain(sid);

    if (paid) {
      const info = await getOnChainPayment(sid);

      let payment = await getPaymentByOrderId(`contract_${sid}`);
      if (payment && payment.status !== "confirmed") {
        await updatePaymentStatus(payment._id.toString(), "confirmed", clientTxHash);
        payment = await getPaymentByOrderId(`contract_${sid}`);
      }
      await updateSessionStatus(sid, "paid");

      const txHash = clientTxHash || payment?.txHash;

      return NextResponse.json({
        success: true,
        sessionStatus: "paid",
        paid: true,
        verification: {
          txHash: txHash || undefined,
          txUrl: txHash ? `${GOAT_EXPLORER}/tx/${txHash}` : undefined,
          payer: info.payer,
          amountWei: info.amount.toString(),
          paidAt: info.timestamp,
          chainId: 48816,
          network: "GOAT Testnet3",
          paymentType: "contract",
        },
      });
    }

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
