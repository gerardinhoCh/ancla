/* ==========================================================================
   ANCLA - Comfort Quotes Module
   Selects and dynamically rotates between 120 validated comfort phrases
   with matching emojis for real-time emotional reassurance.
   Includes: automatic rotation, system notifications on change, and
   an on/off toggle persisted in localStorage.
   ========================================================================== */

import { COMFORT_QUOTES } from "../data/comfort-quotes.js";
import { soundEngine } from "../audio/sound-engine.js";

const NOTIF_PREF_KEY = "ancla_quote_notifs_enabled";
const AUTO_ROTATE_MS = 30000; // rotate every 30 s automatically

export class ComfortQuotesModule {
  constructor() {
    this.quotes = COMFORT_QUOTES;
    this.currentIndex = -1;

    // DOM refs
    this.bannerEl   = null;
    this.emojiEl    = null;
    this.titleEl    = null;
    this.textEl     = null;
    this.refreshBtn = null;
    this.notifToggleBtn = null;

    // State
    this.notifsEnabled = this._loadPref();
    this._autoRotateTimer = null;
  }

  // ── Preference helpers ────────────────────────────────────────────────────

  _loadPref() {
    try { return localStorage.getItem(NOTIF_PREF_KEY) !== "false"; }
    catch { return false; }
  }

  _savePref(val) {
    try { localStorage.setItem(NOTIF_PREF_KEY, val ? "true" : "false"); }
    catch { /* noop */ }
  }

  // ── Initialise ────────────────────────────────────────────────────────────

  init() {
    this.bannerEl   = document.getElementById("reassuranceBanner");
    this.emojiEl    = document.getElementById("reassuranceEmoji");
    this.titleEl    = document.getElementById("reassuranceTitle");
    this.textEl     = document.getElementById("reassuranceText");
    this.refreshBtn = document.getElementById("refreshQuoteBtn");

    if (!this.bannerEl || !this.quotes || this.quotes.length === 0) return;

    // Inject the notification toggle button into the banner
    this._injectNotifToggle();

    // Display a random quote upon opening the app
    this.displayRandomQuote(false);
    this._attachEvents();
    this._startAutoRotate();
  }

  // ── DOM injection ─────────────────────────────────────────────────────────

  _injectNotifToggle() {
    // Find the header row inside the banner (where refreshBtn lives)
    const headerRow = this.refreshBtn?.parentElement;
    if (!headerRow) return;

    const btn = document.createElement("button");
    btn.id = "quoteNotifToggleBtn";
    btn.title = "Activar / desactivar notificaciones de frases";
    btn.style.cssText = `
      padding: 2px 9px;
      font-size: 0.70rem;
      border-radius: 999px;
      border: 1px solid rgba(45, 212, 191, 0.35);
      background: rgba(255,255,255,0.7);
      cursor: pointer;
      transition: all 0.25s ease;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 700;
      color: #0f766e;
    `;
    this.notifToggleBtn = btn;
    this._syncToggleUI();

    headerRow.appendChild(btn);
  }

  _syncToggleUI() {
    if (!this.notifToggleBtn) return;
    if (this.notifsEnabled) {
      this.notifToggleBtn.innerHTML = "🔔 Notifs On";
      this.notifToggleBtn.style.background = "rgba(45, 212, 191, 0.15)";
    } else {
      this.notifToggleBtn.innerHTML = "🔕 Notifs Off";
      this.notifToggleBtn.style.background = "rgba(255,255,255,0.7)";
    }
  }

  // ── Quote display ─────────────────────────────────────────────────────────

  getRandomIndex() {
    let nextIdx = Math.floor(Math.random() * this.quotes.length);
    if (nextIdx === this.currentIndex && this.quotes.length > 1) {
      nextIdx = (nextIdx + 1) % this.quotes.length;
    }
    return nextIdx;
  }

  displayRandomQuote(animate = true, fromUser = false) {
    const nextIdx = this.getRandomIndex();
    this.currentIndex = nextIdx;
    const quote = this.quotes[this.currentIndex];
    if (!quote) return;

    if (animate) {
      soundEngine.vibrate([25]);

      if (this.emojiEl) this.emojiEl.style.transform = "scale(0.8) rotate(-10deg)";
      if (this.titleEl) this.titleEl.style.opacity = "0.2";
      if (this.textEl)  this.textEl.style.opacity  = "0.2";

      setTimeout(() => {
        if (this.emojiEl) {
          this.emojiEl.textContent = quote.emoji;
          this.emojiEl.style.transform = "scale(1.1) rotate(5deg)";
        }
        if (this.titleEl) {
          this.titleEl.textContent = quote.title;
          this.titleEl.style.opacity = "1";
        }
        if (this.textEl) {
          this.textEl.textContent = quote.text;
          this.textEl.style.opacity = "1";
        }
        setTimeout(() => {
          if (this.emojiEl) this.emojiEl.style.transform = "scale(1) rotate(0deg)";
        }, 150);
      }, 150);
    } else {
      if (this.emojiEl) this.emojiEl.textContent = quote.emoji;
      if (this.titleEl) this.titleEl.textContent = quote.title;
      if (this.textEl)  this.textEl.textContent  = quote.text;
    }

    // Send system notification if enabled (only on animated changes, not initial load)
    if (animate && this.notifsEnabled) {
      this._sendQuoteNotification(quote);
    }
  }

  // ── System notification ───────────────────────────────────────────────────

  async _sendQuoteNotification(quote) {
    if (!("Notification" in window)) return;

    // Request permission on first attempt if not yet decided
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        this.notifsEnabled = false;
        this._savePref(false);
        this._syncToggleUI();
        return;
      }
    }

    if (Notification.permission !== "granted") return;

    try {
      // Prefer Service Worker notification (works even when app is backgrounded)
      const swReg = await navigator.serviceWorker?.ready;
      if (swReg) {
        swReg.showNotification(`${quote.emoji} Ancla`, {
          body: quote.text,
          icon: "./icons/icon-192.png",
          badge: "./icons/icon-96.png",
          tag: "ancla-comfort-quote",   // replaces previous, no spam
          renotify: true,
          vibrate: [30, 60, 30],
          silent: true,
        });
      } else {
        // Fallback: plain Notification API
        new Notification(`${quote.emoji} Ancla`, {
          body: quote.text,
          icon: "./icons/icon-192.png",
          tag: "ancla-comfort-quote",
          silent: true,
        });
      }
    } catch (err) {
      console.warn("Notification error:", err);
    }
  }

  // ── Auto-rotate ───────────────────────────────────────────────────────────

  _startAutoRotate() {
    this._clearAutoRotate();
    this._autoRotateTimer = setInterval(() => {
      this.displayRandomQuote(true);
    }, AUTO_ROTATE_MS);
  }

  _clearAutoRotate() {
    if (this._autoRotateTimer) {
      clearInterval(this._autoRotateTimer);
      this._autoRotateTimer = null;
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  _attachEvents() {
    // Refresh button
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._startAutoRotate(); // reset auto-timer
        this.displayRandomQuote(true, true);
      });
    }

    // Tap banner body
    if (this.bannerEl) {
      this.bannerEl.addEventListener("click", (e) => {
        // Don't trigger if clicking buttons inside
        if (e.target.closest("button")) return;
        this._startAutoRotate();
        this.displayRandomQuote(true, true);
      });
    }

    // Notification toggle
    if (this.notifToggleBtn) {
      this.notifToggleBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        this.notifsEnabled = !this.notifsEnabled;
        this._savePref(this.notifsEnabled);
        this._syncToggleUI();

        // If enabling, request permission straight away
        if (this.notifsEnabled && Notification.permission === "default") {
          const result = await Notification.requestPermission();
          if (result !== "granted") {
            this.notifsEnabled = false;
            this._savePref(false);
            this._syncToggleUI();
          }
        }

        // Animate the button briefly
        this.notifToggleBtn.style.transform = "scale(0.92)";
        setTimeout(() => {
          if (this.notifToggleBtn) this.notifToggleBtn.style.transform = "scale(1)";
        }, 150);
      });
    }
  }
}

export const comfortQuotes = new ComfortQuotesModule();
