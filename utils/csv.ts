
import { Sale, Product, StaffMember, Shift, OrderType, PaymentMethod, ShiftStatus, PayRate, SpecialDay } from '../types';

const escapeCell = (cellData: any): string => {
  const str = String(cellData ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const parseCsvRow = (row: string): string[] => {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (inQuotes) {
      if (char === '"' && i + 1 < row.length && row[i + 1] === '"') {
        currentField += '"'; i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ',') { result.push(currentField); currentField = ''; }
      else currentField += char;
    }
  }
  result.push(currentField);
  return result;
};

// --- Sales ---
export const generateSalesCSV = (sales: Sale[]): string => {
  const headers = ['id', 'date', 'orderType', 'paymentMethod', 'total', 'totalVat', 'discount', 'staffId', 'staffName', 'items_json'];
  const rows = sales.map(s => [s.id, s.date, s.orderType, s.paymentMethod, s.total.toFixed(2), s.totalVat.toFixed(2), s.discount?.toFixed(2) ?? '0.00', s.staffId, s.staffName, JSON.stringify(s.items)].map(escapeCell).join(','));
  return [headers.join(','), ...rows].join('\n');
};

export const parseSalesCSV = (csvText: string): Sale[] => {
  const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]);
  const headerMap = headers.reduce((acc, h, i) => ({ ...acc, [h]: i }), {} as Record<string, number>);
  if (headerMap.id === undefined || headerMap.items_json === undefined) return [];
  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    try {
      const v = parseCsvRow(line);
      return {
        id: v[headerMap.id], date: v[headerMap.date],
        orderType: v[headerMap.orderType] as OrderType, paymentMethod: v[headerMap.paymentMethod] as PaymentMethod,
        total: parseFloat(v[headerMap.total]), totalVat: parseFloat(v[headerMap.totalVat]),
        discount: parseFloat(v[headerMap.discount] || '0'), staffId: v[headerMap.staffId], staffName: v[headerMap.staffName],
        items: JSON.parse(v[headerMap.items_json] || '[]'),
      };
    } catch (e) { return null; }
  }).filter(Boolean) as Sale[];
};

// --- Products ---
export const generateProductsCSV = (products: Product[]): string => {
  const headers = ['id', 'name', 'priceEatIn', 'priceTakeAway', 'vatRateEatIn', 'vatRateTakeAway', 'category'];
  const rows = products.map(p => headers.map(h => escapeCell((p as any)[h])).join(','));
  return [headers.join(','), ...rows].join('\n');
};

export const parseProductsCSV = (csvText: string): Product[] => {
  const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0].toLowerCase());
  const headerMap = headers.reduce((acc, h, i) => ({ ...acc, [h.trim()]: i }), {} as Record<string, number>);

  const requiredHeaders = ['name', 'priceeatin', 'pricetakeaway', 'category'];
  const missingHeaders = requiredHeaders.filter(h => headerMap[h] === undefined);
  if (missingHeaders.length > 0) {
      throw new Error(`CSV file must contain the following columns: ${missingHeaders.join(', ')}.`);
  }

  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const v = parseCsvRow(line);

    const name = String(v[headerMap.name] || '').trim();
    if (!name) return null;

    const priceEatIn = parseFloat(v[headerMap.priceeatin]);
    const priceTakeAway = parseFloat(v[headerMap.pricetakeaway]);
    const vatRateEatIn = parseFloat(v[headerMap.vatrateeatin]);
    const vatRateTakeAway = parseFloat(v[headerMap.vatratetakeaway]);

    return {
      id: String(v[headerMap.id] || crypto.randomUUID()),
      name: name,
      category: String(v[headerMap.category] || 'Uncategorized').trim(),
      priceEatIn: isNaN(priceEatIn) ? 0 : priceEatIn,
      priceTakeAway: isNaN(priceTakeAway) ? 0 : priceTakeAway,
      vatRateEatIn: isNaN(vatRateEatIn) ? 20 : vatRateEatIn,
      vatRateTakeAway: isNaN(vatRateTakeAway) ? 20 : vatRateTakeAway,
    };
  }).filter((p): p is Product => p !== null);
};


// --- Rota Data ---
export const generateRotaCSV = (staff: StaffMember[], shifts: Shift[], specialDays: SpecialDay[]): string => {
  const staffHeaders = ['id', 'name', 'hourlyRate', 'color', 'isContracted'];
  const staffRows = staff.map(s => {
    const payRates = s.payRates || [];
    const latestRate = payRates.length > 0 ? [...payRates].sort((a,b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0].rate : 0;
    const staffDataWithRate = { ...s, hourlyRate: latestRate };
    return staffHeaders.map(h => escapeCell((staffDataWithRate as any)[h])).join(',');
  });
  const shiftHeaders = ['id', 'staffId', 'start', 'end', 'status'];
  const shiftRows = shifts.map(s => shiftHeaders.map(h => escapeCell((s as any)[h])).join(','));
  
  const specialDayHeaders = ['date', 'eventName'];
  const specialDayRows = specialDays.map(d => [d.id, d.eventName].map(escapeCell).join(','));

  return [
    '## STAFF', staffHeaders.join(','), ...staffRows, 
    '', 
    '## SHIFTS', shiftHeaders.join(','), ...shiftRows,
    '',
    '## SPECIAL DAYS', specialDayHeaders.join(','), ...specialDayRows
  ].join('\n');
};

export const parseRotaCSV = (csvText: string): { staff: StaffMember[], shifts: Shift[], specialDays: SpecialDay[] } => {
  const staff: StaffMember[] = []; 
  const shifts: Shift[] = [];
  const specialDays: SpecialDay[] = [];

  let currentSection: 'STAFF' | 'SHIFTS' | 'SPECIAL DAYS' | null = null;
  let headers: string[] = []; 
  let headerMap: Record<string, number> = {};

  for (const line of csvText.trim().replace(/\r\n/g, '\n').split('\n')) {
    if (line.trim() === '' || line.startsWith('##')) {
      currentSection = line.includes('STAFF') ? 'STAFF' : line.includes('SHIFTS') ? 'SHIFTS' : line.includes('SPECIAL DAYS') ? 'SPECIAL DAYS' : null;
      headers = []; 
      continue;
    }
    if (currentSection) {
      if (headers.length === 0) {
        headers = parseCsvRow(line); 
        headerMap = headers.reduce((acc, h, i) => ({ ...acc, [h]: i }), {}); 
        continue;
      }
      const v = parseCsvRow(line);
      if (currentSection === 'STAFF' && v[headerMap.id]) {
        const rate = parseFloat(v[headerMap.hourlyRate]) || 0;
        const payRates: PayRate[] = [{ id: crypto.randomUUID(), rate, effectiveDate: new Date(0).toISOString() }];
        staff.push({ id: v[headerMap.id], name: v[headerMap.name], payRates: payRates, color: v[headerMap.color], isContracted: v[headerMap.isContracted] === 'true' });
      } else if (currentSection === 'SHIFTS' && v[headerMap.id] && v[headerMap.staffId]) {
        shifts.push({ id: v[headerMap.id], staffId: v[headerMap.staffId], start: v[headerMap.start], end: v[headerMap.end], status: (v[headerMap.status] as ShiftStatus) || ShiftStatus.Active });
      } else if (currentSection === 'SPECIAL DAYS' && v[headerMap.date]) {
        const eventName = v[headerMap.eventName] || '';
        if (eventName) {
            specialDays.push({
                id: v[headerMap.date],
                eventName: eventName,
                lastUpdated: new Date().toISOString()
            });
        }
      }
    }
  }
  return { staff, shifts, specialDays };
};

// --- Categories (Export only for now) ---
export const generateCategoriesCSV = (categoryOrder: string[]): string => {
    const headers = ['category_order_index', 'category_name'];
    const rows = categoryOrder.map((cat, i) => [i, escapeCell(cat)].join(','));
    return [headers.join(','), ...rows].join('\n');
};