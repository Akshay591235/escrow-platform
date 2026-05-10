/**
 * Fee Calculator
 * 
 * Ensures correct fee distribution:
 * - Buyer pays: itemPrice + ₹5
 * - Seller receives: itemPrice - ₹5
 * - Platform gets: ₹10 total
 * 
 * This guarantees:
 * (itemPrice + 5) - (itemPrice - 5) = 10
 */

export const PLATFORM_FEE_FROM_BUYER = 5; // ₹5
export const PLATFORM_FEE_FROM_SELLER = 5; // ₹5
export const TOTAL_PLATFORM_FEE = 10; // ₹10

export interface FeeBreakdown {
  itemPrice: number;
  buyerTotal: number; // Amount buyer pays
  sellerReceives: number; // Amount seller receives
  platformTotal: number; // Amount platform keeps
  verification: {
    buyerPaysExtra: number; // Should be 5
    sellerPaysExtra: number; // Should be 5
    platformGetsTotal: number; // Should be 10
  };
}

/**
 * Calculate fees for a transaction
 * Returns breakdown showing all amounts
 */
export const calculateFees = (itemPrice: number): FeeBreakdown => {
  const buyerTotal = itemPrice + PLATFORM_FEE_FROM_BUYER;
  const sellerReceives = itemPrice - PLATFORM_FEE_FROM_SELLER;
  const platformTotal = buyerTotal - sellerReceives;

  return {
    itemPrice,
    buyerTotal,
    sellerReceives,
    platformTotal,
    verification: {
      buyerPaysExtra: buyerTotal - itemPrice, // 5
      sellerPaysExtra: itemPrice - sellerReceives, // 5
      platformGetsTotal: platformTotal, // 10
    },
  };
};

/**
 * Validate fee calculation
 * Throws if calculation is incorrect
 */
export const validateFeeCalculation = (breakdown: FeeBreakdown): void => {
  const errors: string[] = [];

  if (breakdown.verification.buyerPaysExtra !== PLATFORM_FEE_FROM_BUYER) {
    errors.push(
      `Buyer pays ₹${breakdown.verification.buyerPaysExtra} extra, expected ₹${PLATFORM_FEE_FROM_BUYER}`
    );
  }

  if (breakdown.verification.sellerPaysExtra !== PLATFORM_FEE_FROM_SELLER) {
    errors.push(
      `Seller pays ₹${breakdown.verification.sellerPaysExtra} extra, expected ₹${PLATFORM_FEE_FROM_SELLER}`
    );
  }

  if (breakdown.verification.platformGetsTotal !== TOTAL_PLATFORM_FEE) {
    errors.push(
      `Platform gets ₹${breakdown.verification.platformGetsTotal}, expected ₹${TOTAL_PLATFORM_FEE}`
    );
  }

  if (errors.length > 0) {
    throw new Error('Fee calculation invalid: ' + errors.join('; '));
  }
};
