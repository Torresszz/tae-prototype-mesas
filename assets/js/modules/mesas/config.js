// ============================================================
// CONFIGURACIÓN DEL MÓDULO MESAS
// assets/js/modules/mesas/config.js
// ============================================================

export const MESAS_CONFIG = {
  // Crítico = MÁS DE este número de promociones (11 o más). Se marca en rojo.
  PROMOS_CRITICO_MAYOR_A: 10,

  // Nivel intermedio (naranja): desde este número hasta el límite crítico.
  // ⚠️ Valor propuesto; ajustable sin tocar el resto del código.
  PROMOS_ADVERTENCIA_DESDE: 5,

  // Alertas de agenda: una semana antes (se usa a partir de la Fase 3).
  DIAS_ALERTA_ANTICIPADA: 7,

  // Límite por archivo de plantilla en el prototipo con localStorage (Fase 2).
  PLANTILLA_MAX_MB: 2,
};

// ¿La cantidad de promociones es crítica? (más de 10)
export function esCritico(cantidad) {
  return Number(cantidad) > MESAS_CONFIG.PROMOS_CRITICO_MAYOR_A;
}

// Clase CSS del contador de promociones: "danger" | "warning" | ""
export function nivelPromociones(cantidad) {
  const n = Number(cantidad) || 0;

  if (esCritico(n)) {
    return "danger";
  }

  if (n >= MESAS_CONFIG.PROMOS_ADVERTENCIA_DESDE) {
    return "warning";
  }

  return "";
}
