// ============================================================
// UTILIDADES COMPARTIDAS DE MESAS
// assets/js/modules/mesas/mesaUtils.js
//
// Se usa a partir de Fase 4 para que Demanda, Promociones y
// Calificación trabajen con la misma asignación de mesa.
// ============================================================

import { getData } from "../../storage.js";
import { getSession } from "../../auth.js";


// ============================================================
// NÚMERO DE EXPEDIENTE
// ============================================================

export function getNumeroExpediente(expediente) {
  return String(
    expediente?.numero ||
    expediente?.expediente ||
    "",
  );
}


// ============================================================
// INTERPRETAR NÚMERO
// ============================================================

export function parseNumeroExpediente(numero) {
  const texto = String(numero || "");

  // Ejemplo:
  // 124/2026
  let match = texto.match(
    /(\d+)\s*\/\s*(\d{4})/,
  );

  if (match) {
    return {
      consecutivo: Number(match[1]),
      anio: Number(match[2]),
    };
  }


  // Ejemplo:
  // EXP-2026-124
  match = texto.match(
    /(\d{4})\D+(\d+)/,
  );

  if (match) {
    return {
      consecutivo: Number(match[2]),
      anio: Number(match[1]),
    };
  }


  return {
    consecutivo: null,
    anio: null,
  };
}


// ============================================================
// ASIGNACIÓN DE MESA
//
// Mesa 1 = pares
// Mesa 2 = impares
// Mesa 3 = OJC y expedientes de 2021 o anteriores
// ============================================================

export function mesaDeExpediente(expediente) {
  const numero =
    getNumeroExpediente(expediente);

  const {
    consecutivo,
    anio,
  } =
    parseNumeroExpediente(numero);


  const anioFecha =
    Number(
      String(
        expediente?.fechaRecepcion ||
        expediente?.fecha ||
        expediente?.creadoEn ||
        "",
      ).slice(0, 4),
    );


  const anioEfectivo =
    anio ||
    anioFecha ||
    null;


  const texto = [
    numero,
    expediente?.tipo,
    expediente?.clasificacion,
    expediente?.asunto,
  ]
    .filter(Boolean)
    .join(" ");


  if (
    /\bOJC\b/i.test(texto) ||
    (
      anioEfectivo &&
      anioEfectivo <= 2021
    )
  ) {
    return 3;
  }


  if (consecutivo === null) {
    return 1;
  }


  return (
    consecutivo % 2 === 0
      ? 1
      : 2
  );
}


// ============================================================
// MESA DEL USUARIO
// null = usuario con acceso a todas las mesas
// ============================================================

export function mesaUsuarioActual() {
  return getSession()?.mesa || null;
}


// ============================================================
// EXPEDIENTES VISIBLES PARA EL USUARIO ACTUAL
// ============================================================

export function getExpedientesMesaActual() {
  const datos =
    getData(
      "expedientes",
      [],
    );

  const expedientes =
    Array.isArray(datos)
      ? datos
      : [];

  const mesa =
    mesaUsuarioActual();


  if (!mesa) {
    return expedientes;
  }


  return expedientes.filter(
    (expediente) =>
      mesaDeExpediente(expediente) ===
      Number(mesa),
  );
}


// ============================================================
// BUSCAR EXPEDIENTE EXACTO
// ============================================================

export function buscarExpedienteExacto(numero) {
  const buscado =
    String(numero || "")
      .trim()
      .toLowerCase();

  if (!buscado) {
    return null;
  }


  return (
    getExpedientesMesaActual()
      .find(
        (expediente) =>
          getNumeroExpediente(expediente)
            .trim()
            .toLowerCase() ===
          buscado,
      ) ||
    null
  );
}