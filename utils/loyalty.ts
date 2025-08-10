
import { Customer } from '../types';

/**
 * Calculates a customer's available loyalty points.
 * @param customer The customer object.
 * @returns The total number of available points.
 */
export const calculateAvailablePoints = (customer: Customer | undefined): number => {
    return customer?.totalLoyaltyPoints ?? 0;
};
