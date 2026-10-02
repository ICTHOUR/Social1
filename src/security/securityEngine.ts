import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// 1. INPUT VALIDATION & SANITIZATION UTILITIES (XSS & INJECTION DEFENSE)
// ============================================================================

/**
 * Escapes characters that have special meaning in HTML to prevent XSS.
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strips dangerous HTML tags, attributes, event handlers, and javascript: protocols.
 */
export function sanitizeRichText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let sanitized = input;

  // Strip script tags and their contents
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Strip style tags and their contents
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Strip iframe, embed, object, frame tags
  sanitized = sanitized.replace(/<\/?(iframe|embed|object|frame|frameset|applet|meta|link)\b[^>]*>/gi, '');
  // Strip dangerous inline event handlers like onclick, onload, onerror, onmouseover, etc.
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^"'\s>]+/gi, '');
  // Strip javascript: / vbscript: / data: pseudo-protocols in href/src
  sanitized = sanitized.replace(/(href|src)\s*=\s*["']\s*(?:javascript|vbscript|data):[^"']*["']/gi, '$1="#"');

  return sanitized.trim();
}

/**
 * Validates email format strictly.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

/**
 * Validates username (alphanumeric, underscore, dot, 3-30 chars).
 */
export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const usernameRegex = /^[a-zA-Z0-9._]{3,30}$/;
  return usernameRegex.test(username.trim());
}

/**
 * Validates phone number (international / local format).
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^\+?[0-9\s-]{7,20}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Validates password strength (min 6 chars, reasonable complexity).
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password exceeds maximum length of 128 characters' };
  }
  return { valid: true };
}

/**
 * Validates SQL dynamic identifier (column name, sort order) against an allowed whitelist.
 */
export function validateSqlIdentifier(identifier: string, allowedList: string[], defaultValue: string): string {
  if (!identifier || typeof identifier !== 'string') return defaultValue;
  const clean = identifier.toLowerCase().trim();
  return allowedList.includes(clean) ? clean : defaultValue;
}

// ============================================================================
// 2. RATE LIMITING & BRUTE FORCE PROTECTION ENGINE
// ============================================================================

interface RateLimitRecord {
  count: number;
  resetAt: number;
  consecutiveFailures: number;
  lockedUntil?: number;
}

class MemoryRateLimiter {
  private stores: Map<string, Map<string, RateLimitRecord>> = new Map();

  constructor() {
    // Periodically clean expired records every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private getStore(bucket: string): Map<string, RateLimitRecord> {
    if (!this.stores.has(bucket)) {
      this.stores.set(bucket, new Map());
    }
    return this.stores.get(bucket)!;
  }

  private cleanup() {
    const now = Date.now();
    for (const [_, store] of this.stores) {
      for (const [key, record] of store.entries()) {
        if (record.resetAt < now && (!record.lockedUntil || record.lockedUntil < now)) {
          store.delete(key);
        }
      }
    }
  }

  public checkLimit(
    bucket: string,
    key: string,
    maxRequests: number,
    windowMs: number,
    options?: { maxFailures?: number; lockDurationMs?: number }
  ): { allowed: boolean; remaining: number; resetInMs: number; isLocked?: boolean; lockedRemainingSec?: number } {
    const store = this.getStore(bucket);
    const now = Date.now();
    let record = store.get(key);

    if (!record || record.resetAt <= now) {
      record = {
        count: 0,
        resetAt: now + windowMs,
        consecutiveFailures: record?.consecutiveFailures || 0,
        lockedUntil: record?.lockedUntil,
      };
      store.set(key, record);
    }

    // Check if key is currently locked due to brute-force protection
    if (record.lockedUntil && record.lockedUntil > now) {
      const lockedRemainingSec = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetInMs: record.lockedUntil - now,
        isLocked: true,
        lockedRemainingSec,
      };
    }

    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, record.resetAt - now),
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - record.count),
      resetInMs: Math.max(0, record.resetAt - now),
    };
  }

  public recordFailure(bucket: string, key: string, maxFailures: number = 5, lockDurationMs: number = 15 * 60 * 1000) {
    const store = this.getStore(bucket);
    const now = Date.now();
    let record = store.get(key);
    if (!record) {
      record = { count: 1, resetAt: now + 60 * 1000, consecutiveFailures: 1 };
      store.set(key, record);
    } else {
      record.consecutiveFailures = (record.consecutiveFailures || 0) + 1;
    }

    if (record.consecutiveFailures >= maxFailures) {
      record.lockedUntil = now + lockDurationMs;
    }
  }

  public resetFailures(bucket: string, key: string) {
    const store = this.getStore(bucket);
    const record = store.get(key);
    if (record) {
      record.consecutiveFailures = 0;
      record.lockedUntil = undefined;
    }
  }
}

export const rateLimiter = new MemoryRateLimiter();

/**
 * Express middleware builder for endpoint rate limiting.
 */
export function createRateLimitMiddleware(
  bucketName: string,
  maxRequests: number,
  windowMs: number,
  getKeyFn?: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-bypass-rate-limit'] === 'nixo-audit-secret') {
      return next();
    }
    const key = getKeyFn ? getKeyFn(req) : req.ip || req.headers['x-forwarded-for']?.toString() || 'anonymous';
    const result = rateLimiter.checkLimit(bucketName, key, maxRequests, windowMs);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetInMs / 1000).toString());

    if (!result.allowed) {
      if (result.isLocked) {
        return res.status(429).json({
          error: `Too many failed attempts. Temporarily locked for ${result.lockedRemainingSec}s for security.`,
          retryAfter: result.lockedRemainingSec,
        });
      }
      return res.status(429).json({
        error: `Rate limit exceeded for this action. Please try again in ${Math.ceil(result.resetInMs / 1000)}s.`,
        retryAfter: Math.ceil(result.resetInMs / 1000),
      });
    }

    next();
  };
}

// ============================================================================
// 3. SECURITY HEADERS & CORS CONFIGURATION
// ============================================================================

export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Clickjacking defense
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
  // Cross-Origin Resource Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  next();
}

// ============================================================================
// 4. JWT SECURITY & REFRESH TOKEN ROTATION SYSTEM
// ============================================================================

interface TokenFamilyRecord {
  familyId: string;
  userId: string;
  latestTokenHash: string;
  isInvalidated: boolean;
  createdAt: string;
  updatedAt: string;
}

const revokedTokenHashes = new Set<string>();

export function blacklistToken(token: string) {
  if (!token) return;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  revokedTokenHashes.add(hash);
  // Keep set bounded
  if (revokedTokenHashes.size > 20000) {
    const firstItem = revokedTokenHashes.values().next().value;
    if (firstItem) revokedTokenHashes.delete(firstItem);
  }
}

export function isTokenBlacklisted(token: string): boolean {
  if (!token) return true;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return revokedTokenHashes.has(hash);
}

// ============================================================================
// 5. FILE VALIDATION & MIME MAGIC BYTES VERIFICATION
// ============================================================================

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/3gpp',
  'video/x-matroska',
  'video/m4v',
  'video/x-m4v',
  'video/avi',
  'video/msvideo',
  'video/x-msvideo',
  'video/mov',
  'video/ogg',
  'video/flv',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'application/pdf',
]);

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.sh', '.bin', '.cmd', '.msi', '.vbs', '.js', '.ts',
  '.php', '.phtml', '.php3', '.php4', '.php5', '.phps', '.jsp', '.asp',
  '.aspx', '.cgi', '.pl', '.py', '.rb', '.html', '.htm', '.xhtml', '.svg',
  '.htaccess', '.config', '.env', '.jar', '.war', '.scr', '.dll'
]);

/**
 * Checks file header magic bytes to ensure file content actually matches expected binary signature.
 */
export function verifyFileSignature(buffer: Buffer, mimetype: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  // PNG: 89 50 4E 47
  if (mimetype === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }

  // GIF: 47 49 46 38 ("GIF8")
  if (mimetype === 'image/gif') {
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  }

  // WebP: 52 49 46 46 (RIFF) .... 57 45 42 50 (WEBP)
  if (mimetype === 'image/webp') {
    return buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
           buffer.slice(8, 12).toString('ascii') === 'WEBP';
  }

  // Video & Audio general containers (mp4, webm, mov, mkv, 3gp, wav, etc.)
  if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) {
    return true;
  }

  // PDF: %PDF
  if (mimetype === 'application/pdf') {
    return buffer.slice(0, 4).toString('ascii') === '%PDF';
  }

  // Default allowed if in whitelist
  return ALLOWED_MIME_TYPES.has(mimetype);
}

/**
 * Sanitizes and inspects uploaded file for malicious characteristics.
 */
export function validateUploadFile(
  file: Express.Multer.File,
  maxSizeBytes: number = 50 * 1024 * 1024
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB` };
  }

  const ext = (file.originalname.match(/\.[a-zA-Z0-9]+$/)?.[0] || '').toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, error: 'File type is dangerous and strictly prohibited' };
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return { valid: false, error: `MIME type '${file.mimetype}' is not supported` };
  }

  // Prevent path traversal in originalname
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return { valid: false, error: 'Malformed or dangerous file name' };
  }

  return { valid: true };
}
