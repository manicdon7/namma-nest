"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Wallet, ExternalLink, Loader2, ArrowLeft } from "lucide-react";

// GOAT Testnet3
const CHAIN_ID = 48816;
const CHAIN_ID_HEX = "0xBEB0";
const GOAT_RPC = "https://rpc.testnet3.goat.network";
const EXPLORER = "https://explorer.testnet3.goat.network";

const CONTRACT_ABI_FRAGMENT = [
  {
    name: "pay",
    type: "function",
    inputs: [{ name: "sessionId", type: "string" }],
    outputs: [],
    stateMutability: "payable",
  },
];

type Step = "connect" | "review" | "paying" | "success" | "error";

function BotPayContent() {
  const params = useSearchParams();
  const sessionId = params.get("sid") || "";

  const [step, setStep] = useState<Step>("connect");
  const [account, setAccount] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [contractAddress, setContractAddress] = useState<string>("");
  const [feeWei, setFeeWei] = useState<string>("");
  const [feeDisplay, setFeeDisplay] = useState<string>("0.0000001");
  const [polling, setPolling] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Load contract info from env / API
  useEffect(() => {
    const addr = process.env.NEXT_PUBLIC_PAYMENT_CONTRACT || "";
    setContractAddress(addr);

    // Fetch fee from API
    fetch("/api/payment/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, skipCreate: true }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.searchFeeWei) {
          setFeeWei(d.searchFeeWei);
          const wei = BigInt(d.searchFeeWei);
          setFeeDisplay((Number(wei) / 1e18).toFixed(7).replace(/\.?0+$/, ""));
        }
        if (d.contractAddress) {
          setContractAddress(d.contractAddress);
        }
      })
      .catch(() => {
        // fallback defaults
        const defaultFee = "100000000000";
        setFeeWei(defaultFee);
        setFeeDisplay("0.0000001");
      });
  }, [sessionId]);

  // ── Connect MetaMask ────────────────────────────────────────

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setErrorMsg("MetaMask not found. Please install MetaMask.");
      setStep("error");
      return;
    }

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        setErrorMsg("No account found. Please unlock MetaMask.");
        setStep("error");
        return;
      }

      // Switch to GOAT Testnet3
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_ID_HEX }],
        });
      } catch (switchErr: unknown) {
        if ((switchErr as { code?: number }).code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: CHAIN_ID_HEX,
                chainName: "GOAT Network Testnet3",
                nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
                rpcUrls: [GOAT_RPC],
                blockExplorerUrls: [EXPLORER],
              },
            ],
          });
        } else {
          throw switchErr;
        }
      }

      setAccount(accounts[0]);
      setStep("review");
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 4001) {
        setErrorMsg("Wallet connection cancelled.");
      } else {
        setErrorMsg(e.message || "Failed to connect wallet.");
      }
      setStep("error");
    }
  }, []);

  // ── ABI-encode pay(sessionId) ───────────────────────────────

  const encodePayCall = useCallback(async (sid: string): Promise<string> => {
    const { ethers } = await import("ethers");
    const iface = new ethers.Interface(CONTRACT_ABI_FRAGMENT);
    return iface.encodeFunctionData("pay", [sid]);
  }, []);

  // ── Send BTC to contract ────────────────────────────────────

  const sendPayment = useCallback(async () => {
    if (!contractAddress || !feeWei || !sessionId) {
      setErrorMsg("Missing contract configuration.");
      setStep("error");
      return;
    }

    setStep("paying");
    setErrorMsg("");

    try {
      const calldata = await encodePayCall(sessionId);

      const tx = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: contractAddress,
            value: "0x" + BigInt(feeWei).toString(16),
            data: calldata,
          },
        ],
      });

      setTxHash(tx as string);
      setPolling(true);

      // Poll /api/payment/verify until confirmed
      let attempts = 0;
      const maxAttempts = 30;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json();

          if (data.paid || data.status === "paid") {
            clearInterval(interval);
            setConfirmed(true);
            setPolling(false);
            setStep("success");
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setPolling(false);
            // tx was sent but not confirmed in time — still show success with tx hash
            setStep("success");
          }
        } catch {
          // keep polling
        }
      }, 5000);
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 4001 || e.code === 4200) {
        setErrorMsg("Transaction cancelled in wallet.");
      } else {
        setErrorMsg(e.message || "Transaction failed.");
      }
      setStep("review");
    }
  }, [contractAddress, feeWei, sessionId, account, encodePayCall]);

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-error" />
          <h2 className="font-display text-xl font-bold text-text">Invalid Link</h2>
          <p className="mt-2 text-sm text-text-muted">No session ID found. Please use the link from the Telegram bot.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <span className="text-2xl">🏠</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-text">Namma Nest</h1>
          <p className="mt-1 text-sm text-text-muted">Complete your search payment</p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Connect Wallet ─────────────────────────────── */}
          {step === "connect" && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="mb-5 rounded-xl bg-primary/5 border border-primary/20 p-4">
                <p className="text-xs text-text-muted mb-1">Session ID</p>
                <p className="font-mono text-xs text-primary break-all">{sessionId}</p>
              </div>

              <div className="mb-5 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-bg p-3">
                  <span className="text-sm text-text-muted">Network</span>
                  <span className="text-sm font-medium text-text">GOAT Testnet3</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-bg p-3">
                  <span className="text-sm text-text-muted">Search Fee</span>
                  <span className="text-sm font-bold text-primary">{feeDisplay} BTC</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-bg p-3">
                  <span className="text-sm text-text-muted">Contract</span>
                  <a
                    href={`${EXPLORER}/address/${contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {contractAddress ? `${contractAddress.slice(0, 8)}...${contractAddress.slice(-6)}` : "Loading..."}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <button
                onClick={connectWallet}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-95"
              >
                <Wallet className="h-4 w-4" />
                Connect MetaMask & Pay
              </button>

              <p className="mt-3 text-center text-xs text-text-muted">
                Requires MetaMask with BTC on GOAT Testnet3
              </p>
            </motion.div>
          )}

          {/* ── Review & Confirm ────────────────────────────── */}
          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <div className="mb-1 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <p className="text-xs text-text-muted">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
              </div>

              <h2 className="mb-4 mt-3 font-display text-lg font-bold text-text">
                Confirm Payment
              </h2>

              <div className="mb-5 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-bg p-3">
                  <span className="text-sm text-text-muted">You pay</span>
                  <span className="text-lg font-bold text-primary">{feeDisplay} BTC</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-bg p-3">
                  <span className="text-sm text-text-muted">Network</span>
                  <span className="text-sm font-medium text-text">GOAT Testnet3</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-bg p-3">
                  <span className="text-sm text-text-muted">Records on-chain</span>
                  <span className="text-sm font-medium text-success">Yes ✓</span>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-50/5 p-3">
                <p className="text-xs text-amber-500">
                  ⚡ After MetaMask confirms, go back to Telegram and tap
                  <strong> ✅ I&apos;ve Paid</strong>
                </p>
              </div>

              <button
                onClick={sendPayment}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-95"
              >
                Pay {feeDisplay} BTC →
              </button>

              <button
                onClick={() => setStep("connect")}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl px-6 py-2.5 text-sm text-text-muted hover:text-text"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            </motion.div>
          )}

          {/* ── Paying ──────────────────────────────────────── */}
          {step === "paying" && (
            <motion.div
              key="paying"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="rounded-2xl border border-border bg-surface p-8 text-center"
            >
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
              <h2 className="font-display text-lg font-bold text-text">
                {txHash ? "Confirming on GOAT Testnet3..." : "Waiting for MetaMask..."}
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                {txHash
                  ? "Transaction submitted. Waiting for block confirmation..."
                  : "Please approve the transaction in MetaMask"}
              </p>
              {txHash && (
                <a
                  href={`${EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View on Explorer <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {polling && (
                <p className="mt-3 text-xs text-text-muted animate-pulse">
                  Polling contract for confirmation...
                </p>
              )}
            </motion.div>
          )}

          {/* ── Success ─────────────────────────────────────── */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-success/30 bg-surface p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <CheckCircle className="mx-auto mb-4 h-16 w-16 text-success" />
              </motion.div>
              <h2 className="font-display text-xl font-bold text-text">
                {confirmed ? "Payment Confirmed!" : "Transaction Sent!"}
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                {confirmed
                  ? "Payment recorded on GOAT Testnet3. Go back to Telegram!"
                  : "Your transaction is being confirmed on GOAT Testnet3."}
              </p>

              {txHash && (
                <a
                  href={`${EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20"
                >
                  View Transaction <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <div className="mt-6 rounded-xl border border-border bg-bg p-4">
                <p className="text-sm font-medium text-text">Next Step</p>
                <p className="mt-1 text-sm text-text-muted">
                  Return to Telegram and tap{" "}
                  <span className="font-semibold text-text">✅ I&apos;ve Paid — Verify Now</span>
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  The AI agent will start searching for rentals!
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Error ───────────────────────────────────────── */}
          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-error/30 bg-surface p-6"
            >
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-error" />
              <h2 className="text-center font-display text-lg font-bold text-text">
                Something went wrong
              </h2>
              <p className="mt-2 text-center text-sm text-text-muted">{errorMsg}</p>
              <button
                onClick={() => { setStep("connect"); setErrorMsg(""); }}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-4 text-center text-xs text-text-muted">
          Powered by{" "}
          <a href="/" className="text-primary hover:underline">Namma Nest</a>{" "}
          · GOAT Network Testnet3
        </p>
      </motion.div>
    </div>
  );
}

export default function BotPayPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <BotPayContent />
    </Suspense>
  );
}
