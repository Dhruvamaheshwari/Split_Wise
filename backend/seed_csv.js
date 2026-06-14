const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const prisma = require('./config/prisma');
const { parseFlexibleDate, parseAmount, isSettlementRow, normalizeSplitType } = require('./utils/csvParser');

const CSV_FILE_PATH = process.argv[2] || path.join(__dirname, '../Expenses Export.csv');

async function main() {
  console.log(`Starting Advanced CSV Seeding from: ${CSV_FILE_PATH}`);
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error('File not found! Please provide correct path.');
    process.exit(1);
  }

  const records = [];
  
  // Read CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (data) => records.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Read ${records.length} records. Extracting users...`);

  // 1. Collect unique users
  const uniqueUsers = new Set();
  records.forEach(row => {
    if (row.paid_by) uniqueUsers.add(row.paid_by.trim().toLowerCase());
    if (row.split_with) {
      row.split_with.split(';').forEach(u => uniqueUsers.add(u.trim().toLowerCase()));
    }
  });

  uniqueUsers.delete('');

  const userMap = {}; // name -> id
  const mainUserEmail = "aisha@example.com";

  for (const name of uniqueUsers) {
    const email = name === 'aisha' ? mainUserEmail : `${name.replace(/\s+/g, '')}@example.com`;
    
    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: name.charAt(0).toUpperCase() + name.slice(1),
          email,
          password: 'hashedpassword_placeholder'
        }
      });
    }
    userMap[name] = user.id;
  }

  // 2. Create the Import Group
  const group = await prisma.group.create({
    data: { name: "CSV Edge Cases Group" }
  });
  console.log(`Created Group ID: ${group.id}`);

  // 3. Add members to group
  for (const userId of Object.values(userMap)) {
    await prisma.groupMember.create({
      data: { group_id: group.id, user_id: userId, role: "member" }
    });
  }

  // 4. Process Rows
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const parsedAmount = parseAmount(row.amount);
    
    // Skip zeroes
    if (parsedAmount === 0) continue;

    // Default missing paid_by
    let paidByRaw = row.paid_by ? row.paid_by.trim().toLowerCase() : 'aisha';
    const paidByUserId = userMap[paidByRaw];

    // Currency and Amount logic
    const currency = (row.currency && row.currency.trim().toUpperCase()) || 'INR';
    const exchangeRate = currency === 'USD' ? 85.0 : 1.0;
    const baseAmount = parsedAmount * exchangeRate; // Stored amount in INR
    const originalAmount = currency !== 'INR' ? parsedAmount : null;

    // Date logic
    const created_at = parseFlexibleDate(row.date);

    // Is Settlement?
    if (isSettlementRow(row)) {
      const splitWithRaw = row.split_with ? row.split_with.split(';')[0].trim().toLowerCase() : null;
      if (splitWithRaw && userMap[splitWithRaw]) {
        await prisma.settlement.create({
          data: {
            group_id: group.id,
            paid_by_user_id: paidByUserId,
            paid_to_user_id: userMap[splitWithRaw],
            amount: Math.abs(baseAmount),
            created_at
          }
        });
        console.log(`[Row ${i+2}] Inserted Settlement: ${Math.abs(baseAmount)} INR`);
      }
      continue;
    }

    // It's an Expense
    const splitWith = row.split_with ? row.split_with.split(';').map(u => u.trim().toLowerCase()).filter(Boolean) : [];
    if (splitWith.length === 0) continue;

    const splitType = normalizeSplitType(row.split_type);

    const expense = await prisma.expense.create({
      data: {
        group_id: group.id,
        paid_by_user_id: paidByUserId,
        amount: baseAmount,
        original_amount: originalAmount,
        currency,
        exchange_rate: exchangeRate,
        split_type: splitType,
        description: row.description || 'Unknown Expense',
        created_at
      }
    });

    if (row.notes && row.notes.trim() !== '') {
      await prisma.expenseComment.create({
        data: {
          expense_id: expense.id,
          user_id: paidByUserId,
          content: row.notes.trim(),
          created_at
        }
      });
    }

    // Calculate splits (similar to backend controller logic)
    const splits = [];
    
    if (splitType === 'EQUAL') {
      const perPerson = baseAmount / splitWith.length;
      splitWith.forEach(u => {
        splits.push({ expense_id: expense.id, user_id: userMap[u], amount_owed: perPerson, split_value: null });
      });
    } else if (splitType === 'PERCENTAGE') {
      const detailMap = {};
      let totalPerc = 0;
      if (row.split_details) {
        row.split_details.split(';').forEach(p => {
          const match = p.trim().match(/([a-zA-Z\s]+)\s+([\d.]+)%/);
          if (match) {
            const uName = match[1].trim().toLowerCase();
            const perc = parseFloat(match[2]);
            detailMap[uName] = perc;
            totalPerc += perc;
          }
        });
      }
      if (totalPerc === 0) totalPerc = 100;

      splitWith.forEach(u => {
        const perc = detailMap[u] || 0;
        const normalizedPerc = perc / totalPerc;
        splits.push({ expense_id: expense.id, user_id: userMap[u], amount_owed: baseAmount * normalizedPerc, split_value: perc });
      });
    } else if (splitType === 'SHARE') {
      const detailMap = {};
      let totalShares = 0;
      if (row.split_details) {
        row.split_details.split(';').forEach(p => {
          const parts = p.split(/\s+/);
          const uName = parts.slice(0, -1).join(' ').trim().toLowerCase();
          const share = parseFloat(parts[parts.length - 1]);
          if (uName && !isNaN(share)) {
            detailMap[uName] = share;
            totalShares += share;
          }
        });
      }
      if (totalShares === 0) totalShares = splitWith.length;

      splitWith.forEach(u => {
        const share = detailMap[u] || 1;
        splits.push({ expense_id: expense.id, user_id: userMap[u], amount_owed: baseAmount * (share / totalShares), split_value: share });
      });
    } else if (splitType === 'UNEQUAL') {
      const detailMap = {};
      if (row.split_details) {
        row.split_details.split(';').forEach(p => {
          const parts = p.split(/\s+/);
          const uName = parts.slice(0, -1).join(' ').trim().toLowerCase();
          const amt = parseFloat(parts[parts.length - 1]);
          if (uName && !isNaN(amt)) {
            detailMap[uName] = amt;
          }
        });
      }
      splitWith.forEach(u => {
        const amt = detailMap[u] || 0;
        splits.push({ expense_id: expense.id, user_id: userMap[u], amount_owed: amt * exchangeRate, split_value: amt });
      });
    }

    if (splits.length > 0) {
      await prisma.expenseSplit.createMany({ data: splits });
      console.log(`[Row ${i+2}] Inserted ${splitType} Expense: ${row.description} (${baseAmount} INR)`);
    }
  }

  console.log("✅ Seed completed successfully!");
}

main().catch(e => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
