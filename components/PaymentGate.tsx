"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  HelpCircle,
  Loader2,
  ArrowRight,
  Wallet,
  ExternalLink,
} from "lucide-react";
import type { SearchPreferences, SearchPropertyType } from "@/types/search";

interface SearchData {
  location: string;
  latitude?: number;
  longitude?: number;
  type: SearchPropertyType;
  budgetMin: number;
  budgetMax: number;
  preferences: SearchPreferences;
}

interface PaymentGateProps {
  walletAddress: string;
  searchData: SearchData;
  amount: number;
  onSuccess: (sessionId: string) => void;
  onClose: () => void;
}

type PaymentStep = "creating" | "pay" | "verifying" | "success" | "error";

// ─── ABI encoding helpers ─────────────────────────────────────────────────────

/** Encode pay(string sessionId) using ethers ABI encoder (loaded dynamically). */
async function encodePayCall(sessionId: string): Promise<string> {
  const { ethers } = await import("ethers");
  const iface = new ethers.Interface(["function pay(string sessionId) payable"]);
  return iface.encodeFunctionData("pay", [sessionId]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentGate({
  walletAddress,
  searchData,
  amount,
  onSuccess,
  onClose,
}: PaymentGateProps) {
  const [step, setStep] = useState<PaymentStep>("creating");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [searchFeeWei, setSearchFeeWei] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initiatedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (step === "verifying") {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            setStep("error");
            setError("Payment timed out. Please try again.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  // ── Step 1: Create session in DB ────────────────────────────────────────────
  const initiateSession = useCallback(async () => {
    if (initiatedRef.current) return;
    initiatedRef.current = true;

    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          location: searchData.location,
          latitude: searchData.latitude,
          longitude: searchData.longitude,
          preferences: searchData.preferences,
        }),
      });
      const data = await res.json();

      if (data.cached && data.sessionId) {
        setSessionId(data.sessionId);
        setStep("success");
        setTimeout(() => onSuccess(data.sessionId), 1200);
        return;
      }

      if (!res.ok) {
        throw new Error(
          data.debug ? `${data.error}: ${data.debug}` : data.error || "Failed to create session"
        );
      }

      setSessionId(data.sessionId);
      setContractAddress(data.contractAddress);
      setSearchFeeWei(data.searchFeeWei);
      setStep("pay");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session creation failed");
      setStep("error");
    }
  }, [walletAddress, searchData, onSuccess]);

  useEffect(() => {
    initiateSession();
  }, [initiateSession]);

  // ── Step 2: Send BTC to contract ────────────────────────────────────────────
  const executePayment = async () => {
    if (!contractAddress || !sessionId || !searchFeeWei) return;

    try {
      setStep("verifying");

      const calldata = await encodePayCall(sessionId);
      const valueHex = "0x" + BigInt(searchFeeWei).toString(16);

      const txHashRaw = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: contractAddress,
            value: valueHex,
            data: calldata,
          },
        ],
      })) as string;

      setTxHash(txHashRaw);
      startPolling(sessionId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction rejected";
      setError(msg.includes("rejected") ? "Transaction cancelled in wallet." : msg);
      setStep("error");
    }
  };

  // ── Step 3: Poll verify endpoint ────────────────────────────────────────────
  const startPolling = (sid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        });
        const data = await res.json();

        if (data.success) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("success");
          setTimeout(() => onSuccess(sid), 1500);
        } else if (data.error && !data.pending) {
          if (pollRef.current) clearInterval(pollRef.current);
          setError(data.error);
          setStep("error");
        }
      } catch {
        /* keep polling */
      }
    }, 5000);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const feeDisplay = searchFeeWei
    ? (Number(BigInt(searchFeeWei)) / 1e18).toFixed(6).replace(/\.?0+$/, "")
    : String(amount);

  const explorerTxUrl = txHash
    ? `https://explorer.testnet3.goat.network/tx/${txHash}`
    : null;

  const steps: { label: string }[] = [
    { label: "Session" },
    { label: "Pay" },
    { label: "Verify" },
  ];

  const currentStepIndex =
    step === "creating" ? 0
    : step === "pay"     ? 1
    : step === "verifying" || step === "success" ? 2
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
              <Wallet className="h-7 w-7 text-accent" />
            </div>
            <h2 className="font-display text-xl font-bold text-text">
              Unlock AI Search
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Pay with native BTC — recorded on GOAT Testnet3
            </p>
          </div>

          {/* Step Indicators */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    currentStepIndex >= i
                      ? "bg-primary text-white"
                      : "bg-border text-text-muted"
                  }`}
                >
                  {currentStepIndex > i ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 w-8 ${
                      currentStepIndex > i ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Fee Display */}
          <div className="mb-5 rounded-xl border border-accent/30 bg-accent/10 p-4 text-center">
            <p className="text-sm text-text-muted">Search fee</p>
            <p className="font-mono text-3xl font-bold text-accent">
              {feeDisplay} BTC
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Recorded on GOAT Network Testnet3
            </p>
          </div>

          {/* Wallet info */}
          <div className="mb-4 rounded-lg bg-bg p-3">
            <p className="text-xs text-text-muted">Your wallet</p>
            <p className="font-mono text-xs text-text">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>

          {/* Timer — shown while verifying */}
          {step === "verifying" && (
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-text-muted">
              <Clock className="h-4 w-4" />
              <span>Waiting for confirmation — {formatTime(timeLeft)}</span>
            </div>
          )}

          {/* Action Area */}
          <div className="space-y-3">
            {step === "creating" && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-text-muted">
                  Preparing session...
                </span>
              </div>
            )}

            {step === "pay" && (
              <>
                {contractAddress && (
                  <div className="rounded-lg bg-bg p-3">
                    <p className="text-xs text-text-muted">Payment contract</p>
                    <p className="break-all font-mono text-xs text-text">
                      {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
                    </p>
                    <a
                      href={`https://explorer.testnet3.goat.network/address/${contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View on explorer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  MetaMask will ask you to send{" "}
                  <span className="font-semibold">{feeDisplay} BTC</span> to the
                  contract. Your payment will be stored permanently on-chain.
                </div>

                <button
                  onClick={executePayment}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Pay {feeDisplay} BTC
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}

            {step === "verifying" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <span className="text-sm font-medium text-text">
                  Confirming on-chain...
                </span>
                <span className="text-xs text-text-muted">
                  Waiting for block confirmation
                </span>
                {explorerTxUrl && (
                  <a
                    href={explorerTxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Track transaction
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {step === "success" && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-3 py-4"
              >
                <CheckCircle className="h-12 w-12 text-success" />
                <p className="font-semibold text-success">Payment Confirmed!</p>
                <p className="text-sm text-text-muted">
                  Launching AI search...
                </p>
              </motion.div>
            )}

            {step === "error" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <AlertCircle className="h-12 w-12 text-error" />
                <p className="text-center text-sm text-error">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setTimeLeft(300);
                    initiatedRef.current = false;
                    setStep("creating");
                    initiateSession();
                  }}
                  className="rounded-xl border border-primary px-6 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Explainer */}
          <div className="mt-5">
            <button
              onClick={() => setShowExplainer(!showExplainer)}
              className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-primary"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Why do I pay?
            </button>
            <AnimatePresence>
              {showExplainer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">
                    A small fee powers the OpenClaw AI agent to search multiple
                    rental platforms, validate listings, and deliver curated
                    results. The payment is sent directly to the{" "}
                    <strong>NammaNestPayments</strong> smart contract on GOAT
                    Testnet3, creating an immutable record before the agent runs.
                    Test BTC has no real monetary value.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
