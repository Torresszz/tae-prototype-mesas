// ============================================================
// DATOS DE DEMOSTRACIÓN DE LAS SECCIONES DEL MÓDULO MESAS
// assets/js/modules/mesas/demo.js
// FASE 8 - T-21
//
// Lo llama seedSecretariaDemo() (mesas.js) justo después de crear los
// expedientes, promociones y seguimiento de demostración. Genera:
//   - demandas por radicar y radicadas
//   - calificaciones (por acordar / acordadas)
//   - agenda: audiencias y calificaciones, con avisos que ya vencen
//   - consultas (enviar / regresar) y un acumulado
//   - oficios de varios años
//   - plantillas de ejemplo (una por categoría)
//
// Es IDEMPOTENTE: los registros de demostración llevan ids fijos que
// empiezan con "demo-"; al repetir el botón se reemplazan, sin
// duplicarse y sin tocar los registros reales del usuario.
// ============================================================

import { getData, saveData } from "../../storage.js";
import { todayISO } from "../../utils.js";

import { ARCHIVOS_DEMO } from "./demoArchivos.js";
import {
  eliminarNotificacionesEvento,
  generarNotificacionesEvento,
} from "./notificaciones.js";
import {
  getNumeroExpediente,
  mesaDeExpediente,
} from "./mesaUtils.js";
import { PLANTILLA_CATEGORIAS } from "./catalogos.js";

// ============================================================
// HELPERS
// ============================================================

const esDemo = (registro) => String(registro?.id || "").startsWith("demo-");

function lista(clave) {
  const datos = getData(clave, []);

  return Array.isArray(datos) ? datos : [];
}

// Fecha local en formato YYYY-MM-DD, desplazada n días respecto a hoy.
function dia(offset) {
  const fecha = new Date();

  fecha.setDate(fecha.getDate() + offset);

  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");

  return `${fecha.getFullYear()}-${m}-${d}`;
}

// ============================================================
// FUNCIÓN PRINCIPAL
// numeros: números de los expedientes de demostración (mesas.js)
// ============================================================

export function sembrarDemoFases(numeros = []) {
  const expedientes = lista("expedientes");

  const mapa = new Map(
    expedientes.map((expediente) => [getNumeroExpediente(expediente), expediente]),
  );

  // Solo trabajamos con los expedientes de demostración que existen.
  const existentes = numeros.filter((numero) => mapa.has(numero));

  if (!existentes.length) {
    return;
  }

  const mesaDe = (numero) => mesaDeExpediente(mapa.get(numero));
  const usuarioDe = (numero) => `Mesa ${mesaDe(numero)}`;

  sembrarDemandas(existentes);
  sembrarCalificaciones(existentes);
  sembrarAgenda(existentes, mesaDe);
  sembrarConsultas(existentes, mapa, expedientes, usuarioDe);
  sembrarAcumulado(existentes, usuarioDe);
  sembrarOficios(existentes, usuarioDe);
  sembrarPlantillas();
}

// ============================================================
// DEMANDAS
// radicacion: estados permitidos en Demanda (sin revisión interna)
// ============================================================

const DEMANDAS = {
  "123/2026": ["por-radicar", "en-proceso"],
  "124/2026": ["radicado", "en-lista", -20],
  "125/2026": ["radicado", "en-actuaria", -12],
  "126/2026": ["por-radicar", "en-firma"],
  "127/2026": ["radicado", "en-archivo", -40],
  "128/2026": ["por-radicar", "en-proceso"],
  "129/2026": ["radicado", "en-firma", -5],
  "130/2026": ["radicado", "en-lista", -3],
  "131/2026": ["por-radicar", "en-proceso"],
  "132/2026": ["radicado", "en-actuaria", -1],
  "133/2026": ["por-radicar", "en-proceso"],
  "045/2021": ["radicado", "en-archivo", -60],
  "OJC-012/2026": ["por-radicar", "en-proceso"],
  "087/2020": ["radicado", "en-lista", -90],
};

function sembrarDemandas(numeros) {
  const demandas = getData("mesasDemandas", {}) || {};

  numeros.forEach((numero) => {
    const datos = DEMANDAS[numero];

    if (!datos) {
      return;
    }

    const [categoria, radicacion, offset] = datos;

    demandas[numero] = {
      radicacion,
      categoria,
      ...(categoria === "radicado" ? { radicadoEn: dia(offset) } : {}),
    };
  });

  saveData("mesasDemandas", demandas);
}

// ============================================================
// CALIFICACIONES
// estado: sin "en-archivo". resultado: por-acordar / acordado.
// ============================================================

const CALIFICACIONES = {
  "123/2026": ["en-proceso", "por-acordar"],
  "124/2026": ["en-firma", "por-acordar"],
  "125/2026": ["en-lista", "acordado", -8],
  "126/2026": ["en-revision-interna", "por-acordar"],
  "127/2026": ["en-actuaria", "acordado", -30],
  "128/2026": ["en-proceso", "por-acordar"],
  "129/2026": ["en-revision-interna", "por-acordar"],
  "130/2026": ["en-lista", "acordado", -2],
  "131/2026": ["en-proceso", "por-acordar"],
  "132/2026": ["en-proceso", "por-acordar"],
  "133/2026": ["en-lista", "acordado", -6],
  "045/2021": ["en-actuaria", "acordado", -45],
  "OJC-012/2026": ["en-proceso", "por-acordar"],
  "087/2020": ["en-firma", "por-acordar"],
};

function sembrarCalificaciones(numeros) {
  const propias = new Set(numeros.filter((numero) => CALIFICACIONES[numero]));

  // Se reemplazan solo las de los expedientes de demostración.
  const restantes = lista("mesasCalificaciones").filter(
    (item) => !propias.has(String(item.expediente)),
  );

  const nuevas = [...propias].map((numero, indice) => {
    const [estado, resultado, offset] = CALIFICACIONES[numero];

    return {
      id: `demo-cal-${indice + 1}`,
      expediente: numero,
      estado,
      resultado,
      notas: "Calificación de demostración.",
      ...(resultado === "acordado" ? { concluidaEn: dia(offset) } : {}),
    };
  });

  saveData("mesasCalificaciones", [...restantes, ...nuevas]);
}

// ============================================================
// AGENDA (audiencias y calificaciones) + AVISOS
//
// Audiencia → 2 avisos (Actuaría y Archivo). Calificación → 1 aviso
// (Auxiliar). El aviso se activa DIAS_ALERTA_ANTICIPADA días antes,
// así que los eventos próximos ya traen avisos vencidos (visibles en
// el panel de Alertas). Los eventos pasados no generan avisos.
// ============================================================

const EVENTOS = [
  // Audiencias por desahogar (próximas: con aviso ya vencido)
  ["audiencia", "124/2026", 3, "10:00", "Trifásica", "por-desahogar"],
  ["audiencia", "133/2026", 2, "13:00", "Incidental", "por-desahogar"],
  ["audiencia", "126/2026", 6, "09:30", "Confesionales", "por-desahogar"],
  // Audiencia por desahogar lejana (aviso aún no vence)
  ["audiencia", "129/2026", 20, "11:00", "Testimonial", "por-desahogar"],
  // Audiencias desahogadas
  ["audiencia", "125/2026", -10, "12:00", "Cotejos", "desahogada"],
  ["audiencia", "127/2026", -25, "10:30", "Ratificación de convenio", "desahogada"],
  ["audiencia", "087/2020", -7, "09:00", "Inspección", "desahogada"],
  ["audiencia", "128/2026", -14, "11:00", "Trifásica", "desahogada"],
  // Calificaciones
  ["calificacion", "123/2026", 4, "09:00"],
  ["calificacion", "OJC-012/2026", 1, "10:00"],
  ["calificacion", "131/2026", 12, "11:30"],
];

function sembrarAgenda(numeros, mesaDe) {
  const agenda = lista("mesasAgenda");

  // Quita los eventos de demostración anteriores y sus avisos.
  agenda.filter(esDemo).forEach((evento) => eliminarNotificacionesEvento(evento.id));

  const reales = agenda.filter((evento) => !esDemo(evento));

  const nuevos = EVENTOS.filter(([, numero]) => numeros.includes(numero)).map(
    ([tipo, numero, offset, hora, tipoAudiencia, estadoAudiencia], indice) => ({
      id: `demo-ag-${indice + 1}`,
      tipo,
      expediente: numero,
      fecha: dia(offset),
      hora,
      notas:
        tipo === "audiencia"
          ? "Audiencia de demostración."
          : "Calificación de demostración.",
      mesa: mesaDe(numero),
      creadoPor: "Secretaría de Acuerdos",
      ...(tipo === "audiencia" ? { tipoAudiencia, estadoAudiencia } : {}),
    }),
  );

  saveData("mesasAgenda", [...reales, ...nuevos]);

  // Avisos solo para eventos que todavía no ocurren.
  const hoy = todayISO();

  nuevos
    .filter((evento) => evento.fecha >= hoy)
    .forEach((evento) => generarNotificacionesEvento(evento));
}

// ============================================================
// CONSULTAS
// Cada expediente termina en la ubicación de su último movimiento.
// ============================================================

const CONSULTAS = [
  ["125/2026", "enviar", "Presidencia", -6],
  ["125/2026", "regresar", "Mesas", -4],
  ["131/2026", "enviar", "Actuaría", -3],
  ["127/2026", "enviar", "Archivo", -15],
  ["045/2021", "enviar", "Proyectos", -2],
];

function sembrarConsultas(numeros, mapa, expedientes, usuarioDe) {
  const restantes = lista("mesasConsultas").filter((item) => !esDemo(item));

  const nuevas = CONSULTAS.filter(([numero]) => numeros.includes(numero)).map(
    ([expediente, accion, destino, offset], indice) => ({
      id: `demo-con-${indice + 1}`,
      expediente,
      accion,
      destino,
      fecha: dia(offset),
      usuario: usuarioDe(expediente),
      creadoEn: new Date(`${dia(offset)}T12:00:00`).toISOString(),
    }),
  );

  saveData("mesasConsultas", [...restantes, ...nuevas]);

  // Ubicación = destino del último movimiento de cada expediente.
  const ultimos = new Map();

  nuevas.forEach((item) => ultimos.set(item.expediente, item));

  expedientes.forEach((registro) => {
    const ultimo = ultimos.get(getNumeroExpediente(registro));

    if (ultimo) {
      registro.ubicacion =
        ultimo.destino === "Mesas"
          ? `Mesa ${mesaDeExpediente(registro)}`
          : ultimo.destino;
    }
  });

  saveData("expedientes", expedientes);
}

// ============================================================
// ACUMULADO (cruza mesas: nuevo de Mesa 2, antiguo de Mesa 3)
// ============================================================

function sembrarAcumulado(numeros, usuarioDe) {
  const restantes = lista("mesasAcumulados").filter((item) => !esDemo(item));

  if (!numeros.includes("129/2026") || !numeros.includes("045/2021")) {
    saveData("mesasAcumulados", restantes);
    return;
  }

  saveData("mesasAcumulados", [
    ...restantes,
    {
      id: "demo-acu-1",
      expedienteNuevo: "129/2026",
      expedienteAntiguo: "045/2021",
      fecha: dia(-4),
      usuario: usuarioDe("129/2026"),
    },
  ]);
}

// ============================================================
// OFICIOS (varios años)
// El consecutivo de cada oficio demo continúa después del mayor
// consecutivo REAL del mismo año, para no repetir números.
// ============================================================

const OFICIOS = [
  // [fecha exacta o offset, dirigidoA, asunto, expediente]
  ["2024-02-14", "Presidencia del Tribunal", "Remisión de acuerdo para firma", "087/2020"],
  ["2024-06-03", "Archivo General", "Envío de expediente concluido", "045/2021"],
  ["2024-11-21", "Actuaría", "Notificación de acuerdo", "087/2020"],
  ["2025-01-20", "Secretaría de Finanzas", "Solicitud de informe", "127/2026"],
  ["2025-04-08", "Actuaría", "Notificación de acuerdo", "045/2021"],
  ["2025-08-15", "Proyectos", "Solicitud de proyecto de resolución", "087/2020"],
  ["2025-12-02", "Archivo General", "Envío de expediente", "127/2026"],
  [-45, "Presidencia del Tribunal", "Remisión de acuerdo para firma", "125/2026"],
  [-30, "Actuaría", "Notificación de acuerdo", "131/2026"],
  [-18, "Secretaría de Educación", "Solicitud de informe", "126/2026"],
  [-7, "Ayuntamiento de Colima", "Requerimiento de documentos", "124/2026"],
  [-2, "Archivo General", "Envío de expediente", "127/2026"],
];

function sembrarOficios(numeros, usuarioDe) {
  const todos = lista("registroOficios");
  const reales = todos.filter((oficio) => !esDemo(oficio));

  // Mayor consecutivo real por año
  const base = {};

  reales.forEach((oficio) => {
    const anio = Number(oficio.anio);

    base[anio] = Math.max(base[anio] || 0, Number(oficio.consecutivo) || 0);
  });

  const nuevos = OFICIOS.filter(([, , , numero]) => numeros.includes(numero)).map(
    ([cuando, dirigidoA, asunto, expediente], indice) => {
      const fecha = typeof cuando === "number" ? dia(cuando) : cuando;
      const anio = Number(fecha.slice(0, 4));

      base[anio] = (base[anio] || 0) + 1;

      return {
        id: `demo-ofi-${indice + 1}`,
        anio,
        consecutivo: base[anio],
        fecha,
        dirigidoA,
        asunto,
        expediente,
        elaboradoPor: usuarioDe(expediente),
      };
    },
  );

  saveData("registroOficios", [...reales, ...nuevos]);
}

// ============================================================
// PLANTILLAS (una por categoría)
// ============================================================

function sembrarPlantillas() {
  const restantes = lista("mesasPlantillas").filter((item) => !esDemo(item));

  const subidoPor = {
    demanda: "Mesa 1",
    promociones: "Mesa 2",
    calificacion: "Mesa 1",
    consultas: "Mesa 3",
    oficios: "Mesa 2",
  };

  const nuevas = PLANTILLA_CATEGORIAS.filter(
    (categoria) => ARCHIVOS_DEMO[categoria.clave],
  ).map((categoria, indice) => {
    const archivo = ARCHIVOS_DEMO[categoria.clave];
    const nombre = `Plantilla de ${categoria.etiqueta.toLowerCase()} (demostración)`;

    return {
      id: `demo-pla-${indice + 1}`,
      nombre,
      categoria: categoria.clave,
      tipoArchivo: archivo.tipoArchivo,
      nombreArchivo: `plantilla-${categoria.clave}-demo.${archivo.tipoArchivo}`,
      tamano: archivo.tamano,
      dataUrl: archivo.dataUrl,
      subidoPor: subidoPor[categoria.clave] || "Mesa 1",
      fecha: dia(-(indice + 1) * 3),
    };
  });

  saveData("mesasPlantillas", [...restantes, ...nuevas]);
}
