export function createPaymentGateway(provider = 'mock') {
  if (provider === 'mock') {
    return {
      provider,
      async createCheckoutSession({ userId, amount, currency = 'IRR', planId }) {
        return {
          ok: true,
          provider,
          checkoutUrl: `https://example.com/mock-checkout?u=${encodeURIComponent(userId)}&plan=${encodeURIComponent(planId || '')}`,
          referenceId: `mock-pay-${Date.now()}`,
          amount,
          currency
        };
      },
      async verifyPayment({ referenceId }) {
        return { ok: true, provider, referenceId, status: 'paid' };
      }
    };
  }

  // Placeholder for future providers (e.g. Zarinpal, Stripe, etc.)
  return {
    provider,
    async createCheckoutSession({ userId, amount, currency = 'IRR', planId }) {
      return {
        ok: true,
        provider,
        checkoutUrl: 'https://example.com/provider-not-implemented',
        referenceId: `stub-pay-${Date.now()}`,
        amount,
        currency,
        planId,
        userId,
        note: 'Payment provider adapter not implemented yet'
      };
    },
    async verifyPayment({ referenceId }) {
      return { ok: true, provider, referenceId, status: 'pending', note: 'Provider adapter not implemented yet' };
    }
  };
}
