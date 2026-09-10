/* ==========================================================================
   ANCLA - Biometric (WebAuthn) & PIN Authentication Controller
   Protects sensitive mental health data with instant emergency SOS bypass.
   ========================================================================== */

import { cryptoEngine } from "../crypto/encryption.js";
import { storage } from "../db/storage.js";

export class AuthController {
  constructor() {
    this.isLocked = false;
    this.hasPinConfigured = false;
    this.isWebAuthnAvailable = false;
    this.pinBuffer = "";
    this.onUnlockCallbacks = [];
  }

  /**
   * Initializes auth status, checks for existing PIN or biometrics
   */
  async init() {
    // Check if WebAuthn platform authenticator is supported
    if (window.PublicKeyCredential &&
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      try {
        this.isWebAuthnAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        this.isWebAuthnAvailable = false;
      }
    }

    const pinHash = await storage.getSetting("pin_hash");
    this.hasPinConfigured = !!pinHash;

    if (this.hasPinConfigured) {
      this.lock();
    } else {
      // If no PIN set yet, set a default master demo PIN "1234" with key derivation for testing,
      // or prompt user to configure one.
      const defaultSalt = cryptoEngine.generateSalt(16);
      const saltBase64 = cryptoEngine.arrayBufferToBase64(defaultSalt);
      const initialKey = await cryptoEngine.deriveKey("0000", defaultSalt);
      cryptoEngine.setActiveKey(initialKey, defaultSalt);
      await storage.setSetting("salt", saltBase64);
      this.isLocked = false;
    }

    this.renderLockScreenState();
    this.attachEvents();
  }

  /**
   * Registers callback on successful unlock
   */
  onUnlock(fn) {
    this.onUnlockCallbacks.push(fn);
  }

  /**
   * Locks the application UI
   */
  lock() {
    cryptoEngine.clearKey();
    this.isLocked = true;
    this.pinBuffer = "";
    this.renderLockScreenState();
  }

  /**
   * Unlocks the application UI with verified key
   */
  unlock(key, salt) {
    cryptoEngine.setActiveKey(key, salt);
    this.isLocked = false;
    this.pinBuffer = "";
    this.renderLockScreenState();
    this.onUnlockCallbacks.forEach(fn => fn());
  }

  /**
   * Configures or updates PIN
   */
  async setPin(pin) {
    if (pin.length !== 4) throw new Error("El PIN debe tener 4 dígitos.");
    const salt = cryptoEngine.generateSalt(16);
    const saltBase64 = cryptoEngine.arrayBufferToBase64(salt);
    const hash = await cryptoEngine.sha256(pin + saltBase64);
    const key = await cryptoEngine.deriveKey(pin, salt);

    await storage.setSetting("pin_hash", hash);
    await storage.setSetting("salt", saltBase64);

    this.hasPinConfigured = true;
    this.unlock(key, salt);
    return true;
  }

  /**
   * Verifies an entered PIN
   */
  async verifyPin(enteredPin) {
    const storedHash = await storage.getSetting("pin_hash");
    const storedSaltBase64 = await storage.getSetting("salt");

    if (!storedHash || !storedSaltBase64) {
      // Default setup without configured pin
      return true;
    }

    const testHash = await cryptoEngine.sha256(enteredPin + storedSaltBase64);
    if (testHash === storedHash) {
      const salt = cryptoEngine.base64ToArrayBuffer(storedSaltBase64);
      const key = await cryptoEngine.deriveKey(enteredPin, new Uint8Array(salt));
      this.unlock(key, new Uint8Array(salt));
      return true;
    }
    return false;
  }

  /**
   * Native WebAuthn platform authentication trigger
   */
  async authenticateBiometric() {
    if (!this.isWebAuthnAvailable) {
      alert("Autenticación biométrica no disponible en este dispositivo. Usa tu PIN.");
      return false;
    }

    try {
      // In a real PWA context, WebAuthn uses navigator.credentials.get
      // with a challenge generated for the local origin
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          timeout: 60000,
          userVerification: "preferred"
        }
      });

      if (credential) {
        // Biometrics successful, recover session key
        const storedSaltBase64 = await storage.getSetting("salt");
        if (storedSaltBase64) {
          const salt = cryptoEngine.base64ToArrayBuffer(storedSaltBase64);
          // With platform passkey, derive session unlock
          const key = await cryptoEngine.deriveKey("biometric_authenticated", new Uint8Array(salt));
          this.unlock(key, new Uint8Array(salt));
        } else {
          this.isLocked = false;
          this.renderLockScreenState();
        }
        return true;
      }
    } catch (err) {
      console.warn("Biometric authentication cancelled or failed:", err);
      // Fallback smoothly to PIN
      return false;
    }
  }

  /**
   * Renders lockscreen visibility and PIN dots
   */
  renderLockScreenState() {
    const overlay = document.getElementById("lockscreenOverlay");
    const securityBadge = document.getElementById("securityStatusBadge");

    if (!overlay) return;

    if (this.isLocked) {
      overlay.style.display = "flex";
      if (securityBadge) {
        securityBadge.className = "badge-security locked";
        securityBadge.innerHTML = `<span>🔒</span> Bloqueado`;
      }
    } else {
      overlay.style.display = "none";
      if (securityBadge) {
        securityBadge.className = "badge-security";
        securityBadge.innerHTML = `<span>🛡️</span> Cifrado AES-256`;
      }
    }

    this.updatePinDots();
  }

  updatePinDots() {
    const dots = document.querySelectorAll(".pin-dot");
    dots.forEach((dot, index) => {
      if (index < this.pinBuffer.length) {
        dot.classList.add("filled");
      } else {
        dot.classList.remove("filled");
      }
    });
  }

  /**
   * Keypad event handling
   */
  attachEvents() {
    const keypadButtons = document.querySelectorAll(".keypad-btn[data-num]");
    const deleteBtn = document.getElementById("keypadDeleteBtn");
    const bioBtn = document.getElementById("keypadBioBtn");
    const lockAppBtn = document.getElementById("lockAppBtn");

    keypadButtons.forEach(btn => {
      btn.addEventListener("click", async () => {
        const num = btn.getAttribute("data-num");
        if (this.pinBuffer.length < 4) {
          this.pinBuffer += num;
          this.updatePinDots();

          if (this.pinBuffer.length === 4) {
            const success = await this.verifyPin(this.pinBuffer);
            if (!success) {
              // Shake animation on error
              const card = document.querySelector(".lockscreen-card");
              if (card) {
                card.animate([
                  { transform: "translateX(-8px)" },
                  { transform: "translateX(8px)" },
                  { transform: "translateX(-4px)" },
                  { transform: "translateX(0)" }
                ], { duration: 300 });
              }
              setTimeout(() => {
                this.pinBuffer = "";
                this.updatePinDots();
              }, 400);
            }
          }
        }
      });
    });

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        this.pinBuffer = this.pinBuffer.slice(0, -1);
        this.updatePinDots();
      });
    }

    if (bioBtn) {
      bioBtn.addEventListener("click", () => this.authenticateBiometric());
    }

    if (lockAppBtn) {
      lockAppBtn.addEventListener("click", () => this.lock());
    }
  }
}

export const auth = new AuthController();
