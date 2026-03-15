export type PaymentStatus = "pending" | "confirmed" | "failed";

export interface Payment {
  id: string;
  session_id: string;
  user_id: string;
  amount_tokens: number;
  tx_hash: string;
  x402_payment_id: string;
  status: PaymentStatus;
  created_at: string;
}

export interface PaymentRequest {
  paymentId: string;
  paymentUrl: string;
  amount: number;
  tokenAddress: string;
  receiverAddress: string;
  chainId: number;
  expiresAt: string;
}

export interface PaymentVerification {
  verified: boolean;
  txHash: string;
  amount: number;
}
