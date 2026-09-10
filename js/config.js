/* ==========================================================================
   ANCLA - Clinical & System Configuration
   ========================================================================== */

export const CONFIG = {
  APP_NAME: "Ancla",
  APP_VERSION: "1.0.0",
  DB_NAME: "ancla_secure_db",
  DB_VERSION: 1,

  // Default Emergency Hotlines (Ecuador primary per plan_tecnico_implementacion.md)
  DEFAULT_HOTLINES: [
    {
      id: "ec_msp_171",
      name: "Línea 171 - Opción 6 (Salud Mental)",
      entity: "Ministerio de Salud Pública del Ecuador (MSP)",
      number: "171",
      extension: "Opción 6",
      telUri: "tel:171",
      type: "mental_health",
      badge: "Gratuito 24/7",
      urgent: true,
      description: "Atención psicológica inmediata y contención de crisis emocional en Ecuador."
    },
    {
      id: "ec_ecu911",
      name: "ECU 911 (Emergencias Nacionales)",
      entity: "Servicio Integrado de Seguridad ECU 911",
      number: "911",
      telUri: "tel:911",
      type: "general_emergency",
      badge: "Emergencia Vital",
      urgent: true,
      description: "Ambulancias, rescate y riesgo inminente para la vida en Ecuador."
    }
  ],

  // International emergency contacts database for rapid configuration
  INTERNATIONAL_HOTLINES: {
    EC: { country: "Ecuador", mental: "171,6", emergency: "911" },
    ES: { country: "España", mental: "024", emergency: "112" },
    MX: { country: "México", mental: "8009112000", emergency: "911" },
    CO: { country: "Colombia", mental: "106", emergency: "123" },
    AR: { country: "Argentina", mental: "135", emergency: "911" },
    CL: { country: "Chile", mental: "*4141", emergency: "131" },
    US: { country: "Estados Unidos", mental: "988", emergency: "911" }
  },

  // Starter Safety Plan Template based on Stanley-Brown Clinical Protocol
  DEFAULT_SAFETY_PLAN: {
    step1_warning_signs: [
      "Pensamientos persistentes de 'ya no aguanto más'",
      "Aislamiento social y no responder mensajes",
      "Aumento drástico de ansiedad o taquicardia",
      "Insomnio severo o ganas de dormir todo el día"
    ],
    step2_internal_coping: [
      "Hacer 4 ciclos de respiración en caja (4-4-4-4)",
      "Poner agua fría en la cara (reflejo de inmersión TIPP)",
      "Escuchar mi playlist de anclaje",
      "Salir a caminar 10 minutos sin rumbo fijo"
    ],
    step3_distractions: [
      "Ir a una cafetería concurrida a tomar un té",
      "Dar un paseo en el parque cerca de casa",
      "Ver videos reconfortantes de naturaleza o comedia"
    ],
    step4_support_people: [
      { name: "Mamá / Familiar cercano", phone: "", relation: "Familia" },
      { name: "Mejor amigo/a", phone: "", relation: "Amistad" }
    ],
    step5_professionals: [
      { name: "Línea 171 Opción 6 (Salud Mental)", phone: "171", role: "Crisis 24/7" },
      { name: "Terapeuta / Psiquiatra de cabecera", phone: "", role: "Profesional de salud" }
    ],
    step6_safe_environment: [
      "Apartar medicamentos a un pastillero de dosis diaria bajo supervisión",
      "Alejar objetos cortantes o potencialmente dañinos",
      "Permanecer acompañado en casa hasta que pase la ola de crisis"
    ]
  },

  // Coping Cards validated in Cognitive Behavioral & Dialectical Behavior Therapy
  DEFAULT_COPING_CARDS: [
    {
      id: "card_1",
      front: "¿Sientes que esta ola de angustia nunca terminará?",
      back: "Las crisis emocionales tienen una curva: suben, alcanzan un pico y descienden. Esta sensación es temporal. Has superado el 100% de tus peores días.",
      category: "perspectiva"
    },
    {
      id: "card_2",
      front: "¿Tu mente te dice que eres una carga para los demás?",
      back: "Tu mente está filtrando la realidad por el dolor. Las personas que te aprecian prefieren escucharte y abrazarte hoy que extrañarte mañana.",
      category: "apoyo"
    },
    {
      id: "card_3",
      front: "¿Sientes que pierdes el control por completo?",
      back: "Solo necesitas atravesar los próximos 10 minutos. No tienes que resolver toda tu vida hoy, solo estar a salvo en este instante.",
      category: "presente"
    },
    {
      id: "card_4",
      front: "¿La ansiedad física te está paralizando?",
      back: "Tu cuerpo activó una falsa alarma de supervivencia. Siéntate, apoya los pies firmes en el piso y deja que el aire salga lentamente.",
      category: "corporal"
    }
  ],

  // Breathing Techniques Specifications
  BREATHING_TECHNIQUES: {
    box: {
      name: "Caja (4-4-4-4)",
      description: "Regula el cortisol y estabiliza el ritmo cardíaco en momentos de pánico.",
      cycle: [
        { action: "Inhala", duration: 4, type: "inhale" },
        { action: "Sostén", duration: 4, type: "hold" },
        { action: "Exhala", duration: 4, type: "exhale" },
        { action: "Pausa", duration: 4, type: "hold" }
      ]
    },
    deep: {
      name: "4-7-8 Relajación",
      description: "Activa el sistema nervioso parasimpático para reducir la hiperactivación.",
      cycle: [
        { action: "Inhala", duration: 4, type: "inhale" },
        { action: "Sostén", duration: 7, type: "hold" },
        { action: "Exhala", duration: 8, type: "exhale" }
      ]
    },
    coherence: {
      name: "Coherencia 5-5",
      description: "Equilibra la variabilidad del ritmo cardíaco y la calma mental.",
      cycle: [
        { action: "Inhala", duration: 5, type: "inhale" },
        { action: "Exhala", duration: 5, type: "exhale" }
      ]
    }
  },

  // Grounding 5-4-3-2-1 Sensory Steps
  GROUNDING_STEPS: [
    {
      step: 5,
      sense: "Vista",
      icon: "👁️",
      instruction: "Observa 5 cosas a tu alrededor con atención.",
      prompt: "Nombra 5 objetos, colores o detalles visuales que ves ahora mismo.",
      defaultTags: ["Una ventana", "Un color azul", "Una planta", "Un reloj", "Un libro"]
    },
    {
      step: 4,
      sense: "Tacto",
      icon: "🖐️",
      instruction: "Siente 4 texturas o sensaciones físicas.",
      prompt: "Toca tu ropa, la textura de la mesa, el suelo bajo tus pies o el aire en tus manos.",
      defaultTags: ["La tela de mi camisa", "El frío de la mesa", "Mis pies en el piso", "El peso de mi teléfono"]
    },
    {
      step: 3,
      sense: "Oído",
      icon: "👂",
      instruction: "Presta atención a 3 sonidos distintos.",
      prompt: "Escucha el tráfico lejano, un reloj, el viento o el zumbido de un aparato.",
      defaultTags: ["Tráfico afuera", "El zumbido del aire", "Mi propia respiración"]
    },
    {
      step: 2,
      sense: "Olfato",
      icon: "👃",
      instruction: "Identifica 2 aromas en el entorno.",
      prompt: "El aroma a café, perfume, madera o simplemente el aire fresco de la habitación.",
      defaultTags: ["Aroma a café/té", "Aire fresco"]
    },
    {
      step: 1,
      sense: "Gusto",
      icon: "👅",
      instruction: "Percibe 1 sabor o sensación en tu boca.",
      prompt: "Toma un sorbo de agua fría, siente el sabor de una menta o percibe el estado actual de tu boca.",
      defaultTags: ["Sabor de agua fría"]
    }
  ]
};
