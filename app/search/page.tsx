"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import SearchForm from "@/components/SearchForm";
import PaymentGate from "@/components/PaymentGate";
import type { SearchPreferences, SearchPropertyType } from "@/types/search";

interface SearchFormData {
  location: string;
  latitude?: number;
  longitude?: number;
  type: SearchPropertyType;
  budgetMin: number;
  budgetMax: number;
  preferences: SearchPreferences;
}

export default function SearchPage() {
  const router = useRouter();
  const { address: walletAddress, isConnected } = useAccount();

  const [showPayment, setShowPayment] = useState(false);
  const [formData, setFormData] = useState<SearchFormData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearchSubmit = (data: SearchFormData) => {
    if (!isConnected || !walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }
    setError(null);
    setFormData(data);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (sessionId: string) => {
    setShowPayment(false);
    if (!formData) return;

    const params = new URLSearchParams({
      sessionId,
      location: formData.location,
      type: formData.type,
      budgetMin: String(formData.budgetMin),
      budgetMax: String(formData.budgetMax),
    });

    router.push(`/results?${params.toString()}`);
  };

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
            Find Your Perfect Nest
          </h1>
          <p className="mt-3 text-text-muted">
            Connect your wallet, tell us what you&apos;re looking for, and our AI
            will find the best options across Chennai, Bengaluru, and all cities.
          </p>
        </motion.div>

        {/* Wallet prompt — use ConnectButton from navbar or inline */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-border bg-surface p-6 text-center"
          >
            <h2 className="font-display text-lg font-semibold text-text">
              Connect Wallet to Search
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Pay{" "}
              <span className="font-semibold text-accent">0.0000001 BTC</span>{" "}
              on GOAT Testnet3 to unlock AI search. Use MetaMask, WalletConnect, or any EVM wallet.
            </p>
            <p className="mt-2 text-xs text-text-muted">
              MetaMask not connecting? Try disabling other wallet extensions (e.g. Coinbase Wallet) or refresh the page.
            </p>
            <div className="mt-5 flex justify-center">
              <ConnectButton
                chainStatus="icon"
                showBalance={false}
                accountStatus="address"
              />
            </div>
          </motion.div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Form — enabled when wallet connected */}
        <div className={!isConnected ? "pointer-events-none opacity-50" : ""}>
          <SearchForm onSubmit={handleSearchSubmit} loading={false} />
        </div>

        {!isConnected && (
          <p className="mt-4 text-center text-sm text-text-muted">
            Connect your wallet above to enable the search form.
          </p>
        )}
      </div>

      {/* Payment Gate Modal */}
      {showPayment && formData && walletAddress && (
        <PaymentGate
          walletAddress={walletAddress}
          searchData={formData}
          amount={Number(process.env.NEXT_PUBLIC_SEARCH_FEE_TOKENS) || 1}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
