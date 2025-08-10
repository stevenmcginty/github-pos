import { Sale, OrderType, Product, PaymentMethod } from '../types';

export interface KPI {
  totalRevenue: number;
  grossSales: number;
  netSales: number;
  totalVat: number;
  transactionCount: number;
  averageTransaction: number;
  cardTransactionPercentage: number;
  redeemedItemsCount: number;
}

export interface DailyData {
  date: string; // YYYY-MM-DD
  total: number;
}

export interface HourlyData {
  hour: number; // 0-23
  total: number;
}

export interface MonthlyData {
    month: string; // YYYY-MM
    total: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface OrderTypeSplit {
  [OrderType.EatIn]: number;
  [OrderType.TakeAway]: number;
}

export const toLocalDateString = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const processSalesDataForDay = (sales: Sale[], day: Date) => {
  const dayString = toLocalDateString(day);
  const salesForDay = sales.filter(s => toLocalDateString(new Date(s.date)) === dayString);

  const hourlyData: Record<number, number> = {};
  for(let i=0; i<24; i++) hourlyData[i] = 0;

  salesForDay.forEach(sale => {
    const saleHour = new Date(sale.date).getHours();
    hourlyData[saleHour] += sale.total;
  });

  const hourlyChartData = Object.entries(hourlyData).map(([hour, total]) => ({ hour: parseInt(hour), total }));

  return { hourlyChartData };
};


export const processSalesData = (sales: Sale[], products: Product[]) => {
  const topProductsMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  // Initialize map from the products list to ensure all products are represented,
  // even those with zero sales in the period.
  products.forEach(p => {
    if (p && p.name) {
      topProductsMap[p.name] = { name: p.name, quantity: 0, revenue: 0 };
    }
  });

  const orderTypeRevenue: OrderTypeSplit = {
    [OrderType.EatIn]: 0,
    [OrderType.TakeAway]: 0,
  };

  const kpis: Omit<KPI, 'cardTransactionPercentage' | 'redeemedItemsCount'> = {
    totalRevenue: 0,
    grossSales: 0,
    netSales: 0,
    totalVat: 0,
    transactionCount: sales.length,
    averageTransaction: 0,
  };

  sales.forEach(sale => {
    // Robustness check: Ensure sale object and its critical properties exist.
    if (!sale || typeof sale.total !== 'number' || !sale.items) {
        kpis.transactionCount = Math.max(0, kpis.transactionCount - 1); // Adjust count for invalid sale
        return;
    }
    
    // Robustness check for OrderType.
    if (sale.orderType === OrderType.EatIn || sale.orderType === OrderType.TakeAway) {
        orderTypeRevenue[sale.orderType] += sale.total;
    }

    const preDiscountTotal = sale.total + (sale.discount || 0);
    kpis.totalRevenue += sale.total;
    kpis.totalVat += sale.totalVat || 0; // Guard against missing VAT
    kpis.grossSales += preDiscountTotal;

    sale.items.forEach(item => {
      // Robustness check for item name.
      if (item && item.name) {
        if (!topProductsMap[item.name]) {
          // If a product from a sale isn't in the main products list, add it.
          topProductsMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        
        const quantity = typeof item.quantity === 'number' && isFinite(item.quantity) ? item.quantity : 0;
        const price = typeof item.priceAtSale === 'number' && isFinite(item.priceAtSale) ? item.priceAtSale : 0;
        
        topProductsMap[item.name].quantity += quantity;
        topProductsMap[item.name].revenue += price * quantity;
      }
    });
  });

  if (kpis.transactionCount > 0) {
    kpis.averageTransaction = kpis.grossSales / kpis.transactionCount;
  }
  kpis.netSales = kpis.grossSales - kpis.totalVat;

  const topProducts = Object.values(topProductsMap);

  return { kpis, topProducts, orderTypeRevenue };
};


export const processSalesForDateRange = (sales: Sale[], startDate: Date, endDate: Date) => {
    const rangeSales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= startDate && saleDate <= endDate;
    });

    const kpis: KPI = {
        totalRevenue: 0,
        grossSales: 0,
        netSales: 0,
        totalVat: 0,
        transactionCount: rangeSales.length,
        averageTransaction: 0,
        cardTransactionPercentage: 0,
        redeemedItemsCount: 0,
    };
    
    let cardTransactionCount = 0;
    const topProductsMap: Record<string, {name: string, quantity: number, revenue: number}> = {};
    const dailyData: Record<string, number> = {};
    const hourlyData: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyData[i] = 0;
    const monthlyData: Record<string, number> = {}; // YYYY-MM

    rangeSales.forEach(sale => {
        const preDiscountTotal = sale.total + (sale.discount || 0);
        
        kpis.totalRevenue += sale.total;
        kpis.totalVat += sale.totalVat;
        kpis.grossSales += preDiscountTotal;

        if (sale.paymentMethod === PaymentMethod.Card) {
            cardTransactionCount++;
        }

        const saleDate = new Date(sale.date);
        const saleDateString = toLocalDateString(saleDate);
        if(!dailyData[saleDateString]) {
            dailyData[saleDateString] = 0;
        }
        dailyData[saleDateString] += sale.total;
        
        const saleHour = saleDate.getHours();
        hourlyData[saleHour] += sale.total;

        const monthKey = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += sale.total;

        sale.items.forEach(item => {
            if (item.isRedeemed) {
                kpis.redeemedItemsCount += item.quantity;
            }

            if (!topProductsMap[item.name]) {
                topProductsMap[item.name] = { name: item.name, quantity: 0, revenue: 0};
            }
            topProductsMap[item.name].quantity += item.quantity;
            const price = item.priceAtSale ?? (item as any).price;
            topProductsMap[item.name].revenue += price * item.quantity;
        });
    });

    if (kpis.transactionCount > 0) {
        kpis.averageTransaction = kpis.grossSales / kpis.transactionCount;
        kpis.cardTransactionPercentage = (cardTransactionCount / kpis.transactionCount) * 100;
    }
    kpis.netSales = kpis.grossSales - kpis.totalVat;
    
    const topProducts = Object.values(topProductsMap).sort((a,b) => b.quantity - a.quantity);
    const dailyChartData = Object.entries(dailyData).map(([date, total]) => ({ date, total })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const hourlyChartData = Object.entries(hourlyData).map(([hour, total]) => ({ hour: parseInt(hour), total }));
    const monthlyChartData = Object.entries(monthlyData).map(([month, total]) => ({ month, total })).sort((a,b) => a.month.localeCompare(b.month));

    return { kpis, topProducts, dailyChartData, hourlyChartData, monthlyChartData, rangeSales };
}


export const getCumulativeData = (data: { total: number }[]): { total: number }[] => {
    let runningTotal = 0;
    return data.map(d => {
        runningTotal += d.total;
        return { ...d, total: runningTotal };
    });
};