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

  // Placeholder for future providers (e.g. Kavenegar, Twilio, etc.)
  return {
    provider,
    async sendOtp({ mobile, code }) {
      console.log(`[SMS:${provider}] NOT IMPLEMENTED - OTP ${code} -> ${mobile}`);
      return { ok: true, provider, messageId: `stub-${Date.now()}`, note: 'Provider adapter not implemented yet' };
    }
  };
}
