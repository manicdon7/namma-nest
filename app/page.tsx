"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  Wallet,
  Bot,
  Home,
  ArrowRight,
  Star,
  Shield,
  Zap,
  Send,
} from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Search",
    description: "Enter your location & preferences — house, PG, budget, amenities.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Wallet,
    title: "Pay",
    description: "Pay a tiny fee with BTC on GOAT Testnet3 — recorded on-chain.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Bot,
    title: "AI Finds",
    description: "OpenClaw searches NoBroker, 99acres, MagicBricks & more.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: Home,
    title: "Move In",
    description: "Get validated, broker-free listings — contact owners directly.",
    color: "bg-blue-600/10 text-blue-600",
  },
];

const testimonials = [
  {
    name: "Priya R.",
    location: "T Nagar, Chennai",
    text: "Found a 2BHK in 30 seconds flat. No brokers, no hassle. Namma Nest is magic!",
    rating: 5,
  },
  {
    name: "Arjun K.",
    location: "Koramangala, Bengaluru",
    text: "The AI actually validates listings — no more fake photos or outdated prices.",
    rating: 5,
  },
  {
    name: "Sneha M.",
    location: "Indiranagar, Bengaluru",
    text: "Love the Telegram bot! I search for PGs right from my phone while commuting.",
    rating: 5,
  },
];

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10">
          <svg
            className="h-full w-full opacity-[0.03]"
            viewBox="0 0 1200 600"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="#C45E2E"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
              <Zap className="h-4 w-4" />
              Chennai · Bengaluru · All Cities
            </div>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl font-bold leading-tight text-text sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Find Your Nest.{" "}
            <span className="text-primary">Pay Once.</span>{" "}
            <span className="text-secondary">Move In.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-text-muted sm:text-xl"
          >
            AI-powered rental search for Chennai, Bengaluru, and all cities.
            Zero spam, zero brokers. NoBroker, 99acres, Housing.com & more — all validated by AI.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/search"
              className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30"
            >
              Search Now
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="https://t.me/NammaNestBot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-8 py-4 text-lg font-semibold text-text transition-colors hover:border-primary hover:text-primary"
            >
              <Send className="h-5 w-5" />
              Try on Telegram
            </a>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex items-center justify-center gap-6 text-sm text-text-muted"
          >
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-secondary" />
              AI Validated
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-accent" />
              30s Results
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-primary" />
              Zero Brokers
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="border-t border-border bg-surface px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center"
          >
            <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-3 text-text-muted">
              Four simple steps to your new home
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative rounded-2xl border border-border bg-bg p-6 text-center"
              >
                <div className="absolute -top-3 left-6 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {i + 1}
                </div>
                <div
                  className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${step.color}`}
                >
                  <step.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg font-semibold text-text">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center"
          >
            <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">
              What People Say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <div className="mb-3 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-accent text-accent"
                    />
                  ))}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-text-muted">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div>
                  <p className="text-sm font-semibold text-text">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.location}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Telegram CTA Banner */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-secondary/20 bg-gradient-to-r from-secondary to-secondary/80 p-8 text-center text-white sm:p-12"
        >
          <Send className="mx-auto mb-4 h-10 w-10 opacity-80" />
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Also Available on Telegram!
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm opacity-90">
            Search for rentals right from Telegram. Share your location, set
            preferences, pay, and get AI-curated results — all without leaving
            the app.
          </p>
          <a
            href="https://t.me/NammaNestBot"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-white/90"
          >
            <Send className="h-4 w-4" />
            Open Telegram Bot
          </a>
        </motion.div>
      </section>
    </div>
  );
}
