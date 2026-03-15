import { createPublicClient, http, formatUnits, defineChain } from "viem";

const goatTestnet3 = defineChain({
  id: 48816,
  name: "GOAT Testnet3",
  nativeCurrency: { name: "BTC", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet3.goat.network"] },
  },
  blockExplorers: {
    default: { name: "GOAT Explorer", url: "https://explorer.testnet3.goat.network" },
  },
  testnet: true,
});

const SEARCH_FEE = Number(process.env.SEARCH_FEE_TOKENS) || 1;
const GOAT_CHAIN_ID = 48816;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

function getClient() {
  return createPublicClient({
    chain: goatTestnet3,
    transport: http(),
  });
}

export async function getTokenBalance(
  walletAddress: string,
  tokenAddress: string
): Promise<number> {
  const client = getClient();

  const [balance, decimals] = await Promise.all([
    client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    }),
    client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
  ]);

  return Number(formatUnits(balance, decimals));
}

export async function getTokenSymbol(tokenAddress: string): Promise<string> {
  const client = getClient();
  return client.readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
  });
}

export function getGoatConfig() {
  return {
    chainId: GOAT_CHAIN_ID,
    searchFee: SEARCH_FEE,
    chainName: "GOAT Testnet3",
    rpcUrl: "https://rpc.testnet3.goat.network",
    explorerUrl: "https://explorer.testnet3.goat.network",
  };
}
