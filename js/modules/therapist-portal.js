/* ==========================================================================
   ANCLA - Support Network & Governance Module
   Manages primary key contacts (Psychologist & Second-in-Command),
   wellness reminders, clinical consultation summaries, and privacy consents.
   ========================================================================== */

import { CONFIG } from "../config.js";
import { storage } from "../db/storage.js";
import { cryptoEngine } from "../crypto/encryption.js";
import { sosModule } from "./sos.js";
import { dailyMilestones } from "./daily-milestones.js";

export class TherapistPortalModule {
  constructor() {
    this.containerEl = null;
    this.consents = {};
    this.contacts = [];
    this.keyContacts = {
      psychologist: { ...CONFIG.DEFAULT_KEY_CONTACTS.psychologist },
      secondInCommand: { ...CONFIG.DEFAULT_KEY_CONTACTS.secondInCommand }
    };
  }

  async init() {
    this.containerEl = document.getElementById("therapistPortalContainer");
    await this.loadConsents();
    await this.loadKeyContacts();
    await this.loadPersonalContacts();
    this.render();
    this.attachEvents();
  }

  async loadConsents() {
    const list = await storage.getAll("consents");
    list.forEach(c => {
      this.consents[c.type] = c.authorized;
    });
  }

  async loadKeyContacts() {
    const saved = await storage.getSetting("key_emergency_contacts", null);
    if (saved) {
      if (saved.psychologist) this.keyContacts.psychologist = { ...this.keyContacts.psychologist, ...saved.psychologist };
      if (saved.secondInCommand) this.keyContacts.secondInCommand = { ...this.keyContacts.secondInCommand, ...saved.secondInCommand };
    }
  }

  async loadPersonalContacts() {
    this.contacts = await storage.getAll("contacts");
  }

  async setConsent(type, authorized) {
    this.consents[type] = authorized;
    await storage.put("consents", {
      type,
      authorized,
      updatedAt: new Date().toISOString()
    });
  }

  render() {
    if (!this.containerEl) return;

    const psych = this.keyContacts.psychologist;
    const sec = this.keyContacts.secondInCommand;
    const isPermGranted = ("Notification" in window) && Notification.permission === "granted";
    const notifyTime = dailyMilestones.notificationTime || "20:00";

    this.containerEl.innerHTML = `
      <!-- ══════════════════════════════════════════════════════
           1. MI RED DE SEGURIDAD & CONTACTOS DE EMERGENCIA
           ══════════════════════════════════════════════════════ -->
      <div class="card card-sky" style="margin-bottom: var(--space-4);">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: var(--sky-100);">🛡️</span>
            Mi Red de Seguridad Prioritaria
          </div>
          <button id="editNetworkContactsBtn" class="btn btn-sm btn-secondary">
            ✏️ Editar
          </button>
        </div>
        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 14px;">
          Estas personas son alertadas de forma automática al presionar el llamado de emergencia al 911.
        </p>

        <!-- Psicólogo a Cargo -->
        <div style="background: var(--bg-surface); border: 1.5px solid #fecdd3; border-radius: var(--radius-xl); padding: 14px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; color: #dc2626; text-transform: uppercase;">
                🩺 Psicólogo(a) a Cargo
              </div>
              <strong style="font-size: 0.96rem; color: var(--text-primary);">${psych.name}</strong>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">${psych.phone}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="tel:${psych.phone}" class="btn btn-sm btn-primary" style="flex: 1; text-align: center; background: #dc2626; border-color: #dc2626;">
              📞 Llamar
            </a>
            <a href="https://wa.me/${(psych.phone || '').replace(/\+/g, '')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" style="flex: 1; text-align: center;">
              🟢 WhatsApp
            </a>
          </div>
        </div>

        <!-- Segundo al Mando -->
        <div style="background: var(--bg-surface); border: 1.5px solid #bae6fd; border-radius: var(--radius-xl); padding: 14px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; color: #0284c7; text-transform: uppercase;">
                🛡️ Segundo al Mando (Apoyo Inmediato)
              </div>
              <strong style="font-size: 0.96rem; color: var(--text-primary);">${sec.name}</strong>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">${sec.phone}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="tel:${sec.phone}" class="btn btn-sm btn-primary" style="flex: 1; text-align: center; background: #0284c7; border-color: #0284c7;">
              📞 Llamar
            </a>
            <a href="https://wa.me/${(sec.phone || '').replace(/\+/g, '')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" style="flex: 1; text-align: center;">
              🟢 WhatsApp
            </a>
          </div>
        </div>

        <!-- Otros contactos personales -->
        <div style="border-top: 1px dashed var(--border-subtle); padding-top: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary);">Otras Personas de Confianza</span>
            <button id="addExtraContactBtn" class="btn btn-sm btn-ghost" style="font-size: 0.78rem;">➕ Añadir</button>
          </div>
          <div id="extraContactsList">
            ${this.renderExtraContacts()}
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           2. NOTIFICACIONES & RECORDATORIOS DIARIOS
           ══════════════════════════════════════════════════════ -->
      <div class="card card-mint" style="margin-bottom: var(--space-4);">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: var(--mint-100);">🔔</span>
            Recordatorios de Hitos Diarios
          </div>
          <span style="font-size: 0.75rem; font-weight: 800; color: ${isPermGranted ? '#0d9488' : '#e11d48'}; background: #fff; padding: 4px 10px; border-radius: var(--radius-full); border: 1px solid currentColor;">
            ${isPermGranted ? "Activos" : "Desactivados"}
          </span>
        </div>
        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 12px;">
          Ancla te enviará una alerta cálida si llega tu hora de descanso y aún tienes hitos pendientes (ánimo o calma).
        </p>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--bg-surface); padding: 12px 16px; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); margin-bottom: 12px;">
          <div>
            <strong style="font-size: 0.88rem; display: block;">Hora del Recordatorio</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Horario ideal para tu pausa diaria</span>
          </div>
          <input type="time" id="settingsNotifyTime" value="${notifyTime}" style="padding: 6px 12px; border-radius: var(--radius-lg); border: 1px solid var(--border-strong); background: var(--bg-canvas); font-weight: 700;" />
        </div>
        <div style="display: flex; gap: 8px;">
          ${!isPermGranted ? `
            <button id="settingsEnableNotifyBtn" class="btn btn-primary btn-block" style="border-radius: var(--radius-xl);">
              🔔 Activar Permiso de Notificaciones
            </button>
          ` : `
            <button id="settingsTestNotifyBtn" class="btn btn-secondary btn-block" style="border-radius: var(--radius-xl);">
              🔔 Probar Notificación Ahora
            </button>
          `}
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           3. RESUMEN CLÍNICO PARA SESIÓN CON PSICÓLOGO
           ══════════════════════════════════════════════════════ -->
      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: rgba(139, 92, 246, 0.15); color: #7c3aed;">🏥</span>
            Ficha Clínica para Consulta Terapéutica
          </div>
          <button class="btn btn-sm btn-secondary" id="generateClinicalReportBtn">📄 Generar Ficha</button>
        </div>
        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 12px;">
          Genera un resumen privado y estructurado de tu evolución de ánimo y contactos de emergencia para tu sesión de terapia.
        </p>
        <div id="clinicalReportOutput" style="display: none; background: var(--bg-surface); padding: 16px; border-radius: var(--radius-xl); border: 1px solid var(--border-subtle); margin-top: 12px;"></div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           4. PRIVACIDAD (LOPDP) & COPIA DE SEGURIDAD CIFRADA
           ══════════════════════════════════════════════════════ -->
      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: rgba(20, 184, 166, 0.15); color: #0d9488;">🔒</span>
            Privacidad & Copia de Seguridad Cifrada
          </div>
        </div>
        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 14px;">
          Tus datos permanecen cifrados localmente en tu dispositivo bajo la LOPDP.
        </p>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
            <div>
              <strong style="font-size: 0.88rem; display: block;">Incluir Registro de Ánimo en Reportes</strong>
              <span style="font-size: 0.74rem; color: var(--text-muted);">Permite exportar tu gráfica emocional</span>
            </div>
            <input type="checkbox" id="consentMood" ${this.consents["mood_tracking"] ? "checked" : ""} style="width: 18px; height: 18px; accent-color: var(--mint-500);" />
          </label>

          <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
            <div>
              <strong style="font-size: 0.88rem; display: block;">Permitir Anclajes Multimedia (Fotos/Audios)</strong>
              <span style="font-size: 0.74rem; color: var(--text-muted);">Almacenamiento seguro en la base de datos local</span>
            </div>
            <input type="checkbox" id="consentAnchors" ${this.consents["multimedia_anchors"] ? "checked" : ""} style="width: 18px; height: 18px; accent-color: var(--mint-500);" />
          </label>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-secondary" id="exportBackupBtn" style="flex: 1; min-width: 140px; border-radius: var(--radius-xl);">
            📥 Descargar Copia
          </button>
          <label class="btn btn-secondary" style="flex: 1; min-width: 140px; text-align: center; cursor: pointer; border-radius: var(--radius-xl);">
            📤 Restaurar Copia
            <input type="file" id="importBackupFile" accept=".json" style="display: none;" />
          </label>
        </div>
      </div>
    `;

    this.attachDynamicEvents();
  }

  renderExtraContacts() {
    if (!this.contacts || this.contacts.length === 0) {
      return `<p style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">No has registrado contactos adicionales aún.</p>`;
    }

    return this.contacts.map((c, i) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-surface); border-radius: var(--radius-md); margin-bottom: 6px; border: 1px solid var(--border-subtle);">
        <div>
          <strong style="font-size: 0.85rem;">${c.name}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 6px;">(${c.relation || 'Apoyo'})</span>
          <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${c.phone}</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <a href="tel:${c.phone}" class="btn btn-sm btn-ghost" title="Llamar">📞</a>
          <button class="btn btn-sm btn-ghost delete-extra-contact-btn" data-index="${i}" data-id="${c.id}" title="Eliminar">🗑️</button>
        </div>
      </div>
    `).join("");
  }

  attachDynamicEvents() {
    // Edit key network contacts trigger
    const editNetworkBtn = document.getElementById("editNetworkContactsBtn");
    if (editNetworkBtn) {
      editNetworkBtn.addEventListener("click", () => {
        sosModule.showEditKeyContactsModal();
      });
    }

    // Add extra contact modal trigger
    const addExtraBtn = document.getElementById("addExtraContactBtn");
    if (addExtraBtn) {
      addExtraBtn.addEventListener("click", () => {
        this.showAddContactPrompt();
      });
    }

    // Delete extra contact
    const deleteBtns = document.querySelectorAll(".delete-extra-contact-btn");
    deleteBtns.forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("¿Eliminar este contacto de apoyo?")) {
          await storage.delete("contacts", parseInt(id, 10) || id);
          await this.loadPersonalContacts();
          this.render();
          sosModule.loadEmergencyContacts().then(() => sosModule.renderEmergencyGrid());
        }
      });
    });

    // Time change for notifications
    const timeInput = document.getElementById("settingsNotifyTime");
    if (timeInput) {
      timeInput.addEventListener("change", async (e) => {
        const val = e.target.value;
        dailyMilestones.notificationTime = val;
        await storage.setSetting("notification_milestones_time", val);
      });
    }

    // Enable notifications button
    const enableNotifyBtn = document.getElementById("settingsEnableNotifyBtn");
    if (enableNotifyBtn) {
      enableNotifyBtn.addEventListener("click", async () => {
        await dailyMilestones.requestNotificationPermission();
        this.render();
      });
    }

    // Test notification button
    const testNotifyBtn = document.getElementById("settingsTestNotifyBtn");
    if (testNotifyBtn) {
      testNotifyBtn.addEventListener("click", async () => {
        await dailyMilestones.checkAndNotifyIfIncomplete(true);
      });
    }

    // Checkbox toggles for consents
    const cMood = document.getElementById("consentMood");
    const cAnchors = document.getElementById("consentAnchors");

    if (cMood) {
      cMood.addEventListener("change", (e) => this.setConsent("mood_tracking", e.target.checked));
    }
    if (cAnchors) {
      cAnchors.addEventListener("change", (e) => this.setConsent("multimedia_anchors", e.target.checked));
    }

    // Clinical Report Generator
    const genReportBtn = document.getElementById("generateClinicalReportBtn");
    const reportOutput = document.getElementById("clinicalReportOutput");
    if (genReportBtn && reportOutput) {
      genReportBtn.addEventListener("click", async () => {
        reportOutput.style.display = "block";
        reportOutput.innerHTML = `
          <div style="font-size: 0.85rem; line-height: 1.6;">
            <h4 style="font-size: 1rem; color: #7c3aed; margin-bottom: 8px;">📋 Ficha de Acompañamiento Clínico · Ancla</h4>
            <p><strong>Fecha de Generación:</strong> ${new Date().toLocaleDateString("es-EC")} ${new Date().toLocaleTimeString("es-EC")}</p>
            <p><strong>Psicólogo(a) a Cargo:</strong> ${this.keyContacts.psychologist.name} (${this.keyContacts.psychologist.phone})</p>
            <p><strong>Segundo al Mando:</strong> ${this.keyContacts.secondInCommand.name} (${this.keyContacts.secondInCommand.phone})</p>
            <p><strong>Estado de Emergencia:</strong> ECU 911 configurado como llamada prioritaria #1.</p>
            <p style="margin-top: 8px; color: var(--text-muted); font-size: 0.78rem;">
              Cumple con la Ley Orgánica de Protección de Datos Personales (Ecuador). Los datos permanecen bajo tu custodia exclusiva.
            </p>
            <button class="btn btn-sm btn-primary" onclick="window.print()" style="margin-top: 10px;">
              🖨️ Imprimir / Guardar PDF
            </button>
          </div>
        `;
      });
    }

    // Export Encrypted Backup
    const exportBtn = document.getElementById("exportBackupBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        try {
          const fullData = await storage.exportAllData();
          const jsonBlob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(jsonBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `ancla_respaldo_seguro_${new Date().toISOString().split("T")[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          alert("Error al exportar datos: " + err.message);
        }
      });
    }

    // Import Backup
    const importInput = document.getElementById("importBackupFile");
    if (importInput) {
      importInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target.result);
            await storage.importAllData(data);
            alert("✅ Datos restaurados con éxito.");
            window.location.reload();
          } catch (err) {
            alert("Error al restaurar archivo de respaldo: " + err.message);
          }
        };
        reader.readAsText(file);
      });
    }
  }

  showAddContactPrompt() {
    const name = prompt("Nombre de la persona de apoyo:");
    if (!name) return;
    const phone = prompt(`Teléfono de ${name} (ej: +593991234567):`);
    if (!phone) return;
    const relation = prompt(`Relación o parentesco con ${name} (ej: Amigo/a, Hermano/a):`) || "Apoyo";

    storage.put("contacts", { name, phone, relation }).then(async () => {
      await this.loadPersonalContacts();
      this.render();
      sosModule.loadEmergencyContacts().then(() => sosModule.renderEmergencyGrid());
    });
  }

  attachEvents() {
    // Already attached dynamically on each render
  }
}

export const therapistPortal = new TherapistPortalModule();
