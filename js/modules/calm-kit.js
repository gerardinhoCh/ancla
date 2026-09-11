/* ==========================================================================
   ANCLA - Calm Kit & Grounding Exercises Module
   ========================================================================== */

import { CONFIG } from "../config.js";
import { soundEngine } from "../audio/sound-engine.js";
import { dailyMilestones } from "./daily-milestones.js";

export class CalmKitModule {
  constructor() {
    this.currentTechnique = "box";
    this.isBreathingRunning = false;
    this.breathingTimer = null;
    this.currentPhaseIndex = 0;
    this.secondsLeft = 0;

    // Grounding 5-4-3-2-1 state
    this.groundingStepIndex = 0;

    // Coping Cards state
    this.cards = [...CONFIG.DEFAULT_COPING_CARDS];
    this.currentCardIndex = 0;
  }

  async init() {
    this.renderBreathingInterface();
    this.renderGroundingStep();
    this.renderCopingCard();
    this.attachEvents();
  }

  /* ------------------------------------------------------------------------
     1. Breathing Exercise Engine
     ------------------------------------------------------------------------ */
  renderBreathingInterface() {
    const tech = CONFIG.BREATHING_TECHNIQUES[this.currentTechnique];
    const descEl = document.getElementById("breathingDesc");
    if (descEl) descEl.textContent = tech.description;

    const actionLabel = document.getElementById("breathingActionLabel");
    const timerCount = document.getElementById("breathingTimerCount");
    const orb = document.getElementById("breathingOrb");

    if (actionLabel) actionLabel.textContent = "Listo";
    if (timerCount) timerCount.textContent = tech.cycle[0].duration;
    if (orb) {
      orb.className = "breathing-orb";
    }
  }

  startBreathing() {
    if (this.isBreathingRunning) return;
    this.isBreathingRunning = true;
    this.currentPhaseIndex = 0;

    // Mark daily milestone for calm exercise
    dailyMilestones.markMilestone("calm");

    const startBtn = document.getElementById("startBreathingBtn");
    if (startBtn) {
      startBtn.textContent = "⏸️ Pausar";
      startBtn.classList.remove("btn-primary");
      startBtn.classList.add("btn-secondary");
    }

    this.runPhase();
  }

  pauseBreathing() {
    this.isBreathingRunning = false;
    clearTimeout(this.breathingTimer);

    const startBtn = document.getElementById("startBreathingBtn");
    if (startBtn) {
      startBtn.textContent = "▶️ Reanudar";
      startBtn.classList.remove("btn-secondary");
      startBtn.classList.add("btn-primary");
    }
  }

  runPhase() {
    if (!this.isBreathingRunning) return;

    const tech = CONFIG.BREATHING_TECHNIQUES[this.currentTechnique];
    const phase = tech.cycle[this.currentPhaseIndex];
    this.secondsLeft = phase.duration;

    const actionLabel = document.getElementById("breathingActionLabel");
    const timerCount = document.getElementById("breathingTimerCount");
    const orb = document.getElementById("breathingOrb");

    if (actionLabel) actionLabel.textContent = phase.action;
    if (timerCount) timerCount.textContent = this.secondsLeft;

    if (orb) {
      orb.className = `breathing-orb ${phase.type}`;
    }

    // Audio chime on phase change
    if (phase.type === "inhale") {
      soundEngine.playTransitionBell(528);
    } else if (phase.type === "exhale") {
      soundEngine.playTransitionBell(432);
    } else {
      soundEngine.playTransitionBell(396);
    }

    this.tickCountdown();
  }

  tickCountdown() {
    this.breathingTimer = setTimeout(() => {
      if (!this.isBreathingRunning) return;

      this.secondsLeft--;
      const timerCount = document.getElementById("breathingTimerCount");
      if (timerCount) timerCount.textContent = this.secondsLeft;

      if (this.secondsLeft > 0) {
        this.tickCountdown();
      } else {
        const tech = CONFIG.BREATHING_TECHNIQUES[this.currentTechnique];
        this.currentPhaseIndex = (this.currentPhaseIndex + 1) % tech.cycle.length;
        this.runPhase();
      }
    }, 1000);
  }

  /* ------------------------------------------------------------------------
     2. 5-4-3-2-1 Sensory Grounding Tool
     ------------------------------------------------------------------------ */
  renderGroundingStep() {
    const stepData = CONFIG.GROUNDING_STEPS[this.groundingStepIndex];
    if (!stepData) return;

    const iconEl = document.getElementById("groundingIcon");
    const titleEl = document.getElementById("groundingTitle");
    const descEl = document.getElementById("groundingDesc");
    const tagsContainer = document.getElementById("groundingTags");
    const nodes = document.querySelectorAll(".grounding-step-node");

    if (iconEl) iconEl.textContent = stepData.icon;
    if (titleEl) titleEl.textContent = `${stepData.step} cosas que puedes percibir con la ${stepData.sense}`;
    if (descEl) descEl.textContent = stepData.prompt;

    nodes.forEach((node, idx) => {
      node.classList.remove("active", "completed");
      if (idx === this.groundingStepIndex) {
        node.classList.add("active");
      } else if (idx < this.groundingStepIndex) {
        node.classList.add("completed");
      }
    });

    if (tagsContainer) {
      tagsContainer.innerHTML = stepData.defaultTags.map(tag => `
        <button class="grounding-tag-btn">${tag}</button>
      `).join("");

      tagsContainer.querySelectorAll(".grounding-tag-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          btn.classList.toggle("checked");
          soundEngine.vibrate(40);
        });
      });
    }

    const prevBtn = document.getElementById("groundingPrevBtn");
    if (prevBtn) {
      prevBtn.style.visibility = this.groundingStepIndex === 0 ? "hidden" : "visible";
    }

    const nextBtn = document.getElementById("groundingNextBtn");
    if (nextBtn) {
      if (this.groundingStepIndex === CONFIG.GROUNDING_STEPS.length - 1) {
        nextBtn.textContent = "Finalizar Anclaje ✨";
      } else {
        nextBtn.textContent = "Siguiente sentido ➡️";
      }
    }
  }

  nextGrounding() {
    if (this.groundingStepIndex < CONFIG.GROUNDING_STEPS.length - 1) {
      this.groundingStepIndex++;
      this.renderGroundingStep();
      soundEngine.vibrate(60);
    } else {
      this.groundingStepIndex = 0;
      this.renderGroundingStep();
      alert("¡Has completado el anclaje 5-4-3-2-1! Observa cómo se siente tu cuerpo en este momento presente.");
    }
  }

  prevGrounding() {
    if (this.groundingStepIndex > 0) {
      this.groundingStepIndex--;
      this.renderGroundingStep();
    }
  }

  speakCurrentGrounding() {
    const stepData = CONFIG.GROUNDING_STEPS[this.groundingStepIndex];
    if (stepData) {
      soundEngine.speak(`${stepData.instruction}. ${stepData.prompt}`);
    }
  }

  /* ------------------------------------------------------------------------
     3. Coping Cards Deck
     ------------------------------------------------------------------------ */
  renderCopingCard() {
    const card = this.cards[this.currentCardIndex];
    if (!card) return;

    const frontEl = document.getElementById("cardFrontText");
    const backEl = document.getElementById("cardBackText");
    const indicatorEl = document.getElementById("copingCardCounter");
    const cardEl = document.getElementById("activeCopingCard");

    if (frontEl) frontEl.textContent = card.front;
    if (backEl) backEl.textContent = card.back;
    if (indicatorEl) indicatorEl.textContent = `${this.currentCardIndex + 1} de ${this.cards.length}`;

    if (cardEl) cardEl.classList.remove("is-flipped");
  }

  nextCard() {
    this.currentCardIndex = (this.currentCardIndex + 1) % this.cards.length;
    this.renderCopingCard();
  }

  prevCard() {
    this.currentCardIndex = (this.currentCardIndex - 1 + this.cards.length) % this.cards.length;
    this.renderCopingCard();
  }

  attachEvents() {
    // Breathing Start / Pause
    const startBreathingBtn = document.getElementById("startBreathingBtn");
    if (startBreathingBtn) {
      startBreathingBtn.addEventListener("click", () => {
        if (this.isBreathingRunning) {
          this.pauseBreathing();
        } else {
          this.startBreathing();
        }
      });
    }

    // Technique Selector Tabs
    const techTabs = document.querySelectorAll(".technique-tab");
    techTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        techTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        this.pauseBreathing();
        this.currentTechnique = tab.getAttribute("data-tech");
        this.renderBreathingInterface();
      });
    });

    // Grounding Navigation
    const nextGroundingBtn = document.getElementById("groundingNextBtn");
    const prevGroundingBtn = document.getElementById("groundingPrevBtn");
    const speakGroundingBtn = document.getElementById("groundingSpeakBtn");

    if (nextGroundingBtn) nextGroundingBtn.addEventListener("click", () => this.nextGrounding());
    if (prevGroundingBtn) prevGroundingBtn.addEventListener("click", () => this.prevGrounding());
    if (speakGroundingBtn) speakGroundingBtn.addEventListener("click", () => this.speakCurrentGrounding());

    // Coping Card flip & pagination
    const activeCard = document.getElementById("activeCopingCard");
    if (activeCard) {
      activeCard.addEventListener("click", () => {
        activeCard.classList.toggle("is-flipped");
        soundEngine.vibrate(30);
      });
    }

    const nextCardBtn = document.getElementById("nextCardBtn");
    const prevCardBtn = document.getElementById("prevCardBtn");

    if (nextCardBtn) nextCardBtn.addEventListener("click", () => this.nextCard());
    if (prevCardBtn) prevCardBtn.addEventListener("click", () => this.prevCard());

    // Ambient Sound Generator Toggle
    const soundToggleTheta = document.getElementById("toggleSoundTheta");
    const soundToggle432 = document.getElementById("toggleSound432");

    if (soundToggleTheta) {
      soundToggleTheta.addEventListener("click", () => {
        if (soundEngine.isPlayingAmbient) {
          soundEngine.stopAmbient();
          soundToggleTheta.textContent = "▶️ Ondas Theta (6 Hz)";
        } else {
          soundEngine.startAmbientTone("theta");
          soundToggleTheta.textContent = "⏹️ Detener Sonido";
        }
      });
    }

    if (soundToggle432) {
      soundToggle432.addEventListener("click", () => {
        if (soundEngine.isPlayingAmbient) {
          soundEngine.stopAmbient();
          soundToggle432.textContent = "▶️ Frecuencia 432 Hz";
        } else {
          soundEngine.startAmbientTone("432hz");
          soundToggle432.textContent = "⏹️ Detener Sonido";
        }
      });
    }
  }
}

export const calmKit = new CalmKitModule();
