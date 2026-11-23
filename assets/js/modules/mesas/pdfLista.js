// ============================================================
// PDF DE LA LISTA DE ACUERDOS
// assets/js/modules/mesas/pdfLista.js
//
// Genera el PDF de una lista (tabla EXP. / ACTOR / DEMANDADO /
// ACUERDO, agrupada por año) sin librerías externas: escribe el
// archivo PDF directamente con la fuente estándar Helvetica-Bold.
// Cuando exista un servidor, este módulo se puede sustituir por el
// generador de documentos del backend.
// ============================================================

// Anchos de Helvetica-Bold (milésimas de em), códigos 32 a 255 (WinAnsi).
const ANCHOS = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,278,278,556,500,1000,556,556,333,1000,667,333,1000,278,611,278,278,278,278,500,500,350,556,1000,333,1000,556,333,944,278,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];

// Hoja tamaño oficio, como el formato que usan las mesas.
const PAGINA = { ancho: 612, alto: 964 };
const MARGEN = { x: 60, arriba: 70, abajo: 60 };
const COLUMNAS = [26, 88, 104, 104, 170];
const TAMANO = 8.5;
const INTERLINEA = 10.5;
const RELLENO = 4;

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO",
  "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

const ROMANOS = { 1: "I", 2: "II", 3: "III" };

// Caracteres de Windows-1252 que no coinciden con Latin-1.
const ESPECIALES = {
  "€": 128, "‚": 130, "„": 132, "…": 133, "‘": 145, "’": 146,
  "“": 147, "”": 148, "•": 149, "–": 150, "—": 151,
};

function codigos(texto) {
  return Array.from(String(texto ?? "")).map((caracter) => {
    const codigo = caracter.codePointAt(0);

    if (ESPECIALES[caracter]) return ESPECIALES[caracter];
    if (codigo === 9 || codigo === 10 || codigo === 13) return 32;
    if (codigo >= 32 && codigo <= 126) return codigo;
    if (codigo >= 160 && codigo <= 255) return codigo;

    return 63; // "?"
  });
}

function anchoTexto(texto, tam = TAMANO) {
  return (
    codigos(texto).reduce((suma, c) => suma + (ANCHOS[c - 32] || 556), 0) *
    (tam / 1000)
  );
}

// Cadena PDF: paréntesis escapados y acentos en octal (archivo ASCII).
function cadenaPdf(texto) {
  return (
    "(" +
    codigos(texto)
      .map((c) => {
        if (c === 40 || c === 41 || c === 92) return "\\" + String.fromCharCode(c);
        if (c > 126) return "\\" + c.toString(8).padStart(3, "0");
        return String.fromCharCode(c);
      })
      .join("") +
    ")"
  );
}

// Parte un texto en renglones que caben en anchoMax.
function partir(texto, anchoMax, tam = TAMANO) {
  const renglones = [];

  String(texto ?? "")
    .split(/\n/)
    .forEach((parrafo) => {
      const palabras = parrafo.trim().split(/\s+/).filter(Boolean);
      let actual = "";

      if (!palabras.length) {
        renglones.push("");
        return;
      }

      palabras.forEach((palabra) => {
        // Palabra más ancha que la celda: se corta por caracteres.
        while (anchoTexto(palabra, tam) > anchoMax) {
          let corte = palabra.length - 1;

          while (
            corte > 1 &&
            anchoTexto(palabra.slice(0, corte), tam) > anchoMax
          ) {
            corte -= 1;
          }

          if (actual) {
            renglones.push(actual);
            actual = "";
          }

          renglones.push(palabra.slice(0, corte));
          palabra = palabra.slice(corte);
        }

        const candidato = actual ? actual + " " + palabra : palabra;

        if (anchoTexto(candidato, tam) <= anchoMax) {
          actual = candidato;
        } else {
          renglones.push(actual);
          actual = palabra;
        }
      });

      if (actual) renglones.push(actual);
    });

  return renglones;
}

const mayus = (texto) => String(texto ?? "").toLocaleUpperCase("es-MX");

export function fechaLarga(fechaISO) {
  const [anio, mes, dia] = String(fechaISO || "").slice(0, 10).split("-");

  return `${dia} DE ${MESES[Number(mes) - 1] || ""} DEL AÑO ${anio}`;
}

export function mesaRomano(mesa) {
  return ROMANOS[mesa] || String(mesa ?? "");
}

export function tituloLista(lista) {
  return `LISTA DE ACUERDOS # ${lista.numero} DE FECHA ${fechaLarga(lista.fecha)}.`;
}

// Nombre de archivo con el formato que ya usan las mesas:
// M1_LISTA_DE_ACDOS_No_249_10_NOV_2026.pdf
export function nombreArchivoLista(lista) {
  const [anio, mes, dia] = String(lista.fecha || "").slice(0, 10).split("-");
  const mesCorto = (MESES[Number(mes) - 1] || "").slice(0, 3);

  return `M${lista.mesa}_LISTA_DE_ACDOS_No_${lista.numero}_${dia}_${mesCorto}_${anio}.pdf`;
}

// ------------------------------------------------------------
// ARCHIVO PDF
// Recibe las páginas (lista de operaciones de dibujo cada una) y el
// tamaño de hoja; devuelve el Blob. Lo comparten las listas de las
// mesas y las de amparos directos.
// ------------------------------------------------------------
function ensamblarPdf(paginas, pagina) {
  // ---------------------------------------------------------
  // ARCHIVO
  // ---------------------------------------------------------
  const objetos = [];
  const agregar = (cuerpo) => objetos.push(cuerpo);

  const ids = paginas.map((_, i) => ({ pagina: 4 + i * 2, contenido: 5 + i * 2 }));

  agregar("<< /Type /Catalog /Pages 2 0 R >>");
  agregar(`<< /Type /Pages /Kids [${ids.map((id) => id.pagina + " 0 R").join(" ")}] /Count ${paginas.length} >>`);
  agregar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  paginas.forEach((operaciones, i) => {
    const flujo = operaciones.join("\n");

    agregar(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pagina.ancho} ${pagina.alto}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${ids[i].contenido} 0 R >>`,
    );
    agregar(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const posiciones = [];

  objetos.forEach((cuerpo, i) => {
    posiciones.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
  });

  const inicioXref = pdf.length;

  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  posiciones.forEach((posicion) => {
    pdf += String(posicion).padStart(10, "0") + " 00000 n \n";
  });
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  // Todo el archivo es ASCII: un byte por carácter.
  const bytes = new Uint8Array(pdf.length);

  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i);

  return new Blob([bytes], { type: "application/pdf" });
}

// ------------------------------------------------------------
// GENERADOR
// ------------------------------------------------------------
export function generarPdfLista(lista) {
  const anchoTabla = COLUMNAS.reduce((a, b) => a + b, 0);
  const x0 = (PAGINA.ancho - anchoTabla) / 2;
  const tope = PAGINA.alto - MARGEN.arriba;
  const piso = MARGEN.abajo;

  const paginas = [];
  let ops = [];
  let y = tope;

  const nuevaPagina = () => {
    if (ops.length) paginas.push(ops);
    ops = ["0.6 w", "0 G", "0 g"];
    y = tope;
  };

  const rect = (x, yArriba, ancho, alto) => {
    ops.push(`${x.toFixed(2)} ${(yArriba - alto).toFixed(2)} ${ancho.toFixed(2)} ${alto.toFixed(2)} re S`);
  };

  // Texto centrado en una celda (renglones ya partidos).
  const textoCelda = (renglones, x, yArriba, ancho) => {
    renglones.forEach((renglon, indice) => {
      if (!renglon) return;

      const tx = x + (ancho - anchoTexto(renglon)) / 2;
      const ty = yArriba - RELLENO - TAMANO + 1.5 - indice * INTERLINEA;

      ops.push(`BT /F1 ${TAMANO} Tf ${tx.toFixed(2)} ${ty.toFixed(2)} Td ${cadenaPdf(renglon)} Tj ET`);
    });
  };

  const altoDe = (lineas) => lineas * INTERLINEA + RELLENO * 2;

  // Fila de celdas: [{ ancho, renglones }]
  const fila = (celdas) => {
    const alto = altoDe(Math.max(1, ...celdas.map((c) => c.renglones.length)));
    let x = x0;

    celdas.forEach((celda) => {
      rect(x, y, celda.ancho, alto);
      textoCelda(celda.renglones, x, y, celda.ancho);
      x += celda.ancho;
    });

    y -= alto;
  };

  const encabezadoColumnas = () => {
    fila(
      ["", "EXP.", "ACTOR", "DEMANDADO", "ACUERDO"].map((titulo, i) => ({
        ancho: COLUMNAS[i],
        renglones: [titulo],
      })),
    );
    y -= 6;
  };

  const filaAnio = (anio) => {
    fila([{ ancho: anchoTabla, renglones: [String(anio)] }]);
  };

  nuevaPagina();

  // Título + mesa
  const anchoMesa = 78;

  fila([
    {
      ancho: anchoTabla - anchoMesa,
      renglones: partir(tituloLista(lista), anchoTabla - anchoMesa - RELLENO * 2),
    },
    { ancho: anchoMesa, renglones: [`MESA ${mesaRomano(lista.mesa)}`] },
  ]);
  encabezadoColumnas();

  const filas = Array.isArray(lista.filas) ? lista.filas : [];
  const lineasPorPagina = Math.floor((tope - piso - 60) / INTERLINEA);
  let anioActual = null;

  if (!filas.length) {
    fila([{ ancho: anchoTabla, renglones: ["SIN ACUERDOS."] }]);
  }

  filas.forEach((registro) => {
    const celdas = [
      [""],
      partir(mayus(registro.expediente), COLUMNAS[1] - RELLENO * 2),
      partir(mayus(registro.actor), COLUMNAS[2] - RELLENO * 2),
      partir(mayus(registro.demandado), COLUMNAS[3] - RELLENO * 2),
      partir(
        (registro.acuerdos || []).map(mayus).join("\n\n"),
        COLUMNAS[4] - RELLENO * 2,
      ),
    ];

    const total = Math.max(...celdas.map((c) => c.length));

    // Una fila más alta que la hoja se reparte en varias.
    for (let inicio = 0; inicio < total; inicio += lineasPorPagina) {
      const trozo = celdas.map((c) => c.slice(inicio, inicio + lineasPorPagina));
      const alto = altoDe(Math.max(1, ...trozo.map((c) => c.length)));
      const cambiaAnio = inicio === 0 && registro.anio !== anioActual;
      const necesario = alto + (cambiaAnio ? altoDe(1) : 0);

      if (y - necesario < piso) {
        nuevaPagina();
        encabezadoColumnas();
      }

      if (cambiaAnio) {
        anioActual = registro.anio;
        filaAnio(anioActual || "S/A");
      }

      fila(trozo.map((renglones, i) => ({ ancho: COLUMNAS[i], renglones })));
    }
  });

  paginas.push(ops);

  return ensamblarPdf(paginas, PAGINA);
}

// ============================================================
// LISTA DE AMPAROS DIRECTOS
// Mismo estilo de tabla, con el formato de las listas de la Mesa de
// Amparos Directos:
//
//   LISTA NO. 102.
//   ÁREA DE AMPARO DIRECTO A ACTUARÍA.
//   --- 29 DE OCTUBRE DEL 2026 ---
//   No. DE EXPEDIENTE | ACTOR | DEMANDADO | ESTADO PROCESAL | FOJAS
//
// lista = { numero, fecha, filas: [{ expediente, actor, demandado,
//           estados: [texto], fojas }] }
// ============================================================
const PAGINA_AMPAROS = { ancho: 612, alto: 792 };
const COLUMNAS_AMPAROS = [80, 86, 86, 112, 46];
const TITULOS_AMPAROS = ["No. DE EXPEDIENTE", "ACTOR", "DEMANDADO", "ESTADO PROCESAL", "FOJAS"];
const AREA_AMPAROS = "ÁREA DE AMPARO DIRECTO A ACTUARÍA.";

export function fechaLargaAmparos(fechaISO) {
  const [anio, mes, dia] = String(fechaISO || "").slice(0, 10).split("-");

  return `${dia} DE ${MESES[Number(mes) - 1] || ""} DEL ${anio}`;
}

export function tituloListaAmparos(lista) {
  return `LISTA NO. ${lista.numero}.`;
}

// LISTA_DE_AMPAROS_No_102_29_OCT_2026.pdf
export function nombreArchivoListaAmparos(lista) {
  const [anio, mes, dia] = String(lista.fecha || "").slice(0, 10).split("-");
  const mesCorto = (MESES[Number(mes) - 1] || "").slice(0, 3);

  return `LISTA_DE_AMPAROS_No_${lista.numero}_${dia}_${mesCorto}_${anio}.pdf`;
}

export function generarPdfListaAmparos(lista) {
  const anchoTabla = COLUMNAS_AMPAROS.reduce((a, b) => a + b, 0);
  const x0 = (PAGINA_AMPAROS.ancho - anchoTabla) / 2;
  const tope = PAGINA_AMPAROS.alto - 60;
  const piso = 50;

  const paginas = [];
  let ops = [];
  let y = tope;

  const nuevaPagina = () => {
    if (ops.length) paginas.push(ops);
    ops = ["0.6 w", "0 G", "0 g"];
    y = tope;
  };

  const rect = (x, yArriba, ancho, alto) => {
    ops.push(
      `${x.toFixed(2)} ${(yArriba - alto).toFixed(2)} ${ancho.toFixed(2)} ${alto.toFixed(2)} re S`,
    );
  };

  // Texto centrado; renglones: [{ texto, tam, subrayado }]
  const textoCelda = (renglones, x, yArriba, ancho, altoFila) => {
    // Centrado vertical dentro de la celda
    let cursor =
      yArriba - RELLENO - (altoFila - altoRenglones(renglones)) / 2;

    renglones.forEach(({ texto, tam = TAMANO, subrayado = false }) => {
      const interlinea = tam + 2;

      if (texto) {
        const w = anchoTexto(texto, tam);
        const tx = x + (ancho - w) / 2;
        const ty = cursor - tam + 1.5;

        ops.push(
          `BT /F1 ${tam} Tf ${tx.toFixed(2)} ${ty.toFixed(2)} Td ${cadenaPdf(texto)} Tj ET`,
        );

        if (subrayado) {
          ops.push(
            `${tx.toFixed(2)} ${(ty - 1.5).toFixed(2)} m ${(tx + w).toFixed(2)} ${(ty - 1.5).toFixed(2)} l S`,
          );
        }
      }

      cursor -= interlinea;
    });
  };

  const altoRenglones = (renglones) =>
    renglones.reduce((suma, r) => suma + (r.tam || TAMANO) + 2, 0) + RELLENO * 2;

  // Fila de celdas: [{ ancho, renglones: [{ texto, tam?, subrayado? }] }]
  const fila = (celdas) => {
    const alto = Math.max(...celdas.map((c) => altoRenglones(c.renglones)));
    let x = x0;

    celdas.forEach((celda) => {
      rect(x, y, celda.ancho, alto);
      textoCelda(celda.renglones, x, y, celda.ancho, alto);
      x += celda.ancho;
    });

    y -= alto;
  };

  const partirRenglones = (texto, ancho, tam = TAMANO) =>
    partir(texto, ancho - RELLENO * 2, tam).map((t) => ({ texto: t, tam }));

  const encabezadoColumnas = () => {
    fila(
      TITULOS_AMPAROS.map((titulo, i) => ({
        ancho: COLUMNAS_AMPAROS[i],
        renglones: partirRenglones(titulo, COLUMNAS_AMPAROS[i], 9),
      })),
    );
  };

  nuevaPagina();

  // Título, área y fecha (cada bloque en su propia celda, como el original)
  fila([
    {
      ancho: anchoTabla,
      renglones: [{ texto: tituloListaAmparos(lista), tam: 16 }],
    },
  ]);
  fila([
    {
      ancho: anchoTabla,
      renglones: [
        { texto: AREA_AMPAROS, tam: 9 },
        { texto: `--- ${fechaLargaAmparos(lista.fecha)} ---`, tam: 9, subrayado: true },
      ],
    },
  ]);
  encabezadoColumnas();

  const filas = Array.isArray(lista.filas) ? lista.filas : [];
  const lineasPorPagina = Math.floor((tope - piso - 60) / INTERLINEA);

  if (!filas.length) {
    fila([{ ancho: anchoTabla, renglones: [{ texto: "SIN AMPAROS.", tam: TAMANO }] }]);
  }

  filas.forEach((registro) => {
    const celdas = [
      partirRenglones(mayus(registro.expediente), COLUMNAS_AMPAROS[0]),
      partirRenglones(mayus(registro.actor), COLUMNAS_AMPAROS[1]),
      partirRenglones(mayus(registro.demandado), COLUMNAS_AMPAROS[2]),
      partirRenglones(
        (registro.estados || []).map(mayus).join("\n\n"),
        COLUMNAS_AMPAROS[3],
      ),
      partirRenglones(String(registro.fojas ?? ""), COLUMNAS_AMPAROS[4]),
    ];

    const total = Math.max(...celdas.map((c) => c.length));

    // Una fila más alta que la hoja se reparte en varias.
    for (let inicio = 0; inicio < total; inicio += lineasPorPagina) {
      const trozo = celdas.map((c) => c.slice(inicio, inicio + lineasPorPagina));
      const alto = Math.max(...trozo.map((c) => altoRenglones(c)));

      if (y - alto < piso) {
        nuevaPagina();
        encabezadoColumnas();
      }

      fila(trozo.map((renglones, i) => ({ ancho: COLUMNAS_AMPAROS[i], renglones })));
    }
  });

  paginas.push(ops);

  return ensamblarPdf(paginas, PAGINA_AMPAROS);
}
