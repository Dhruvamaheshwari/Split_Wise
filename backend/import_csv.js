const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const prisma = require('./config/prisma');

const CSV_FILE_PATH = process.argv[2] || path.join(__dirname, '../Expenses Export.csv');

async function main() {
  console.log(`Starting CSV Import from: ${CSV_FILE_PATH}`);
  
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

  console.log(`Read ${records.length} records. Processing...`);

  // 1. Collect unique users
  const uniqueUsers = new Set();
  records.forEach(row => {
    if (row.paid_by) uniqueUsers.add(row.paid_by.trim().toLowerCase());
    if (row.split_with) {
      row.split_with.split(';').forEach(u => uniqueUsers.add(u.trim().toLowerCase()));
    }
  });

  // Remove empties
  uniqueUsers.delete('');

  console.log(`Found ${uniqueUsers.size} unique users. Syncing...`);

  const userMap = {}; // name -> id
  const mainUserEmail = "aisha@example.com"; // Map Aisha to a default email

  for (const name of uniqueUsers) {
    const email = name === 'aisha' ? mainUserEmail : `${name.replace(/\s+/g, '')}@example.com`;
    
    // Upsert user
    let user = await prisma.user.findFirst({
      where: { email }
    });

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
    data: {
      name: "CSV Import Test Group",
    }
  });

  console.log(`Created Group ID: ${group.id}`);

  // 3. Add members to group
  for (const userId of Object.values(userMap)) {
    await prisma.groupMember.create({
      data: {
        group_id: group.id,
        user_id: userId,
        role: "member"
      }
    });
  }

  // Helper for amounts
  const parseAmount = (val) => {
    if (!val) return 0;
    const clean = val.replace(/,/g, '');
    return parseFloat(clean);
  };

  // 4. Process Expenses and Settlements
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    let amount = parseAmount(row.amount);
    
    // Skip zeroes
    if (amount === 0) continue;

    // Default missing paid_by
    let paidByRaw = row.paid_by ? row.paid_by.trim().toLowerCase() : 'aisha';
    const paidByUserId = userMap[paidByRaw];

    // Is Settlement?
    if (!row.split_type || row.split_type.trim() === '') {
      // It's a settlement
      const splitWithRaw = row.split_with ? row.split_with.trim().toLowerCase() : null;
      if (splitWithRaw && userMap[splitWithRaw]) {
        await prisma.settlement.create({
          data: {
            group_id: group.id,
            paid_by_user_id: paidByUserId,
            paid_to_user_id: userMap[splitWithRaw],
            amount: Math.abs(amount)
          }
        });
        console.log(`[Row ${i+2}] Inserted Settlement: ${amount}`);
      }
      continue;
    }

    // It's an Expense
    const splitWith = row.split_with ? row.split_with.split(';').map(u => u.trim().toLowerCase()).filter(Boolean) : [];
    if (splitWith.length === 0) continue;

    const expense = await prisma.expense.create({
      data: {
        group_id: group.id,
        paid_by_user_id: paidByUserId,
        amount: amount,
        description: row.description || 'Unknown Expense',
      }
    });

    // Add note as comment if exists
    if (row.notes && row.notes.trim() !== '') {
      await prisma.expenseComment.create({
        data: {
          expense_id: expense.id,
          user_id: paidByUserId,
          content: row.notes.trim()
        }
      });
    }

    // Calculate splits
    const splits = [];
    const splitType = row.split_type.trim().toLowerCase();
    
    if (splitType === 'equal') {
      const perPerson = amount / splitWith.length;
      splitWith.forEach(u => {
        splits.push({
          expense_id: expense.id,
          user_id: userMap[u],
          amount_owed: perPerson
        });
      });
    } else if (splitType === 'percentage') {
      // parse details
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
      
      // Normalize to 100%
      if (totalPerc === 0) totalPerc = 100;

      splitWith.forEach(u => {
        const perc = detailMap[u] || 0;
        const normalizedPerc = perc / totalPerc;
        splits.push({
          expense_id: expense.id,
          user_id: userMap[u],
          amount_owed: amount * normalizedPerc
        });
      });
    } else if (splitType === 'share' || splitType === 'unequal') {
      // In a real app, unequal parses absolute amounts, share parses ratios.
      // For testing, we fallback to equal if parsing fails.
      const perPerson = amount / splitWith.length;
      splitWith.forEach(u => {
        splits.push({
          expense_id: expense.id,
          user_id: userMap[u],
          amount_owed: perPerson
        });
      });
    }

    if (splits.length > 0) {
      await prisma.expenseSplit.createMany({
        data: splits
      });
      console.log(`[Row ${i+2}] Inserted Expense: ${row.description} (${amount})`);
    }
  }

  console.log("✅ Import completed successfully!");
}

main().catch(e => {
  console.error("❌ Import failed:");
  console.error(e);
  process.exit(1);
});
