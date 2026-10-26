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
        dueDate: {
          $max: "$dueDate",
        },
      },
    },
  ]);

  
  const netAmount = result[0]?.netAmount || 0;
 const status = netAmount === 0 ? "settled" : "active";

  const newPairRecord = await PairRecord.findOneAndUpdate(
    { contactA, contactB },
    { netAmount, status, dueDate: result[0]?.dueDate || null },
    { upsert: true, new: true },
  );
  
};

export default ReCalculatePairBalance;
