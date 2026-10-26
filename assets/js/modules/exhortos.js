// =====================================================
// MODULO EXHORTOS
// =====================================================

import { getData, saveData } from "../storage.js";

import { createId, escapeHTML, escapeJS, formatDate } from "../utils.js";

let exhortos = [];

// =====================================================
// INICIALIZAR
// =====================================================

export function initExhortos() {
  exhortos = getData("exhortos", []);

  window.openExhortoForm = openExhortoForm;

  window.renderExhortos = renderExhortos;

  window.viewExhorto = viewExhorto;
}

// =====================================================
// TABLA
// =====================================================

export function renderExhortos() {
  exhortos = getData("exhortos", []);
  const table = document.getElementById("exhortosTable");

  if (!table) {
    return;
  }

  if (exhortos.length === 0) {
    table.innerHTML = `

        <tr>

        <td colspan="9">

        No existen exhortos registrados.

        </td>

        </tr>

        `;

    return;
  }

  table.innerHTML = exhortos
    .map(
      (item) => `



<tr>



<td>

${escapeHTML(item.numero)}

</td>





<td>

${formatDate(item.fecha)}

</td>





<td>

${escapeHTML(item.origen)}

</td>





<td>
${escapeHTML(item.actor || item.actorDemandado)}
</td>

<td>
${escapeHTML(item.demandado)}
</td>





<td>

${escapeHTML(item.autoridad)}

</td>





<td>

${escapeHTML(item.promocion)}

</td>





<td>

<span class="badge">

${escapeHTML(item.estado)}

</span>

</td>





<td>


${escapeHTML(item.ubicacion)}



</td>





</tr>



`,
    )
    .join("");
}

// =====================================================
// FORMULARIO
// =====================================================

export function openExhortoForm() {
  const modal = document.getElementById("modalContent");

  modal.innerHTML = `



<div class="form-header">


<span>
Exhortos
</span>


<h2>
Nuevo exhorto
</h2>


</div>







<div class="form-body">



<form id="exhortoForm">





<div class="form-grid">





<div class="field">


<label>
Número exhorto
</label>


<input
id="numeroExhorto"
required
>


</div>






<div class="field">


<label>
Fecha llegada
</label>


<input
type="date"
id="fechaExhorto"
required
>


</div>







<div class="field">


<label>
Número exhorto origen
</label>


<input
id="origenExhorto"
>


</div>







<div class="field">


<label>
Actor demandado
</label>


<input
id="actorDemandado"
>


</div>







<div class="field">


<label>
Autoridad exhortante
</label>


<input
id="autoridadExhortante"
>


</div>







<div class="field">


<label>
Estado
</label>


<select
id="estadoExhorto"
>


<option>
Recibido
</option>


<option>
En trámite
</option>


<option>
Concluido
</option>


</select>


</div>







<div class="field">


<label>
Ubicación
</label>


<input
id="ubicacionExhorto"
>


</div>







<div class="field full">


<label>
Promoción
</label>


<textarea
id="promocionExhorto"
placeholder="
Número expediente y número oficio
"
></textarea>


</div>






</div>







<div class="form-actions">


<button

type="button"

class="secondary-btn"

onclick="closeModal()"

>

Cancelar

</button>





<button

class="primary-btn"

>

Guardar exhorto

</button>



</div>





</form>



</div>



`;

  document.getElementById("modal").classList.add("show");

  document.getElementById("exhortoForm").addEventListener(
    "submit",

    saveExhorto,
  );
}

// =====================================================
// GUARDAR
// =====================================================

function saveExhorto(event) {
  event.preventDefault();

  const exhorto = {
    id: createId(),

    numero: document.getElementById("numeroExhorto").value,

    fecha: document.getElementById("fechaExhorto").value,

    origen: document.getElementById("origenExhorto").value,

    actorDemandado: document.getElementById("actorDemandado").value,

    autoridad: document.getElementById("autoridadExhortante").value,

    promocion: document.getElementById("promocionExhorto").value,

    estado: document.getElementById("estadoExhorto").value,

    ubicacion: document.getElementById("ubicacionExhorto").value,

    creadoEn: new Date().toISOString(),
  };

  exhortos.unshift(exhorto);

  saveData("exhortos", exhortos);

  renderExhortos();

  closeModal();
}

// =====================================================
// DETALLE
// =====================================================

export function viewExhorto(id) {
  const exhorto = exhortos.find((item) => item.id === id);

  if (!exhorto) {
    return;
  }

  const modal = document.getElementById("modalContent");

  modal.innerHTML = `



<div class="form-header">


<span>
Detalle exhorto
</span>


<h2>

${escapeHTML(exhorto.numero)}

</h2>


</div>





<div class="form-body">


<div class="detail-grid">

<div class="detail-item">
<span>Tipo de exhorto</span>
<strong>${exhorto.interno ? "Interno" : "Externo"}</strong>
</div>

<div class="detail-item">
<span>Requerimiento o solicitud</span>
<strong>${escapeHTML(exhorto.requerimiento) || "—"}</strong>
</div>

<div class="detail-item">

<span>
Autoridad exhortante
</span>


<strong>

${escapeHTML(exhorto.autoridad)}

</strong>

</div>





<div class="detail-item">
<span>Actor</span>
<strong>${escapeHTML(exhorto.actor || exhorto.actorDemandado) || "—"}</strong>
</div>

<div class="detail-item">
<span>Demandado</span>
<strong>${escapeHTML(exhorto.demandado) || "—"}</strong>
</div>





<div class="detail-item">

<span>
Promoción
</span>


<strong>

${escapeHTML(exhorto.promocion)}

</strong>

</div>





<div class="detail-item">

<span>
Ubicación
</span>


<strong>

${escapeHTML(exhorto.ubicacion)}

</strong>

</div>

${
  exhorto.expedienteVinculado
    ? `
<div class="detail-item">
<span>Expediente vinculado</span>
<strong>${escapeHTML(exhorto.expedienteVinculado)}</strong>
</div>`
    : ""
}



</div>


</div>


`;

  document.getElementById("modal").classList.add("show");
}
