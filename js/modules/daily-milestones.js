/* ==========================================================================
   ANCLA - Daily Milestones & Preventive Notifications Module
   Tracks daily emotional wellness milestones and delivers gentle notifications
   when milestones have not been completed.
   ========================================================================== */

import { storage } from "../db/storage.js";
import { soundEngine } from "../audio/sound-engine.js";

export class DailyMilestonesModule {
  constructor() {
    this.milestones = {
      mood: false,
      calm: false,
      safety: false
    };
    this.notificationTime = "20:00"; // Default 8:00 PM
    this.notificationsEnabled = false;
    this.timerCheckInterval = null;
  }

  async init() {
    await this.loadSettings();
    await this.loadTodayMilestones();
    this.renderHomeMilestonesCard();
    this.setupScheduler();
  }

  getTodayKey() {
    const d = new Date();
    return `milestones_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async loadSettings() {
    const savedTime = await storage.getSetting("notification_milestones_time", "20:00");
    const savedEnabled = await storage.getSetting("notification_milestones_enabled", false);
    this.notificationTime = savedTime;
    this.notificationsEnabled = savedEnabled && ("Notification" in window && Notification.permission === "granted");
  }

  async loadTodayMilestones() {
    const key = this.getTodayKey();
    const data = await storage.get("settings", key);
    if (data && data.value) {
      this.milestones = {
        mood: !!data.value.mood,
        calm: !!data.value.calm,
        safety: !!data.value.safety
      };
    } else {
      // Check if mood was logged today in mood_logs
      const todayStr = new Date().toISOString().split("T")[0];
      const allMoods = await storage.getAll("mood_logs");
      const hasMoodToday = allMoods.some(m => m.timestamp && m.timestamp.startsWith(todayStr));

      this.milestones = {
        mood: hasMoodToday,
        calm: false,
        safety: false
      };
      await this.saveTodayMilestones();
    }
  }

  async saveTodayMilestones() {
    const key = this.getTodayKey();
    await storage.setSetting(key, this.milestones);
    this.renderHomeMilestonesCard();
  }

  async markMilestone(type) {
    if (this.milestones[type] === true) return;
    this.milestones[type] = true;
    await this.saveTodayMilestones();

    // Haptic feedback & celebration sound
    soundEngine.vibrate([40, 30, 60]);

    // If all completed, notify encouragement
    if (this.areAllCompleted()) {
      console.log("🌟 ¡Felicitaciones! Has completado todos los hitos diarios de Ancla.");
    }
  }

  areAllCompleted() {
    return this.milestones.mood && this.milestones.calm && this.milestones.safety;
  }

  getPendingList() {
    const pending = [];
    if (!this.milestones.mood) pending.push("Check-in de estado de ánimo");
    if (!this.milestones.calm) pending.push("Momento de respiración o calma");
    if (!this.milestones.safety) pending.push("Revisión de plan de seguridad y anclajes");
    return pending;
  }

  async requestNotificationPermission() {
    if (!("Notification" in window)) {
      alert("Tu navegador no soporta notificaciones de escritorio.");
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        this.notificationsEnabled = true;
        await storage.setSetting("notification_milestones_enabled", true);
        this.renderHomeMilestonesCard();
        this.showNotification(
          "⚓ Ancla · Notificaciones activadas",
          "Te acompañaremos con recordatorios amorosos si tus hitos diarios de bienestar están pendientes."
        );
        return true;
      } else {
        this.notificationsEnabled = false;
        await storage.setSetting("notification_milestones_enabled", false);
        this.renderHomeMilestonesCard();
        return false;
      }
    } catch (e) {
      console.error("Error al solicitar permiso de notificaciones:", e);
      return false;
    }
  }

  async showNotification(title, body) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    // Attempt via Service Worker for PWA compatibility
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body: body,
            icon: "./manifest.webmanifest",
            badge: "./manifest.webmanifest",
            vibrate: [200, 100, 200],
            tag: "ancla-daily-milestones",
            renotify: true,
            data: { url: "./" }
          });
          return;
        }
      } catch (err) {
        console.warn("Fallback to native Notification window:", err);
      }
    }

    try {
      new Notification(title, {
        body: body,
        icon: "./manifest.webmanifest"
      });
    } catch (e) {
      console.error("No se pudo mostrar la notificación:", e);
    }
  }

  async checkAndNotifyIfIncomplete(isManualTest = false) {
    await this.loadTodayMilestones();
    const pending = this.getPendingList();

    if (pending.length === 0) {
      if (isManualTest) {
        alert("✨ ¡Excelente! Ya cumpliste todos tus hitos diarios de hoy. ¡Buen trabajo cuidando de ti!");
      }
      return;
    }

    const pendingText = pending.join(", ");
    const title = "⚓ Ancla · Hitos de bienestar pendientes";
    const body = `Hola, aún no has completado: ${pendingText}. Tómate 2 minutos para conectar contigo y respirar 🌱.`;

    if (isManualTest) {
      if (Notification.permission === "granted") {
        this.showNotification(title, body);
      } else {
        alert(`${title}\n\n${body}`);
      }
    } else if (this.notificationsEnabled) {
      this.showNotification(title, body);
    }
  }

  setupScheduler() {
    if (this.timerCheckInterval) clearInterval(this.timerCheckInterval);

    // Check every minute if we reached the scheduled notification time
    this.timerCheckInterval = setInterval(async () => {
      if (!this.notificationsEnabled) return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      if (currentTimeStr === this.notificationTime) {
        const lastNotifiedKey = `last_notified_${this.getTodayKey()}`;
        const alreadyNotified = await storage.getSetting(lastNotifiedKey, false);

        if (!alreadyNotified) {
          await this.checkAndNotifyIfIncomplete(false);
          await storage.setSetting(lastNotifiedKey, true);
        }
      }
    }, 60000);
  }

  renderHomeMilestonesCard() {
    const container = document.getElementById("dailyMilestonesContainer");
    if (!container) return;

    const completedCount = Object.values(this.milestones).filter(Boolean).length;
    const progressPercent = Math.round((completedCount / 3) * 100);
    const isPermGranted = ("Notification" in window) && Notification.permission === "granted";

    container.innerHTML = `
      <div class="card card-mint" style="margin-bottom: var(--space-4); border: 1.5px solid rgba(45, 212, 191, 0.35);">
        <div class="card-header" style="margin-bottom: 8px;">
          <div class="card-title">
            <span class="card-icon" style="background: var(--mint-100);">🌱</span>
            Hitos Diarios de Bienestar
          </div>
          <span style="font-size: 0.82rem; font-weight: 800; color: #0d9488; background: #ccfbf1; padding: 4px 10px; border-radius: var(--radius-full);">
            ${completedCount}/3 Completados (${progressPercent}%)
          </span>
        </div>

        <!-- Progress Bar -->
        <div style="height: 8px; background: rgba(45, 212, 191, 0.2); border-radius: var(--radius-full); overflow: hidden; margin-bottom: 12px;">
          <div style="height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, #2dd4bf, #06b6d4); transition: width 0.5s ease-out;"></div>
        </div>

        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
          Pequeñas acciones diarias que fortalecen tu estabilidad emocional. Si no se cumplen, Ancla te avisará.
        </p>

        <!-- Milestones list -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
          <!-- Milestone 1: Mood -->
          <div class="milestone-row" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.2rem;">${this.milestones.mood ? "✅" : "⭕"}</span>
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-primary);">Check-in de Ánimo</strong>
                <div style="font-size: 0.74rem; color: var(--text-muted);">Registra cómo te sientes hoy</div>
              </div>
            </div>
            <button class="btn btn-sm ${this.milestones.mood ? 'btn-ghost' : 'btn-primary'}" onclick="document.querySelector('[data-tab=tab-mood]').click()">
              ${this.milestones.mood ? "Hecho" : "Registrar"}
            </button>
          </div>

          <!-- Milestone 2: Calm -->
          <div class="milestone-row" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.2rem;">${this.milestones.calm ? "✅" : "⭕"}</span>
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-primary);">1 Minuto de Calma</strong>
                <div style="font-size: 0.74rem; color: var(--text-muted);">Respiración o anclaje guiado</div>
              </div>
            </div>
            <button class="btn btn-sm ${this.milestones.calm ? 'btn-ghost' : 'btn-secondary'}" onclick="document.querySelector('[data-tab=tab-calm]').click()">
              ${this.milestones.calm ? "Hecho" : "Iniciar"}
            </button>
          </div>

          <!-- Milestone 3: Safety Plan -->
          <div class="milestone-row" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.2rem;">${this.milestones.safety ? "✅" : "⭕"}</span>
              <div>
                <strong style="font-size: 0.88rem; color: var(--text-primary);">Revisar Plan de Seguridad</strong>
                <div style="font-size: 0.74rem; color: var(--text-muted);">Tus anclajes y contactos a mano</div>
              </div>
            </div>
            <button class="btn btn-sm ${this.milestones.safety ? 'btn-ghost' : 'btn-secondary'}" onclick="document.querySelector('[data-tab=tab-plan]').click()">
              ${this.milestones.safety ? "Hecho" : "Revisar"}
            </button>
          </div>
        </div>

        <!-- Notification Controls & Settings -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding-top: 8px; border-top: 1px dashed rgba(45, 212, 191, 0.3);">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 1rem;">🔔</span>
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">
              Notificaciones de hitos:
            </span>
            <span style="font-size: 0.75rem; color: ${isPermGranted ? '#0d9488' : '#e11d48'}; font-weight: 700;">
              ${isPermGranted ? "Activas" : "Desactivadas"}
            </span>
          </div>

          <div style="display: flex; gap: 6px;">
            ${!isPermGranted ? `
              <button id="enableMilestonesNotifyBtn" class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 0.75rem;">
                Activar Avisos
              </button>
            ` : `
              <button id="testMilestonesNotifyBtn" class="btn btn-sm btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;">
                Probar Alerta
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    this.attachCardEvents();
  }

  attachCardEvents() {
    const enableBtn = document.getElementById("enableMilestonesNotifyBtn");
    if (enableBtn) {
      enableBtn.addEventListener("click", async () => {
        await this.requestNotificationPermission();
      });
    }

    const testBtn = document.getElementById("testMilestonesNotifyBtn");
    if (testBtn) {
      testBtn.addEventListener("click", async () => {
        await this.checkAndNotifyIfIncomplete(true);
      });
    }
  }
}

export const dailyMilestones = new DailyMilestonesModule();
