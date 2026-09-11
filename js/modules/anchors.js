/* ==========================================================================
   ANCLA - Personal Multimedia Anchors Module
   Private, local photos and comforting voice notes (IndexedDB + MediaRecorder).
   ========================================================================== */

import { storage } from "../db/storage.js";
import { dailyMilestones } from "./daily-milestones.js";

export class AnchorsModule {
  constructor() {
    this.containerEl = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  async init() {
    this.containerEl = document.getElementById("anchorsContainer");
    await this.renderAnchors();
    this.attachEvents();
  }

  async renderAnchors() {
    if (!this.containerEl) return;
    const items = await storage.getAll("anchors");
    if (items.length > 0) {
      dailyMilestones.markMilestone("safety");
    }

    if (items.length === 0) {
      this.containerEl.innerHTML = `
        <div style="text-align: center; padding: 24px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg); background: var(--bg-surface-elevated);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🖼️ 🎙️</div>
          <h4 style="margin-bottom: 4px;">Tus Anclajes Personales</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); max-width: 320px; margin: 0 auto 16px;">
            Guarda fotos de seres queridos, mascotas o mensajes de voz reconfortantes que te recuerden razones para vivir.
          </p>
        </div>
      `;
      return;
    }

    this.containerEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-3); margin-top: var(--space-3);">
        ${items.map(item => `
          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; position: relative;">
            ${item.type === "image" ? `
              <img src="${item.dataUrl}" alt="${item.title || "Anclaje"}" style="width: 100%; height: 120px; object-fit: cover; display: block;" />
            ` : `
              <div style="height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(139, 92, 246, 0.1);">
                <span style="font-size: 2rem;">🎙️</span>
                <audio controls src="${item.dataUrl}" style="width: 90%; height: 32px; margin-top: 8px;"></audio>
              </div>
            `}
            <div style="padding: 8px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.78rem; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                ${item.title || "Anclaje"}
              </span>
              <button class="btn btn-sm btn-ghost delete-anchor-btn" data-id="${item.id}" style="color: #ef4444; padding: 2px 6px;">✕</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    this.attachDeleteEvents();
  }

  attachDeleteEvents() {
    const deleteButtons = this.containerEl.querySelectorAll(".delete-anchor-btn");
    deleteButtons.forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        if (confirm("¿Eliminar este anclaje de tu dispositivo?")) {
          await storage.delete("anchors", id);
          await this.renderAnchors();
        }
      });
    });
  }

  attachEvents() {
    const uploadInput = document.getElementById("anchorFileInput");
    if (uploadInput) {
      uploadInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
          const title = prompt("Título para esta foto (ej. 'Mi perro Toby', 'Viaje al campo'):") || "Foto reconfortante";
          await storage.put("anchors", {
            type: "image",
            title: title.trim(),
            dataUrl: reader.result,
            createdAt: new Date().toISOString()
          });
          await this.renderAnchors();
        };
        reader.readAsDataURL(file);
      });
    }

    // Voice note recording
    const recordVoiceBtn = document.getElementById("recordVoiceAnchorBtn");
    if (recordVoiceBtn) {
      recordVoiceBtn.addEventListener("click", async () => {
        if (!this.isRecording) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);

            this.mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
              const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
              const reader = new FileReader();
              reader.onloadend = async () => {
                const title = prompt("Título para esta nota de voz (ej. 'Mensaje de esperanza'):") || "Audio de calma";
                await storage.put("anchors", {
                  type: "audio",
                  title: title.trim(),
                  dataUrl: reader.result,
                  createdAt: new Date().toISOString()
                });
                await this.renderAnchors();
              };
              reader.readAsDataURL(audioBlob);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            recordVoiceBtn.textContent = "⏹️ Detener Grabación";
            recordVoiceBtn.classList.add("btn-urgent");
          } catch (err) {
            alert("No se pudo acceder al micrófono en este dispositivo.");
          }
        } else {
          this.mediaRecorder.stop();
          this.isRecording = false;
          recordVoiceBtn.textContent = "🎙️ Grabar audio de anclaje";
          recordVoiceBtn.classList.remove("btn-urgent");
        }
      });
    }
  }
}

export const anchorsModule = new AnchorsModule();
