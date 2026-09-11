/* ==========================================================================
   ANCLA - SOS Emergency Module
   Priority #1: ECU 911 (Gratuito) + Instant Alert to Psychologist & Second-in-Command
   ========================================================================== */

import { CONFIG } from "../config.js";
import { storage } from "../db/storage.js";
import { soundEngine } from "../audio/sound-engine.js";

export class SOSModule {
  constructor() {
    this.modalEl = null;
    this.fabBtn = null;
    this.contacts = [];
    this.keyContacts = {
      psychologist: { ...CONFIG.DEFAULT_KEY_CONTACTS.psychologist },
      secondInCommand: { ...CONFIG.DEFAULT_KEY_CONTACTS.secondInCommand }
    };
  }

  async init() {
    this.modalEl = document.getElementById("sosModalBackdrop");
    this.fabBtn = document.getElementById("sosFloatingBtn");
    await this.loadEmergencyContacts();
    await this.loadKeyContacts();
    this.renderEmergencyGrid();
    this.attachEvents();
  }

  async loadEmergencyContacts() {
    this.contacts = await storage.getAll("contacts");
  }

  async loadKeyContacts() {
    const saved = await storage.getSetting("key_emergency_contacts", null);
    if (saved) {
      if (saved.psychologist) this.keyContacts.psychologist = { ...this.keyContacts.psychologist, ...saved.psychologist };
      if (saved.secondInCommand) this.keyContacts.secondInCommand = { ...this.keyContacts.secondInCommand, ...saved.secondInCommand };
    }
  }

  async saveKeyContacts(psychologist, secondInCommand) {
    this.keyContacts.psychologist = psychologist;
    this.keyContacts.secondInCommand = secondInCommand;
    await storage.setSetting("key_emergency_contacts", this.keyContacts);
    this.renderEmergencyGrid();
  }

  renderEmergencyGrid() {
    const gridContainer = document.getElementById("emergencySpeedGrid");
    if (!gridContainer) return;

    const psych = this.keyContacts.psychologist;
    const secCmd = this.keyContacts.secondInCommand;

    let html = `
      <!-- ══════════════════════════════════════════════════════
           OPCIÓN #1 PRIORITARIA: 911 GRATUITO + ALERTA DOBLE
           ══════════════════════════════════════════════════════ -->
      <div class="priority-sos-card" style="
        background: linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%);
        border: 2.5px solid #ef4444;
        border-radius: var(--radius-2xl, 24px);
        padding: var(--space-5, 20px);
        box-shadow: 0 8px 24px rgba(239, 68, 68, 0.25);
        margin-bottom: 16px;
      ">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
          <div style="
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #dc2626;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
          ">🚨</div>
          <div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-size: 0.72rem; font-weight: 800; background: #dc2626; color: #fff; padding: 2px 8px; border-radius: var(--radius-full);">
                1ª OPCIÓN RECOMENDADA
              </span>
              <span style="font-size: 0.72rem; font-weight: 800; background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: var(--radius-full);">
                GRATUITO
              </span>
            </div>
            <h4 style="font-size: 1.05rem; font-weight: 800; color: #991b1b; margin-top: 4px; line-height: 1.3;">
              Llamada 911 + Alerta a Psicólogo y 2º al Mando
            </h4>
            <p style="font-size: 0.78rem; color: #7f1d1d; margin-top: 2px; line-height: 1.4;">
              Conecta de inmediato con la central de emergencias <strong>ECU 911</strong> y envía alerta simultánea a tu red de protección.
            </p>
          </div>
        </div>

        <!-- Alerta Target Indicators -->
        <div style="background: rgba(255, 255, 255, 0.8); border-radius: var(--radius-lg, 16px); padding: 10px 14px; margin-bottom: 12px; font-size: 0.78rem; color: #374151;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span>🩺 <strong>Psicólogo:</strong> ${psych.name}</span>
            <span style="color: #6b7280; font-family: monospace;">${psych.phone || "Sin tel."}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>🛡️ <strong>2º al Mando:</strong> ${secCmd.name}</span>
            <span style="color: #6b7280; font-family: monospace;">${secCmd.phone || "Sin tel."}</span>
          </div>
        </div>

        <!-- Main Action Trigger -->
        <button id="primary911AlertBtn" class="btn btn-urgent btn-block" style="
          font-size: 1.02rem;
          font-weight: 800;
          padding: 14px;
          border-radius: var(--radius-xl, 20px);
          background: #dc2626;
          color: #ffffff;
          box-shadow: 0 6px 18px rgba(220, 38, 38, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        ">
          <span>📞 Iniciar 911 y Enviar Alertas</span>
        </button>

        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
          <button id="editKeyContactsBtn" class="btn btn-sm btn-ghost" style="font-size: 0.74rem; color: #991b1b; padding: 2px 6px;">
            ✏️ Editar Psicólogo o 2º al Mando
          </button>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin: 16px 0 12px;">
        <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
          Otras Líneas y Contactos
        </span>
        <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
      </div>
    `;

    // 2. National Hotlines (171 MSP Ecuador & others)
    CONFIG.DEFAULT_HOTLINES.forEach(h => {
      // 911 is already #1, render MSP 171 option
      if (h.id === "ec_msp_171") {
        html += `
          <a href="${h.telUri}" class="emergency-btn urgent" data-id="${h.id}">
            <div class="emergency-icon">🩺</div>
            <div class="emergency-details">
              <div class="emergency-title">${h.name}</div>
              <div class="emergency-desc">${h.description}</div>
            </div>
            <span class="emergency-action-badge">Llamar ${h.number}</span>
          </a>
        `;
      }
    });

    // 3. Personal Emergency Contacts
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
            ¿Deseas agregar más contactos personales de apoyo?
          </p>
          <button class="btn btn-sm btn-secondary" id="addQuickContactBtn">
            ➕ Agregar contacto extra
          </button>
        </div>
      `;
    }

    gridContainer.innerHTML = html;
    this.attachGridActions();
  }

  attachGridActions() {
    // Primary 911 Action Trigger
    const primary911Btn = document.getElementById("primary911AlertBtn");
    if (primary911Btn) {
      primary911Btn.addEventListener("click", () => {
        this.dispatch911WithAlerts();
      });
    }

    // Edit key contacts trigger
    const editKeyBtn = document.getElementById("editKeyContactsBtn");
    if (editKeyBtn) {
      editKeyBtn.addEventListener("click", () => {
        this.showEditKeyContactsModal();
      });
    }

    // Add extra contact button
    const addBtn = document.getElementById("addQuickContactBtn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        this.closeModal();
        const tabBtn = document.querySelector('[data-tab="tab-plan"]');
        if (tabBtn) tabBtn.click();
      });
    }

    // Send single SOS message buttons
    const msgButtons = document.querySelectorAll(".send-sos-msg-btn");
    msgButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const phone = btn.getAttribute("data-phone");
        const name = btn.getAttribute("data-name");
        this.dispatchSingleMessage(phone, name);
      });
    });
  }

  /**
   * Primary Action:
   * 1. Initiates immediate call to 911 (Gratuito).
   * 2. Prepares & dispatches distress alerts to Psychologist & Second-in-Command.
   * 3. Displays active dispatch dashboard with direct SMS/WhatsApp links.
   */
  dispatch911WithAlerts() {
    soundEngine.vibrate([100, 50, 150, 50, 200]);

    const psych = this.keyContacts.psychologist;
    const secCmd = this.keyContacts.secondInCommand;

    const psychMsg = `🚨 [EMERGENCIA VITAL ANCLA] He activado el llamado de emergencia al 911. Como mi Psicólogo a cargo (${psych.name}), por favor comunícate o asísteme de inmediato.`;
    const secCmdMsg = `🚨 [EMERGENCIA VITAL ANCLA] He activado el llamado de emergencia al 911. Como mi Segundo al mando y contacto prioritario (${secCmd.name}), necesito tu presencia y apoyo urgente ahora.`;

    // 1. Trigger native call to 911
    const callLink = document.createElement("a");
    callLink.href = "tel:911";
    document.body.appendChild(callLink);
    callLink.click();
    document.body.removeChild(callLink);

    // 2. Open confirmation and alert dispatch sheet
    this.showDispatchDashboard(psych, secCmd, psychMsg, secCmdMsg);
  }

  showDispatchDashboard(psych, secCmd, psychMsg, secCmdMsg) {
    const existing = document.getElementById("dispatchDashboardModal");
    if (existing) existing.remove();

    const encodedPsych = encodeURIComponent(psychMsg);
    const encodedSec = encodeURIComponent(secCmdMsg);

    const psychSmsUrl = `sms:${psych.phone || ""}?body=${encodedPsych}`;
    const psychWaUrl = `https://wa.me/${(psych.phone || "").replace(/\+/g, '')}?text=${encodedPsych}`;

    const secSmsUrl = `sms:${secCmd.phone || ""}?body=${encodedSec}`;
    const secWaUrl = `https://wa.me/${(secCmd.phone || "").replace(/\+/g, '')}?text=${encodedSec}`;

    const modal = document.createElement("div");
    modal.id = "dispatchDashboardModal";
    modal.className = "modal-backdrop active";
    modal.style.zIndex = "10000";
    modal.innerHTML = `
      <div class="modal-sheet" style="max-height: 90vh; overflow-y: auto;">
        <div class="modal-handle"></div>
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 50%; background: #fee2e2; color: #dc2626; font-size: 2rem; margin-bottom: 8px;">
            🚨
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #991b1b; margin-bottom: 4px;">
            Llamada al 911 Iniciada
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            Se está comunicando con emergencias (Gratuito). Envía ahora el mensaje de alerta a tu red:
          </p>
        </div>

        <!-- Alert 1: Psicólogo a Cargo -->
        <div style="background: var(--bg-surface); border: 1.5px solid #f87171; border-radius: var(--radius-xl); padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; color: #b91c1c; text-transform: uppercase;">
                🩺 Psicólogo(a) a Cargo
              </div>
              <strong style="font-size: 0.95rem; color: var(--text-primary);">${psych.name}</strong>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">${psych.phone}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="${psychSmsUrl}" class="btn btn-sm btn-primary" style="flex: 1; text-align: center; background: #dc2626; border-color: #dc2626;">
              💬 Enviar SMS Alerta
            </a>
            <a href="${psychWaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" style="flex: 1; text-align: center;">
              🟢 WhatsApp
            </a>
          </div>
        </div>

        <!-- Alert 2: Segundo al Mando -->
        <div style="background: var(--bg-surface); border: 1.5px solid #38bdf8; border-radius: var(--radius-xl); padding: 14px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; color: #0284c7; text-transform: uppercase;">
                🛡️ Segundo al Mando
              </div>
              <strong style="font-size: 0.95rem; color: var(--text-primary);">${secCmd.name}</strong>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">${secCmd.phone}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="${secSmsUrl}" class="btn btn-sm btn-primary" style="flex: 1; text-align: center; background: #0284c7; border-color: #0284c7;">
              💬 Enviar SMS Alerta
            </a>
            <a href="${secWaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" style="flex: 1; text-align: center;">
              🟢 WhatsApp
            </a>
          </div>
        </div>

        <button id="closeDispatchDashboardBtn" class="btn btn-ghost btn-block" style="border-radius: var(--radius-xl);">
          Entendido · Cerrar panel
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById("closeDispatchDashboardBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => modal.remove());
    }
  }

  showEditKeyContactsModal() {
    const existing = document.getElementById("editKeyContactsModal");
    if (existing) existing.remove();

    const psych = this.keyContacts.psychologist;
    const secCmd = this.keyContacts.secondInCommand;

    const modal = document.createElement("div");
    modal.id = "editKeyContactsModal";
    modal.className = "modal-backdrop active";
    modal.style.zIndex = "10001";
    modal.innerHTML = `
      <div class="modal-sheet" style="max-height: 90vh; overflow-y: auto;">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div>
            <h3 style="font-size: 1.15rem;">Configurar Red de Emergencia</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Contactos alertados automáticamente con el 911</p>
          </div>
          <button id="closeEditKeyModalBtn" class="modal-close-btn">✕</button>
        </div>

        <form id="keyContactsForm" style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Psicólogo a Cargo -->
          <div style="background: var(--bg-surface); border: 1.5px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 14px;">
            <div style="font-weight: 800; font-size: 0.92rem; color: #dc2626; margin-bottom: 8px;">
              🩺 Psicólogo(a) a Cargo
            </div>
            <div class="input-group" style="margin-bottom: 8px;">
              <label class="input-label" style="font-size: 0.78rem;">Nombre o Especialista</label>
              <input type="text" id="psychNameInput" class="input-field" value="${psych.name || ''}" placeholder="Ej: Dra. María Torres" required />
            </div>
            <div class="input-group">
              <label class="input-label" style="font-size: 0.78rem;">Teléfono / WhatsApp</label>
              <input type="tel" id="psychPhoneInput" class="input-field" value="${psych.phone || ''}" placeholder="Ej: +593991234567" required />
            </div>
          </div>

          <!-- Segundo al Mando -->
          <div style="background: var(--bg-surface); border: 1.5px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 14px;">
            <div style="font-weight: 800; font-size: 0.92rem; color: #0284c7; margin-bottom: 8px;">
              🛡️ Segundo al Mando (Apoyo Inmediato)
            </div>
            <div class="input-group" style="margin-bottom: 8px;">
              <label class="input-label" style="font-size: 0.78rem;">Nombre de Persona de Apoyo</label>
              <input type="text" id="secNameInput" class="input-field" value="${secCmd.name || ''}" placeholder="Ej: Carlos (Hermano / Pareja)" required />
            </div>
            <div class="input-group">
              <label class="input-label" style="font-size: 0.78rem;">Teléfono / WhatsApp</label>
              <input type="tel" id="secPhoneInput" class="input-field" value="${secCmd.phone || ''}" placeholder="Ej: +593998765432" required />
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" style="padding: 12px; font-size: 1rem; border-radius: var(--radius-xl);">
            Guardar Contactos de Emergencia 💾
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById("closeEditKeyModalBtn");
    if (closeBtn) closeBtn.addEventListener("click", () => modal.remove());

    const form = document.getElementById("keyContactsForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const updatedPsych = {
          ...psych,
          name: document.getElementById("psychNameInput").value.trim(),
          phone: document.getElementById("psychPhoneInput").value.trim()
        };
        const updatedSec = {
          ...secCmd,
          name: document.getElementById("secNameInput").value.trim(),
          phone: document.getElementById("secPhoneInput").value.trim()
        };

        await this.saveKeyContacts(updatedPsych, updatedSec);
        modal.remove();
      });
    }
  }

  dispatchSingleMessage(phone, name) {
    const message = encodeURIComponent(
      `Hola ${name || ""}, estoy atravesando una crisis emocional difícil y necesito tu apoyo ahora mismo. Por favor comunícate conmigo cuando veas este mensaje.`
    );
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
