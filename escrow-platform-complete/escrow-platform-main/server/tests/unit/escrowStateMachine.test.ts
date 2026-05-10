/**
 * Escrow State Machine Unit Tests
 * 
 * Tests state transition logic
 */

import { isValidTransition, validateTransition, getAllowedTransitions } from '../../src/utils/escrowStateMachine';

describe('Escrow State Machine', () => {
  describe('isValidTransition', () => {
    test('should allow initiated → paid', () => {
      expect(isValidTransition('initiated', 'paid')).toBe(true);
    });

    test('should allow paid → shipped', () => {
      expect(isValidTransition('paid', 'shipped')).toBe(true);
    });

    test('should allow shipped → delivered', () => {
      expect(isValidTransition('shipped', 'delivered')).toBe(true);
    });

    test('should allow delivered → completed', () => {
      expect(isValidTransition('delivered', 'completed')).toBe(true);
    });

    test('should NOT allow initiated → shipped', () => {
      expect(isValidTransition('initiated', 'shipped')).toBe(false);
    });

    test('should NOT allow paid → completed', () => {
      expect(isValidTransition('paid', 'completed')).toBe(false);
    });

    test('should NOT allow completed → initiated', () => {
      expect(isValidTransition('completed', 'initiated')).toBe(false);
    });

    test('should allow any state → disputed', () => {
      expect(isValidTransition('initiated', 'disputed')).toBe(true);
      expect(isValidTransition('paid', 'disputed')).toBe(true);
      expect(isValidTransition('shipped', 'disputed')).toBe(true);
    });
  });

  describe('validateTransition', () => {
    test('should not throw for valid transition', () => {
      expect(() => validateTransition('initiated', 'paid', 'pay')).not.toThrow();
    });

    test('should throw for invalid transition', () => {
      expect(() => validateTransition('initiated', 'shipped', 'ship')).toThrow(
        'Invalid transition'
      );
    });

    test('should throw descriptive error', () => {
      expect(() => validateTransition('paid', 'initiated', 'reverse')).toThrow(
        /Cannot reverse/
      );
    });
  });

  describe('getAllowedTransitions', () => {
    test('should return allowed transitions from initiated', () => {
      const allowed = getAllowedTransitions('initiated');
      expect(allowed).toContain('paid');
      expect(allowed).toContain('disputed');
      expect(allowed).not.toContain('shipped');
    });

    test('should return empty array for completed', () => {
      const allowed = getAllowedTransitions('completed');
      expect(allowed).toEqual([]);
    });
  });
});
