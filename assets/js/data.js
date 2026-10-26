// =====================================================
// DATOS INICIALES
// =====================================================

import { createId } from "./utils.js";

export const initialExpedientes = [
  {
    id: createId(),

    numero: "124/2026",

    fecha: "2026-08-15",

    actor: "HAC COQUIMATLÁN",

    demandado: "SINDICATO",

    codemandado: "",

    entidad: "OTRO(S)",

    clasificacion: "OCL - Educación",

    estado: "En instrucción",

    ubicacion: "Secretaría de Acuerdos",

    creadoEn: new Date().toISOString(),
  },

  {
    id: createId(),

    numero: "125/2026",

    fecha: "2026-08-16",

    actor: "JUAN PÉREZ",

    demandado: "SECRETARÍA DE SALUD",

    codemandado: "",

    entidad: "Gobierno",

    clasificacion: "OJC - Salud",

    estado: "Recibido",

    ubicacion: "Oficialía de Partes",

    creadoEn: new Date().toISOString(),
  },
];

export const initialDemandas = [];

export const initialAmparos = [];

export const initialExhortos = [];

export const initialPromociones = [];

export const initialOficios = [];
