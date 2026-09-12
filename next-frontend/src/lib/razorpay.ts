declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }
    if (window.Razorpay) {
      return resolve(true);
    }

    const existing = document.getElementById('rzp-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'rzp-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export interface RazorpayPaymentParams {
  apiBaseUrl?: string;
  amount: number; // in Rupees
  orderId: string | string[]; // DB booking / order UUID(s)
  orderType: 'sports' | 'event' | 'order';
  title?: string;
  description?: string;
  user: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  onSuccess: (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
  onError?: (error: any) => void;
}

export async function processRazorpayPayment({
  apiBaseUrl = 'http://127.0.0.1:3004',
  amount,
  orderId,
  orderType,
  title = 'Passwala',
  description = 'Payment Checkout',
  user,
  onSuccess,
  onDismiss,
  onError,
}: RazorpayPaymentParams) {
  try {
    const formattedOrderId = Array.isArray(orderId) ? orderId.join(',') : orderId;

    // Step 1: If amount is 0, bypass gateway directly
    if (amount <= 0) {
      onSuccess({
        razorpay_payment_id: 'pay_free_order',
        razorpay_order_id: 'order_free_order',
        razorpay_signature: 'free_signature',
      });
      return;
    }

    // Step 2: Ensure Razorpay SDK script is loaded
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !window.Razorpay) {
      throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
    }

    // Step 3: Create Razorpay Order on Backend
    const createRes = await fetch(`${apiBaseUrl}/api/orders/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount),
        orderId: formattedOrderId,
      }),
    });

    const rzpOrder = await createRes.json();
    if (!createRes.ok || !rzpOrder.id) {
      throw new Error(rzpOrder.error || 'Failed to initialize payment gateway.');
    }

    // Step 4: Handle backend simulation/mock mode
    if (rzpOrder.is_mock) {
      // Mock mode verification
      const verifyRes = await fetch(`${apiBaseUrl}/api/orders/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_order_id: rzpOrder.id,
          razorpay_signature: 'mock_signature',
          orderId: formattedOrderId,
          type: orderType,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Payment simulation verification failed');
      }
      onSuccess({
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_order_id: rzpOrder.id,
        razorpay_signature: 'mock_signature',
      });
      return;
    }

    // Step 5: Launch real/test Razorpay Checkout modal
    const cleanPhone = (user.phone || '').replace(/\D/g, '').slice(-10);

    const options = {
      key: rzpOrder.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TagOyNgXMANCBQ',
      amount: rzpOrder.amount,
      currency: rzpOrder.currency || 'INR',
      name: title,
      description,
      order_id: rzpOrder.id,
      prefill: {
        name: user.name || 'Guest User',
        email: user.email || '',
        contact: cleanPhone,
      },
      theme: {
        color: '#f97316', // Passwala warm orange
      },
      config: {
        display: {
          blocks: {
            upi: {
              name: 'Pay via UPI',
              instruments: [{ method: 'upi' }],
            },
          },
          sequence: ['block.upi'],
          preferences: {
            show_default_blocks: true,
          },
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          // Verify payment signature on backend
          const verifyRes = await fetch(`${apiBaseUrl}/api/orders/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId: formattedOrderId,
              type: orderType,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.error || 'Payment signature verification failed.');
          }

          onSuccess(response);
        } catch (err: any) {
          if (onError) onError(err);
        }
      },
      modal: {
        ondismiss: () => {
          if (onDismiss) onDismiss();
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err: any) {
    if (onError) {
      onError(err);
    }
  }
}
