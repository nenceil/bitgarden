export default { createTransport: () => ({ sendMail: async () => { globalThis.__mailSent = (globalThis.__mailSent || 0) + 1; } }) };
