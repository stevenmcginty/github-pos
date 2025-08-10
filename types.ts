
export interface Product {
  id: string;
  name: string;
  priceEatIn: number; // Price for Eat In, including VAT
  priceTakeAway: number; // Price for Take Away, including VAT
  vatRateEatIn: number; // VAT rate for Eat In
  vatRateTakeAway: number; // VAT rate for Take Away
  category: string;
  loyaltyPoints?: number;
  pointsToRedeem?: number;
  isGiftCard?: boolean;
  isRedeemable?: boolean;
}

export interface CartItem extends Product {
  instanceId: string; // A unique ID for this specific line item in the cart, even if the product is the same.
  quantity: number;
  notes?: string; // Optional notes for item customization (e.g., "extra cheese")
  linkedItems?: CartItem[]; // Optional array for linked items like extras
  isRedeemed?: boolean;
}

export enum OrderType {
  EatIn = 'Eat In',
  TakeAway = 'Take Away',
}

export enum PaymentMethod {
  Cash = 'Cash',
  Card = 'Card',
}

// A product as it exists in a completed sale record.
export interface SaleItem extends Product {
  quantity: number;
  priceAtSale: number; // This is now required for a sale.
  notes?: string; // Optional notes for item customization
  linkedItems?: SaleItem[]; // Optional array for linked items
  loyaltyPoints?: number;
  isRedeemed?: boolean;
}


export interface Sale {
  id: string;
  date: string; // ISO string
  items: SaleItem[];
  total: number;
  totalVat: number;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  discount?: number;
  staffId?: string;
  staffName?: string;
  tableId?: string;
  tableName?: string;
  customerId?: string;
  pointsEarned?: number;
  pointsSpent?: number;
  giftCardAmountUsed?: number;
}

export interface PointTransaction {
  id: string; // Unique ID for the transaction
  date: string; // ISO string of when the transaction occurred
  change: number; // Positive for points earned, negative for points spent
  reason: string; // e.g., "Points from purchase", "Redeemed: Americano"
  saleId?: string; // Optional ID of the sale that generated this transaction
}

export interface Customer {
  id: string; // Unique ID, also the content of the QR code
  name: string;
  email?: string;
  phone?: string;
  totalLoyaltyPoints: number;
  giftCardBalance: number;
  pointsHistory: PointTransaction[];
}

export interface PayRate {
    id: string;
    rate: number;
    effectiveDate: string; // ISO String
}

export interface StaffMember {
  id:string;
  name: string;
  payRates: PayRate[];
  color: string;
  isContracted: boolean;
}

export enum ShiftStatus {
  Active = 'Active',
  Holiday = 'On Holiday',
}

export interface Break {
  id: string;
  timestamp: string; // ISO String
}

export interface Shift {
  id:string;
  staffId: string;
  start: string; // ISO String
  end: string; // ISO String
  status?: ShiftStatus;
  breaks?: Break[];
  wageAtTimeOfShift?: number; // The hourly rate used for this specific shift's calculation
}

export interface PayrollSummary {
    staffId: string;
    staffName: string;
    totalHours: number;
    totalEarnings: number;
    shifts: Shift[];
    staffColor?: string;
}

export interface DailyNote {
  id: string; // YYYY-MM-DD
  note: string;
  lastUpdated: string; // ISO String
}

export interface SpecialDay {
  id: string; // YYYY-MM-DD
  eventName: string;
  lastUpdated: string; // ISO String
}

export interface Table {
  id: string;
  name: string;
  group?: string; // For grouping in the table plan UI
}

// This represents an active order at a table, synced across devices.
export interface OpenTab {
  id: string; // Corresponds to tableId
  tableId: string;
  tableName: string;
  cart: CartItem[];
  orderType: OrderType;
  discount: string;
  paymentMethod: PaymentMethod;
  cashTendered: string;
  // New fields for real-time, collaborative table plan
  createdAt: string; // ISO string for tracking occupancy time
  staffId: string; // ID of staff member who opened/is serving
  staffName: string; // Name of staff member
  customerId?: string;
}

export interface Settings {
  categoryOrder: Record<string, string[]>;
  productOrder: Record<string, string[]>;
  lastUpdated?: number;
}

export interface UnclaimedGiftCard {
  id: string;
  amount: number;
  createdAt: string;
  creatingSaleId: string;
  isRedeemed: boolean;
  redeemedAt?: string;
  redeemedByCustomerId?: string;
}