/* ==========================================================================
   ANCLA - Safety Plan Module (Stanley-Brown 6-Step Clinical Protocol)
   ========================================================================== */

import { storage } from "../db/storage.js";
import { cryptoEngine } from "../crypto/encryption.js";
import { dailyMilestones } from "./daily-milestones.js";

export class SafetyPlanModule {
  constructor() {
    this.plan = null;
    this.containerEl = null;
  }

  async init() {
    this.containerEl = document.getElementById("safetyPlanContainer");
    await this.loadPlan();
    this.render();
    this.attachEvents();
    // Mark daily milestone for reviewing safety plan
    await dailyMilestones.markMilestone("safety");
  }

  async loadPlan() {
    this.plan = await storage.get("safety_plan", "primary");
    if (!this.plan) {
      await storage.seedInitialDataIfNeeded();
      this.plan = await storage.get("safety_plan", "primary");
    }
  }

  async savePlan() {
    this.plan.updatedAt = new Date().toISOString();
    await storage.put("safety_plan", this.plan);
    this.render();
    await dailyMilestones.markMilestone("safety");
  }

  render() {
    if (!this.containerEl || !this.plan) return;

    this.containerEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <div>
          <h2>Plan de Seguridad Personal</h2>
          <p style="font-size: 0.82rem; color: var(--text-muted);">Basado en el protocolo clínico validado Stanley-Brown</p>
        </div>
        <button class="btn btn-sm btn-secondary" id="printSafetyPlanBtn">
          🖨️ Imprimir / PDF
        </button>
      </div>

      <!-- Paso 1 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: #fecdd3; color: #be123c;">1</span>
            Señales de advertencia
          </div>
          <button class="btn btn-sm btn-ghost add-item-btn" data-step="step1_warning_signs">➕ Añadir</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
          Pensamientos, imágenes, sensaciones corporales o conductas que indican que una crisis está comenzando.
        </p>
        <div class="plan-step-items" id="step1_items">
          ${this.renderItemList("step1_warning_signs", this.plan.step1_warning_signs)}
        </div>
      </div>

      <!-- Paso 2 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: #a7f3d0; color: #065f46;">2</span>
            Estrategias de afrontamiento individuales
          </div>
          <button class="btn btn-sm btn-ghost add-item-btn" data-step="step2_internal_coping">➕ Añadir</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
          Actividades que puedo hacer por mi cuenta para calmarme o distraer mi mente sin contactar a nadie.
        </p>
        <div class="plan-step-items" id="step2_items">
          ${this.renderItemList("step2_internal_coping", this.plan.step2_internal_coping)}
        </div>
      </div>

      <!-- Paso 3 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: #bae6fd; color: #0369a1;">3</span>
            Personas y lugares de distracción
          </div>
          <button class="btn btn-sm btn-ghost add-item-btn" data-step="step3_distractions">➕ Añadir</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
          Lugares o personas con las que puedo estar para despejar la mente sin tener que hablar de la crisis.
        </p>
        <div class="plan-step-items" id="step3_items">
          ${this.renderItemList("step3_distractions", this.plan.step3_distractions)}
        </div>
      </div>

      <!-- Paso 4 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: #e9d5ff; color: #7c3aed;">4</span>
            Red de apoyo a quien pedir ayuda directa
          </div>
          <button class="btn btn-sm btn-ghost add-person-btn" data-step="step4_support_people">➕ Añadir</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
          Personas de confianza con las que puedo hablar con sinceridad sobre lo que estoy sintiendo.
        </p>
        <div class="plan-step-items" id="step4_items">
          ${this.renderPeopleList("step4_support_people", this.plan.step4_support_people)}
        </div>
      </div>

      <!-- Paso 5 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: #fef3c7; color: #b45309;">5</span>
            Profesionales y servicios de emergencia
          </div>
          <button class="btn btn-sm btn-ghost add-person-btn" data-step="step5_professionals">➕ Añadir</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
          Médicos, psicólogos, psiquiatras o líneas oficiales de atención en crisis 24/7.
        </p>
        <div class="plan-step-items" id="step5_items">
          ${this.renderPeopleList("step5_professionals", this.plan.step5_professionals)}
        </div>
      </div>

      <!-- Paso 6 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon" style="background: #bbf7d0; color: #15803d;">6</span>
            Cómo hacer que el entorno sea seguro
          </div>
          <button class="btn btn-sm btn-ghost add-item-btn" data-step="step6_safe_environment">➕ Añadir</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
          Medidas concretas para limitar o eliminar el acceso a medios letales o situaciones de riesgo.
        </p>
        <div class="plan-step-items" id="step6_items">
          ${this.renderItemList("step6_safe_environment", this.plan.step6_safe_environment)}
        </div>
      </div>
    `;

    this.attachDynamicItemEvents();
  }

  renderItemList(stepKey, items) {
    if (!items || items.length === 0) {
      return `<p style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">Sin elementos agregados.</p>`;
    }

    return items.map((text, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-canvas); border-radius: var(--radius-lg); margin-bottom: 6px; border: 1.5px solid var(--border-soft);">
        <span style="font-size: 0.9rem; color: var(--text-primary);">• ${text}</span>
        <button class="btn btn-sm btn-ghost remove-item-btn" data-step="${stepKey}" data-idx="${idx}" title="Eliminar" style="color: var(--text-muted); padding: 4px;">
          ✕
        </button>
      </div>
    `).join("");
  }

  renderPeopleList(stepKey, people) {
    if (!people || people.length === 0) {
      return `<p style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">Sin contactos registrados.</p>`;
    }

    return people.map((p, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-canvas); border-radius: var(--radius-lg); margin-bottom: 6px; border: 1.5px solid var(--border-soft);">
        <div>
          <strong style="font-size: 0.92rem; color: var(--text-primary); display: block;">${p.name}</strong>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${p.relation || p.role || ""} ${p.phone ? `• ${p.phone}` : ""}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          ${p.phone ? `<a href="tel:${p.phone}" class="btn btn-sm btn-secondary" style="padding: 4px 8px;">📞</a>` : ""}
          <button class="btn btn-sm btn-ghost remove-item-btn" data-step="${stepKey}" data-idx="${idx}" title="Eliminar" style="color: var(--text-muted); padding: 4px;">
            ✕
          </button>
        </div>
      </div>
    `).join("");
  }

  attachDynamicItemEvents() {
    // Add text item
    const addButtons = this.containerEl.querySelectorAll(".add-item-btn");
    addButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const step = btn.getAttribute("data-step");
        const val = prompt("Ingresa un nuevo elemento para este paso:");
        if (val && val.trim()) {
          if (!this.plan[step]) this.plan[step] = [];
          this.plan[step].push(val.trim());
          this.savePlan();
        }
      });
    });

    // Add person/contact item
    const addPersonBtns = this.containerEl.querySelectorAll(".add-person-btn");
    addPersonBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const step = btn.getAttribute("data-step");
        const name = prompt("Nombre de la persona o entidad:");
        if (!name || !name.trim()) return;
        const phone = prompt("Número de teléfono (opcional para llamada directa):") || "";
        const relation = prompt("Relación o rol (ej. Amigo, Madre, Terapeuta):") || "";

        if (!this.plan[step]) this.plan[step] = [];
        this.plan[step].push({ name: name.trim(), phone: phone.trim(), relation: relation.trim() });
        this.savePlan();
      });
    });

    // Remove item
    const removeButtons = this.containerEl.querySelectorAll(".remove-item-btn");
    removeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const step = btn.getAttribute("data-step");
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        if (confirm("¿Deseas eliminar este elemento de tu plan?")) {
          this.plan[step].splice(idx, 1);
          this.savePlan();
        }
      });
    });
  }

  attachEvents() {
    const printBtn = document.getElementById("printSafetyPlanBtn");
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }
  }
}

export const safetyPlan = new SafetyPlanModule();
