
import mongoose from "mongoose";

const PairRecordSchema = new mongoose.Schema(
  {
    contactA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    contactB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    netAmount: {
      type: Number,
      required: true,
      default: 0, 
    },
    status: {
      type: String,
      enum: ["active", "settled"],
      default: "active",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    autoReminder: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

PairRecordSchema.index({ contactA: 1, contactB: 1 }, { unique: true });

export default mongoose.model("PairRecord", PairRecordSchema);