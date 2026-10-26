// =====================================================
// RESUMEN DIARIO
// Dashboard Tribunal
// =====================================================

import { getData } from "../storage.js";

import { todayISO, formatDate } from "../utils.js";

// =====================================================
// INICIALIZAR
// =====================================================

export function initResumen() {
  window.updateDailySummary = updateDailySummary;
}

// =====================================================
// ACTUALIZAR RESUMEN
// =====================================================

export function updateDailySummary() {
  const hoy = todayISO();

  const demandas = getData("demandas", []);

  const amparos = getData("amparos", []);

  const exhortos = getData("exhortos", []);

  const promociones = getData("promociones", []);

  const oficios = getData("oficios", []);

  const demandasHoy = demandas.filter((item) => item.creadoEn?.startsWith(hoy));

  const amparosHoy = amparos.filter((item) => item.creadoEn?.startsWith(hoy));

  const exhortosHoy = exhortos.filter((item) => item.creadoEn?.startsWith(hoy));

  const promocionesHoy = promociones.filter((item) =>
    item.creadoEn?.startsWith(hoy),
  );

  const oficiosHoy = oficios.filter((item) => item.creadoEn?.startsWith(hoy));

  const total =
    demandasHoy.length +
    amparosHoy.length +
    exhortosHoy.length +
    promocionesHoy.length +
    oficiosHoy.length;

  // TOTAL

  const totalElement = document.getElementById("dailyTotal");

  if (totalElement) {
    totalElement.textContent = total;
  }

  // CONTADORES

  setText("dailyDemandas", demandasHoy.length);

  setText("dailyAmparos", amparosHoy.length);

  setText("dailyExhortos", exhortosHoy.length);

  setText("dailyPromociones", promocionesHoy.length);

  setText("dailyOficios", oficiosHoy.length);

  // FECHA

  const date = document.getElementById("dailyDate");

  if (date) {
    date.textContent = formatDate(hoy);
  }

  renderRecentCaptures([
    ...demandasHoy.map((x) => ({
      tipo: "Demanda",
      fecha: x.creadoEn,
      referencia: x.expediente,
    })),

    ...amparosHoy.map((x) => ({
      tipo: "Amparo",
      fecha: x.creadoEn,
      referencia: x.expediente,
    })),

    ...exhortosHoy.map((x) => ({
      tipo: "Exhorto",
      fecha: x.creadoEn,
      referencia: x.numero,
    })),

    ...promocionesHoy.map((x) => ({
      tipo: "Promoción",
      fecha: x.creadoEn,
      referencia: x.numero,
    })),

    ...oficiosHoy.map((x) => ({
      tipo: "Oficio",
      fecha: x.creadoEn,
      referencia: x.numero,
    })),
  ]);
}

// =====================================================
// TEXTO SIMPLE
// =====================================================

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

// =====================================================
// ULTIMAS CAPTURAS
// =====================================================

function renderRecentCaptures(data) {
  const container = document.getElementById("dailyRecentCaptures");

  if (!container) {
    return;
  }

  if (data.length === 0) {
    container.innerHTML = `

        <div class="daily-empty">

        No hay capturas realizadas hoy.

        </div>

        `;

    return;
  }

  data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  container.innerHTML = data
    .slice(0, 5)
    .map(
      (item) => `


<div class="daily-recent-item">


<div class="daily-recent-top">


<strong>

${item.tipo}

</strong>


<span>

${new Date(item.fecha).toLocaleTimeString("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
})}

</span>


</div>



<p>

${item.referencia}

</p>



</div>


`,
    )
    .join("");
}
