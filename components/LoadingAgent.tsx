"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const statusMessages = [
  "Initializing Namma Nest AI...",
  "Searching NoBroker...",
  "Checking 99acres...",
  "Scanning MagicBricks...",
  "Browsing Housing.com...",
  "Checking OLX listings...",
  "Searching local classifieds...",
  "Validating listings...",
  "Checking price accuracy...",
  "Verifying locations...",
  "Almost done...",
  "Curating your results...",
];

export default function LoadingAgent() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2500);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 3, 95));
    }, 500);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      {/* Animated House */}
      <div className="relative mb-8">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          {/* Roof */}
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
          >
            <svg
              width="120"
              height="100"
              viewBox="0 0 120 100"
              className="text-primary"
            >
              <motion.path
                d="M10 55 L60 10 L110 55"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              />
              <motion.rect
                x="25"
                y="55"
                width="70"
                height="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                rx="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1,
                  delay: 0.5,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              />
              <motion.rect
                x="48"
                y="68"
                width="24"
                height="27"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                rx="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.8,
                  delay: 1,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              />
            </svg>
          </motion.div>
        </motion.div>

        {/* Pulse rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/30"
            initial={{ width: 60, height: 60, opacity: 0.6 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Status Text */}
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-6 font-display text-lg font-semibold text-text"
      >
        {statusMessages[messageIndex]}
      </motion.p>

      {/* Progress Bar */}
      <div className="w-full max-w-sm">
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-secondary"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-text-muted">
          {Math.round(progress)}% complete
        </p>
      </div>

      <p className="mt-6 max-w-md text-center text-sm text-text-muted">
        Our AI agent is searching across multiple platforms to find the best
        rentals near your location. This usually takes 30-60 seconds.
      </p>
    </div>
  );
}
