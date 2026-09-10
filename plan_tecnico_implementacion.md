# Plan Técnico de Implementación
## App de Plan de Seguridad y Apoyo en Crisis

---

## 1. Principios de arquitectura

1. **Offline-first**: ninguna función crítica (SOS, plan de seguridad, kit de calma, contactos) depende de conexión a internet.
2. **Confiabilidad sobre features**: el botón SOS debe funcionar aunque el resto de la app falle. Se implementa como componente aislado con manejo de errores propio.
3. **Privacidad por diseño**: cifrado local por defecto, sincronización opt-in y granular.
4. **Gobernanza clínica**: el contenido (ejercicios, plan de seguridad, tarjetas de afrontamiento) lo define el equipo clínico, no el equipo técnico. El desarrollo debe incluir validación con psicólogos/psiquiatras y, si es posible, personas con experiencia vivida.

---

## 2. Stack tecnológico recomendado

### Frontend (app móvil)
- **React Native** (Expo bare workflow, o CLI si se necesita más control nativo) para iOS/Android desde una sola base de código.
- Alternativa válida: **Flutter**, si el equipo tiene más experiencia con Dart.
- Motivo: ambos dan acceso a APIs nativas críticas (teléfono, biometría, notificaciones locales) sin duplicar desarrollo.

### Almacenamiento local
- **SQLite cifrado** (`expo-sqlite` + capa de cifrado, o SQLCipher) para datos estructurados: plan de seguridad, registro de ánimo, contactos.
- **Archivos cifrados** para medios (fotos, audios de anclaje): `expo-file-system` + cifrado AES-256 antes de escribir a disco.
- Claves de cifrado gestionadas por **iOS Keychain / Android Keystore** — nunca en texto plano ni en el propio código.

### Autenticación biométrica
- iOS: `LocalAuthentication` (Face ID / Touch ID). Android: `BiometricPrompt`.
- Librería cross-platform: `expo-local-authentication` o `react-native-biometrics`.
- Fallback: PIN numérico corto (4–6 dígitos), no contraseña alfanumérica — prioriza velocidad en crisis.

### Backend (solo para el portal del terapeuta, es opcional)
- **Supabase** (Postgres + Row Level Security) o Node.js/Express con Postgres si se necesita más control.
- El backend nunca es requisito para el funcionamiento del núcleo de la app.
- RLS o su equivalente para que cada terapeuta solo pueda leer los datos de sus propios pacientes, y solo lo que el paciente autorizó.

### Llamadas y notificaciones
- Llamadas de emergencia: `Linking.openURL('tel:171')`, `tel:911`, etc. — API nativa, sin permisos especiales.
- Notificaciones **locales** (no push remoto) para check-ins o recordatorios, evitando dependencia de red: `expo-notifications`.
- Considerar **App Shortcuts (Android) / Siri Shortcuts (iOS)** para que el SOS sea accesible incluso desde la pantalla de bloqueo del sistema.

---

## 3. Modelos de datos principales

```
User            { id, nombre, terapeuta_id?, biometria_activa }
SafetyPlan      { señales_alerta[], estrategias_solo[], 
                   personas_lugares_distraccion[], 
                   personas_ayuda[], profesionales_emergencia[], 
                   checklist_entorno_seguro[] }
CalmKit         { ejercicios[], anclajes_multimedia[], tarjetas_afrontamiento[] }
MoodLog         { timestamp, puntaje, nota? }
EmergencyContact{ nombre, relación, teléfono, prioridad }
SyncConsent     { tipo_dato, autorizado (bool), fecha }
```

`SyncConsent` es clave: cada categoría de dato (ánimo, ejercicios completados, anclajes) se sincroniza solo si el paciente la autorizó explícitamente, y puede revocarse en cualquier momento.

---

## 4. Implementación por módulo

### 4.1 Pantalla de inicio y SOS
- Botón SOS como componente persistente (floating action button) montado en el navegador raíz, visible en toda la app.
- Un toque abre un panel corto con las opciones (línea 171 opción 6 — salud mental/crisis, MSP; 911/ECU 911 para alta complejidad; terapeuta; contacto de confianza). Un solo nivel de fricción: sin confirmaciones dobles que retrasen la llamada, pero sí un panel breve que evite marcados accidentales.
- **Modo Crisis**: ruta de navegación independiente y simplificada, activable desde el SOS o un gesto configurable; oculta cualquier menú secundario.

### 4.2 Kit de calma y anclajes
- Ejercicios guiados: contenido estructurado en JSON local, editable por el terapeuta desde el portal; reproducción de audio con `expo-av`.
- Fotos/audios de anclaje: `expo-image-picker` y grabación con `expo-av`; cifrado antes de persistir.
- Tarjetas de afrontamiento: CRUD simple; opcionalmente pre-cargadas por el terapeuta vía sincronización.

### 4.3 Plan de seguridad interactivo
- Formulario en 6 pasos (modelo Stanley-Brown), editable en cualquier momento.
- Vista de "lectura rápida" para momentos de crisis: texto grande, alto contraste, mínimo scroll.

### 4.4 Seguridad, privacidad y sincronización clínica
- Bloqueo biométrico al abrir la app — pero el flujo de SOS debe quedar accesible incluso antes de desbloquear (widget o shortcut del sistema operativo).
- Portal del terapeuta: app web separada, acceso por invitación + consentimiento explícito del paciente, revocable en cualquier momento.
- Nunca sincronizar anclajes personales (fotos/audio) sin consentimiento adicional y explícito, distinto del consentimiento general.

---

## 5. Seguridad y cumplimiento normativo

- Cifrado en reposo: AES-256 para base de datos local y archivos multimedia.
- Cifrado en tránsito: TLS 1.2+ para toda comunicación con el backend.
- Minimización de datos: el backend guarda solo lo estrictamente necesario para el portal del terapeuta.
- **Marco legal en Ecuador**: la Ley Orgánica de Protección de Datos Personales (LOPDP) clasifica los datos de salud (incluida salud mental) como datos sensibles, lo que exige consentimiento explícito, informado y revocable. Se recomienda asesoría legal especializada antes del lanzamiento, ya que los requisitos específicos de implementación pueden variar.
- Si se contempla distribución fuera de Ecuador, usar HIPAA/GDPR como referencia de buenas prácticas de diseño, aunque no apliquen directamente.
- Auditoría de seguridad externa (pentesting, revisión de cifrado) antes del lanzamiento.

---

## 6. Roadmap por fases

| Fase | Duración estimada | Entregable |
|---|---|---|
| 0 — Validación clínica y legal | 2–4 semanas | Contenido validado por psicólogos/psiquiatras, revisión legal, flujos revisados con usuarios con experiencia vivida |
| 1 — MVP | 6–8 semanas | Inicio, SOS, plan de seguridad, almacenamiento cifrado, bloqueo biométrico |
| 2 — Kit de calma | 4–6 semanas | Ejercicios, anclajes, tarjetas, modo offline completo |
| 3 — Portal terapeuta | 4–6 semanas | Sincronización opcional con consentimiento granular |
| 4 — Pruebas | 3–4 semanas | Usabilidad en escenarios de crisis simulados, auditoría de accesibilidad y seguridad |
| 5 — Piloto | — | Grupo reducido de pacientes/terapeutas antes del lanzamiento general |

---

## 7. Testing y validación

- Pruebas de usabilidad con personas con experiencia vivida, siempre con supervisión ética.
- Prueba de estrés del flujo SOS: debe completarse en menos de 2 segundos desde cualquier pantalla.
- Revisión de un comité de ética si se involucra a pacientes en las pruebas.
- Accesibilidad: compatibilidad con lectores de pantalla, tamaños de fuente ajustables, alto contraste (WCAG 2.1 AA como referencia mínima).

---

**Nota**: este documento cubre la arquitectura técnica. El contenido clínico (redacción del plan de seguridad, guiones de los ejercicios, tarjetas de afrontamiento) debe ser definido y validado por el equipo terapéutico antes de codificarse como contenido fijo en la app.
