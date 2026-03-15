/**
 * On-chain reads for NammaNestPayments contract using viem (server-side only).
 */
import { createPublicClient, http, parseAbi } from "viem";

const goatTestnet3 = {
  id: 48816,
  name: "GOAT Testnet3",
  nativeCurrency: { name: "BTC", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet3.goat.network"] },
    public:  { http: ["https://rpc.testnet3.goat.network"] },
  },
  blockExplorers: {
    default: { name: "GOAT Explorer", url: "https://explorer.testnet3.goat.network" },
  },
} as const;

export const CONTRACT_ABI = parseAbi([
  "function pay(string sessionId) payable",
  "function isSessionPaid(string sessionId) view returns (bool)",
  "function getPayment(string sessionId) view returns (address payer, uint256 amount, uint256 timestamp, bool exists)",
  "function searchFee() view returns (uint256)",
  "function searchCount(address) view returns (uint256)",
  "event PaymentReceived(address indexed payer, string sessionId, uint256 amount, uint256 timestamp)",
]);

function getContractAddress(): `0x${string}` {
  const addr = process.env.PAYMENT_CONTRACT_ADDRESS;
  if (!addr || !addr.startsWith("0x")) {
    throw new Error("PAYMENT_CONTRACT_ADDRESS is not set. Deploy the contract first.");
  }
  return addr as `0x${string}`;
}

function getClient() {
  return createPublicClient({
    chain: goatTestnet3,
    transport: http(),
  });
}

/** Returns true if the given sessionId has been paid on-chain. */
export async function isSessionPaidOnChain(sessionId: string): Promise<boolean> {
  const client = getClient();
  return client.readContract({
    address: getContractAddress(),
    abi: CONTRACT_ABI,
    functionName: "isSessionPaid",
    args: [sessionId],
  });
}

/** Returns the full payment record for a session. */
export async function getOnChainPayment(sessionId: string): Promise<{
  payer: string;
  amount: bigint;
  timestamp: number;
  exists: boolean;
}> {
  const client = getClient();
  const [payer, amount, timestamp, exists] = await client.readContract({
    address: getContractAddress(),
    abi: CONTRACT_ABI,
    functionName: "getPayment",
    args: [sessionId],
  });
  return { payer, amount, timestamp: Number(timestamp), exists };
}

/** Returns the current search fee in wei from the contract. */
export async function getOnChainSearchFee(): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: getContractAddress(),
    abi: CONTRACT_ABI,
    functionName: "searchFee",
    args: [],
  });
}

/** Returns the deployed contract address (for the frontend to use). */
export function getContractAddressPublic(): string {
  return process.env.PAYMENT_CONTRACT_ADDRESS ?? "";
}
