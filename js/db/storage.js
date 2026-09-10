/* ==========================================================================
   ANCLA - Native IndexedDB Offline-First Storage Engine
   Transactional, resilient, zero external dependencies.
   ========================================================================== */

import { CONFIG } from "../config.js";

export class StorageEngine {
  constructor() {
    this.dbName = CONFIG.DB_NAME;
    this.version = CONFIG.DB_VERSION;
    this.db = null;
  }

  /**
   * Initializes the IndexedDB database schema
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Stores
        if (!db.objectStoreNames.contains("safety_plan")) {
          db.createObjectStore("safety_plan", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("contacts")) {
          db.createObjectStore("contacts", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("coping_cards")) {
          db.createObjectStore("coping_cards", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("mood_logs")) {
          const moodStore = db.createObjectStore("mood_logs", { keyPath: "id", autoIncrement: true });
          moodStore.createIndex("timestamp", "timestamp", { unique: false });
        }
        if (!db.objectStoreNames.contains("anchors")) {
          db.createObjectStore("anchors", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("consents")) {
          db.createObjectStore("consents", { keyPath: "type" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Generic get item from a store
   */
  async get(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Generic put item into a store
   */
  async put(storeName, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(value);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Generic delete item from a store
   */
  async delete(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Generic get all items from a store
   */
  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Gets setting by key
   */
  async getSetting(key, defaultValue = null) {
    const item = await this.get("settings", key);
    return item ? item.value : defaultValue;
  }

  /**
   * Saves setting
   */
  async setSetting(key, value) {
    return await this.put("settings", { key, value });
  }

  /**
   * Seeds initial data if not present
   */
  async seedInitialDataIfNeeded() {
    await this.init();

    // Check Safety Plan
    const currentPlan = await this.get("safety_plan", "primary");
    if (!currentPlan) {
      await this.put("safety_plan", {
        id: "primary",
        ...CONFIG.DEFAULT_SAFETY_PLAN,
        updatedAt: new Date().toISOString()
      });
    }

    // Check Coping Cards
    const cards = await this.getAll("coping_cards");
    if (cards.length === 0) {
      for (const card of CONFIG.DEFAULT_COPING_CARDS) {
        await this.put("coping_cards", card);
      }
    }

    // Default consents
    const consents = await this.getAll("consents");
    if (consents.length === 0) {
      const defaultConsents = [
        { type: "mood_tracking", authorized: true, date: new Date().toISOString() },
        { type: "safety_plan_sharing", authorized: false, date: new Date().toISOString() },
        { type: "multimedia_anchors", authorized: false, date: new Date().toISOString() }
      ];
      for (const c of defaultConsents) {
        await this.put("consents", c);
      }
    }
  }

  /**
   * Exports full database dump for secure backup
   */
  async exportAllData() {
    await this.init();
    return {
      version: this.version,
      exportedAt: new Date().toISOString(),
      safety_plan: await this.getAll("safety_plan"),
      contacts: await this.getAll("contacts"),
      coping_cards: await this.getAll("coping_cards"),
      mood_logs: await this.getAll("mood_logs"),
      consents: await this.getAll("consents"),
      settings: await this.getAll("settings")
    };
  }

  /**
   * Clears all personal data (Reset)
   */
  async resetAll() {
    await this.init();
    const storeNames = ["safety_plan", "contacts", "coping_cards", "mood_logs", "anchors", "consents", "settings"];
    const tx = this.db.transaction(storeNames, "readwrite");
    storeNames.forEach(store => tx.objectStore(store).clear());
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }
}

export const storage = new StorageEngine();
