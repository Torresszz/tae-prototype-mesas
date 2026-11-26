// ============================================================
// PLANTILLAS DE AMPAROS DIRECTOS
// assets/js/modules/amparosDirectos/plantillasDirectos.js
//
// Mismo apartado que las plantillas de Mesas (mesas/plantillas.js),
// pero con las categorías de la Mesa de Amparos y su propio almacén
// (llave "mesasAmparosPlantillas"):
//   Informe Justificado, Radicaciones, Certificación, Oficios,
//   Ampara y protege, No ampara ni protege.
// Solo el usuario de Amparos Directos sube, edita o borra.
// ============================================================

import { canManageTemplatesAmparosDirectos } from "../../auth.js";

import { montarPlantillasEn } from "../mesas/plantillas.js";

import { crearAlmacenPlantillas } from "../mesas/plantillasStore.js";

import {
  PLANTILLA_CATEGORIAS_AMPAROS,
  etiquetaCategoriaPlantillaAmparos,
} from "../mesas/catalogos.js";

export const storePlantillasDirectos = crearAlmacenPlantillas(
  "mesasAmparosPlantillas",
);

const contexto = {
  categorias: PLANTILLA_CATEGORIAS_AMPAROS,
  etiquetaCategoria: etiquetaCategoriaPlantillaAmparos,
  store: storePlantillasDirectos,
  puedeGestionar: () => canManageTemplatesAmparosDirectos(),
  // La barra de filtros global es de la página de Mesas
  filtrosGlobales: false,
  textoUso: "Archivos .docx y .pdf de uso de la Mesa de Amparos Directos.",
  textoSoloGestores:
    "Solo el usuario de Amparos Directos puede subir o borrar plantillas.",
  textoBorrar: "Dejará de estar disponible en Amparos Directos.",
  categoriaFiltro: "",
};

export function renderPlantillasDirectos(host) {
  montarPlantillasEn(host, { categoria: "", contexto });
}
