// ============================================================
// SERVICIO DE EXPEDIENTES
// assets/js/modules/mesas/expedienteService.js
// ============================================================

import {
  getData,
} from "../../storage.js";

import {
  getExpedientesMesaActual,
  getNumeroExpediente,
  mesaDeExpediente,
} from "./mesaUtils.js";


// ============================================================
// CLAVES DE ALMACENAMIENTO
// ============================================================

const KEYS = {
  demandas: "mesasDemandas",
  promociones: "promociones",
  seguimiento: "mesasSeguimiento",
  agenda: "mesasAgenda",
};


// ============================================================
// LISTADO GENERAL DE EXPEDIENTES
// ============================================================

export function getExpedientesConsulta() {

  const expedientes =
    getExpedientesMesaActual();

  const seguimiento =
    getData(KEYS.seguimiento, {}) || {};


  return expedientes

    .filter(
      (expediente) =>
        expediente.recibidoMesa !== false,
    )

    .map((expediente) => {

      const numero =
        String(
          getNumeroExpediente(expediente) || "",
        );

      if (!numero) {
        return null;
      }

      const registro =
        seguimiento[numero] || {};


      return {

        numero,

        fecha:
          expediente.fechaRecepcion ||
          expediente.fecha ||
          expediente.creadoEn ||
          "",

        actor:
          expediente.actor ||
          expediente.promovente ||
          "—",

        demandado:
          expediente.demandado ||
          "—",

        mesa:
          mesaDeExpediente(expediente),

        estado:
          registro.estado ||
          "en-proceso",

        asunto:
          expediente.actoDemandado ||
          expediente.asunto ||
          expediente.accion ||
          "Sin asunto registrado",

        expediente,

        seguimiento:
          registro,

      };

    })

    .filter(Boolean)

    .sort(
      (a, b) =>
        fechaOrden(b.fecha) -
        fechaOrden(a.fecha),
    );

}


// ============================================================
// BUSCAR EXPEDIENTE
// ============================================================

export function getExpedienteConsulta(
  numero,
) {

  return (

    getExpedientesConsulta()

      .find(
        (item) =>
          item.numero === String(numero),
      )

    || null

  );

}


// ============================================================
// DEMANDA INICIAL
// ============================================================

export function getDemandaExpediente(
  numero,
) {

  const registro =
    getExpedienteConsulta(numero);

  if (!registro) {
    return null;
  }

  const demandas =
    getData(KEYS.demandas, {}) || {};

  const demanda =
    demandas[numero] || {};

  const expediente =
    registro.expediente;


  return {

    numero:
      registro.numero,

    fecha:
      registro.fecha,

    actor:
      registro.actor,

    demandado:
      registro.demandado,

    resumen:
      expediente.resumen ||
      expediente.descripcion ||
      expediente.actoDemandado ||
      registro.asunto,

    radicacion:
      demanda.radicacion ||
      "en-proceso",

    categoria:
      demanda.categoria ||
      "por-radicar",

    calificacion:
      demanda.calificacion ||
      null,

    acuerdo:
      demanda.acuerdo ||
      null,

    documento:
      expediente.documento ||
      expediente.archivo ||
      null,

    historial:
      Array.isArray(demanda.historialRadicacion)
        ? demanda.historialRadicacion
        : [],

    demanda,

  };

}


// ============================================================
// PROMOCIONES DEL EXPEDIENTE
// ============================================================

export function getPromocionesExpediente(
  numero,
) {

  const registro =
    getExpedienteConsulta(numero);

  if (!registro) {
    return [];
  }

  const promociones =
    getData(KEYS.promociones, []);

  if (!Array.isArray(promociones)) {
    return [];
  }


  return promociones

    .filter(
      (promocion) =>
        String(
          promocion.expediente ||
          promocion.numero ||
          "",
        ) === registro.numero,
    )

    .map((promocion) => {

      return {

        id:
          promocion.id,

        expediente:
          registro.numero,

        fecha:
          promocion.fecha ||
          promocion.creadoEn ||
          "",

        promovente:
          promocion.promovente ||
          promocion.actor ||
          registro.actor,

        resumen:
          promocion.extracto ||
          promocion.descripcion ||
          promocion.tipo ||
          "Sin resumen registrado",

        estadoAcuerdo:
          promocion.estadoAcuerdo ||
          "en-proceso",

        estadoPromocion:
          promocion.estadoPromocion ||
          "por-acordar",

        recibidaMesa:
          promocion.recibidaMesa === true,

        acuerdo:
          promocion.acuerdo ||
          null,

        documento:
          promocion.archivo ||
          promocion.documento ||
          promocion.escrito ||
          null,

        anexos:
          Array.isArray(promocion.anexos)
            ? promocion.anexos
            : [],

        historial:
          Array.isArray(promocion.historialAcuerdo)
            ? promocion.historialAcuerdo
            : [],

        promocion,

      };

    })

    .sort(
      (a, b) =>
        fechaOrden(b.fecha) -
        fechaOrden(a.fecha),
    );

}


// ============================================================
// AUDIENCIAS DEL EXPEDIENTE
// ============================================================

export function getAudienciasExpediente(
  numero,
) {

  const registro =
    getExpedienteConsulta(numero);

  if (!registro) {
    return [];
  }

  const agenda =
    getData(KEYS.agenda, []);

  if (!Array.isArray(agenda)) {
    return [];
  }


  return agenda

    .filter(
      (evento) =>

        evento.tipo === "audiencia" &&

        String(
          evento.expediente || "",
        ) === registro.numero,
    )

    .sort(
      (a, b) =>

        fechaOrden(
          `${a.fecha}T${a.hora || "00:00"}`,
        ) -

        fechaOrden(
          `${b.fecha}T${b.hora || "00:00"}`,
        ),
    );

}


// ============================================================
// HISTORIAL GENERAL DEL EXPEDIENTE
// ============================================================

export function getActuacionesExpediente(
  numero,
) {

  const registro =
    getExpedienteConsulta(numero);

  if (!registro) {
    return [];
  }

  const demanda =
    getDemandaExpediente(numero);

  const promociones =
    getPromocionesExpediente(numero);

  const actuaciones = [];


  // Historial general del expediente.

  agregarHistorial(
    actuaciones,
    registro.seguimiento.historial,
    "Expediente",
  );


  // Historial de la demanda inicial.

  agregarHistorial(
    actuaciones,
    demanda?.historial,
    "Demanda inicial",
  );


  // Historial de las promociones.

  promociones.forEach((promocion) => {

    agregarHistorial(
      actuaciones,
      promocion.historial,
      "Promoción",
      promocion.id,
    );

  });


  return actuaciones.sort(
    (a, b) =>
      fechaOrden(a.fecha) -
      fechaOrden(b.fecha),
  );

}


// ============================================================
// NORMALIZAR HISTORIAL
// ============================================================

function agregarHistorial(
  destino,
  historial,
  origen,
  referencia = null,
) {

  if (!Array.isArray(historial)) {
    return;
  }

  historial.forEach((item) => {

    destino.push({

      fecha:
        item.fecha ||
        "",

      movimiento:
        item.movimiento ||
        item.accion ||
        "Movimiento registrado",

      detalle:
        item.detalle ||
        "",

      usuario:
        item.usuario ||
        item.por ||
        "",

      origen,

      referencia,

    });

  });

}


// ============================================================
// DETALLE COMPLETO DEL EXPEDIENTE
// ============================================================

export function getDetalleExpediente(
  numero,
) {

  const registro =
    getExpedienteConsulta(numero);

  if (!registro) {
    return null;
  }


  return {

    ...registro,

    demanda:
      getDemandaExpediente(numero),

    promociones:
      getPromocionesExpediente(numero),

    audiencias:
      getAudienciasExpediente(numero),

    actuaciones:
      getActuacionesExpediente(numero),

  };

}


// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function fechaOrden(value) {

  const fecha =
    Date.parse(value);

  return Number.isFinite(fecha)
    ? fecha
    : 0;

}