"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, createStorage, noopStorage } from "wagmi";
import type { Chain } from "wagmi/chains";

// GOAT Network Testnet3 — native BTC, Chain ID 48816
export const goatTestnet3 = {
  id: 48816,
  name: "GOAT Testnet3",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet3.goat.network"] },
  },
  blockExplorers: {
    default: { name: "GOAT Explorer", url: "https://explorer.testnet3.goat.network" },
  },
  testnet: true,
} as const satisfies Chain;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "62da37d025d35b744456652b39e932e2";

// Fix: MetaMask shows "Opening... Confirm connection" but never connects after approval
// Use localStorage directly — https://github.com/rainbow-me/rainbowkit/issues/2275
const storage = createStorage({
  storage: typeof window !== "undefined" ? window.localStorage : noopStorage,
});

export const config = getDefaultConfig({
  appName: "Namma Nest",
  projectId,
  chains: [goatTestnet3],
  ssr: true,
  storage,
  transports: {
    [goatTestnet3.id]: http("https://rpc.testnet3.goat.network"),
  },
});
