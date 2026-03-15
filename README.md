# Namma Nest

**Find Your Perfect Nest, Instantly.**

AI-powered rental house and PG finder for India. Users search for rentals near their location, pay a small fee with GOAT tokens via the x402 protocol, and the OpenClaw AI agent searches, validates, and returns clean, structured listings from across the web.

## Features

- **AI-Powered Search**: OpenClaw agent searches NoBroker, 99acres, MagicBricks, Housing.com, and more
- **x402 Payment Gating**: Pay with GOAT tokens on GOAT Testnet3 via the x402 protocol before each search
- **Listing Validation**: Each result is AI-validated for accuracy, realistic pricing, and active status
- **Web Platform**: Full-featured Next.js app with search, results, and dashboard
- **Telegram Bot**: Complete bot with location sharing, payment flow, and formatted results
- **Zero Brokers**: Direct contact with property owners

## Tech Stack

| Layer      | Technology                                          |
| ---------- | --------------------------------------------------- |
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS   |
| UI         | Framer Motion animations, Lucide icons              |
| Backend    | Next.js API Routes, Node.js serverless functions    |
| AI Agent   | OpenClaw (web search + validation)                  |
| Payments   | GOAT x402 protocol (`goatx402-sdk-server` + `goatx402-sdk`) |
| Database   | MongoDB (Mongoose)                                  |
| Bot        | Telegraf.js (Telegram Bot API)                      |
| Wallet     | RainbowKit + wagmi + viem                           |
| Hosting    | Vercel (web), Railway/Fly.io (bot)                  |

## Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB instance (MongoDB Atlas or local)
- OpenClaw API key
- GOAT x402 merchant credentials (`GOATX402_API_KEY`, `GOATX402_API_SECRET`, `GOATX402_MERCHANT_ID`)
- Telegram bot token (from @BotFather)

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/namma-nest.git
cd namma-nest
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials. Key variables:

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `GOATX402_API_URL` | GOAT x402 API endpoint |
| `GOATX402_MERCHANT_ID` | Your x402 merchant ID |
| `GOATX402_API_KEY` | x402 API key (server-side only) |
| `GOATX402_API_SECRET` | x402 API secret (server-side only) |
| `OPENCLAW_API_KEY` | OpenClaw AI agent API key |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Run the Telegram bot (local polling mode)

```bash
npm run bot
```

## Architecture: Payment-Gated Agent Flow

The core architecture ensures the OpenClaw agent **only runs after x402 payment is verified**:

```
User submits search form
  → POST /api/payment/initiate
    → Creates x402 order via GoatX402Client.createOrder()
    → Returns orderId + payToAddress to frontend
  → User sends GOAT tokens to payToAddress
  → Frontend polls POST /api/payment/verify
    → Calls GoatX402Client.getOrderStatus(orderId)
    → When status = PAYMENT_CONFIRMED → session.status = "paid"
  → POST /api/search (guarded: requires session.status === "paid")
    → OpenClaw agent searches + validates listings
    → Results saved to MongoDB → returned to user
```

## Deployment

### Web Platform (Vercel)

1. Push your code to GitHub
2. Import the repository on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example` in the Vercel dashboard
4. Deploy

### Telegram Bot Webhook

After deploying to Vercel, set the Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.vercel.app/api/bot/webhook",
    "secret_token": "YOUR_WEBHOOK_SECRET"
  }'
```

## Project Structure

```
namma-nest/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout with theme + fonts
│   ├── page.tsx                 # Landing page
│   ├── search/page.tsx          # Search UI
│   ├── results/page.tsx         # Results display
│   ├── dashboard/page.tsx       # User dashboard
│   └── api/
│       ├── search/route.ts      # OpenClaw search (x402-gated)
│       ├── payment/
│       │   ├── initiate/route.ts  # Create x402 order
│       │   └── verify/route.ts    # Poll x402 order status
│       ├── bot/webhook/route.ts   # Telegram webhook handler
│       ├── listings/[id]/         # Single listing endpoint
│       └── sessions/[id]/         # Session details endpoint
├── bot/                         # Standalone Telegram bot
│   ├── index.ts                 # Bot bootstrap
│   ├── commands/                # Bot commands (/start, /search, /history)
│   ├── scenes/                  # Conversation flows
│   └── middleware/              # Session management
├── lib/
│   ├── db/
│   │   ├── connection.ts        # MongoDB connection (Mongoose)
│   │   ├── models.ts            # Mongoose schemas/models
│   │   └── queries.ts           # All DB query functions
│   ├── openclaw/
│   │   ├── agent.ts             # OpenClaw agent init + runner
│   │   ├── search.ts            # Search prompt builder + parser
│   │   └── validate.ts          # Listing validation via OpenClaw
│   ├── payment/
│   │   ├── x402.ts              # GoatX402Client SDK integration
│   │   └── goat.ts              # GOAT testnet3 chain config
│   └── utils/
│       ├── cn.ts                # Tailwind class merge utility
│       ├── formatter.ts         # Rent/listing formatters
│       └── location.ts          # Geocoding helpers
├── components/                  # React components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── SearchForm.tsx
│   ├── PaymentGate.tsx          # x402 payment modal
│   ├── ListingCard.tsx
│   ├── ListingsGrid.tsx
│   └── LoadingAgent.tsx
├── types/                       # TypeScript type definitions
└── .env.example                 # Environment variables template
```

## Environment Variables

See [`.env.example`](./.env.example) for the complete list with descriptions.

**Important**: `GOATX402_API_KEY` and `GOATX402_API_SECRET` must never be exposed to the frontend. They are used server-side only for HMAC-authenticated requests to the GOAT x402 Core API.

## License

MIT
