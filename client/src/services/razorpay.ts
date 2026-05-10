/**
 * Razorpay Integration Service
 * 
 * Handles payment processing via Razorpay checkout
 */

interface RazorpayWindow extends Window {
  Razorpay: any;
}

declare const window: RazorpayWindow;

export interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: (response: any) => void;
  prefill?: {
    name: string;
    email: string;
    contact: string;
  };
}

/**
 * Load Razorpay script dynamically
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Open Razorpay checkout modal
 */
export const openRazorpayCheckout = (options: RazorpayOptions) => {
  const rzp = new window.Razorpay(options);
  rzp.open();
};
