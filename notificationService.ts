// notificationService.ts
export function sendNotification(type: string, recipient: string, data: any) {
  // In dev, console.log. Replace with Twilio/SendGrid in production.
  const templates: Record<string, string> = {
    buyer_payment_secured: `Dear Buyer, your payment of ₹${data.amount} for "${data.itemName}" is secured. Seller will ship within 48 hours.`,
    seller_new_order: `Dear Seller, you have a new order! ₹${data.heldAmount} held for "${data.itemName}". Ship ASAP to receive ₹${data.payout}.`,
    seller_shipped: `Buyer, seller has shipped "${data.itemName}". Tracking: ${data.trackingInfo}. Confirm delivery once received.`,
    buyer_confirmed: `Seller, buyer confirmed delivery of "${data.itemName}". ₹${data.payoutAmount} has been released to your bank account.`,
    dispute_raised: `Transaction "${data.itemName}" has been disputed. Funds are frozen. Resolution within 48 hours.`,
  };
  const message = templates[type]?.replace(/\$\{[\w.]+\}/g, (match) => {
    const path = match.slice(2, -1);
    return path.split('.').reduce((obj, key) => obj?.[key], data) ?? match;
  });
  console.log(`[NOTIFICATION] To: ${recipient} | Type: ${type} | Message: ${message}`);
}