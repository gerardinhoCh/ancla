/* ==========================================================================
   ANCLA - Main Application Coordinator
   Initializes all modules, handles routing, Service Worker & offline status.
   ========================================================================== */

import { storage } from "./db/storage.js";
import { auth } from "./auth/biometric.js";
import { sosModule } from "./modules/sos.js";
import { crisisMode } from "./modules/crisis-mode.js";
import { calmKit } from "./modules/calm-kit.js";
import { moodTracker } from "./modules/mood-tracker.js";
import { anchorsModule } from "./modules/anchors.js";
import { therapistPortal } from "./modules/therapist-portal.js";
import { dailyMilestones } from "./modules/daily-milestones.js";

class App {
  constructor() {
    this.currentTab = "tab-home";
    this.deferredInstallPrompt = null;
  }

  async init() {
    console.log("⚓ Inicializando Ancla: Sistema de Contención y Apoyo en Crisis...");

    try {
      // 1. Initialize persistent storage
      await storage.init();
      await storage.seedInitialDataIfNeeded();

      // 2. Initialize Authentication & Security
      await auth.init();

      // 3. Initialize Functional Modules
      await sosModule.init();
      await crisisMode.init();
      await calmKit.init();
      await moodTracker.init();
      await anchorsModule.init();
      await therapistPortal.init();
      await dailyMilestones.init();

      // 4. Setup Navigation & UI Listeners
      this.setupNavigation();
      this.setupPWA();
      this.setupOfflineWatcher();

      console.log("✅ Ancla está lista y 100% operativa en modo offline-first.");
    } catch (err) {
      console.error("Error crítico durante la inicialización de Ancla:", err);
    }
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-item");
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        this.switchTab(targetTab);
      });
    });

    // Support deep link to tabs
    const quickLaunchCalm = document.getElementById("homeQuickCalmBtn");
    if (quickLaunchCalm) {
      quickLaunchCalm.addEventListener("click", () => this.switchTab("tab-calm"));
    }

    const quickLaunchNetwork = document.getElementById("homeQuickNetworkBtn");
    if (quickLaunchNetwork) {
      quickLaunchNetwork.addEventListener("click", () => this.switchTab("tab-settings"));
    }

    const quickLaunchCrisis = document.getElementById("homeQuickCrisisBtn");
    if (quickLaunchCrisis) {
      quickLaunchCrisis.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("launch-crisis-mode"));
      });
    }
  }

  switchTab(tabId) {
    if (!tabId) return;

    // Update nav buttons
    document.querySelectorAll(".nav-item").forEach(btn => {
      if (btn.getAttribute("data-tab") === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Update tab views
    document.querySelectorAll(".tab-view").forEach(view => {
      if (view.id === tabId) {
        view.classList.add("active");
      } else {
        view.classList.remove("active");
      }
    });

    this.currentTab = tabId;
    if (tabId === "tab-home") {
      dailyMilestones.loadTodayMilestones().then(() => dailyMilestones.renderHomeMilestonesCard());
    } else if (tabId === "tab-settings") {
      therapistPortal.loadKeyContacts().then(() => therapistPortal.loadPersonalContacts()).then(() => therapistPortal.render());
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  setupPWA() {
    // Register Service Worker for total offline resilience
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", async () => {
        try {
          const reg = await navigator.serviceWorker.register("./sw.js");
          console.log("Service Worker registrado con éxito en scope:", reg.scope);
        } catch (err) {
          console.warn("Fallo en registro de Service Worker:", err);
        }
      });
    }

    // Capture install prompt for PWA installation banner
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const installBanner = document.getElementById("pwaInstallBanner");
      if (installBanner) installBanner.style.display = "flex";
    });

    const installActionBtn = document.getElementById("pwaInstallBtn");
    if (installActionBtn) {
      installActionBtn.addEventListener("click", async () => {
        if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          const choice = await this.deferredInstallPrompt.userChoice;
          if (choice.outcome === "accepted") {
            const installBanner = document.getElementById("pwaInstallBanner");
            if (installBanner) installBanner.style.display = "none";
          }
          this.deferredInstallPrompt = null;
        }
      });
    }
  }

  setupOfflineWatcher() {
    const updateOnlineStatus = () => {
      const offlineIndicator = document.getElementById("offlineBadge");
      if (offlineIndicator) {
        if (!navigator.onLine) {
          offlineIndicator.style.display = "inline-flex";
        } else {
          offlineIndicator.style.display = "none";
        }
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();
  }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
});
