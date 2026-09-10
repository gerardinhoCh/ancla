/* ==========================================================================
   ANCLA - Mood Tracker Module
   Native fast check-in, SVG trend visualization, and clinical risk alert.
   ========================================================================== */

import { storage } from "../db/storage.js";

export class MoodTrackerModule {
  constructor() {
    this.selectedScore = 5;
    this.selectedEmotions = new Set();
    this.logs = [];
  }

  async init() {
    await this.loadLogs();
    this.render();
    this.renderChart();
    this.attachEvents();
  }

  async loadLogs() {
    this.logs = await storage.getAll("mood_logs");
    // Sort ascending by timestamp
    this.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  async saveLog(score, emotions, note) {
    const entry = {
      timestamp: new Date().toISOString(),
      score: parseInt(score, 10),
      emotions: Array.from(emotions),
      note: note.trim()
    };

    await storage.put("mood_logs", entry);
    await this.loadLogs();
    this.renderChart();
    this.checkRiskPattern();
  }

  checkRiskPattern() {
    if (this.logs.length >= 2) {
      const recent = this.logs.slice(-2);
      const isCritical = recent.every(log => log.score <= 3);
      if (isCritical) {
        const alertBox = document.getElementById("moodRiskAlert");
        if (alertBox) {
          alertBox.style.display = "block";
        }
      }
    }
  }

  render() {
    const scoreSlider = document.getElementById("moodScoreSlider");
    const scoreDisplay = document.getElementById("moodScoreVal");
    const labelDisplay = document.getElementById("moodScoreLabel");

    const labels = [
      "",
      "Crisis aguda / Muy difícil 😣",
      "Muy abrumado/a 😟",
      "Con mucha angustia 🥺",
      "Inquieto/a o decaído/a 😐",
      "Estado neutral / Regular 🙂",
      "Con algo de alivio 😊",
      "Tranquilo/a y enfocado/a 😌",
      "Sereno/a y con energía 😃",
      "Muy bien / Seguro/a ✨",
      "Excelente estado de calma 🌟"
    ];

    if (scoreSlider && scoreDisplay) {
      scoreSlider.addEventListener("input", (e) => {
        this.selectedScore = parseInt(e.target.value, 10);
        scoreDisplay.textContent = this.selectedScore;
        if (labelDisplay) labelDisplay.textContent = labels[this.selectedScore] || "";
      });
    }

    // Emotion chips selection
    const chips = document.querySelectorAll(".emotion-chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const val = chip.getAttribute("data-emotion");
        if (this.selectedEmotions.has(val)) {
          this.selectedEmotions.delete(val);
          chip.classList.remove("selected");
        } else {
          this.selectedEmotions.add(val);
          chip.classList.add("selected");
        }
      });
    });
  }

  renderChart() {
    const svgContainer = document.getElementById("moodChartSvg");
    if (!svgContainer) return;

    if (this.logs.length === 0) {
      svgContainer.innerHTML = `
        <text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-size="14">
          Aún no hay registros. Haz tu primer check-in hoy.
        </text>
      `;
      return;
    }

    const data = this.logs.slice(-10); // Last 10 records
    const width = 500;
    const height = 180;
    const padding = 35;

    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const points = data.map((d, idx) => {
      const x = padding + (data.length > 1 ? (idx / (data.length - 1)) * availableWidth : availableWidth / 2);
      const y = height - padding - ((d.score - 1) / 9) * availableHeight;
      return { x, y, score: d.score, date: new Date(d.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }) };
    });

    const pathD = points.length > 1
      ? points.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, "")
      : "";

    let svgHtml = `
      <!-- Background Guide Lines -->
      <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="#334155" stroke-dasharray="4" />
      <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="#334155" stroke-dasharray="4" />
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#334155" />

      <text x="${padding - 10}" y="${padding + 4}" text-anchor="end" fill="#94a3b8" font-size="11">10</text>
      <text x="${padding - 10}" y="${height / 2 + 4}" text-anchor="end" fill="#94a3b8" font-size="11">5</text>
      <text x="${padding - 10}" y="${height - padding + 4}" text-anchor="end" fill="#94a3b8" font-size="11">1</text>
    `;

    if (points.length > 1) {
      svgHtml += `
        <!-- Area fill under line -->
        <path d="${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z" fill="rgba(20, 184, 166, 0.15)" />
        <!-- Trend line -->
        <path d="${pathD}" fill="none" stroke="#14b8a6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      `;
    }

    // Draw dots & dates
    points.forEach(pt => {
      svgHtml += `
        <circle cx="${pt.x}" cy="${pt.y}" r="6" fill="#06b6d4" stroke="#ffffff" stroke-width="2" />
        <text x="${pt.x}" y="${pt.y - 12}" text-anchor="middle" fill="#f8fafc" font-weight="700" font-size="11">${pt.score}</text>
        <text x="${pt.x}" y="${height - 10}" text-anchor="middle" fill="#64748b" font-size="10">${pt.date}</text>
      `;
    });

    svgContainer.innerHTML = svgHtml;
  }

  attachEvents() {
    const saveBtn = document.getElementById("saveMoodBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const noteEl = document.getElementById("moodNoteInput");
        const note = noteEl ? noteEl.value : "";
        await this.saveLog(this.selectedScore, this.selectedEmotions, note);
        if (noteEl) noteEl.value = "";
        alert("¡Registro emocional guardado con éxito!");
      });
    }

    const reviewPlanBtn = document.getElementById("moodAlertReviewPlanBtn");
    if (reviewPlanBtn) {
      reviewPlanBtn.addEventListener("click", () => {
        const planTab = document.querySelector('[data-tab="tab-plan"]');
        if (planTab) planTab.click();
      });
    }
  }
}

export const moodTracker = new MoodTrackerModule();
