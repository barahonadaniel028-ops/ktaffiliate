/* Aura · datos del predictor de viralidad (125 ganchos medidos de la cuenta piloto). Copia literal del portal. Cada espacio puede reemplazar App.PRED con sus propios datos. */
window.__PRED = (function(){
  const PRED = {
 "version": "2026-10-13",
 "base": 50,
 "base_rate": 0.288,
 "n": 125,
 "features": [
  {
   "id": "promesa",
   "label": "Promesa directa ('esto', 'así', 'this is how', 'say this')",
   "re": "\\b(this is how|say this|this one|this is why|here's|here is|esto|esta|este|as[ií]|c[oó]mo)\\b",
   "pts": 7.3,
   "prior": 6,
   "source": "Kit: gancho que promete un resultado y abre un bucle",
   "evidence": {
    "n_con": 29,
    "ok_con": 13,
    "n_sin": 96,
    "ok_sin": 23,
    "logor": 0.9318552484152666
   }
  },
  {
   "id": "objeto",
   "label": "Objeto o ritual concreto (hoja, tinta, rutina, billetera)",
   "re": "\\b(object|objeto|paper|hoja|ink|tinta|color|ritual|routine|rutina|morning|ma[nñ]ana|house|casa|wallet|billetera|coin|moneda|pen|l[aá]piz)\\b",
   "pts": 6.0,
   "prior": 5,
   "source": "Fórmula L3: la especificidad convierte",
   "evidence": {
    "n_con": 18,
    "ok_con": 8,
    "n_sin": 107,
    "ok_sin": 28,
    "logor": 0.8140601092252563
   }
  },
  {
   "id": "tiempo",
   "label": "Tiempo o cifra concreta (30 minutos, 6 años, $2)",
   "re": "\\b\\d+[- ]?(minute|min|second|seconds|day|days|year|years|hour|hours|minuto|minutos|segundo|d[ií]a|d[ií]as|a[nñ]o|a[nñ]os|horas)\\b|\\$\\s?\\d",
   "pts": 5.1,
   "prior": 5,
   "source": "Test de calidad del hook, filtro 3: específico (números, nombres)",
   "evidence": {
    "n_con": 10,
    "ok_con": 4,
    "n_sin": 115,
    "ok_sin": 32,
    "logor": 0.5978370007556206
   }
  },
  {
   "id": "contrario",
   "label": "Rompe una creencia (no, nunca, nadie, deja de)",
   "re": "\\b(not|n't|never|nobody|no one|stop|nunca|nadie|no es|no era|deja de|mata|kills?)\\b",
   "pts": 2.7,
   "prior": 4,
   "source": "Kit: las palabras negativas rinden mejor (no, deja de, evita)",
   "evidence": {
    "n_con": 26,
    "ok_con": 8,
    "n_sin": 99,
    "ok_sin": 28,
    "logor": 0.16215588719936033
   }
  },
  {
   "id": "pregunta",
   "label": "Pregunta directa con signo de interrogación",
   "re": "\\?",
   "pts": -2,
   "prior": 4,
   "source": "Kit: el gancho abre una pregunta en la mente",
   "evidence": {
    "n_con": 4,
    "ok_con": 0,
    "n_sin": 121,
    "ok_sin": 36,
    "logor": -0.7660085288248173
   }
  },
  {
   "id": "tu",
   "label": "Le habla al espectador con 'tú/vos/you'",
   "re": "\\b(you|your|you're|tu|tus|vos|te|ten[eé]s)\\b",
   "pts": -2.8,
   "prior": 3,
   "source": "Kit: 'llamada' (siempre tú)",
   "evidence": {
    "n_con": 65,
    "ok_con": 15,
    "n_sin": 60,
    "ok_sin": 21,
    "logor": -0.5613999097289243
   }
  },
  {
   "id": "kevin",
   "label": "Nombra a Kevin Trudeau en el gancho",
   "re": "\\b(kevin|trudeau)\\b",
   "pts": -5,
   "prior": -5,
   "source": "MASTERY #9 (MEDIA): nombrarlo rinde peor",
   "evidence": {
    "n_con": 2,
    "ok_con": 0,
    "n_sin": 123,
    "ok_sin": 36,
    "logor": -0.2321933868341278
   }
  },
  {
   "id": "anuncio",
   "label": "Anuncio de evento (join, free, reto, gratis)",
   "re": "\\b(join|challenge|free|gratis|reto|[uú]nete|inscr)\\w*",
   "pts": -12,
   "prior": -12,
   "source": "MASTERY #4 (ALTA): el peor gancho de apertura",
   "evidence": {
    "n_con": 0,
    "ok_con": 0,
    "n_sin": 125,
    "ok_sin": 36,
    "logor": 0.8888917576860408
   }
  },
  {
   "id": "cliche",
   "label": "Cliché de ley de atracción (tus palabras crean tu realidad)",
   "re": "(your words (are )?(creating|create)|words create|tus palabras crean|your thoughts become|positive (mind|thinking)|mente positiva|the universe (will|is|has)|el universo (te|va|est))",
   "pts": -6,
   "prior": -6,
   "source": "MASTERY #5 (ALTA): los clichés fallan igual en ambos idiomas",
   "evidence": {
    "n_con": 0,
    "ok_con": 0,
    "n_sin": 125,
    "ok_sin": 36,
    "logor": 0.8888917576860408
   }
  },
  {
   "id": "simple",
   "label": "Palabras simples (ninguna de 11 letras o más)",
   "re": "^(?![\\s\\S]*[a-záéíóúñü']{11,})",
   "pts": 3,
   "prior": 2,
   "source": "Jenny Hoyos (una sola fuente, autodeclarada): hook en lenguaje de quinto grado o menos",
   "evidence": {
    "n_con": 103,
    "ok_con": 32,
    "n_sin": 22,
    "ok_sin": 4,
    "logor": 0.5548425091827648
   }
  }
 ],
 "backtest": {
  "auc_insample": 0.682,
  "auc_cv5": 0.652,
  "auc_prior_only": 0.609,
  "buckets": [
   {
    "rango": "0-39",
    "n": 0,
    "pasa1000": 0,
    "tasa": 0.0
   },
   {
    "rango": "40-49",
    "n": 6,
    "pasa1000": 1,
    "tasa": 0.167
   },
   {
    "rango": "50-59",
    "n": 81,
    "pasa1000": 19,
    "tasa": 0.235
   },
   {
    "rango": "60-69",
    "n": 35,
    "pasa1000": 14,
    "tasa": 0.4
   },
   {
    "rango": "70-100",
    "n": 3,
    "pasa1000": 2,
    "tasa": 0.667
   }
  ]
 },
 "hist_hooks": {
  "en": [
   "Without this object, you're losing money every day.",
   "Your life isn't happening to you. It's coming from you.",
   "Your house looks like a billionaire's. Except for this.",
   "You've been waiting for power you already have.",
   "Telling people your goal doesn't help you. It kills it.",
   "The people who love you most are secretly working against your dream",
   "There's a psychological glitch called counterintention that kills every goal you talk about",
   "I never told anyone about the Rolls Royce until I already had it",
   "They gave him the longest prison sentence in U.S. history... for a crime that doesn't exist",
   "Step one to silence someone: control the media. Step two: put them in prison.",
   "10 years in federal prison. Not a felony. Not even a misdemeanor.",
   "He had a failsafe in case they tried to disappear him",
   "Farm-raised salmon swims in its own waste before it reaches your plate",
   "They feed salmon GMO poison just to make it grow faster",
   "Your 'healthy' salmon dinner is dyed to look like something it's not",
   "he got locked up for / ZERO CRIMES",
   "Why the media will never tell you the truth",
   "That pink color on your salmon? It's not natural. It's injected."
  ],
  "es": [
   "Si no tenés esto en tu casa, estás perdiendo dinero.",
   "Crear tu vida no es magia, es una decisión.",
   "Tu casa se parece a la de un rico, menos en esto.",
   "Si creés que no podés cambiar, te mintieron.",
   "Esto no es feng shui. Es física, y ya está en tu casa.",
   "A los 18 años te dieron una deuda que ni la bancarrota puede borrar.",
   "Esta sartén mata pájaros. Vos la tenés en la cocina.",
   "En 1910 un solo hombre decidió qué es medicina de verdad. Todavía vivís bajo esa decisión.",
   "Tu cerebro tiene una frecuencia de pobre y una de rico. Vivís en la equivocada.",
   "Este salto de 30 segundos ejercita cada célula de tu cuerpo, no solo el músculo.",
   "Un objeto de $2 que atrae dinero como un imán atrae metal.",
   "La universidad subió 1200% desde 1980. Tu sueldo no.",
   "El teflón suelta un gas que mata a un canario en minutos. ¿Qué te hace a vos?",
   "Rockefeller no era médico. Decidió qué te puede curar un médico.",
   "Los billonarios no piensan más rápido. Transmiten en otra onda.",
   "No es cardio. Es la única forma de exprimir las toxinas de cada célula.",
   "Los que tienen dinero no lo guardan en el banco, lo guardan en esto.",
   "Firmaste esa deuda antes de poder alquilar un auto.",
   "Raspaste tu sartén de teflón. Ya te la comiste.",
   "Contarle tu meta a alguien la mata antes de que empiece",
   "Las personas que mas te quieren estan saboteando tu sueno sin saberlo",
   "$6.000 millones para que solo existieran dos tratamientos: pastilla o cirugía.",
   "Existe un mecanismo psicologico llamado contraintencion que apaga cualquier meta que compartis",
   "Meditar no te relaja. Te cambia de canal.",
   "Un aparato de los 80 que la gente fitness de hoy ignora por completo.",
   "Nunca le dije a nadie del Rolls Royce hasta que ya lo tenia",
   "Le dieron la sentencia mas larga de la historia de EE.UU. por un delito que no existe",
   "Primero controlan los medios para callarte. Despues te meten preso.",
   "10 anos en prision federal. Ni siquiera era un delito menor.",
   "Tenia un plan por si intentaban desaparecerlo",
   "Cada beep de tu auto te esta condicionando como a un perro",
   "Asi entrenan a un perro. Asi te estan entrenando a ti.",
   "Tu auto suena igual que el clicker que usan para entrenar animales, y no es casualidad",
   "Las elites usan el mismo truco de sonido que usan para entrenar perros",
   "Hay una onda de energia invisible que las flores liberan y te cambia el cerebro",
   "Lo que ves como decoracion es en realidad una frecuencia que borra negatividad",
   "Un ramo de $10 puede limpiar el trauma que cargas en el cuerpo",
   "Kevin Trudeau: dejá de decir \"yo soy\" así",
   "Por qué tu cerebro cree todo lo que decís de vos",
   "Cada vez que decís \"soy un fracasado\" te estás condenando",
   "Así te programaste para fracasar sin darte cuenta",
   "2 palabras que están arruinando tu vida",
   "Kevin Trudeau revela el peligro real de decir \"yo soy\"",
   "Esto cambia en el segundo que cambiás tus palabras",
   "No es tu sueldo lo que te tiene pobre, es tu boca",
   "Cada vez que decís no me alcanza, tu cerebro te obedece",
   "¿Por qué seguís sin plata aunque digas que querés tener plata?",
   "Está caro es la frase que te está manteniendo pobre",
   "Te estás auto-boicoteando cada vez que hablás de dinero",
   "Tu boca decide cuánta plata vas a tener este año",
   "Por qué quedarte agradecido puede matarte la ambición",
   "Dejá de decir estas 4 frases si de verdad querés tener plata"
  ]
 },
 "scale": {
  "center": 58,
  "slope": 3.2,
  "min": 5,
  "max": 98,
  "green": 70,
  "amber": 45,
  "logit_slope": 0.07
 },
 "sources": [
  "media-empire/FORMULA-MAPA.md (8 leyes, test de calidad del hook, 6 tipos, Kallaway, vidIQ)",
  "analysis/MASTERY.md (patrones #2 al #12, #17 y #18)",
  "hooks_log.csv cruzado por URL con Metricool: 125 ganchos reales, 36 pasaron 1000 vistas",
  "kt-strategy-reflection-2026-10-07: variantes casi idénticas reparten vistas a 1 ganador",
  "media-empire/JENNY-HOYOS-ANALISIS.md (3 entrevistas, una sola fuente autodeclarada): regla 'palabras simples' con tope de 3 puntos; el resto de sus reglas figura como pendiente de probar"
 ],
 "reglas_jenny": [
  {
   "id": "hook_sin_sonido",
   "regla": "Hook visual de menos de 3 segundos, que se entiende sin sonido",
   "estado": "por probar",
   "nota": "No se mide desde el texto. Se revisa a ojo en cada pieza: con el sonido apagado, ¿se entiende?"
  },
  {
   "id": "promesa_tras_hook",
   "regla": "Una línea de promesa justo después del hook",
   "estado": "por probar",
   "nota": "Hoy cada pieza lleva un solo texto de gancho. Falta probarlo en una pieza."
  },
  {
   "id": "palabras_simples",
   "regla": "Hook en lenguaje simple (quinto grado o menos)",
   "estado": "puntúa",
   "nota": "Se aproxima con 'ninguna palabra de 11 letras o más'. En tus datos: 32 de 103 ganchos con esto pasaron 1000 vistas, contra 4 de 22 sin esto. Muestra chica, por eso suma poco."
  },
  {
   "id": "termina_en_respuesta",
   "regla": "Terminar el clip en la palabra que cierra la idea y revisar el último segundo",
   "estado": "por probar",
   "nota": "Necesita la gráfica de retención de Instagram de cada reel que pase 1.000 vistas."
  },
  {
   "id": "rango_de_largo",
   "regla": "Un solo rango de largo, de 10 segundos, para todas las piezas",
   "estado": "por probar",
   "nota": "Ella usa 35 a 45 s. El rango de KT hay que medirlo con las piezas que pasaron 1.000 vistas."
  },
  {
   "id": "alcance_sobre_vistas",
   "regla": "Alcance sobre vistas de al menos 70 %, meta 85 %",
   "estado": "por probar",
   "nota": "Se lee en Instagram Insights. No está confirmado que sea la misma cifra que en YouTube."
  },
  {
   "id": "cta_con_resultado",
   "regla": "CTA con el resultado de un alumno en vez de solo 'comenta KT'",
   "estado": "por probar",
   "nota": "Choca con la regla de captions (solo llamado a la acción e info del reto). Lo decide Daniel."
  },
  {
   "id": "hablarle_al_espectador",
   "regla": "Empezar hablándole al espectador (tú, you)",
   "estado": "contradice tus datos",
   "nota": "Con 'tú/you' en el gancho: 15 de 65 ganchos con esto pasaron 1000 vistas, contra 21 de 60 sin esto. Por eso ese rasgo resta."
  },
  {
   "id": "pregunta_posible",
   "regla": "Plantear la idea como pregunta ('¿es posible…?', '¿qué pasa si…?')",
   "estado": "sin datos propios",
   "nota": "Ningún gancho propio usa esa forma. Con signo de interrogación en general: 0 de 4 ganchos con esto pasaron 1000 vistas, contra 36 de 121 sin esto."
  }
 ]
};
return PRED; })();
