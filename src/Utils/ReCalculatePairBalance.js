import PairRecord from "../Models/PairRecord.model.js";
import Transaction from "../Models/Transaction.model.js";

const ReCalculatePairBalance = async (id1, id2) => {
  const [contactA, contactB] =
    id1.toString() < id2.toString() ? [id1, id2] : [id2, id1];

  const result = await Transaction.aggregate([
    {
      $match: {
        status: { $ne: "cancelled" },
        $or: [
          { from: contactA, to: contactB },
          { from: contactB, to: contactA },
        ],
      },
    },
    {
      $group: {
        _id: null,
        netAmount: {
          $sum: {
            $cond: [
              { $eq: ["$from", contactA] },
              "$amount",
              { $multiply: ["$amount", -1] },
            ],
          },
        },
      },
    },
  ]);

  
  const netAmount = result[0]?.netAmount || 0;
 const status = netAmount === 0 ? "settled" : "active";
let dueDate = null;
let settledOn = null;
if (status === "settled") {
  settledOn = new Date();
}

if (status === "active") {
  const creditor = netAmount > 0 ? contactA : contactB; // the one who is owed money
  const debtor = netAmount > 0 ? contactB : contactA;

  const lastLoan = await Transaction.findOne({
    status: { $ne: "cancelled" },
    from: creditor,
    to: debtor,
  })
    .sort({ createdAt: -1, _id: -1 })
    .select("dueDate");

  dueDate = lastLoan?.dueDate ?? null;
}

  const newPairRecord = await PairRecord.findOneAndUpdate(
    { contactA, contactB },
    { netAmount, status, dueDate, settledOn },
    { upsert: true, new: true },
  );
  
};

export default ReCalculatePairBalance;
