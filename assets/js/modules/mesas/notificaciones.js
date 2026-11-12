// ============================================================
// NOTIFICACIONES DE AGENDA
// assets/js/modules/mesas/notificaciones.js
// FASE 3 - T-11 / T-12
// ============================================================

import { getData, saveData } from "../../storage.js";
import { createId } from "../../utils.js";

import { MESAS_CONFIG } from "./config.js";

import {
  etiquetaTipoEventoAgenda,
} from "./catalogos.js";


const KEY_NOTIFICACIONES = "mesasNotificaciones";
const KEY_AGENDA = "mesasAgenda";


// ============================================================
// DESTINATARIOS POR TIPO DE EVENTO
// Audiencia:  Actuaría, una semana (7 días) antes.
// Calificación: auxiliar, una semana (7 días) antes.
// Promoción y exhorto con fecha: Actuaría, 10 días antes.
// ============================================================
export function destinatariosDeTipo(tipo) {
  if (tipo === "audiencia") return ["actuaria"];
  if (tipo === "calificacion") return ["auxiliar"];
  if (tipo === "promocion" || tipo === "exhorto") return ["actuaria"];
  return [];
}

// Días de anticipación del aviso según el tipo de evento.
export function diasAnticipacionDeTipo(tipo) {
  if (tipo === "promocion" || tipo === "exhorto") {
    return MESAS_CONFIG.DIAS_ALERTA_ACTUARIA_PROMOCION_EXHORTO;
  }

  return MESAS_CONFIG.DIAS_ALERTA_ANTICIPADA;
}
// ============================================================
// OBTENER TODAS LAS NOTIFICACIONES
// ============================================================

export function getNotificacionesAgenda() {
  const notificaciones = getData(
    KEY_NOTIFICACIONES,
    [],
  );

  return Array.isArray(notificaciones)
    ? notificaciones
    : [];
}


// ============================================================
// GENERAR NOTIFICACIONES DE UN EVENTO
// T-11
// ============================================================

export function generarNotificacionesEvento(evento) {
  if (
    !evento?.id ||
    !evento?.fecha ||
    !evento?.expediente
  ) {
    return [];
  }

  const fechaAviso = restarDias(
    evento.fecha,
    diasAnticipacionDeTipo(evento.tipo),
  );

  if (!fechaAviso) {
    return [];
  }


    const destinatarios =
    destinatariosDeTipo(
      evento.tipo,
    );
  const nuevas =
    destinatarios.map(
      (destinatario) => ({
        id: createId(),

        eventoId: evento.id,

        destinatario,

        expediente:
          evento.expediente,

        fechaAviso,

        mensaje:
          construirMensaje(
            evento.tipo,
            evento.expediente,
            evento.fecha,
          ),

        leida: false,
      }),
    );


  if (!nuevas.length) {
    return [];
  }


  const actuales =
    getNotificacionesAgenda();


  saveData(
    KEY_NOTIFICACIONES,
    [
      ...actuales,
      ...nuevas,
    ],
  );


  return nuevas;
}


// ============================================================
// SINCRONIZAR AL EDITAR
// T-11
// ============================================================

export function sincronizarNotificacionesEvento(evento) {
  if (!evento?.id) {
    return [];
  }

  // Borra los avisos anteriores.
  eliminarNotificacionesEvento(
    evento.id,
  );

  // Los vuelve a generar con la nueva fecha/tipo.
  return generarNotificacionesEvento(
    evento,
  );
}


// ============================================================
// ELIMINAR AVISOS DE UN EVENTO
// T-11
// ============================================================

export function eliminarNotificacionesEvento(eventoId) {
  if (!eventoId) {
    return;
  }

  const actuales =
    getNotificacionesAgenda();

  const restantes =
    actuales.filter(
      (notificacion) =>
        notificacion.eventoId !== eventoId,
    );

  saveData(
    KEY_NOTIFICACIONES,
    restantes,
  );
}


// ============================================================
// MARCAR COMO LEÍDA
// T-12
// ============================================================

export function marcarNotificacionLeida(id) {
  if (!id) {
    return;
  }

  const notificaciones =
    getNotificacionesAgenda();

  const actualizadas =
    notificaciones.map(
      (notificacion) =>
        notificacion.id === id
          ? {
              ...notificacion,
              leida: true,
            }
          : notificacion,
    );

  saveData(
    KEY_NOTIFICACIONES,
    actualizadas,
  );
}


// ============================================================
// AVISOS ACTIVOS PARA EL PANEL DE ALERTAS
// T-12
//
// Condiciones:
// - no está leído
// - fechaAviso <= hoy
// - el evento todavía no ocurre
// ============================================================

export function getAvisosAgendaPendientes() {
  const notificaciones =
    getNotificacionesAgenda();

  const datosAgenda =
    getData(
      KEY_AGENDA,
      [],
    );

  const eventos =
    Array.isArray(datosAgenda)
      ? datosAgenda
      : [];

  const hoy =
    hoyISO();


  return notificaciones
    .filter(
      (notificacion) =>
        notificacion.leida !== true,
    )

    .filter(
      (notificacion) =>
        Boolean(notificacion.fechaAviso) &&
        notificacion.fechaAviso <= hoy,
    )

    .map(
      (notificacion) => {
        const evento =
          eventos.find(
            (item) =>
              item.id ===
              notificacion.eventoId,
          );

        if (!evento) {
          return null;
        }

                if (!eventoAunNoOcurre(evento)) {
          return null;
        }
        // Ignora avisos antiguos (p. ej. a Archivo) que ya no aplican.
        if (
          !destinatariosDeTipo(
            evento.tipo,
          ).includes(
            notificacion.destinatario,
          )
        ) {
          return null;
        }

        return {
          ...notificacion,

          tipo:
            evento.tipo,

          fechaEvento:
            evento.fecha,

          hora:
            evento.hora || "",

          notas:
            evento.notas || "",

          mesa:
            evento.mesa ?? null,
        };
      },
    )

    .filter(Boolean)

    .sort(
      (a, b) => {
        if (
          a.fechaEvento !==
          b.fechaEvento
        ) {
          return String(
            a.fechaEvento,
          ).localeCompare(
            String(
              b.fechaEvento,
            ),
          );
        }

        return String(
          a.hora || "",
        ).localeCompare(
          String(
            b.hora || "",
          ),
        );
      },
    );
}


// ============================================================
// ¿EL EVENTO TODAVÍA NO OCURRE?
// ============================================================

function eventoAunNoOcurre(evento) {
  if (!evento?.fecha) {
    return false;
  }

  const hoy =
    hoyISO();


  // Evento futuro.
  if (evento.fecha > hoy) {
    return true;
  }


  // Evento de un día anterior.
  if (evento.fecha < hoy) {
    return false;
  }


  // Evento de hoy sin hora.
  //
  // Esto aplica especialmente a Calificación,
  // cuya hora es opcional.
  //
  // Se considera pendiente durante todo el día.
  if (!evento.hora) {
    return true;
  }


  // Evento de hoy con hora:
  // solo sigue pendiente si aún no llega esa hora.
  const ahora =
    new Date();

  const horaActual =
    [
      String(
        ahora.getHours(),
      ).padStart(2, "0"),

      String(
        ahora.getMinutes(),
      ).padStart(2, "0"),
    ].join(":");


  return (
    evento.hora >= horaActual
  );
}


// ============================================================
// RESTAR DÍAS
// ============================================================

function restarDias(fecha, dias) {
  const partes =
    String(fecha)
      .slice(0, 10)
      .split("-")
      .map(Number);


  if (
    partes.length !== 3 ||
    partes.some(
      (valor) =>
        !Number.isFinite(valor),
    )
  ) {
    return "";
  }


  const [
    anio,
    mes,
    dia,
  ] = partes;


  const fechaLocal =
    new Date(
      anio,
      mes - 1,
      dia,
    );


  if (
    Number.isNaN(
      fechaLocal.getTime(),
    )
  ) {
    return "";
  }


  fechaLocal.setDate(
    fechaLocal.getDate() -
    Number(dias || 0),
  );


  return formatearFechaISO(
    fechaLocal,
  );
}


// ============================================================
// HOY EN FORMATO YYYY-MM-DD
// ============================================================

function hoyISO() {
  return formatearFechaISO(
    new Date(),
  );
}


// ============================================================
// FORMATEAR FECHA LOCAL
// ============================================================

function formatearFechaISO(fecha) {
  const anio =
    fecha.getFullYear();

  const mes =
    String(
      fecha.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const dia =
    String(
      fecha.getDate(),
    ).padStart(
      2,
      "0",
    );


  return `${anio}-${mes}-${dia}`;
}


// ============================================================
// MENSAJE
// ============================================================

function construirMensaje(
  tipo,
  expediente,
  fecha,
) {
  const etiqueta =
    etiquetaTipoEventoAgenda(
      tipo,
    );

  return `${etiqueta} del expediente ${expediente} programada para ${fecha}.`;
}