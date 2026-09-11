/* ==========================================================================
   ANCLA - Comfort Quotes Module
   Selects and dynamically rotates between 120 validated comfort phrases
   with matching emojis for real-time emotional reassurance.
   ========================================================================== */

import { COMFORT_QUOTES } from "../data/comfort-quotes.js";
import { soundEngine } from "../audio/sound-engine.js";

export class ComfortQuotesModule {
  constructor() {
    this.quotes = COMFORT_QUOTES;
    this.currentIndex = -1;
    this.bannerEl = null;
    this.emojiEl = null;
    this.titleEl = null;
    this.textEl = null;
    this.refreshBtn = null;
  }

  init() {
    this.bannerEl = document.getElementById("reassuranceBanner");
    this.emojiEl = document.getElementById("reassuranceEmoji");
    this.titleEl = document.getElementById("reassuranceTitle");
    this.textEl = document.getElementById("reassuranceText");
    this.refreshBtn = document.getElementById("refreshQuoteBtn");

    if (!this.bannerEl || !this.quotes || this.quotes.length === 0) return;

    // Display a random quote upon opening the app
    this.displayRandomQuote(false);
    this.attachEvents();
  }

  getRandomIndex() {
    let nextIdx = Math.floor(Math.random() * this.quotes.length);
    // Avoid immediate repetition
    if (nextIdx === this.currentIndex && this.quotes.length > 1) {
      nextIdx = (nextIdx + 1) % this.quotes.length;
    }
    return nextIdx;
  }

  displayRandomQuote(animate = true) {
    const nextIdx = this.getRandomIndex();
    this.currentIndex = nextIdx;
    const quote = this.quotes[this.currentIndex];

    if (!quote) return;

    if (animate) {
      soundEngine.vibrate([25]);

      // Subtle animation
      if (this.emojiEl) this.emojiEl.style.transform = "scale(0.8) rotate(-10deg)";
      if (this.titleEl) this.titleEl.style.opacity = "0.2";
      if (this.textEl) this.textEl.style.opacity = "0.2";

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
      if (this.textEl) this.textEl.textContent = quote.text;
    }
  }

  attachEvents() {
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.displayRandomQuote(true);
      });
    }

    if (this.bannerEl) {
      this.bannerEl.addEventListener("click", () => {
        this.displayRandomQuote(true);
      });
    }
  }
}

export const comfortQuotes = new ComfortQuotesModule();
