// ============================================================
// VISTA PREVIA DE PLANTILLAS (primera página, estilo Google Docs)
// assets/js/modules/mesas/vistaPrevia.js
//
//   PDF  -> primera página dibujada en un <canvas> con pdf.js
//           (incluido en assets/vendor/pdfjs; funciona sin internet)
//   DOCX -> primera página reconstruida desde word/document.xml con un
//           lector propio (sin dependencias ni internet)
//
// La hoja se muestra centrada sobre un fondo gris, con sombra, como la
// miniatura de un documento. Del Word se respetan tamaño de página,
// márgenes, párrafos, negritas/cursivas/subrayado, tamaños, colores,
// alineación, sangrías, viñetas y tablas. NO se dibujan imágenes,
// encabezados ni pies de página (para verlos, descargar el archivo).
// ============================================================

const ANCHO_VISTA = 560; // px que ocupa la hoja en pantalla

const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// ------------------------------------------------------------
// API
// ------------------------------------------------------------
export async function renderVistaPrevia(contenedor, plantilla, blob) {
  contenedor.innerHTML = "";

  const escenario = document.createElement("div");

  escenario.className = "mesas-preview-stage";

  contenedor.appendChild(escenario);

  const pie = document.createElement("p");

  pie.className = "mesas-preview-caption";

  try {
    if (plantilla.tipoArchivo === "pdf") {
      const paginas = await dibujarPdf(escenario, blob);

      pie.textContent =
        paginas > 1 ? `Primera página de ${paginas}` : "Página 1 de 1";
    } else {
      await dibujarDocx(escenario, blob);

      pie.textContent = "Primera página";
    }

    contenedor.appendChild(pie);
  } catch (error) {
    console.error(error);

    contenedor.innerHTML = "";

    const aviso = document.createElement("p");

    aviso.className = "mesas-preview-error";

    aviso.textContent =
      "No se pudo generar la vista previa de este archivo. Puedes descargarlo.";

    contenedor.appendChild(aviso);
  }
}

function hoja(ancho, alto) {
  const marco = document.createElement("div");

  marco.className = "mesas-preview-page";

  marco.style.width = `${ancho}px`;
  marco.style.height = `${alto}px`;

  return marco;
}

// ------------------------------------------------------------
// PDF
// ------------------------------------------------------------
async function dibujarPdf(escenario, blob) {
  const pdfjs = await import("../../../vendor/pdfjs/pdf.min.mjs");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "../../../vendor/pdfjs/pdf.worker.min.mjs",
    import.meta.url,
  ).href;

  const tarea = pdfjs.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
  });

  const documento = await tarea.promise;

  const pagina = await documento.getPage(1);

  const base = pagina.getViewport({ scale: 1 });

  const escala = ANCHO_VISTA / base.width;

  const densidad = Math.max(window.devicePixelRatio || 1, 1);

  const vista = pagina.getViewport({ scale: escala * densidad });

  const canvas = document.createElement("canvas");

  canvas.width = Math.floor(vista.width);
  canvas.height = Math.floor(vista.height);
  canvas.style.width = `${ANCHO_VISTA}px`;
  canvas.style.height = `${Math.round(base.height * escala)}px`;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Primera página del documento");

  const marco = hoja(ANCHO_VISTA, Math.round(base.height * escala));

  marco.appendChild(canvas);

  escenario.appendChild(marco);

  await pagina.render({
    canvasContext: canvas.getContext("2d"),
    canvas,
    viewport: vista,
  }).promise;

  const total = documento.numPages;

  // Libera el trabajador de pdf.js; un fallo aquí no afecta a la vista previa.
  try {
    await tarea.destroy();
  } catch (error) {
    console.warn(error);
  }

  return total;
}

// ------------------------------------------------------------
// ZIP (lo mínimo para leer partes de un .docx)
// ------------------------------------------------------------
async function leerParteZip(buffer, nombre) {
  const vista = new DataView(buffer);

  const bytes = new Uint8Array(buffer);

  // Registro de fin del directorio central (0x06054b50)
  let fin = -1;

  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (vista.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }

  if (fin < 0) throw new Error("No es un archivo .docx válido.");

  const entradas = vista.getUint16(fin + 10, true);

  let puntero = vista.getUint32(fin + 16, true);

  const decodificador = new TextDecoder();

  for (let n = 0; n < entradas; n++) {
    if (vista.getUint32(puntero, true) !== 0x02014b50) break;

    const metodo = vista.getUint16(puntero + 10, true);
    const comprimido = vista.getUint32(puntero + 20, true);
    const largoNombre = vista.getUint16(puntero + 28, true);
    const largoExtra = vista.getUint16(puntero + 30, true);
    const largoComentario = vista.getUint16(puntero + 32, true);
    const desplazamiento = vista.getUint32(puntero + 42, true);

    const nombreParte = decodificador.decode(
      bytes.subarray(puntero + 46, puntero + 46 + largoNombre),
    );

    if (nombreParte === nombre) {
      const nombreLocal = vista.getUint16(desplazamiento + 26, true);
      const extraLocal = vista.getUint16(desplazamiento + 28, true);

      const inicio = desplazamiento + 30 + nombreLocal + extraLocal;

      const datos = bytes.subarray(inicio, inicio + comprimido);

      if (metodo === 0) return decodificador.decode(datos);

      if (metodo !== 8) throw new Error("Compresión de .docx no admitida.");

      const flujo = new Blob([datos])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"));

      return decodificador.decode(await new Response(flujo).arrayBuffer());
    }

    puntero += 46 + largoNombre + largoExtra + largoComentario;
  }

  return null;
}

// ------------------------------------------------------------
// DOCX
// ------------------------------------------------------------
const PX_POR_PT = 96 / 72;

const hijosW = (nodo, nombre) =>
  [...(nodo?.children || [])].filter(
    (hijo) => hijo.localName === nombre && hijo.namespaceURI === NS_W,
  );

const primeroW = (nodo, nombre) => hijosW(nodo, nombre)[0] || null;

const atributoW = (nodo, nombre) =>
  nodo?.getAttributeNS(NS_W, nombre) ?? nodo?.getAttribute(`w:${nombre}`) ?? null;

const twipsAPt = (valor) => (Number(valor) || 0) / 20;

function propiedadActiva(rPr, nombre) {
  const nodo = primeroW(rPr, nombre);

  if (!nodo) return false;

  const valor = atributoW(nodo, "val");

  return !(valor === "0" || valor === "false" || valor === "none");
}

async function dibujarDocx(escenario, blob) {
  const buffer = await blob.arrayBuffer();

  const xml = await leerParteZip(buffer, "word/document.xml");

  if (!xml) throw new Error("El .docx no tiene word/document.xml.");

  const estilosXml = await leerParteZip(buffer, "word/styles.xml").catch(
    () => null,
  );

  const analizador = new DOMParser();

  const documento = analizador.parseFromString(xml, "application/xml");

  if (documento.querySelector("parsererror")) {
    throw new Error("document.xml no es válido.");
  }

  // Tamaño base de letra (puntos), del estilo predeterminado del documento
  let tamanoBase = 11;

  let familiaBase = "Calibri, Carlito, Arial, sans-serif";

  if (estilosXml) {
    const estilos = analizador.parseFromString(estilosXml, "application/xml");

    const valores = estilos.getElementsByTagNameNS(NS_W, "rPrDefault")[0];

    const rPr = primeroW(valores, "rPr");

    const sz = atributoW(primeroW(rPr, "sz"), "val");

    if (sz) tamanoBase = Number(sz) / 2;

    const fuente = atributoW(primeroW(rPr, "rFonts"), "ascii");

    if (fuente) familiaBase = `"${fuente}", ${familiaBase}`;
  }

  const cuerpo = documento.getElementsByTagNameNS(NS_W, "body")[0];

  // Página y márgenes (twips -> pt); por omisión, Carta con 1"
  let pagina = { ancho: 612, alto: 792, sup: 72, der: 72, inf: 72, izq: 72 };

  const sectPr = [...cuerpo.children]
    .filter((nodo) => nodo.localName === "sectPr")
    .pop();

  if (sectPr) {
    const tam = primeroW(sectPr, "pgSz");

    const mar = primeroW(sectPr, "pgMar");

    if (tam) {
      pagina.ancho = twipsAPt(atributoW(tam, "w")) || pagina.ancho;
      pagina.alto = twipsAPt(atributoW(tam, "h")) || pagina.alto;
    }

    if (mar) {
      pagina.sup = twipsAPt(atributoW(mar, "top")) || pagina.sup;
      pagina.der = twipsAPt(atributoW(mar, "right")) || pagina.der;
      pagina.inf = twipsAPt(atributoW(mar, "bottom")) || pagina.inf;
      pagina.izq = twipsAPt(atributoW(mar, "left")) || pagina.izq;
    }
  }

  const anchoPx = pagina.ancho * PX_POR_PT;
  const altoPx = pagina.alto * PX_POR_PT;
  const escala = ANCHO_VISTA / anchoPx;

  // Hoja a tamaño real, reducida con transform para que quepa
  const papel = document.createElement("div");

  papel.className = "mesas-preview-paper";
  papel.style.width = `${anchoPx}px`;
  papel.style.height = `${altoPx}px`;
  papel.style.padding = [pagina.sup, pagina.der, pagina.inf, pagina.izq]
    .map((valor) => `${valor * PX_POR_PT}px`)
    .join(" ");
  papel.style.fontSize = `${tamanoBase * PX_POR_PT}px`;
  papel.style.fontFamily = familiaBase;
  papel.style.transform = `scale(${escala})`;

  const marco = hoja(ANCHO_VISTA, Math.round(altoPx * escala));

  marco.appendChild(papel);

  escenario.appendChild(marco);

  const contexto = { corte: false, tamanoBase };

  for (const nodo of cuerpo.children) {
    if (contexto.corte) break;

    if (nodo.namespaceURI !== NS_W) continue;

    if (nodo.localName === "p") {
      const parrafo = construirParrafo(nodo, contexto);

      if (parrafo) papel.appendChild(parrafo);
    } else if (nodo.localName === "tbl") {
      papel.appendChild(construirTabla(nodo, contexto));
    } else if (nodo.localName === "sdt") {
      // Controles de contenido: se leen sus párrafos
      const contenido = primeroW(nodo, "sdtContent");

      for (const hijo of contenido?.children || []) {
        if (hijo.localName === "p") {
          const parrafo = construirParrafo(hijo, contexto);

          if (parrafo) papel.appendChild(parrafo);
        }
      }
    }
  }

  if (!papel.childNodes.length) {
    const vacio = document.createElement("p");

    vacio.textContent = "El documento no tiene contenido que mostrar.";

    papel.appendChild(vacio);
  }
}

function construirTabla(tbl, contexto) {
  const tabla = document.createElement("table");

  tabla.className = "mesas-preview-table";

  const bordes = primeroW(primeroW(tbl, "tblPr"), "tblBorders");

  const estiloTabla = atributoW(primeroW(primeroW(tbl, "tblPr"), "tblStyle"), "val") || "";

  // "Tabla con cuadrícula" (Table Grid) trae sus bordes en el estilo
  if (bordes || /grid|cuadr/i.test(estiloTabla)) tabla.classList.add("con-bordes");

  for (const fila of hijosW(tbl, "tr")) {
    const tr = document.createElement("tr");

    for (const celda of hijosW(fila, "tc")) {
      const td = document.createElement("td");

      const span = Number(atributoW(primeroW(primeroW(celda, "tcPr"), "gridSpan"), "val")) || 1;

      if (span > 1) td.colSpan = span;

      for (const parrafo of hijosW(celda, "p")) {
        const nodo = construirParrafo(parrafo, { ...contexto, corte: false }, true);

        if (nodo) td.appendChild(nodo);
      }

      tr.appendChild(td);
    }

    tabla.appendChild(tr);
  }

  return tabla;
}

function construirParrafo(p, contexto, dentroDeTabla = false) {
  const pPr = primeroW(p, "pPr");

  // Salto de página antes del párrafo: lo que sigue ya no es la página 1
  if (!dentroDeTabla && primeroW(pPr, "pageBreakBefore")) {
    contexto.corte = true;

    return null;
  }

  const estilo = atributoW(primeroW(pPr, "pStyle"), "val") || "";

  const esTitulo = /^(Title|Titulo|Título)$/i.test(estilo);

  const esEncabezado = /^(Heading|Ttulo|Título|Encabezado)\s?(\d)/i.exec(estilo);

  const nodo = document.createElement("p");

  nodo.className = "mesas-preview-p";

  const alineacion = atributoW(primeroW(pPr, "jc"), "val");

  if (alineacion) {
    nodo.style.textAlign =
      { both: "justify", distribute: "justify", center: "center", right: "right", end: "right" }[
        alineacion
      ] || "left";
  }

  const sangria = primeroW(pPr, "ind");

  if (sangria) {
    const izquierda = twipsAPt(atributoW(sangria, "left") ?? atributoW(sangria, "start"));

    const primera = twipsAPt(atributoW(sangria, "firstLine"));

    const colgante = twipsAPt(atributoW(sangria, "hanging"));

    if (izquierda) nodo.style.marginLeft = `${izquierda * PX_POR_PT}px`;

    if (primera) nodo.style.textIndent = `${primera * PX_POR_PT}px`;

    if (colgante) nodo.style.textIndent = `${-colgante * PX_POR_PT}px`;
  }

  const espaciado = primeroW(pPr, "spacing");

  if (espaciado) {
    const antes = atributoW(espaciado, "before");

    const despues = atributoW(espaciado, "after");

    const linea = Number(atributoW(espaciado, "line"));

    if (antes !== null) nodo.style.marginTop = `${twipsAPt(antes) * PX_POR_PT}px`;

    if (despues !== null) nodo.style.marginBottom = `${twipsAPt(despues) * PX_POR_PT}px`;

    if (linea && atributoW(espaciado, "lineRule") !== "exact") {
      nodo.style.lineHeight = String(Math.max(linea / 240, 1));
    }
  }

  if (esTitulo) {
    nodo.style.fontSize = "1.8em";
    nodo.style.fontWeight = "700";
  } else if (esEncabezado) {
    nodo.style.fontSize = `${[0, 1.6, 1.4, 1.2, 1.1][Number(esEncabezado[2])] || 1.1}em`;
    nodo.style.fontWeight = "700";
  }

  // Viñeta / numeración: se representa con un punto
  if (primeroW(pPr, "numPr") || /bullet|vi[ñn]eta/i.test(estilo)) {
    nodo.classList.add("con-vineta");
  }

  let tieneTexto = false;

  const recorrer = (padre) => {
    for (const hijo of padre.children) {
      if (hijo.namespaceURI !== NS_W) continue;

      if (hijo.localName === "r") {
        const rPr = primeroW(hijo, "rPr");

        const fragmento = document.createElement("span");

        if (propiedadActiva(rPr, "b")) fragmento.style.fontWeight = "700";

        if (propiedadActiva(rPr, "i")) fragmento.style.fontStyle = "italic";

        const decoraciones = [];

        if (propiedadActiva(rPr, "u")) decoraciones.push("underline");

        if (propiedadActiva(rPr, "strike")) decoraciones.push("line-through");

        if (decoraciones.length) fragmento.style.textDecoration = decoraciones.join(" ");

        const sz = atributoW(primeroW(rPr, "sz"), "val");

        if (sz) fragmento.style.fontSize = `${(Number(sz) / 2) * PX_POR_PT}px`;

        const color = atributoW(primeroW(rPr, "color"), "val");

        if (color && /^[0-9a-f]{6}$/i.test(color)) fragmento.style.color = `#${color}`;

        const fuente = atributoW(primeroW(rPr, "rFonts"), "ascii");

        if (fuente) fragmento.style.fontFamily = `"${fuente}", Arial, sans-serif`;

        for (const parte of hijo.children) {
          if (parte.namespaceURI !== NS_W) continue;

          if (parte.localName === "t") {
            fragmento.appendChild(document.createTextNode(parte.textContent));

            if (parte.textContent) tieneTexto = true;
          } else if (parte.localName === "tab") {
            fragmento.appendChild(document.createTextNode("      "));
          } else if (parte.localName === "br") {
            if (atributoW(parte, "type") === "page") {
              contexto.corte = true;
            } else {
              fragmento.appendChild(document.createElement("br"));
            }
          }
        }

        nodo.appendChild(fragmento);
      } else if (hijo.localName === "hyperlink" || hijo.localName === "smartTag" || hijo.localName === "ins") {
        recorrer(hijo);
      }
    }
  };

  recorrer(p);

  if (!tieneTexto && !nodo.querySelector("br")) {
    nodo.classList.add("vacio");

    nodo.appendChild(document.createElement("br"));
  }

  return nodo;
}
