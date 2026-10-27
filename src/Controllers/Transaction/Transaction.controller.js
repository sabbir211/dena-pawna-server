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



  const [contactA, contactB] =myContact._id.toString() < otherContact._id.toString() ? [myContact._id, otherContact._id] : [otherContact._id, myContact._id];
    const record = await PairRecordModel.findOne({ contactA, contactB }).lean();
    const amount=record?(contactA.equals(myContact._id) ? record.netAmount : -record.netAmount):0;

  return res.status(200).json({
    person:{name:otherContact.name,email:otherContact.email,_id:otherContact._id,amount},
    entries,
    pagination:{
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit,
        hasMore: page * limit < totalCount
    }
  })
};

export { createTransaction, getMyDenaPawaList, pairLedger };
