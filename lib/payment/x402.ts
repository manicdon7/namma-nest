import { GoatX402Client } from "goatx402-sdk-server";

let _client: GoatX402Client | null = null;

function getClient(): GoatX402Client {
  if (!_client) {
    const baseUrl = process.env.GOATX402_API_URL;
    const apiKey = process.env.GOATX402_API_KEY;
    const apiSecret = process.env.GOATX402_API_SECRET;

    if (!baseUrl || !apiKey || !apiSecret) {
      throw new Error(
        "GOATX402_API_URL, GOATX402_API_KEY, and GOATX402_API_SECRET are required"
      );
    }

    _client = new GoatX402Client({ baseUrl, apiKey, apiSecret });
  }
  return _client;
}

export interface X402Order {
  orderId: string;
  payToAddress: string;
  chainId: number;
  tokenSymbol: string;
  tokenContract?: string;
  amountWei: string;
  status: string;
  flow: string;
  calldataSignRequest?: Record<string, unknown>;
}

export async function createOrder(params: {
  dappOrderId: string;
  chainId: number;
  tokenSymbol: string;
  fromAddress: string;
  amountWei: string;
  tokenContract?: string;
}): Promise<X402Order> {
  const client = getClient();

  const order = await client.createOrder({
    dappOrderId: params.dappOrderId,
    chainId: params.chainId,
    tokenSymbol: params.tokenSymbol,
    tokenContract: params.tokenContract || "",
    fromAddress: params.fromAddress,
    amountWei: params.amountWei,
  });

  return {
    orderId: order.orderId,
    payToAddress: order.payToAddress,
    chainId: params.chainId,
    tokenSymbol: params.tokenSymbol,
    tokenContract: order.tokenContract || params.tokenContract || undefined,
    amountWei: params.amountWei,
    status: "CHECKOUT_VERIFIED",
    flow: order.flow,
    calldataSignRequest: order.calldataSignRequest ? JSON.parse(JSON.stringify(order.calldataSignRequest)) : undefined,
  };
}

export interface OrderStatus {
  orderId: string;
  status: string;
  txHash?: string;
  confirmedAt?: string;
}

export async function getOrderStatus(orderId: string): Promise<OrderStatus> {
  const client = getClient();
  const status = await client.getOrderStatus(orderId);

  return {
    orderId: status.orderId,
    status: status.status,
    txHash: status.txHash,
    confirmedAt: status.confirmedAt,
  };
}

export async function cancelOrder(orderId: string): Promise<void> {
  const client = getClient();
  await client.cancelOrder(orderId);
}

export async function submitCalldataSignature(
  orderId: string,
  signature: string
): Promise<void> {
  const client = getClient();
  await client.submitCalldataSignature(orderId, signature);
}

export function getMerchantId(): string {
  return process.env.GOATX402_MERCHANT_ID || "";
  }
