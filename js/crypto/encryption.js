/* ==========================================================================
   ANCLA - Web Crypto API Engine (AES-256-GCM & PBKDF2)
   Native zero-dependency encryption for health data in rest and transit.
   ========================================================================== */

export class CryptoEngine {
  constructor() {
    this.crypto = window.crypto || window.msCrypto;
    this.subtle = this.crypto.subtle;
    this.activeKey = null;
    this.currentSalt = null;
  }

  /**
   * Generates a cryptographically secure random salt
   * @param {number} length - Bytes of salt (default 16)
   * @returns {Uint8Array}
   */
  generateSalt(length = 16) {
    const salt = new Uint8Array(length);
    this.crypto.getRandomValues(salt);
    return salt;
  }

  /**
   * Derives an AES-GCM 256-bit CryptoKey from a user PIN or passphrase using PBKDF2
   * @param {string} pin - User secret PIN or passphrase
   * @param {Uint8Array} salt - 16-byte salt
   * @returns {Promise<CryptoKey>}
   */
  async deriveKey(pin, salt) {
    const encoder = new TextEncoder();
    const pinBuffer = encoder.encode(pin);

    // Import the raw PIN as base key material
    const baseKey = await this.subtle.importKey(
      "raw",
      pinBuffer,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    // Derive AES-GCM 256 key
    return await this.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      baseKey,
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Sets the active session key
   */
  setActiveKey(key, salt) {
    this.activeKey = key;
    this.currentSalt = salt;
  }

  /**
   * Checks if encryption key is active in current memory session
   */
  hasActiveKey() {
    return this.activeKey !== null;
  }

  /**
   * Clears the active key from memory (lock)
   */
  clearKey() {
    this.activeKey = null;
    this.currentSalt = null;
  }

  /**
   * Encrypts plain JS object or string using AES-256-GCM
   * @param {any} data - Object or string to encrypt
   * @param {CryptoKey} [key] - Optional specific key, defaults to activeKey
   * @returns {Promise<{iv: string, ciphertext: string, salt: string}>}
   */
  async encrypt(data, key = this.activeKey) {
    if (!key) {
      throw new Error("No active encryption key available. App is locked.");
    }

    const encoder = new TextEncoder();
    const plainText = typeof data === "string" ? data : JSON.stringify(data);
    const plainBuffer = encoder.encode(plainText);

    // Generate 12-byte IV for GCM
    const iv = new Uint8Array(12);
    this.crypto.getRandomValues(iv);

    const cipherBuffer = await this.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      plainBuffer
    );

    return {
      iv: this.arrayBufferToBase64(iv),
      ciphertext: this.arrayBufferToBase64(cipherBuffer),
      salt: this.currentSalt ? this.arrayBufferToBase64(this.currentSalt) : null
    };
  }

  /**
   * Decrypts an encrypted payload using AES-256-GCM
   * @param {{iv: string, ciphertext: string}} payload
   * @param {CryptoKey} [key] - Optional specific key, defaults to activeKey
   * @returns {Promise<any>}
   */
  async decrypt(payload, key = this.activeKey) {
    if (!key) {
      throw new Error("No active encryption key available. App is locked.");
    }

    const iv = this.base64ToArrayBuffer(payload.iv);
    const cipherBuffer = this.base64ToArrayBuffer(payload.ciphertext);

    const decryptedBuffer = await this.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      cipherBuffer
    );

    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedBuffer);

    try {
      return JSON.parse(decryptedText);
    } catch {
      return decryptedText;
    }
  }

  /**
   * Calculates SHA-256 hash formatted in hex (used for PIN verification)
   * @param {string} text
   * @returns {Promise<string>}
   */
  async sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await this.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Utilities for Base64 <-> ArrayBuffer conversion
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const cryptoEngine = new CryptoEngine();
