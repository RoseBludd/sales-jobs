// Rate limiting implementation for Next.js API routes
export const rateLimit = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  current: new Map<string, { count: number; resetTime: number }>(),

  checkLimit(ip: string): boolean {
    const now = Date.now();
    const record = this.current.get(ip);

    if (!record) {
      this.current.set(ip, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + this.windowMs;
      return true;
    }

    if (record.count >= this.max) {
      return false;
    }

    record.count++;
    return true;
  }
};

// Helper to parse email address
export const parseEmailAddress = (addr: string | undefined): { email: string; name: string } => {
  if (!addr) {
    return { email: '', name: '' };
  }
  const match = addr.match(/(.*?)\s*<(.+?)>/) || [null, '', addr];
  return {
    name: match[1]?.trim() || match[2] || '',
    email: match[2] || match[0] || '',
  };
}; 