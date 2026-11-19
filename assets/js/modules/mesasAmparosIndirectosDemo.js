import {
  getData,
  saveData
} from "../storage.js";

const KEY_AMPAROS =
  "amparos";

const KEY_SEGUIMIENTO =
  "mesasAmparosSeguimiento";

const KEY_INFORMES =
  "mesasAmparosIndirectosInformes";

const DEMO_VERSION =
  "ai-demo-v3";


// ============================================================
// CARGAR JSON DEMO
// ============================================================

export async function cargarDemoAmparosIndirectos() {

  const response =
    await fetch(
      "./assets/data/amparosIndirectosDemo.json"
    );


  if (!response.ok) {

    throw new Error(
      "No se pudo cargar amparosIndirectosDemo.json"
    );

  }


  const data =
    await response.json();


  const amparos =
    getData(
      KEY_AMPAROS,
      []
    );


  const seguimiento =
    getData(
      KEY_SEGUIMIENTO,
      {}
    );


  const informes =
    getData(
      KEY_INFORMES,
      []
    );


  // ==========================================================
  // LIMPIAR VERSIÓN DEMO ANTERIOR
  // ==========================================================

  const amparosLimpios =
    amparos.filter(
      item =>
        !String(
          item.demoKey ||
          ""
        ).startsWith(
          "ai-demo-"
        )
    );


  const informesLimpios =
    informes.filter(
      item =>
        !String(
          item.demoKey ||
          ""
        ).startsWith(
          "ai-demo-"
        )
    );


  Object.keys(
    seguimiento
  )
    .filter(
      id =>
        /^AMP-I[1-8]$/.test(
          id
        )
    )
    .forEach(
      id => {

        delete seguimiento[id];

      }
    );


  // ==========================================================
  // AMPAROS
  // ==========================================================

  data.amparos.forEach(
    item => {

      const llegada =
        fechaHoras(
          item.llegadaOffsetHoras ||
          0
        );


      const amparo = {

        ...item,

        dia:
          llegada.slice(
            0,
            10
          ),

        llegadaOficialiaEn:
          llegada

      };


      delete amparo
        .llegadaOffsetHoras;


      amparosLimpios.push(
        amparo
      );


      seguimiento[
        String(item.id)
      ] = {

        tipo:
          "indirecto",

        etapa:
          item.etapa ||
          "recibido",

        situacion:
          item.situacion ||
          "esperando-cumplimiento",

        desde:
          llegada,

        recibidoMesaIndirectos:
          item.recibido ===
          true,

        recibidoMesaIndirectosEn:
          item.recibido
            ? fechaHoras(-1)
            : null,

        recibidoMesaIndirectosPor:
          item.recibido
            ? "Amparos Indirectos"
            : null,

        plazoClave:
          item.plazoClave,

        firmaRecibido:
          item.recibido
            ? "Personal de Amparos"
            : null,

        motivoRecibido:
          item.actoReclamado,

        cuad: {

          laudo:
            item.etapa ===
            "cuadernillo",

          notificaciones:
            item.etapa ===
            "cuadernillo",

          demanda:
            item.etapa ===
            "cuadernillo",

          informe:
            item.etapa ===
            "cuadernillo"

        },

        historial: [
          {
            fecha:
              llegada,

            movimiento:
              "Ingreso a Oficialía de Partes",

            por:
              "Oficialía"
          }
        ]

      };

    }
  );


  // ==========================================================
  // INFORMES
  // ==========================================================

  data.informes.forEach(
    item => {

      const fecha =
        fechaDias(
          item.fechaOffsetDias ||
          0
        );


      informesLimpios.push({

        ...item,

        fecha,

        fechaRecepcion:
          fecha,

        origen:
          "recibido",

        recibidoEn:
          `${fecha}T10:00:00`,

        recibidoPor:
          "Amparos Indirectos",

        creadoEn:
          `${fecha}T10:00:00`,

        creadoPor:
          "Amparos Indirectos"

      });

    }
  );


  // ==========================================================
  // GUARDAR
  // ==========================================================

  saveData(
    KEY_AMPAROS,
    amparosLimpios
  );


  saveData(
    KEY_SEGUIMIENTO,
    seguimiento
  );


  saveData(
    KEY_INFORMES,
    informesLimpios
  );


  localStorage.setItem(
    "amparosIndirectosDemoVersion",
    DEMO_VERSION
  );


  return {
    ok:
      true
  };

}


// ============================================================
// FECHAS
// ============================================================

function fechaHoras(
  offset
) {

  return new Date(
    Date.now() +
    offset *
    60 *
    60 *
    1000
  )
    .toISOString();

}


function fechaDias(
  offset
) {

  const fecha =
    new Date();


  fecha.setDate(
    fecha.getDate() +
    offset
  );


  return fecha
    .toISOString()
    .slice(
      0,
      10
    );

}