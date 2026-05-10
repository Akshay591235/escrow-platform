/**
 * Escrow State Machine
 * 
 * Enforces valid state transitions for transactions.
 * Prevents invalid flows like confirming before shipping.
 * 
 * Valid transitions:
 *   initiated → paid → shipped → delivered → completed
 *   ↓ (at any stage)
 *   disputed
 */

type TransactionStatus = 'initiated' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'refunded';

const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  initiated: ['paid', 'disputed'],
  paid: ['shipped', 'disputed', 'refunded'],
  shipped: ['delivered', 'disputed'],
  delivered: ['completed', 'disputed'],
  completed: [], // Terminal state
  disputed: ['refunded', 'paid'], // After dispute resolution
  refunded: [], // Terminal state
};

/**
 * Check if transition is valid
 */
export const isValidTransition = (
  currentStatus: TransactionStatus,
  newStatus: TransactionStatus
): boolean => {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
};

/**
 * Get allowed transitions from current state
 */
export const getAllowedTransitions = (currentStatus: TransactionStatus): TransactionStatus[] => {
  return VALID_TRANSITIONS[currentStatus] || [];
};

/**
 * Validate state machine transition
 * Throws error if invalid
 */
export const validateTransition = (
  currentStatus: TransactionStatus,
  newStatus: TransactionStatus,
  operation: string
): void => {
  if (!isValidTransition(currentStatus, newStatus)) {
    const allowed = getAllowedTransitions(currentStatus).join(', ') || 'none';
    throw new Error(
      `Cannot ${operation}: Invalid transition from '${currentStatus}' to '${newStatus}'. ` +
      `Allowed transitions: ${allowed}`
    );
  }
};

/**
 * State descriptions
 */
export const STATE_DESCRIPTIONS: Record<TransactionStatus, string> = {
  initiated: 'Transaction created, awaiting payment',
  paid: 'Payment received and verified - funds held in escrow',
  shipped: 'Goods shipped with tracking',
  delivered: 'Buyer confirmed receipt',
  completed: 'Payout transferred to seller',
  disputed: 'Dispute raised - funds frozen',
  refunded: 'Refund issued to buyer',
};
