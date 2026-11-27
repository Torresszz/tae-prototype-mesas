// BUSCADOR DE PLANTILLAS (componente compartido)
// Se monta dentro de cualquier modal donde se suben archivos.
//   contexto:     "mesas" | "directos" (qué almacén de plantillas usa)
//   categoria:    categoría sugerida (aparece sola, sin escribir)
//   subcategoria: opcional (las específicas salen primero)
// Devuelve { definir({ categoria, subcategoria }) } para cambiar la sugerencia.

import { escapeHTML, normalizeText } from "../../utils.js";

import { crearAlmacenPlantillas } from "./plantillasStore.js";

import {
  etiquetaCategoriaPlantilla,
  etiquetaCategoriaPlantillaAmparos,
  subcategoriasPlantillaAmparos,
} from "./catalogos.js";

const CONTEXTOS = {
  mesas: {
    store: crearAlmacenPlantillas("mesasPlantillas"),
    etiquetaCategoria: etiquetaCategoriaPlantilla,
    etiquetaSub: () => "",
  },
  directos: {
    store: crearAlmacenPlantillas("mesasAmparosPlantillas"),
    etiquetaCategoria: etiquetaCategoriaPlantillaAmparos,
    etiquetaSub: (p) =>
      subcategoriasPlantillaAmparos(p.categoria).find(
        (s) => s.clave === p.subcategoria,
      )?.etiqueta || "",
  },
};

let contador = 0;

function descargar(plantilla) {
  const enlace = document.createElement("a");

  enlace.href = plantilla.dataUrl;
  enlace.download =
    plantilla.nombreArchivo || `${plantilla.nombre}.${plantilla.tipoArchivo}`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

export function montarBuscadorPlantillas(host, opciones = {}) {
  if (!host) return { definir() {} };

  const ctx = CONTEXTOS[opciones.contexto] || CONTEXTOS.mesas;

  const uid = `plantBusc${++contador}`;

  let sugerida = {
    categoria: opciones.categoria || "",
    subcategoria: opciones.subcategoria || "",
  };

  host.innerHTML = `
    <section class="plantillas-buscador">
      <header class="plantillas-buscador-cabecera">
        <strong><i class="fa-regular fa-file-lines"></i> Plantillas</strong>
        <small data-pb-ayuda></small>
      </header>
      <label class="plantillas-buscador-busqueda" for="${uid}">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input id="${uid}" type="search" autocomplete="off"
          placeholder="Buscar plantilla por nombre o categoría...">
      </label>
      <div class="plantillas-buscador-lista" data-pb-lista></div>
    </section>`;

  const entrada = host.querySelector("input");
  const lista = host.querySelector("[data-pb-lista]");
  const ayuda = host.querySelector("[data-pb-ayuda]");

  const coincide = (p, q) =>
    normalizeText(
      [
        p.nombre,
        p.nombreArchivo,
        p.categoria,
        ctx.etiquetaCategoria(p.categoria),
        p.subcategoria,
        ctx.etiquetaSub(p),
      ].join(" "),
    ).includes(q);

  const fila = (p) => {
    const sub = ctx.etiquetaSub(p);

    return `
      <div class="plantillas-buscador-fila">
        <span class="plantillas-buscador-nombre">
          <strong>${escapeHTML(p.nombre)}</strong>
          <small>${escapeHTML(ctx.etiquetaCategoria(p.categoria))}${sub ? ` · ${escapeHTML(sub)}` : ""} · ${escapeHTML(p.nombreArchivo || "")}</small>
        </span>
        <button type="button" class="mesas-secondary-btn" data-pb-descargar="${escapeHTML(p.id)}">
          <i class="fa-solid fa-download"></i> Descargar
        </button>
      </div>`;
  };

  function pintar() {
    const texto = entrada.value.trim();
    const q = normalizeText(texto);
    const todas = ctx.store.listar();

    let resultado = [];
    let vacio = "";

    if (q) {
      resultado = todas.filter((p) => coincide(p, q));
      ayuda.textContent = "Resultados en todas las categorías";
      vacio = `Sin resultados para «${escapeHTML(texto)}».`;
    } else if (sugerida.categoria) {
      resultado = todas
        .filter(
          (p) =>
            p.categoria === sugerida.categoria &&
            (!sugerida.subcategoria ||
              !p.subcategoria ||
              p.subcategoria === sugerida.subcategoria),
        )
        .sort(
          (a, b) =>
            Number(b.subcategoria === sugerida.subcategoria) -
            Number(a.subcategoria === sugerida.subcategoria),
        );
      ayuda.textContent = `Sugeridas: ${ctx.etiquetaCategoria(sugerida.categoria)}`;
      vacio =
        "No hay plantillas en esta categoría. Escribe arriba para buscar en todas.";
    } else {
      ayuda.textContent = "Escribe para buscar en todas las plantillas";
      vacio = "Sin sugerencias para este documento.";
    }

    lista.innerHTML = resultado.length
      ? resultado.map(fila).join("")
      : `<p class="plantillas-buscador-vacio">${vacio}</p>`;
  }

  entrada.oninput = pintar;

  // Enter no debe enviar/cerrar nada del modal
  entrada.onkeydown = (evento) => {
    if (evento.key === "Enter") evento.preventDefault();
  };

  lista.onclick = (evento) => {
    const boton = evento.target.closest("[data-pb-descargar]");
    if (!boton) return;

    const plantilla = ctx.store.obtener(boton.dataset.pbDescargar);
    if (plantilla) descargar(plantilla);
  };

  pintar();

  return {
    definir({ categoria = "", subcategoria = "" } = {}) {
      sugerida = { categoria, subcategoria };
      entrada.value = "";
      pintar();
    },
  };
}
