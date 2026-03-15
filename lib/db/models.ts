import mongoose, { Schema, type Document, type Model } from "mongoose";

// ─── User ─────────────────────────────────────────────────────

export interface IUser extends Document {
  telegramId?: string;
  walletAddress?: string;
  email?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    telegramId: { type: String, unique: true, sparse: true },
    walletAddress: { type: String, unique: true, sparse: true },
    email: { type: String, sparse: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// ─── Search Session ───────────────────────────────────────────

export interface ISearchSession extends Document {
  userId: mongoose.Types.ObjectId;
  locationText: string;
  latitude?: number;
  longitude?: number;
  preferences: Record<string, unknown>;
  status: "pending" | "paid" | "completed" | "failed";
  createdAt: Date;
}

const SearchSessionSchema = new Schema<ISearchSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    locationText: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    preferences: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "paid", "completed", "failed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

SearchSessionSchema.index({ createdAt: -1 });

// ─── Payment ──────────────────────────────────────────────────

export interface IPayment extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amountTokens: number;
  txHash?: string;
  orderId: string;
  status: "pending" | "confirmed" | "failed" | "cancelled";
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "SearchSession", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountTokens: { type: Number, required: true },
    txHash: { type: String, unique: true, sparse: true },
    orderId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// ─── Listing ──────────────────────────────────────────────────

export interface IListing extends Document {
  sessionId: mongoose.Types.ObjectId;
  title: string;
  type: "house" | "pg" | "apartment";
  address: string;
  rentMin?: number;
  rentMax?: number;
  amenities: string[];
  contact?: string;
  sourceUrl: string;
  validated: boolean;
  rawData: Record<string, unknown>;
  createdAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "SearchSession", required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ["house", "pg", "apartment"], required: true, index: true },
    address: { type: String, required: true },
    rentMin: { type: Number },
    rentMax: { type: Number },
    amenities: { type: [String], default: [] },
    contact: { type: String },
    sourceUrl: { type: String, required: true },
    validated: { type: Boolean, default: false },
    rawData: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// ─── Saved Listing ────────────────────────────────────────────

export interface ISavedListing extends Document {
  userId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SavedListingSchema = new Schema<ISavedListing>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

SavedListingSchema.index({ userId: 1, listingId: 1 }, { unique: true });

// ─── Error Log ────────────────────────────────────────────────

export interface IErrorLog extends Document {
  context: string;
  errorMessage: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>(
  {
    context: { type: String, required: true },
    errorMessage: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

ErrorLogSchema.index({ createdAt: -1 });

// ─── Model Exports (prevent re-compilation in dev) ───────────

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export const SearchSession: Model<ISearchSession> =
  mongoose.models.SearchSession ||
  mongoose.model<ISearchSession>("SearchSession", SearchSessionSchema);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export const Listing: Model<IListing> =
  mongoose.models.Listing || mongoose.model<IListing>("Listing", ListingSchema);

export const SavedListing: Model<ISavedListing> =
  mongoose.models.SavedListing ||
  mongoose.model<ISavedListing>("SavedListing", SavedListingSchema);

export const ErrorLog: Model<IErrorLog> =
  mongoose.models.ErrorLog || mongoose.model<IErrorLog>("ErrorLog", ErrorLogSchema);
