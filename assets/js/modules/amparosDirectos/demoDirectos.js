// DATOS DE PRUEBA: Envíos del TCC, Niega Amparo y plantillas de Directos

import { getData, saveData } from "../../storage.js";
import { amparosDirectos, actualizarSeg } from "./datos.js";
import {
  cuadernilloDe,
  DOCS_CUADERNILLO,
  DOCS_NIEGA_AMPARO,
  sembrarCuadernilloDemo,
} from "./cuadernillo.js";
import { sembrarDocumentoDemo } from "../mesas/documentosFirma.js";
import { ARCHIVOS_DEMO } from "../mesas/demoArchivos.js";
import {
  PLANTILLA_CATEGORIAS_AMPAROS,
  subcategoriasPlantillaAmparos,
} from "../mesas/catalogos.js";

const KEY_PLANTILLAS = "mesasAmparosPlantillas";

function diaLocal(offset = 0) {
  const f = new Date();
  f.setDate(f.getDate() + offset);

  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

// Oficios del TCC ligados a amparos directos, en distintos estados:
//   0, 1 → por categorizar
//   2    → concedido
//   3    → negado, con oficio subido (falta acuerdo)
//   4    → negado, con oficio, acuerdo y cuadernillo completo (listo para archivo)
export function sembrarEnviosTccDemo() {
  const oficios = getData("oficios", []);
  const lista = Array.isArray(oficios) ? oficios : [];
  const existentes = new Set(lista.map((o) => String(o.id)));

  const candidatos = amparosDirectos()
    .filter(
      ({ amparo, seg }) =>
        !seg.envioTcc?.resultado && !existentes.has(`demo-tcc-${amparo.id}`),
    )
    .slice(0, 5);

  const nuevos = [];
  const ahora = new Date().toISOString();

  candidatos.forEach(({ amparo }, i) => {
    const idOficio = `demo-tcc-${amparo.id}`;
    const numero = `TCC-${200 + i}/2026`;

    nuevos.push({
      id: idOficio,
      numero,
      expediente: amparo.expediente || "",
      fecha: diaLocal(-(i + 1)),
      procedencia: "Tribunal Colegiado de Distrito",
      asunto: "Resolución del juicio de amparo directo",
      estado: "Recibido",
      destino: "Administrativo",
      destinoOtro: "",
      recibidoPor: "Oficialía de Partes",
      fechaRecepcion: ahora,
      origen: "amparo",
      amparoId: amparo.id,
      expedienteAmparo: amparo.expediente || "",
      creadoEn: ahora,
    });

    if (i < 2) return;

    const resultado = i === 2 ? "concedido" : "negado";

    actualizarSeg(amparo.id, (s) => {
      s.envioTcc = {
        resultado,
        numeroAD: `AD-${100 + i}/2026`,
        oficioId: idOficio,
        oficioNumero: numero,
        categorizadoEn: ahora,
        categorizadoPor: "Demostración",
      };

      if (resultado !== "negado") return;

      s.niega = {
        notas: i === 4 ? "Documentación completa." : "",
        ...(s.niega || {}),
      };

      const cuad = cuadernilloDe(s);

      const poner = (seccion) => {
        const archivo = sembrarDocumentoDemo(
          "demanda",
          `demo-doc-${amparo.id}-${seccion.id}`,
          { nombreBase: `${seccion.id}_${amparo.id}`, concepto: seccion.texto },
        );

        if (!archivo) return;

        cuad.docs[seccion.id] = {
          documentoId: archivo.documentoId,
          archivo: archivo.archivo,
          subidoEn: ahora,
          subidoPor: "Demostración",
        };
      };

      poner(DOCS_NIEGA_AMPARO[0]); // oficio

      if (i === 4) {
        sembrarCuadernilloDemo(s, amparo.id, DOCS_CUADERNILLO.length);
        poner(DOCS_NIEGA_AMPARO[1]); // acuerdo
      }
    });
  });

  if (nuevos.length) saveData("oficios", [...nuevos, ...lista]);
}

// Una plantilla por categoría (y una por cada tipo de radicación).
export function sembrarPlantillasDirectosDemo() {
  const base =
    ARCHIVOS_DEMO.oficios ||
    ARCHIVOS_DEMO.demanda ||
    Object.values(ARCHIVOS_DEMO)[0];

  if (!base) return;

  const actuales = getData(KEY_PLANTILLAS, []);
  const restantes = (Array.isArray(actuales) ? actuales : []).filter(
    (p) => !String(p.id).startsWith("demo-"),
  );

  const hoy = diaLocal();
  const nuevas = [];

  const agregar = (categoria, nombre, subcategoria = "") =>
    nuevas.push({
      id: `demo-plaa-${nuevas.length + 1}`,
      nombre,
      categoria,
      subcategoria,
      tipoArchivo: base.tipoArchivo,
      nombreArchivo: `${categoria}${subcategoria ? `-${subcategoria}` : ""}-demo.${base.tipoArchivo}`,
      tamano: base.tamano,
      dataUrl: base.dataUrl,
      subidoPor: "Amparos Directos",
      fecha: hoy,
    });

  PLANTILLA_CATEGORIAS_AMPAROS.forEach((categoria) => {
    if (categoria.clave === "radicaciones") {
      const tipos = subcategoriasPlantillaAmparos("radicaciones");

      (tipos.length ? tipos : [{ clave: "", etiqueta: "General" }]).forEach(
        (t) =>
          agregar(
            "radicaciones",
            `Radicación · ${t.etiqueta} (demostración)`,
            t.clave,
          ),
      );

      return;
    }

    agregar(
      categoria.clave,
      `Plantilla de ${categoria.etiqueta.toLowerCase()} (demostración)`,
    );
  });

  saveData(KEY_PLANTILLAS, [...restantes, ...nuevas]);
}
