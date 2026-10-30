import Transaction from "../../Models/Transaction.model.js";
import User from "../../Models/User.model.js";
import Contact from "../../Models/Contact.model.js";
import ReCalculatePairBalance from "../../Utils/ReCalculatePairBalance.js";
import PairRecordModel from "../../Models/PairRecord.model.js";
import mongoose from "mongoose";

const createTransaction = async (req, res) => {
  try {
    const createdBy = req.user._id;

    const {
      name,
      receiverEmail,
      amount,
      note,
      proofImage,
      dueDate,
      direction,
    } = req.body;
    if (!name || !receiverEmail || !amount || !direction) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sender = await Contact.findOne({
      linkedUserId: createdBy,
      isSelf: true,
    });
    let receiver = await Contact.findOne({ email: receiverEmail });

    if (!sender) {
      return res.status(404).json({ message: "Sender contact not found" });
    }
    if (!receiver) {
      receiver = await Contact.create({
        name,
        email: receiverEmail,
        isSelf: false,
        addedBy: createdBy,
      });
    }
    const from = direction === "give" ? sender._id : receiver._id;
    const to = direction === "give" ? receiver._id : sender._id;

    const newTransaction = await Transaction.create({
      from,
      to,
      amount,
      note,
      proofImage,
      dueDate,
      createdBy,
    });

    //calculate pair
    await ReCalculatePairBalance(from, to);

    return res.status(201).json({
      message: "Transaction created successfully",
      transaction: newTransaction,
    });
  } catch (error) {
    console.error("Error in createTransaction:", error);
    return res.status(500).json({ message: "Failed to create transaction" });
  }
};

const getMyDenaPawaList = async (req, res) => {
  const myUserId = req.user._id;

  const myContact = await Contact.findOne({
    linkedUserId: myUserId,
    isSelf: true,
  });
  if (!myContact) {
    return res.status(404).json({ message: "My contact not found" });
  }
  try {
    const myContactId = myContact._id;

    const pairs = await PairRecordModel.find({
      $or: [{ contactA: myContactId }, { contactB: myContactId }],
    }).populate("contactA contactB");

    return res
      .status(200)
      .json({ message: "My pairs found successfully", pairs });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to get my dena pawna list" });
  }
};

const pairLedger = async (req, res) => {
  const { contactId } = req.params;
  const myUserId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(contactId)) {
    return res.status(400).json({ message: "Invalid contactId" });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const myContact = await Contact.findOne({
    linkedUserId: myUserId,
    isSelf: true,
  });
  if (!myContact) {
    return res.status(404).json({ message: "My contact not found" });
  }
  const otherContact = await Contact.findById(contactId);
  if (!otherContact) {
    return res.status(404).json({ message: "Other contact not found" });
  }
  if (myContact._id.equals(otherContact._id)) {
    return res.status(400).json({ message: "Cannot get ledger with self" });
  }

  const filter = {
    $or: [
      { from: myContact._id, to: otherContact._id },
      { from: otherContact._id, to: myContact._id },
    ],
  };
  const [transactions, totalCount] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("from to createdBy"),
    Transaction.countDocuments(filter),
  ]);

  if (totalCount === 0 && !otherContact.createdBy.equals(myUserId)) {
    return res
      .status(403)
      .json({ message: "You are not authorized to view this ledger" });
  }

  const entries = transactions.map((txn) => {
    const direction = txn.from.equals(myContact._id) ? "give" : "take";

    return {
      ...txn.toObject(),
      createdBy: txn.createdBy,
      direction,
      title: direction === "give" ? "You gave" : "You received",
      delta: direction === "give" ? -txn.amount : txn.amount,
    };
  });

  const [contactA, contactB] =
    myContact._id.toString() < otherContact._id.toString()
      ? [myContact._id, otherContact._id]
      : [otherContact._id, myContact._id];
  const record = await PairRecordModel.findOne({ contactA, contactB }).lean();
  const amount = record
    ? contactA.equals(myContact._id)
      ? record.netAmount
      : -record.netAmount
    : 0;
  const dueDate = record ? record.dueDate : null;
  const autoReminder = record ? record.autoReminder : false;

  return res.status(200).json({
    person: {
      name: otherContact.name,
      email: otherContact.email,
      _id: otherContact._id,
      amount,
      dueDate,
      autoReminder,
    },
    entries,
    pagination: {
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      limit,
      hasMore: page * limit < totalCount,
    },
  });
};

const confirmTransaction = async (req, res) => {
  const { transactionId } = req.params;
  const myUserId = req.user._id;
  const myContact = await Contact.findOne({
    linkedUserId: myUserId,
    isSelf: true,
  });
  if (!myContact) {
    return res.status(404).json({ message: "My contact not found" });
  }
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }
  if (transaction.createdBy.toString() === myUserId.toString()) {
    return res
      .status(403)
      .json({ message: "You are not authorized to confirm this transaction" });
  }
  if (transaction.status === "confirmed") {
    return res
      .status(400)
      .json({ message: "Transaction is already confirmed" });
  }
  transaction.status = "confirmed";
  await transaction.save();
  return res
    .status(200)
    .json({ success: true, message: "Transaction confirmed successfully" });
};

const deleteTransaction = async (req, res) => {
  const { transactionId } = req.params;
  const myUserId = req.user._id;
  const myContact = await Contact.findOne({
    linkedUserId: myUserId,
    isSelf: true,
  });

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }
  if (
    transaction.createdBy.equals(myUserId) ||
    (!myContact._id.equals(transaction.from) &&
      !myContact._id.equals(transaction.to))
  ) {
    return res
      .status(403)
      .json({ message: "You are not authorized to delete this transaction" });
  }
  if (transaction.status === "confirmed") {
    return res
      .status(400)
      .json({ message: "Cannot delete a confirmed transaction" });
  }

  await Transaction.findByIdAndUpdate(transactionId, { status: "cancelled" });
  await ReCalculatePairBalance(transaction.from, transaction.to);
  return res
    .status(200)
    .json({ success: true, message: "Transaction deleted successfully" });
};

const toggleAutoReminder = async (req, res) => {
  const { contactId } = req.params;
  const myUserId = req.user._id;

  const myContact = await Contact.findOne({
    linkedUserId: myUserId,
    isSelf: true,
  });
  if (!myContact) {
    return res.status(404).json({ message: "My contact not found" });
  }

  const pairRecord = await PairRecordModel.findOne({
    $or: [
      { contactA: myContact._id, contactB: contactId },
      { contactA: contactId, contactB: myContact._id },
    ],
  });
  if (!pairRecord) {
    return res.status(404).json({ message: "Record not found" });
  }
  if (pairRecord.status != "active") {
    return res
      .status(400)
      .json({ message: "Cannot toggle auto reminder for inactive pair" });
  }

  const result = await PairRecordModel.findByIdAndUpdate(
    pairRecord._id,
    { autoReminder: !pairRecord.autoReminder },
    { new: true }
  );
  return res
    .status(200)
    .json({
      success: true,
      message: "Auto reminder toggled successfully",
      autoReminder: result.autoReminder,
    });
};

export {
  createTransaction,
  getMyDenaPawaList,
  pairLedger,
  confirmTransaction,
  deleteTransaction,
  toggleAutoReminder,
};
