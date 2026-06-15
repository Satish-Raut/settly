export function calculateSplits(amount, expenseDate, splitType, splitWith, splitDetails, memberships) {
  const targetDate = new Date(expenseDate);

  // 1. Get active members on this specific expense date
  const activeMembersOnDate = memberships.filter(m => {
    const joined = new Date(m.joinedAt);
    const left = m.leftAt ? new Date(m.leftAt) : null;
    return joined <= targetDate && (!left || targetDate <= left);
  });
  const activeUserIds = activeMembersOnDate.map(m => m.userId);

  // 2. Validate that every requested split participant is active in the group on this date
  const inactiveParticipants = splitWith.filter(uid => !activeUserIds.includes(uid));
  if (inactiveParticipants.length > 0) {
    throw new Error(`Inactive members: User IDs [${inactiveParticipants.join(', ')}] were inactive on ${targetDate.toLocaleDateString()}`);
  }

  // If no participants, throw
  if (splitWith.length === 0) {
    throw new Error('Split participants list cannot be empty');
  }

  let splits = []; // Array of { userId, shareAmount, percentage }

  if (splitType === 'equal') {
    const count = splitWith.length;
    const rawShare = amount / count;
    const roundedShare = Math.round(rawShare * 100) / 100;
    const totalAllocated = roundedShare * count;
    const remainder = Math.round((amount - totalAllocated) * 100) / 100;

    splitWith.forEach((uid, idx) => {
      // Rounding adjustment: give remainder to the first user
      const share = idx === 0 ? roundedShare + remainder : roundedShare;
      splits.push({ userId: uid, shareAmount: share });
    });
  } else if (splitType === 'percentage') {
    let totalPercent = 0;
    splitWith.forEach(uid => {
      totalPercent += parseFloat(splitDetails[uid] || 0);
    });

    // We check if it sums to exactly 100%
    if (Math.abs(totalPercent - 100.0) > 0.01) {
      throw new Error(`Split percentages must sum to 100%. Found: ${totalPercent}%`);
    }

    splitWith.forEach(uid => {
      const userPercent = parseFloat(splitDetails[uid] || 0);
      const rawShare = (amount * userPercent) / 100.0;
      splits.push({ 
        userId: uid, 
        shareAmount: Math.round(rawShare * 100) / 100,
        percentage: userPercent
      });
    });
  } else if (splitType === 'share') {
    let totalShares = 0;
    splitWith.forEach(uid => {
      totalShares += parseFloat(splitDetails[uid] || 0);
    });

    if (totalShares <= 0) {
      throw new Error('Total shares must be greater than zero');
    }

    splitWith.forEach(uid => {
      const userRatio = parseFloat(splitDetails[uid] || 0);
      const rawShare = amount * (userRatio / totalShares);
      splits.push({ 
        userId: uid, 
        shareAmount: Math.round(rawShare * 100) / 100 
      });
    });
  } else if (splitType === 'unequal') {
    let totalUnequalAmount = 0;
    splitWith.forEach(uid => {
      totalUnequalAmount += parseFloat(splitDetails[uid] || 0);
    });

    if (Math.abs(totalUnequalAmount - amount) > 0.02) {
      throw new Error(`Sum of unequal split amounts (${totalUnequalAmount}) must match the total expense amount (${amount})`);
    }

    splitWith.forEach(uid => {
      const share = parseFloat(splitDetails[uid] || 0);
      splits.push({ userId: uid, shareAmount: share });
    });
  } else {
    throw new Error(`Unsupported split type: ${splitType}`);
  }

  return splits;
}
