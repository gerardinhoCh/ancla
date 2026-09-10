/* ==========================================================================
   ANCLA - Crisis Mode Module (Low Cognitive Load & High Contrast Protocol)
   ========================================================================== */

import { storage } from "../db/storage.js";
import { soundEngine } from "../audio/sound-engine.js";

export class CrisisModeModule {
  constructor() {
    this.overlayEl = null;
    this.currentStep = 0;
    this.plan = null;
    this.steps = [];
  }

  async init() {
    this.overlayEl = document.getElementById("crisisModeOverlay");
    await this.loadPlanData();
    this.setupSteps();
    this.attachEvents();
  }

  async loadPlanData() {
    this.plan = await storage.get("safety_plan", "primary");
  }

  setupSteps() {
    if (!this.plan) return;

    this.steps = [
      {
        title: "Paso 1: Respira y recuerda",
        headline: "Esta crisis es una ola temporal. Estás a salvo aquí y ahora.",
        items: [
          "Inhala profundo... exhala despacio.",
          "El dolor que sientes es real, pero este estado no durará para siempre.",
          "Tu único objetivo en los próximos 10 minutos es mantenerte a salvo."
        ],
        actionBtn: "Hacer respiración guiada",
        actionFn: () => {
          this.deactivate();
          const calmTab = document.querySelector('[data-tab="tab-calm"]');
          if (calmTab) calmTab.click();
        }
      },
      {
        title: "Paso 2: Estrategias que puedes hacer a solas",
        headline: "Cosas que calman tu cuerpo y mente sin necesidad de nadie más:",
        items: this.plan.step2_internal_coping || [
          "Lávate la cara con agua bien fría",
          "Pon tu música de anclaje",
          "Haz 10 respiraciones lentas apoyando los pies descalzos en el piso"
        ]
      },
      {
        title: "Paso 3: Distracción con personas o lugares",
        headline: "Cambia de escenario para bajar la intensidad mental:",
        items: this.plan.step3_distractions || [
          "Sal a caminar a un lugar público iluminado",
          "Ve a una tienda o cafetería concurrida",
          "Llama a alguien solo para hablar de cualquier tema cotidiano"
        ]
      },
      {
        title: "Paso 4: Contactar a tu red de apoyo",
        headline: "Pide ayuda a alguien que te quiere y te respeta:",
        items: (this.plan.step4_support_people || []).map(p => `${p.name} - ${p.phone || "Sin teléfono"}`)
      },
      {
        title: "Paso 5: Profesionales de emergencia",
        headline: "Atención especializada inmediata disponible 24/7:",
        items: [
          "Línea 171 - Opción 6 (Salud Mental MSP Ecuador - Gratuito)",
          "ECU 911 (Ambulancia y Emergencia Vital)",
          "Tu terapeuta o médico tratante"
        ]
      },
      {
        title: "Paso 6: Entorno seguro",
        headline: "Protege tu espacio físico de cualquier peligro:",
        items: this.plan.step6_safe_environment || [
          "Aléjate de objetos peligrosos o dáselos a alguien de confianza",
          "Si estás cerca de una ventana o balcón alto, siéntate en el centro de la habitación",
          "Quédate con alguien o mantén una llamada abierta"
        ]
      }
    ];
  }

  activate() {
    if (!this.overlayEl) return;
    this.currentStep = 0;
    this.overlayEl.classList.add("active");
    this.renderCurrentStep();
    soundEngine.vibrate([100, 50, 100]);
  }

  deactivate() {
    if (!this.overlayEl) return;
    this.overlayEl.classList.remove("active");
  }

  renderCurrentStep() {
    const stepData = this.steps[this.currentStep];
    if (!stepData) return;

    const stepIndicator = document.getElementById("crisisStepIndicator");
    const headline = document.getElementById("crisisHeadline");
    const list = document.getElementById("crisisItemsList");
    const prevBtn = document.getElementById("crisisPrevBtn");
    const nextBtn = document.getElementById("crisisNextBtn");

    if (stepIndicator) stepIndicator.textContent = `Paso ${this.currentStep + 1} de ${this.steps.length}`;
    if (headline) headline.textContent = stepData.headline;

    if (list) {
      list.innerHTML = stepData.items.map((item, idx) => `
        <li class="crisis-item">
          <span class="crisis-item-num">${idx + 1}</span>
          <span>${item}</span>
        </li>
      `).join("");
    }

    if (prevBtn) {
      prevBtn.style.visibility = this.currentStep === 0 ? "hidden" : "visible";
    }

    if (nextBtn) {
      if (this.currentStep === this.steps.length - 1) {
        nextBtn.textContent = "Volver al inicio del plan";
      } else {
        nextBtn.textContent = "Siguiente paso ➡️";
      }
    }
  }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    } else {
      this.currentStep = 0;
    }
    this.renderCurrentStep();
  }

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderCurrentStep();
    }
  }

  attachEvents() {
    window.addEventListener("launch-crisis-mode", () => this.activate());

    const exitBtn = document.getElementById("exitCrisisModeBtn");
    if (exitBtn) {
      exitBtn.addEventListener("click", () => this.deactivate());
    }

    const nextBtn = document.getElementById("crisisNextBtn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.next());
    }

    const prevBtn = document.getElementById("crisisPrevBtn");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.prev());
    }
  }
}

export const crisisMode = new CrisisModeModule();
