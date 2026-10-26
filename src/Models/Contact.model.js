
import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    photoURL: {
      type: String,
      default: "",
    },
    isSelf: {
      type: Boolean,
      default: false, 
    },
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, 
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, 
    },
  },    
  { timestamps: true }
);

ContactSchema.index({ email: 1 });
ContactSchema.index({ phone: 1 });

export default mongoose.model("Contact", ContactSchema);