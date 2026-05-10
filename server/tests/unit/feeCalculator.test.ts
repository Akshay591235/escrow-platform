/**
 * Fee Calculator Unit Tests
 * 
 * Tests fee distribution and validation
 */

import { calculateFees, validateFeeCalculation, TOTAL_PLATFORM_FEE } from '../../src/utils/feeCalculator';

describe('Fee Calculator', () => {
  describe('calculateFees', () => {
    test('should calculate fees for ₹1000 item', () => {
      const fees = calculateFees(1000);

      expect(fees.itemPrice).toBe(1000);
      expect(fees.buyerTotal).toBe(1005); // 1000 + 5
      expect(fees.sellerReceives).toBe(995); // 1000 - 5
      expect(fees.platformTotal).toBe(10); // 5 + 5
    });

    test('should calculate fees for ₹50000 item', () => {
      const fees = calculateFees(50000);

      expect(fees.itemPrice).toBe(50000);
      expect(fees.buyerTotal).toBe(50005);
      expect(fees.sellerReceives).toBe(49995);
      expect(fees.platformTotal).toBe(10);
    });

    test('should always charge buyer ₹5 extra', () => {
      const prices = [1, 10, 100, 1000, 50000];

      prices.forEach((price) => {
        const fees = calculateFees(price);
        expect(fees.verification.buyerPaysExtra).toBe(5);
      });
    });

    test('should always deduct ₹5 from seller', () => {
      const prices = [1, 10, 100, 1000, 50000];

      prices.forEach((price) => {
        const fees = calculateFees(price);
        expect(fees.verification.sellerPaysExtra).toBe(5);
      });
    });

    test('should always give platform ₹10', () => {
      const prices = [1, 10, 100, 1000, 50000];

      prices.forEach((price) => {
        const fees = calculateFees(price);
        expect(fees.verification.platformGetsTotal).toBe(TOTAL_PLATFORM_FEE);
      });
    });
  });

  describe('validateFeeCalculation', () => {
    test('should validate correct calculation', () => {
      const fees = calculateFees(1000);
      expect(() => validateFeeCalculation(fees)).not.toThrow();
    });

    test('should throw if buyer fee is wrong', () => {
      const fees = calculateFees(1000);
      fees.verification.buyerPaysExtra = 10; // Wrong!

      expect(() => validateFeeCalculation(fees)).toThrow('Fee calculation invalid');
    });

    test('should throw if platform fee is wrong', () => {
      const fees = calculateFees(1000);
      fees.verification.platformGetsTotal = 5; // Wrong!

      expect(() => validateFeeCalculation(fees)).toThrow('Fee calculation invalid');
    });
  });

  describe('fee distribution math', () => {
    test('buyer pays exactly what seller receives + 10', () => {
      const prices = [1, 10, 100, 1000, 50000];

      prices.forEach((price) => {
        const fees = calculateFees(price);
        expect(fees.buyerTotal - fees.sellerReceives).toBe(TOTAL_PLATFORM_FEE);
      });
    });
  });
});
