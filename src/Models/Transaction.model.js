
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true, 
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true, 
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
    },
    proofImage: {
      url: { type: String },
      publicId: { type: String },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed"],
      default: "pending",
    },
    dueDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, 
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", TransactionSchema);