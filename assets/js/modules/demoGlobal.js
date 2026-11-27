// DATOS DE PRUEBA DE TODO EL SISTEMA (un solo botón, Panel del Administrador)

import { getData, saveData } from "../storage.js";
import { seedSecretariaDemo } from "./mesas.js";
import { cargarDatosDemoRecepcion } from "./mesas/recepcionPromociones.js";
import { cargarDemoDirectosCompleto } from "./mesasAmparos.js";
import { cargarDemoAmparosIndirectos } from "./mesasAmparosIndirectosDemo.js";

const esDemo = (registro, prefijo) =>
  String(registro?.id || "").startsWith(prefijo);

function lista(clave) {
  const datos = getData(clave, []);

  return Array.isArray(datos) ? datos : [];
}

function dia(offset = 0) {
  const f = new Date();
  f.setDate(f.getDate() + offset);

  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

// ------------------------------------------------------------
// OFICIALÍA: demandas (con su expediente), oficios y registral
// ------------------------------------------------------------
function sembrarOficialia() {
  const ahora = new Date().toISOString();

  const DEMANDAS = [
    ["Recibido", "MARÍA ELENA GUZMÁN RÍOS", "H. AYTO. COLIMA", "Base"],
    [
      "En revisión",
      "JORGE LUIS CORTÉS MEDINA",
      "SERVICIOS DE SALUD DEL ESTADO",
      "Corrimiento escalafonario",
    ],
    [
      "Recibido",
      "ANA PATRICIA SOLÍS VEGA",
      "SECRETARÍA DE EDUCACIÓN",
      "Pago de prestaciones",
    ],
  ];

  const demandas = lista("demandas").filter((d) => !esDemo(d, "demo-dem-"));

  const expedientes = lista("expedientes").filter(
    (e) => !esDemo(e, "demo-exp-dem-"),
  );

  DEMANDAS.forEach(([estado, actor, demandado, accion], i) => {
    const numero = `EXP-2026-${900 + i + 1}`;
    const fecha = dia(-(i + 1));

    demandas.unshift({
      id: `demo-dem-${i + 1}`,
      expediente: numero,
      fecha,
      observacionesFecha: "",
      actorTipo: "fisica",
      actorNombre: actor,
      actorEnteId: null,
      actorCategoria: "",
      actor,
      demandadoTipo: "fisica",
      demandadoNombre: demandado,
      demandadoEnteId: null,
      demandadoCategoria: "",
      demandado,
      terceros: [],
      accionesReclamadas: [{ id: "demo", nombre: accion, manual: false }],
      accion,
      actos: accion,
      estado,
      creadoEn: ahora,
    });

    expedientes.unshift({
      id: `demo-exp-dem-${i + 1}`,
      numero,
      expediente: numero,
      fecha,
      fechaRecepcion: fecha,
      actor,
      demandado,
      actoDemandado: accion,
      estado,
      clasificacion: "",
      ubicacion: "Oficialía de Partes · pendiente de recibir en Mesas",
      recibidoMesa: false,
      demandaId: `demo-dem-${i + 1}`,
      origen: "demanda",
      creadoEn: ahora,
    });
  });

  saveData("demandas", demandas);
  saveData("expedientes", expedientes);

  const OFICIOS = [
    [
      "TAE-OF-901/2026",
      "Juzgado Primero de Distrito",
      "Pendiente",
      "Administrativo",
      "Solicitud de informe sobre el expediente",
    ],
    [
      "TAE-OF-902/2026",
      "Juzgado Segundo de Distrito",
      "Recibido",
      "Presidencia",
      "Requerimiento de documentación",
    ],
    [
      "TAE-OF-903/2026",
      "Juzgado Tercero de Distrito",
      "En revisión",
      "Administrativo",
      "Notificación de resolución",
    ],
    [
      "TAE-OF-904/2026",
      "Otro",
      "Atendido",
      "Administrativo",
      "Respuesta a oficio anterior",
    ],
  ];

  const oficios = lista("oficios").filter((o) => !esDemo(o, "demo-ofi-"));

  OFICIOS.forEach(([numero, procedencia, estado, destino, asunto], i) => {
    const recibido = estado === "Recibido";

    oficios.unshift({
      id: `demo-ofi-${i + 1}`,
      numero,
      expediente: `${120 + i}/2026`,
      fecha: dia(-(i + 2)),
      procedencia,
      asunto,
      estado,
      destino,
      destinoOtro: "",
      recibidoPor: recibido ? "Oficialía de Partes" : "",
      fechaRecepcion: recibido ? ahora : null,
      creadoEn: ahora,
    });
  });

  saveData("oficios", oficios);

  const REGISTRALES = [
    [
      "SINDICATO DE TRABAJADORES DEL ESTADO",
      "Solicitud",
      "Recibida",
      "Solicitud de toma de nota de directiva",
    ],
    [
      "SINDICATO DE SERVIDORES PÚBLICOS",
      "Escrito",
      "En revisión",
      "Escrito de modificación de estatutos",
    ],
    [
      "SINDICATO DE MAESTROS",
      "Notificación",
      "Atendida",
      "Notificación de cambio de domicilio",
    ],
  ];

  const registrales = lista("registrales").filter(
    (r) => !esDemo(r, "demo-reg-"),
  );

  REGISTRALES.forEach(([sindicato, tipo, estado, descripcion], i) => {
    registrales.unshift({
      id: `demo-reg-${i + 1}`,
      expediente: `${400 + i}/2026`,
      sindicato,
      fecha: dia(-(i + 1)),
      oficio: `REG-${50 + i}/2026`,
      tipo,
      estado,
      descripcion,
      destino: "Presidencia",
      creadoEn: ahora,
    });
  });

  saveData("registrales", registrales);
}

// Amparos de assets/data/amparos-ejemplo.json (se agregan los que falten)
async function cargarAmparosEjemplo() {
  const respuesta = await fetch(
    new URL("../../data/amparos-ejemplo.json", import.meta.url),
  );

  if (!respuesta.ok) throw new Error("No se pudo cargar amparos-ejemplo.json");

  const datos = await respuesta.json();
  const ejemplos = Array.isArray(datos) ? datos : datos.amparos || [];
  const actuales = lista("amparos");
  const ids = new Set(actuales.map((a) => String(a.id)));

  saveData("amparos", [
    ...actuales,
    ...ejemplos.filter((a) => !ids.has(String(a.id))),
  ]);
}

// ------------------------------------------------------------
// ORQUESTADOR: cada paso falla por separado y se reporta
// ------------------------------------------------------------
export async function cargarTodosLosDatosDemo() {
  const resultados = [];

  const paso = async (nombre, fn) => {
    try {
      await fn();
      resultados.push({ nombre, ok: true });
    } catch (error) {
      console.error(`Datos de prueba · ${nombre}:`, error);
      resultados.push({
        nombre,
        ok: false,
        error: error?.message || String(error),
      });
    }
  };

  await paso(
    "Oficialía: demandas, expedientes, oficios y registral",
    sembrarOficialia,
  );
  await paso("Oficialía: amparos de ejemplo", cargarAmparosEjemplo);
  await paso(
    "Secretaría de Acuerdos (expedientes, promociones, demandas, calificación, agenda, audiencias, consultas, oficios, exhortos y plantillas)",
    seedSecretariaDemo,
  );
  await paso("Mesas: recepción de promociones", cargarDatosDemoRecepcion);
  await paso(
    "Amparos Directos (pendientes, TCC, envíos del TCC, niega amparo, cuadernillos, listas y plantillas)",
    cargarDemoDirectosCompleto,
  );
  await paso("Amparos Indirectos", cargarDemoAmparosIndirectos);

  return resultados;
}
