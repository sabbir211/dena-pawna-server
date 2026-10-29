import "dotenv/config";
import mongoose from "mongoose";
import PairRecord from "../Models/PairRecord.model.js";
import "../Models/Contact.model.js";
import sendEmail from "../Utils/sendEmail.js";

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatAmount = (amount) =>
  amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Today's date in Bangladesh
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // Match the entire UTC calendar day stored in PairRecord.dueDate
  const start = new Date(`${todayStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const pairs = await PairRecord.find({
    status: "active",
    autoReminder: true,
    dueDate: { $gte: start, $lt: end },
    lastReminderOn: { $ne: todayStr },
  }).populate("contactA contactB", "name email");

  console.log(
    `${todayStr}: Found ${pairs.length} pair(s) to process`
  );

  // Group all due pairs by the person who owes money.
  const debtorGroups = new Map();

  for (const pair of pairs) {
    if (!pair.contactA || !pair.contactB) {
      console.warn(`Skipping pair ${pair._id}: missing contact`);
      continue;
    }

    // Positive: contactA is owed money by contactB.
    // Negative: contactB is owed money by contactA.
    // Zero: nobody owes anything on this pair.
    if (pair.netAmount === 0) {
      console.log(`Skipping pair ${pair._id}: balance is zero`);
      continue;
    }

    const aIsOwed = pair.netAmount > 0;

    const creditor = aIsOwed ? pair.contactA : pair.contactB;
    const debtor = aIsOwed ? pair.contactB : pair.contactA;

    if (!debtor.email) {
      console.warn(
        `Skipping pair ${pair._id}: debtor has no email`
      );
      continue;
    }

    const debtorEmail = debtor.email.trim().toLowerCase();

    if (!debtorGroups.has(debtorEmail)) {
      debtorGroups.set(debtorEmail, {
        debtor,
        pairs: [],
        creditors: new Map(),
        total: 0,
      });
    }

    const group = debtorGroups.get(debtorEmail);
    const amount = Math.abs(pair.netAmount);

    group.pairs.push(pair);
    group.total += amount;

    // Combine multiple entries for the same creditor.
    const creditorKey = creditor._id.toString();

    if (!group.creditors.has(creditorKey)) {
      group.creditors.set(creditorKey, {
        name: creditor.name || "Unknown",
        amount: 0,
      });
    }

    group.creditors.get(creditorKey).amount += amount;
  }

  console.log(
    `Found ${debtorGroups.size} debtor(s) to email`
  );

  let sent = 0;
  let failed = 0;

  // Send one email to each debtor, regardless of how many
  // different people they owe money to.
  for (const [debtorEmail, group] of debtorGroups) {
    const { debtor, pairs: debtorPairs, creditors, total } = group;

    const creditorList = [...creditors.values()];

    const textLines = creditorList.map(
      (creditor) =>
        `- ${creditor.name}: ৳${formatAmount(creditor.amount)}`
    );

    const htmlLines = creditorList.map(
      (creditor) =>
        `<li>${esc(creditor.name)}: <strong>৳${formatAmount(
          creditor.amount
        )}</strong></li>`
    );

    const subject =
      `Payment Reminder: ৳${formatAmount(total)} is due today`;

    const text = [
      `Hi ${debtor.name || "there"},`,
      "",
      "This is a reminder that you have payments due today.",
      "",
      "Payments due today:",
      ...textLines,
      "",
      `Total amount due today: ৳${formatAmount(total)}`,
      "",
      "Please settle your payments on time.",
      "",
      "— DenaPawna",
    ].join("\n");

    const html = `
      <p>Hi ${esc(debtor.name || "there")},</p>

      <p>This is a reminder that you have payments due today.</p>

      <p><strong>Payments due today:</strong></p>

      <ul>
        ${htmlLines.join("\n")}
      </ul>

      <p>
        <strong>
          Total amount due today: ৳${formatAmount(total)}
        </strong>
      </p>

      <p>Please settle your payments on time.</p>

      <p>— DenaPawna</p>
    `;

    try {
      // One email for this debtor, regardless of the number
      // of PairRecord documents in their group.
      await sendEmail({
        to: debtor.email,
        subject,
        text,
        html,
      });

      // Mark every pair in this email as reminded only after
      // the email has been sent successfully.
      const result = await PairRecord.updateMany(
        {
          _id: { $in: debtorPairs.map((pair) => pair._id) },
          lastReminderOn: { $ne: todayStr },
        },
        {
          $set: { lastReminderOn: todayStr },
        }
      );

      sent++;

      console.log(
        `Email sent to ${debtorEmail}: ` +
        `৳${formatAmount(total)} across ` +
        `${creditorList.length} creditor(s). ` +
        `Marked ${result.modifiedCount} pair(s).`
      );
    } catch (err) {
      failed++;

      console.error(
        `Failed processing reminders for ${debtorEmail}:`,
        err.message
      );
    }
  }

  console.log(
    `Done. Emails sent: ${sent}, failed: ${failed}`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
};

run()
  .catch((err) => {
    console.error("Reminder job crashed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });