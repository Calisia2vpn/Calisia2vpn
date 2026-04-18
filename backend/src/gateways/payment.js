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

  return {
    provider,
    async createCheckoutSession() {
      throw Object.assign(new Error(`Payment provider \"${provider}\" is not implemented`), { statusCode: 503 });
    },
    async verifyPayment() {
      throw Object.assign(new Error(`Payment provider \"${provider}\" is not implemented`), { statusCode: 503 });
    }
  };
}
