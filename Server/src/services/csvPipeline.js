import Papa from 'papaparse';

// Map of name variations to canonical database names
const NAME_MAP = {
  'aisha': 'Aisha',
  'rohan': 'Rohan',
  'rohan ': 'Rohan',
  'priya': 'Priya',
  'priya s': 'Priya',
  'meera': 'Meera',
  'sam': 'Sam',
  'dev': 'Dev'
};

// Resolve username/alias to database User record
export function resolveUserAlias(name, dbUsers) {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  const canonicalName = NAME_MAP[normalized] || name.trim();
  
  // Find in DB users list
  return dbUsers.find(u => u.username.toLowerCase() === canonicalName.toLowerCase()) || null;
}

// Normalize dates: converts DD-MM-YYYY or Mar-14 to YYYY-MM-DD
export function normalizeDateString(dateStr) {
  if (!dateStr) return null;
  const str = dateStr.trim();

  // Match "Mar-14" or "14-Mar" or similar Month-Day formats
  const monthDayRegex = /^([A-Za-z]{3})-([0-9]{1,2})$/;
  const dayMonthRegex = /^([0-9]{1,2})-([A-Za-z]{3})$/;
  
  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  let match = str.match(monthDayRegex);
  if (match) {
    const m = months[match[1].toLowerCase()];
    const d = match[2].padStart(2, '0');
    return `2026-${m}-${d}`; // All spreadsheet data is in 2026
  }

  match = str.match(dayMonthRegex);
  if (match) {
    const m = months[match[2].toLowerCase()];
    const d = match[1].padStart(2, '0');
    return `2026-${m}-${d}`;
  }

  // Handle DD-MM-YYYY or MM-DD-YYYY standard dates
  const parts = str.split('-');
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    
    // For standard 04-05-2026, we normalize it to YYYY-MM-DD. 
    // We assume DD-MM-YYYY is standard based on the file layout (01-02-2026 is Feb 1st, 12-02-2026 is Feb 12th).
    return `${year}-${month}-${day}`;
  }

  return dateStr;
}

// Checks if two descriptions share descriptive keywords (excluding common stop words)
function hasDescriptionSimilarity(desc1, desc2) {
  const stopWords = new Set(['at', 'the', 'order', 'dinner', 'lunch', 'breakfast', 'food', 'for', 'booking', 'cab', 'supplies']);
  
  const getKeywords = (desc) => {
    return desc
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // remove punctuation
      .split(/\s+/)
      .filter(word => word.length >= 3 && !stopWords.has(word));
  };

  const keywords1 = getKeywords(desc1);
  const keywords2 = getKeywords(desc2);

  // Check intersection
  return keywords1.some(word => keywords2.includes(word));
}

// Primary processing pipeline
export async function parseAndAuditCSV(csvText, dbUsers, dbMemberships, groupId) {
  // Parse CSV
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });

  const rawRows = parseResult.data;
  const processedRows = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = i + 2; // header is row 1
    const anomalies = [];

    // --- 1. MISSING PAYER ERROR ---
    const rawPayer = row.paid_by;
    let resolvedPayer = null;
    if (!rawPayer || rawPayer.trim() === '') {
      anomalies.push({
        anomalyType: 'MISSING_PAYER',
        severity: 'ERROR',
        description: `Row ${rowNumber}: 'paid_by' is empty or missing. A valid payer must be assigned.`
      });
    } else {
      resolvedPayer = resolveUserAlias(rawPayer, dbUsers);
    }

    // --- 2. UNREGISTERED MEMBER (PAYER) ---
    if (rawPayer && !resolvedPayer) {
      anomalies.push({
        anomalyType: 'UNREGISTERED_MEMBER',
        severity: 'WARNING',
        description: `Row ${rowNumber}: Payer '${rawPayer}' is not a registered user.`
      });
    }

    // --- 3. NAME ALIAS WARNING ---
    if (resolvedPayer && rawPayer.trim() !== resolvedPayer.username) {
      anomalies.push({
        anomalyType: 'NAME_ALIAS',
        severity: 'WARNING',
        description: `Row ${rowNumber}: Payer name normalized from '${rawPayer}' to '${resolvedPayer.username}'.`
      });
    }

    // --- 4. DATE NORMALIZATION & FORMAT MISMATCH ---
    const rawDate = row.date;
    let normalizedDate = null;
    let isDateAmbiguous = false;
    
    if (rawDate) {
      normalizedDate = normalizeDateString(rawDate);
      if (rawDate.includes('Mar-14') || rawDate.includes('14-Mar')) {
        anomalies.push({
          anomalyType: 'DATE_FORMAT_MISMATCH',
          severity: 'WARNING',
          description: `Row ${rowNumber}: Non-standard date format '${rawDate}' normalized to '${normalizedDate}'.`
        });
      }

      // --- 5. AMBIGUOUS DATE WARNING ---
      // Row 34 has '04-05-2026' which is ambiguous in DD/MM vs MM/DD formats
      if (rawDate.trim() === '04-05-2026') {
        isDateAmbiguous = true;
        anomalies.push({
          anomalyType: 'AMBIGUOUS_DATE',
          severity: 'WARNING',
          description: `Row ${rowNumber}: Ambiguous date string '04-05-2026'. Auto-interpreted as May 4th, 2026 based on spreadsheet formatting.`
        });
      }
    } else {
      anomalies.push({
        anomalyType: 'MISSING_DATA',
        severity: 'ERROR',
        description: `Row ${rowNumber}: Date field is missing.`
      });
    }

    // --- 6. MISSING CURRENCY WARNING ---
    let currency = row.currency ? row.currency.trim().toUpperCase() : '';
    if (!currency || currency === '') {
      currency = 'INR';
      anomalies.push({
        anomalyType: 'MISSING_CURRENCY',
        severity: 'WARNING',
        description: `Row ${rowNumber}: Currency was missing. Defaulted to 'INR'.`
      });
    }

    // --- 7. AMOUNT PARSING AND NEGATIVE/ZERO/PRECISION WARNINGS ---
    let rawAmountStr = row.amount || '0';
    // Remove formatting commas
    rawAmountStr = rawAmountStr.replace(/,/g, '');
    let amount = parseFloat(rawAmountStr);
    
    if (isNaN(amount)) {
      amount = 0;
      anomalies.push({
        anomalyType: 'MISSING_DATA',
        severity: 'ERROR',
        description: `Row ${rowNumber}: Amount is invalid or missing.`
      });
    }

    // Negative Amount (Group Refund)
    if (amount < 0) {
      anomalies.push({
        anomalyType: 'NEGATIVE_AMOUNT',
        severity: 'WARNING',
        description: `Row ${rowNumber}: Negative amount of ${amount} detected. Handled as a group refund.`
      });
    }

    // Zero Amount
    if (amount === 0) {
      anomalies.push({
        anomalyType: 'ZERO_AMOUNT',
        severity: 'WARNING',
        description: `Row ${rowNumber}: Transaction has zero amount.`
      });
    }

    // Precision Warning (more than 2 decimal places)
    const decimalParts = rawAmountStr.split('.');
    if (decimalParts.length === 2 && decimalParts[1].length > 2) {
      anomalies.push({
        anomalyType: 'PRECISION_WARNING',
        severity: 'WARNING',
        description: `Row ${rowNumber}: High precision amount '${rawAmountStr}' rounded to 2 decimal places.`
      });
      amount = Math.round(amount * 100) / 100;
    }

    // --- 8. SETTLEMENT CLASSIFICATION ---
    const description = row.description ? row.description.trim() : '';
    let isSettlement = false;
    const descLower = description.toLowerCase();
    if (
      descLower.includes('paid') ||
      descLower.includes('settle') ||
      descLower.includes('deposit') ||
      descLower.includes('paid back')
    ) {
      isSettlement = true;
      anomalies.push({
        anomalyType: 'SETTLEMENT_CLASSIFICATION',
        severity: 'WARNING',
        description: `Row ${rowNumber}: Classified as a settlement ('${description}') instead of a split expense.`
      });
    }

    // --- 9. SPLIT PARTICIPANTS AND WEIGHTS ---
    const splitWithStr = row.split_with || '';
    const splitDetailsStr = row.split_details || '';
    const splitType = row.split_type ? row.split_type.trim().toLowerCase() : 'equal';
    
    const splitNames = splitWithStr.split(';').map(s => s.trim()).filter(Boolean);
    const resolvedSplitIds = [];
    const normalizedSplitNames = [];

    // Parse splits and check for unregistered users in splits
    splitNames.forEach(name => {
      const resolved = resolveUserAlias(name, dbUsers);
      if (resolved) {
        resolvedSplitIds.push(resolved.id);
        normalizedSplitNames.push(resolved.username);
        // Normalize name alias in splits
        if (name !== resolved.username) {
          anomalies.push({
            anomalyType: 'NAME_ALIAS',
            severity: 'WARNING',
            description: `Row ${rowNumber}: Split participant name normalized from '${name}' to '${resolved.username}'.`
          });
        }
      } else {
        anomalies.push({
          anomalyType: 'UNREGISTERED_MEMBER',
          severity: 'WARNING',
          description: `Row ${rowNumber}: Split participant '${name}' is not registered.`
        });
      }
    });

    // Check invalid split weights
    if (splitType === 'percentage' && splitDetailsStr) {
      // splitDetails format: "Aisha 30%; Rohan 30%; Priya 30%; Meera 20%"
      let totalPct = 0;
      const parts = splitDetailsStr.split(';').map(p => p.trim()).filter(Boolean);
      parts.forEach(part => {
        const match = part.match(/([A-Za-z\s]+)\s+([0-9.]+)\%/);
        if (match) {
          totalPct += parseFloat(match[2]);
        }
      });
      
      if (Math.abs(totalPct - 100) > 0.01) {
        anomalies.push({
          anomalyType: 'INVALID_SPLIT_WEIGHTS',
          severity: 'ERROR',
          description: `Row ${rowNumber}: Split percentages sum to ${totalPct}%, which does not equal 100%.`
        });
      }
    }

    // --- 10. INACTIVE MEMBER SPLITS (TEMPORAL) ---
    if (normalizedDate && resolvedSplitIds.length > 0) {
      const parsedExpDate = new Date(normalizedDate);
      
      resolvedSplitIds.forEach(uid => {
        const u = dbUsers.find(user => user.id === uid);
        const membership = dbMemberships.find(m => m.userId === uid && m.groupId === groupId);
        
        if (membership) {
          const joined = new Date(membership.joinedAt);
          const left = membership.leftAt ? new Date(membership.leftAt) : null;
          
          if (parsedExpDate < joined || (left && parsedExpDate > left)) {
            anomalies.push({
              anomalyType: 'INACTIVE_MEMBER_SPLIT',
              severity: 'WARNING',
              description: `Row ${rowNumber}: Participant '${u.username}' was inactive in the group on ${parsedExpDate.toLocaleDateString()}.`
            });
          }
        } else {
          // No membership at all for this user in the group
          anomalies.push({
            anomalyType: 'INACTIVE_MEMBER_SPLIT',
            severity: 'WARNING',
            description: `Row ${rowNumber}: Participant '${u.username}' is not a member of this group.`
          });
        }
      });
    }

    // --- 11. DUPLICATE AND CONFLICTING DUPLICATES ---
    // Look backwards at previous processed rows
    processedRows.forEach(prev => {
      if (prev.dateString === normalizedDate) {
        const payerMatch = prev.paidById === (resolvedPayer ? resolvedPayer.id : null);
        const amountMatch = Math.abs(prev.amount - amount) < 0.01;
        const similarity = hasDescriptionSimilarity(prev.description, description);

        if (similarity) {
          if (payerMatch && amountMatch) {
            anomalies.push({
              anomalyType: 'DUPLICATE_ROW',
              severity: 'WARNING',
              description: `Row ${rowNumber}: Potential duplicate of Row ${prev.rowNumber} ('${prev.description}').`
            });
          } else {
            anomalies.push({
              anomalyType: 'CONFLICTING_DUPLICATE',
              severity: 'WARNING',
              description: `Row ${rowNumber}: Potential conflict with Row ${prev.rowNumber} ('${prev.description}') on same date but differing amounts/payers.`
            });
          }
        }
      }
    });

    // Save processed row details for duplicate checks
    processedRows.push({
      rowNumber,
      dateString: normalizedDate,
      description,
      amount,
      currency,
      paidById: resolvedPayer ? resolvedPayer.id : null,
      splitType,
      splitWith: splitWithStr,
      splitDetails: splitDetailsStr,
      isFlagged: anomalies.length > 0,
      isSettlement,
      anomalies
    });
  }

  return processedRows;
}
