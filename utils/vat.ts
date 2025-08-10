
import { Product, OrderType } from '../types';

/**
 * Calculates the effective VAT rate for a product based on the order type.
 * This version is robust against non-numeric or missing VAT rate data.
 */
export function getEffectiveVatRate(product: Product, orderType: OrderType): number {
  const defaultRate = 20;
  const rateSource = orderType === OrderType.EatIn ? product.vatRateEatIn : product.vatRateTakeAway;

  // If the rate is null or undefined, use the default.
  if (rateSource === null || rateSource === undefined) {
    return defaultRate;
  }

  // Coerce to a number. This handles strings like "20" or "".
  const numericRate = Number(rateSource);

  // If coercion results in NaN (e.g., from an invalid string), use the default.
  // Otherwise, use the valid number (which could be 0).
  return isNaN(numericRate) ? defaultRate : numericRate;
}


/**
 * Calculates the VAT amount from a price that already includes VAT.
 * @param priceIncVat The total price of the item, including VAT.
 * @param vatRate The VAT rate percentage (e.g., 20 for 20%).
 * @returns The amount of VAT included in the price.
 */
export function calculateVatAmount(priceIncVat: number, vatRate: number): number {
  if (vatRate === 0) return 0;
  const priceExVat = priceIncVat / (1 + vatRate / 100);
  return priceIncVat - priceExVat;
}
