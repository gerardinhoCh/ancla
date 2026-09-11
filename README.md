# ⚓ Ancla — Sistema de Apoyo Emocional & Prevención de Crisis

**Ancla** es una Aplicación Web Progresiva (PWA) de salud mental y prevención de crisis diseñada bajo un enfoque **Offline-First**, **Privacidad por Diseño (Cifrado AES-256-GCM)** y estética **Zen-Bubble** (interfaz suave, redondeada y no invasiva).

---

## ✨ Características Principales

- **Botón de Emergencia SOS**: Acceso inmediato a líneas de crisis (Línea 171 Opción 6 MSP y ECU 911 en Ecuador) y contactos de confianza.
- **Modo Crisis**: Interfaz con reducción de estímulos, anclajes emocionales y pasos de rescate en un toque.
- **Plan de Seguridad Stanley-Brown**: 6 pasos clínicos interactivos guardados localmente.
- **Kit de Calma**:
  - Respiración guiada visual con esfera orgánica expansiva (Técnica 4-7-8, Caja 4-4-4-4, Coherencia Cardíaca 5-5).
  - Anclaje sensorial guiado 5-4-3-2-1 con estímulos táctiles.
  - Generador de ondas binaurales Theta (frecuencia portadora 432 Hz) usando la Web Audio API nativa.
- **Registro Emocional**: Check-in diario de ánimo y energía con visualización SVG de tendencias.
- **Anclajes & Recuerdos Seguros**: Espacio protegido para frases, audios y fotos de apoyo.
- **Privacidad y Seguridad de Grado Militar**:
  - Almacenamiento local en **IndexedDB**.
  - Cifrado simétrico **AES-256-GCM** con derivación de claves **PBKDF2** (Web Crypto API).
  - Bloqueo por PIN de 4 dígitos o autenticación biométrica (**WebAuthn** / Windows Hello / FaceID / Huella).
  - Cumplimiento de consentimientos LOPDP para el portal de exportación terapéutica.
- **100% Nativo & Offline**: Sin frameworks pesados ni dependencias externas. Funciona sin internet gracias a su Service Worker.

---

## 🚀 Despliegue en Netlify

Esta aplicación está lista para desplegarse directamente en **Netlify**:

1. Ve a [Netlify](https://app.netlify.com/) e inicia sesión.
2. Selecciona **"Add new site"** → **"Import an existing project"**.
3. Conecta tu cuenta de **GitHub** y selecciona el repositorio `gerardinhoCh/ancla`.
4. Configuración de compilación:
   - **Build command**: *(Dejar vacío)*
   - **Publish directory**: `.` (o dejar vacío/raíz)
5. Haz clic en **"Deploy Ancla"**.

El archivo `netlify.toml` incluido ya gestiona:
- Redirecciones SPA (`/*` → `/index.html 200`).
- Cabeceras para el Service Worker (`Service-Worker-Allowed: /`, `Cache-Control: no-cache`).
- Cabeceras de seguridad HTTP (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

---

## 💻 Desarrollo Local

No requiere `npm install` ni compilación previa:

```bash
# Con Python
python -m http.server 8080

# O con cualquier servidor estático
npx serve .
```

Abre `http://localhost:8080` en tu navegador.
