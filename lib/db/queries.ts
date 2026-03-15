import { connectDB } from "./connection";
import {
  User,
  SearchSession,
  Payment,
  Listing,
  SavedListing,
  ErrorLog,
  type IUser,
  type ISearchSession,
  type IPayment,
  type IListing,
} from "./models";
import type { SessionStatus } from "@/types/search";
import type { RawListing } from "@/types/listing";

// ─── Users ────────────────────────────────────────────────────

export async function findOrCreateUser(params: {
  telegramId?: string;
  walletAddress?: string;
  email?: string;
}): Promise<IUser> {
  await connectDB();
  const { telegramId, walletAddress, email } = params;

  const filter: Record<string, string> = {};
  if (telegramId) filter.telegramId = telegramId;
  else if (walletAddress) filter.walletAddress = walletAddress;
  else if (email) filter.email = email;
  else throw new Error("At least one identifier is required");

  let user = await User.findOne(filter);
  if (user) return user;

  user = await User.create({
    telegramId: telegramId || undefined,
    walletAddress: walletAddress || undefined,
    email: email || undefined,
  });
  return user;
}

export async function getUserById(userId: string): Promise<IUser | null> {
  await connectDB();
  return User.findById(userId);
}

// ─── Search Sessions ──────────────────────────────────────────

export async function createSearchSession(params: {
  userId: string;
  locationText: string;
  latitude?: number;
  longitude?: number;
  preferences: Record<string, unknown>;
}): Promise<ISearchSession> {
  await connectDB();
  return SearchSession.create({
    userId: params.userId,
    locationText: params.locationText,
    latitude: params.latitude,
    longitude: params.longitude,
    preferences: params.preferences,
    status: "pending",
  });
}

export async function getSearchSession(sessionId: string): Promise<ISearchSession | null> {
  await connectDB();
  return SearchSession.findById(sessionId);
}

export async function updateSessionStatus(sessionId: string, status: SessionStatus) {
  await connectDB();
  await SearchSession.findByIdAndUpdate(sessionId, { status });
}

export async function getUserSessions(userId: string, limit = 10): Promise<ISearchSession[]> {
  await connectDB();
  return SearchSession.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
}

export async function findRecentDuplicateSession(
  userId: string,
  location: string,
  withinHours = 1
): Promise<ISearchSession | null> {
  await connectDB();
  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000);

  return SearchSession.findOne({
    userId,
    locationText: location,
    status: "completed",
    createdAt: { $gte: cutoff },
  }).sort({ createdAt: -1 });
}

// ─── Payments ─────────────────────────────────────────────────

export async function createPayment(params: {
  sessionId: string;
  userId: string;
  amountTokens: number;
  orderId: string;
}): Promise<IPayment> {
  await connectDB();
  return Payment.create({
    sessionId: params.sessionId,
    userId: params.userId,
    amountTokens: params.amountTokens,
    orderId: params.orderId,
    status: "pending",
  });
}

export async function updatePaymentStatus(
  paymentId: string,
  status: IPayment["status"],
  txHash?: string
) {
  await connectDB();
  const update: Record<string, unknown> = { status };
  if (txHash) update.txHash = txHash;
  await Payment.findByIdAndUpdate(paymentId, update);
}

export async function getPaymentByOrderId(orderId: string): Promise<IPayment | null> {
  await connectDB();
  return Payment.findOne({ orderId });
}

export async function getUserPayments(userId: string, limit = 20): Promise<IPayment[]> {
  await connectDB();
  return Payment.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("sessionId", "locationText");
}

// ─── Listings ─────────────────────────────────────────────────

export async function saveListings(
  sessionId: string,
  listings: RawListing[]
): Promise<IListing[]> {
  await connectDB();
  const docs = listings.map((l) => ({
    sessionId,
    title: l.title,
    type: l.type,
    address: l.address,
    rentMin: l.rent_min ?? undefined,
    rentMax: l.rent_max ?? undefined,
    amenities: l.amenities || [],
    contact: l.contact || undefined,
    sourceUrl: l.source_url,
    validated: true,
    rawData: l as unknown as Record<string, unknown>,
  }));

  const results = await Listing.insertMany(docs);
  return results as unknown as IListing[];
}

export async function getListingById(id: string): Promise<IListing | null> {
  await connectDB();
  return Listing.findById(id);
}

export async function getListingsBySession(sessionId: string): Promise<IListing[]> {
  await connectDB();
  return Listing.find({ sessionId }).sort({ createdAt: -1 });
}

// ─── Saved Listings ───────────────────────────────────────────

export async function saveListing(userId: string, listingId: string) {
  await connectDB();
  await SavedListing.findOneAndUpdate(
    { userId, listingId },
    { userId, listingId },
    { upsert: true }
  );
}

export async function unsaveListing(userId: string, listingId: string) {
  await connectDB();
  await SavedListing.deleteOne({ userId, listingId });
}

export async function getUserSavedListings(userId: string): Promise<IListing[]> {
  await connectDB();
  const saved = await SavedListing.find({ userId })
    .sort({ createdAt: -1 })
    .populate("listingId");
  return saved.map((s) => s.listingId as unknown as IListing);
}

// ─── Error Logging ────────────────────────────────────────────

export async function logError(
  context: string,
  errorMessage: string,
  metadata?: Record<string, unknown>
) {
  try {
    await connectDB();
    await ErrorLog.create({ context, errorMessage, metadata: metadata || {} });
  } catch {
    console.error(`[logError] Failed to log: ${context} — ${errorMessage}`);
  }
}
