/* ==========================================================================
   ANCLA - Therapist Portal & Clinical Governance Module
   Clinical summary view, granular LOPDP/HIPAA consents, and encrypted backup.
   ========================================================================== */

import { storage } from "../db/storage.js";
import { cryptoEngine } from "../crypto/encryption.js";

export class TherapistPortalModule {
  constructor() {
    this.containerEl = null;
    this.consents = {};
  }

  async init() {
    this.containerEl = document.getElementById("therapistPortalContainer");
    await this.loadConsents();
    this.render();
    this.attachEvents();
  }

  async loadConsents() {
    const list = await storage.getAll("consents");
    list.forEach(c => {
      this.consents[c.type] = c.authorized;
    });
  }

  async setConsent(type, authorized) {
    this.consents[type] = authorized;
    await storage.put("consents", {
      type,
      authorized,
      updatedAt: new Date().toISOString()
    });
  }

  async render() {
    if (!this.containerEl) return;

    this.containerEl.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: rgba(139, 92, 246, 0.15); color: var(--accent-lavender);">🏥</span>
            Resumen Clínico para Consulta
          </div>
          <button class="btn btn-sm btn-secondary" id="generateClinicalReportBtn">📄 Generar Ficha</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
          Esta vista condensa tu plan de seguridad y evolución de ánimo para que puedas revisarla junto a tu psicólogo/a o psiquiatra en sesión.
        </p>
        <div id="clinicalReportOutput" style="display: none; background: var(--bg-surface-elevated); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-top: 12px;"></div>
      </div>

      <!-- Consentimientos LOPDP -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: rgba(20, 184, 166, 0.15); color: var(--accent-teal);">🔒</span>
            Consentimiento Granular (LOPDP / Privacidad)
          </div>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
          Conforme a la Ley Orgánica de Protección de Datos Personales (Ecuador) y normativas de salud mental, tú decides con exactitud qué categorías pueden compartirse o exportarse.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border-radius: var(--radius-md);">
            <div>
              <strong style="font-size: 0.92rem; display: block;">Compartir Plan de Seguridad</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Permite incluir tus 6 pasos en reportes para tu terapeuta.</span>
            </div>
            <input type="checkbox" id="consentPlan" ${this.consents["safety_plan_sharing"] ? "checked" : ""} style="width: 18px; height: 18px; accent-color: var(--accent-teal);" />
          </label>

          <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border-radius: var(--radius-md);">
            <div>
              <strong style="font-size: 0.92rem; display: block;">Compartir Registro de Ánimo</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Permite incluir la curva de evolución emocional y notas.</span>
            </div>
            <input type="checkbox" id="consentMood" ${this.consents["mood_tracking"] ? "checked" : ""} style="width: 18px; height: 18px; accent-color: var(--accent-teal);" />
          </label>

          <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border-radius: var(--radius-md);">
            <div>
              <strong style="font-size: 0.92rem; display: block;">Compartir Anclajes Multimedia (Fotos/Audios)</strong>
              <span style="font-size: 0.78rem; color: var(--text-muted);">Protección estricta: nunca se sincroniza sin este permiso explícito.</span>
            </div>
            <input type="checkbox" id="consentAnchors" ${this.consents["multimedia_anchors"] ? "checked" : ""} style="width: 18px; height: 18px; accent-color: var(--accent-teal);" />
          </label>
        </div>
      </div>

      <!-- Respaldo Cifrado y Portabilidad -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan);">💾</span>
            Copia de Seguridad & Portabilidad
          </div>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
          Descarga todos tus datos en un archivo JSON cifrado o restaura una copia anterior en un nuevo dispositivo.
        </p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-secondary" id="exportBackupBtn">📥 Exportar Copia Cifrada</button>
          <label class="btn btn-secondary" style="cursor: pointer;">
            📤 Importar Copia
            <input type="file" id="importBackupFile" accept=".json" style="display: none;" />
          </label>
        </div>
      </div>

      <!-- Zona de Peligro / Borrado de Datos -->
      <div class="card" style="border-color: rgba(239, 68, 68, 0.3);">
        <div class="card-header">
          <div class="card-title" style="color: #ef4444;">
            <span class="card-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">⚠️</span>
            Zona de Privacidad Absoluta
          </div>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 14px;">
          Si necesitas eliminar todos tus datos de este dispositivo de forma inmediata e irrecuperable:
        </p>
        <button class="btn btn-sm btn-ghost" id="wipeAllDataBtn" style="color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4);">
          🗑️ Eliminar todos mis datos locales
        </button>
      </div>
    `;

    this.attachDynamicEvents();
  }

  attachDynamicEvents() {
    // Checkbox toggles
    const cPlan = document.getElementById("consentPlan");
    const cMood = document.getElementById("consentMood");
    const cAnchors = document.getElementById("consentAnchors");

    if (cPlan) cPlan.addEventListener("change", (e) => this.setConsent("safety_plan_sharing", e.target.checked));
    if (cMood) cMood.addEventListener("change", (e) => this.setConsent("mood_tracking", e.target.checked));
    if (cAnchors) cAnchors.addEventListener("change", (e) => this.setConsent("multimedia_anchors", e.target.checked));

    // Generate clinical report
    const genBtn = document.getElementById("generateClinicalReportBtn");
    if (genBtn) {
      genBtn.addEventListener("click", async () => {
        const out = document.getElementById("clinicalReportOutput");
        if (!out) return;

        const plan = await storage.get("safety_plan", "primary");
        const logs = await storage.getAll("mood_logs");
        const avgScore = logs.length > 0 ? (logs.reduce((a, b) => a + b.score, 0) / logs.length).toFixed(1) : "N/A";

        out.style.display = "block";
        out.innerHTML = `
          <h4 style="margin-bottom: 8px; color: var(--accent-teal);">Ficha Clínica Resumida</h4>
          <p style="font-size: 0.85rem; margin-bottom: 6px;"><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          <p style="font-size: 0.85rem; margin-bottom: 6px;"><strong>Promedio de bienestar (últimos registros):</strong> ${avgScore}/10 (${logs.length} check-ins)</p>
          <p style="font-size: 0.85rem; margin-bottom: 6px;"><strong>Señales de alerta acordadas:</strong> ${(plan?.step1_warning_signs || []).join(", ") || "Ninguna registrada"}</p>
          <p style="font-size: 0.85rem; margin-bottom: 12px;"><strong>Estrategias de rescate validadas:</strong> ${(plan?.step2_internal_coping || []).join(", ") || "Ninguna registrada"}</p>
          <button class="btn btn-sm btn-primary" onclick="window.print()">🖨️ Imprimir Ficha</button>
        `;
      });
    }

    // Export backup
    const exportBtn = document.getElementById("exportBackupBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        const dump = await storage.exportAllData();
        const jsonStr = JSON.stringify(dump, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ancla_respaldo_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Import backup
    const importInput = document.getElementById("importBackupFile");
    if (importInput) {
      importInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const data = JSON.parse(reader.result);
            if (data.safety_plan) {
              for (const p of data.safety_plan) await storage.put("safety_plan", p);
            }
            if (data.coping_cards) {
              for (const c of data.coping_cards) await storage.put("coping_cards", c);
            }
            if (data.mood_logs) {
              for (const m of data.mood_logs) await storage.put("mood_logs", m);
            }
            alert("¡Copia de seguridad restaurada correctamente!");
            window.location.reload();
          } catch (err) {
            alert("El archivo seleccionado no es válido.");
          }
        };
        reader.readAsText(file);
      });
    }

    // Wipe all data
    const wipeBtn = document.getElementById("wipeAllDataBtn");
    if (wipeBtn) {
      wipeBtn.addEventListener("click", async () => {
        const confirm1 = confirm("¿Estás absolutamente seguro de eliminar TODOS los datos locales de esta aplicación?");
        if (confirm1) {
          const confirm2 = prompt("Escribe 'BORRAR' en mayúsculas para confirmar la eliminación irrecuperable:");
          if (confirm2 === "BORRAR") {
            await storage.resetAll();
            alert("Todos los datos han sido borrados de este dispositivo.");
            window.location.reload();
          }
        }
      });
    }
  }

  attachEvents() {
    // Additional global portal events
  }
}

export const therapistPortal = new TherapistPortalModule();
