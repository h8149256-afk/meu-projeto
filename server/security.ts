// Simple rate limiting and security utilities
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class SecurityManager {
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private maxAttempts = 5; // Max attempts per window
  private windowMs = 15 * 60 * 1000; // 15 minutes

  // Rate limiting for login attempts
  checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitMap.get(identifier);

    if (!entry) {
      this.rateLimitMap.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (now > entry.resetTime) {
      // Reset the window
      entry.count = 1;
      entry.resetTime = now + this.windowMs;
      return true;
    }

    if (entry.count >= this.maxAttempts) {
      return false; // Rate limited
    }

    entry.count += 1;
    return true;
  }

  // Reset rate limit (after successful login)
  resetRateLimit(identifier: string): void {
    this.rateLimitMap.delete(identifier);
  }

  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitMap) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  // Password strength validation
  validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
      return { isValid: false, message: 'Senha deve ter pelo menos 6 caracteres' };
    }
    
    if (password.length > 128) {
      return { isValid: false, message: 'Senha muito longa' };
    }

    // Check for common weak passwords
    const weakPasswords = ['123456', 'password', 'senha123', '123123', 'qwerty'];
    if (weakPasswords.includes(password.toLowerCase())) {
      return { isValid: false, message: 'Senha muito fraca, escolha uma senha mais segura' };
    }

    return { isValid: true };
  }

  // Email validation
  validateEmail(email: string): { isValid: boolean; message?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !email.trim()) {
      return { isValid: false, message: 'Email é obrigatório' };
    }
    
    if (!emailRegex.test(email.trim())) {
      return { isValid: false, message: 'Email inválido' };
    }
    
    if (email.length > 254) {
      return { isValid: false, message: 'Email muito longo' };
    }
    
    return { isValid: true };
  }

  // Sanitize input to prevent XSS
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .substring(0, 1000); // Limit length
  }

  // Generate secure session ID
  generateSecureId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result + Date.now().toString(36);
  }
}

export const security = new SecurityManager();

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  security.cleanup();
}, 5 * 60 * 1000);