export function createSmsGateway(provider = 'mock') {
  if (provider === 'mock') {
    return {
      provider,
      async sendOtp({ mobile, code }) {
        console.log(`[SMS:mock] send OTP ${code} -> ${mobile}`);
        return { ok: true, provider, messageId: `mock-${Date.now()}` };
      }
    };
  }

  return {
    provider,
    async sendOtp() {
      throw Object.assign(new Error(`SMS provider \"${provider}\" is not implemented`), { statusCode: 503 });
    }
  };
}
