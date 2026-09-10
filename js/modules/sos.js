/* ==========================================================================
   ANCLA - SOS Emergency Module
   Immediate, resilient speed-dial and emergency action dispatch.
   ========================================================================== */

import { CONFIG } from "../config.js";
import { storage } from "../db/storage.js";

export class SOSModule {
  constructor() {
    this.modalEl = null;
    this.fabBtn = null;
    this.contacts = [];
  }

  async init() {
    this.modalEl = document.getElementById("sosModalBackdrop");
    this.fabBtn = document.getElementById("sosFloatingBtn");
    await this.loadEmergencyContacts();
    this.renderEmergencyGrid();
    this.attachEvents();
  }

  async loadEmergencyContacts() {
    this.contacts = await storage.getAll("contacts");
  }

  renderEmergencyGrid() {
    const gridContainer = document.getElementById("emergencySpeedGrid");
    if (!gridContainer) return;

    // Build emergency list: Official hotlines + user's personal emergency contacts
    let html = "";

    // 1. National Hotlines (171 MSP Ecuador & 911)
    CONFIG.DEFAULT_HOTLINES.forEach(h => {
      html += `
        <a href="${h.telUri}" class="emergency-btn urgent" data-id="${h.id}">
          <div class="emergency-icon">📞</div>
          <div class="emergency-details">
            <div class="emergency-title">${h.name}</div>
            <div class="emergency-desc">${h.description}</div>
          </div>
          <span class="emergency-action-badge">Llamar ${h.number}</span>
        </a>
      `;
    });

    // 2. Personal Emergency Contacts
    if (this.contacts && this.contacts.length > 0) {
      this.contacts.forEach(contact => {
        html += `
          <div class="emergency-btn trusted" style="display: flex; flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="emergency-icon">🤝</div>
              <div class="emergency-details">
                <div class="emergency-title">${contact.name} (${contact.relation || "Apoyo"})</div>
                <div class="emergency-desc">${contact.phone}</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              <a href="tel:${contact.phone}" class="btn btn-sm btn-primary" style="flex: 1; text-align: center;">
                📞 Llamar directo
              </a>
              <button class="btn btn-sm btn-secondary send-sos-msg-btn" data-phone="${contact.phone}" data-name="${contact.name}">
                💬 Enviar mensaje SOS
              </button>
            </div>
          </div>
        `;
      });
    } else {
      html += `
        <div style="padding: 12px; border: 1px dashed var(--border-strong); border-radius: var(--radius-md); text-align: center;">
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
            No has agregado un contacto de confianza personal aún.
          </p>
          <button class="btn btn-sm btn-secondary" id="addQuickContactBtn">
            ➕ Agregar persona de apoyo
          </button>
        </div>
      `;
    }

    gridContainer.innerHTML = html;
    this.attachContactActions();
  }

  attachContactActions() {
    const addBtn = document.getElementById("addQuickContactBtn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        this.closeModal();
        const tabBtn = document.querySelector('[data-tab="tab-plan"]');
        if (tabBtn) tabBtn.click();
      });
    }

    const msgButtons = document.querySelectorAll(".send-sos-msg-btn");
    msgButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const phone = btn.getAttribute("data-phone");
        const name = btn.getAttribute("data-name");
        this.dispatchEmergencyMessage(phone, name);
      });
    });
  }

  /**
   * Generates a pre-filled SMS/WhatsApp emergency distress message
   */
  dispatchEmergencyMessage(phone, name) {
    const message = encodeURIComponent(
      `Hola ${name || ""}, estoy atravesando una crisis emocional difícil y necesito tu apoyo ahora mismo. Por favor comunícate conmigo cuando veas este mensaje.`
    );
    // Prefer SMS protocol for reliable offline cellular dispatch
    window.open(`sms:${phone}?body=${message}`, "_blank");
  }

  openModal() {
    if (this.modalEl) {
      this.modalEl.classList.add("active");
    }
  }

  closeModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove("active");
    }
  }

  attachEvents() {
    if (this.fabBtn) {
      this.fabBtn.addEventListener("click", () => this.openModal());
    }

    const closeBtn = document.getElementById("closeSosModalBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeModal());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener("click", (e) => {
        if (e.target === this.modalEl) this.closeModal();
      });
    }

    // Direct trigger from lockscreen
    const lockBypassBtn = document.getElementById("lockSosBypassBtn");
    if (lockBypassBtn) {
      lockBypassBtn.addEventListener("click", () => this.openModal());
    }

    // Launch Crisis Mode from SOS sheet
    const launchCrisisBtn = document.getElementById("sosLaunchCrisisBtn");
    if (launchCrisisBtn) {
      launchCrisisBtn.addEventListener("click", () => {
        this.closeModal();
        window.dispatchEvent(new CustomEvent("launch-crisis-mode"));
      });
    }
  }
}

export const sosModule = new SOSModule();
