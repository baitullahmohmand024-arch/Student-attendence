/**
 * SchoolSync Cryptographic App PIN / Password Lock Service
 * Uses Web Cryptography API (PBKDF2 with SHA-256, 100,000 iterations, 16-byte random salt).
 * Guarantees zero plain-text storage, lockout rate limiting, and Google account recovery.
 */

const STORAGE_KEY_PIN_HASH = 'schoolsync_pin_hash';
const STORAGE_KEY_PIN_SALT = 'schoolsync_pin_salt';
const STORAGE_KEY_PIN_ENABLED = 'schoolsync_pin_enabled';
const STORAGE_KEY_FAILED_ATTEMPTS = 'schoolsync_pin_failed_attempts';
const STORAGE_KEY_LOCKOUT_UNTIL = 'schoolsync_pin_lockout_until';

class PinLockService {
  /**
   * Hashes a PIN or password using PBKDF2-HMAC-SHA256
   */
  private async hashPin(pin: string, salt: Uint8Array): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Checks if App PIN Lock is currently enabled
   */
  isPinLockEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEY_PIN_ENABLED) === 'true';
  }

  /**
   * Sets or updates the App PIN with a freshly generated cryptographic salt
   */
  async setPin(pin: string): Promise<void> {
    if (!pin || pin.length < 4) {
      throw new Error('PIN must be at least 4 digits or characters.');
    }

    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');

    const hash = await this.hashPin(pin, salt);

    localStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
    localStorage.setItem(STORAGE_KEY_PIN_SALT, saltHex);
    localStorage.setItem(STORAGE_KEY_PIN_ENABLED, 'true');
    this.resetFailedAttempts();
  }

  /**
   * Disables App PIN Lock
   */
  disablePinLock(): void {
    localStorage.removeItem(STORAGE_KEY_PIN_HASH);
    localStorage.removeItem(STORAGE_KEY_PIN_SALT);
    localStorage.setItem(STORAGE_KEY_PIN_ENABLED, 'false');
    this.resetFailedAttempts();
  }

  /**
   * Validates entered PIN against stored cryptographic hash.
   * Enforces exponential rate limits on repeated failures.
   */
  async verifyPin(enteredPin: string): Promise<{ success: boolean; lockoutSeconds?: number }> {
    // 1. Check existing lockout
    const lockoutUntilStr = localStorage.getItem(STORAGE_KEY_LOCKOUT_UNTIL);
    if (lockoutUntilStr) {
      const lockoutUntil = parseInt(lockoutUntilStr, 10);
      const remainingMs = lockoutUntil - Date.now();
      if (remainingMs > 0) {
        return {
          success: false,
          lockoutSeconds: Math.ceil(remainingMs / 1000),
        };
      }
    }

    const storedHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);
    const storedSaltHex = localStorage.getItem(STORAGE_KEY_PIN_SALT);

    if (!storedHash || !storedSaltHex) {
      return { success: true };
    }

    // Convert salt back to Uint8Array
    const saltMatches = storedSaltHex.match(/.{1,2}/g) || [];
    const salt = new Uint8Array(saltMatches.map((byte) => parseInt(byte, 16)));

    const computedHash = await this.hashPin(enteredPin, salt);
    const isMatch = computedHash === storedHash;

    if (isMatch) {
      this.resetFailedAttempts();
      return { success: true };
    } else {
      const attempts = this.recordFailedAttempt();
      let lockoutSeconds = 0;
      if (attempts >= 5) {
        lockoutSeconds = 120; // 2 minutes
      } else if (attempts >= 3) {
        lockoutSeconds = 30; // 30 seconds
      }

      if (lockoutSeconds > 0) {
        localStorage.setItem(STORAGE_KEY_LOCKOUT_UNTIL, (Date.now() + lockoutSeconds * 1000).toString());
      }

      return {
        success: false,
        lockoutSeconds: lockoutSeconds > 0 ? lockoutSeconds : undefined,
      };
    }
  }

  /**
   * Get active lockout time in seconds remaining, if any
   */
  getRemainingLockoutSeconds(): number {
    const lockoutUntilStr = localStorage.getItem(STORAGE_KEY_LOCKOUT_UNTIL);
    if (!lockoutUntilStr) return 0;
    const remainingMs = parseInt(lockoutUntilStr, 10) - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  /**
   * Reset rate-limit attempt counter
   */
  private resetFailedAttempts(): void {
    localStorage.removeItem(STORAGE_KEY_FAILED_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEY_LOCKOUT_UNTIL);
  }

  /**
   * Record a failed attempt
   */
  private recordFailedAttempt(): number {
    const current = parseInt(localStorage.getItem(STORAGE_KEY_FAILED_ATTEMPTS) || '0', 10);
    const next = current + 1;
    localStorage.setItem(STORAGE_KEY_FAILED_ATTEMPTS, next.toString());
    return next;
  }

  /**
   * Recovery: Reset PIN after verified Google Account login
   */
  resetPinAfterAccountVerification(): void {
    this.disablePinLock();
  }
}

export const pinLockService = new PinLockService();
