// =====================================================
// MODULO PROMOCIONES
// =====================================================

import { getData, saveData } from "../storage.js";

import { createId, escapeHTML, escapeJS, formatDate } from "../utils.js";

let promociones = [];

// =====================================================
// INICIALIZAR
// =====================================================

export function initPromociones() {
  promociones = getData("promociones", []);

  window.openPromocionForm = openPromocionForm;

  window.renderPromociones = renderPromociones;

  window.viewPromocion = viewPromocion;
}

// =====================================================
// RENDER TABLA
// =====================================================

export function renderPromociones() {
  // 1. Recargar los datos actualizados desde localStorage
  promociones = getData("promociones", []);

  const table = document.getElementById("promocionesTable");

  if (!table) {
    return;
  }

  if (promociones.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="5">No existen promociones registradas.</td>
      </tr>
    `;
    return;
  }

  // 2. Renderizar filas (Como quitaste Número de Promoción, usamos item.expediente en la primera columna o ajustamos las columnas)
  table.innerHTML = promociones
    .map(
      (item) => `
      <tr>
        <td>${escapeHTML(item.expediente)}</td>
        <td>${escapeHTML(item.oficio || "-")}</td>
        <td>${formatDate(item.fecha)}</td>
        <td>${escapeHTML(item.tipo)}</td>
        <td>${escapeHTML(item.descripcion)}</td>
        <td>
          <button class="table-action" onclick="viewPromocion('${escapeJS(item.id)}')">
            Ver
          </button>
        </td>
      </tr>
    `
    )
    .join("");
}

// =====================================================
// FORMULARIO
// =====================================================

export function openPromocionForm() {
  const modal = document.getElementById("modalContent");

  modal.innerHTML = `



<div class="form-header">


<span>
Promociones
</span>


<h2>
Nueva promoción
</h2>


</div>






<div class="form-body">



<form id="promocionForm">





<div class="form-grid">





<div class="field">


<label>
Número promoción
</label>


<input

id="numeroPromocion"

required

>


</div>







<div class="field">


<label>
Número expediente
</label>


<input

id="expedientePromocion"

required

>


</div>







<div class="field">


<label>
Número oficio relacionado
</label>


<input

id="oficioPromocion"

>


</div>







<div class="field">


<label>
Fecha
</label>


<input

type="date"

id="fechaPromocion"

required

>


</div>







<div class="field">


<label>
Tipo de promoción
</label>


<select

id="tipoPromocion"

>


<option>
Escrito
</option>


<option>
Solicitud
</option>


<option>
Notificación
</option>


<option>
Otro
</option>


</select>


</div>







<div class="field">


<label>
Estado
</label>


<select

id="estadoPromocion"

>


<option>
Recibida
</option>


<option>
En revisión
</option>


<option>
Atendida
</option>


</select>


</div>







<div class="field full">


<label>
Descripción
</label>


<textarea

id="descripcionPromocion"

rows="4"

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

Guardar promoción

</button>



</div>





</form>



</div>



`;

  document.getElementById("modal").classList.add("show");

  document.getElementById("promocionForm").addEventListener(
    "submit",

    savePromocion,
  );
}

// =====================================================
// GUARDAR
// =====================================================

function savePromocion(event) {
  event.preventDefault();

  const expedienteVal = document.getElementById("expedientePromocion")?.value.trim() || "";

  const promocion = {
    id: createId(),
    numero: expedienteVal, // Reemplazamos numeroPromocion por expedienteVal
    expediente: expedienteVal,
    oficio: document.getElementById("oficioPromocion")?.value || "",
    fecha: document.getElementById("fechaPromocion")?.value || "",
    tipo: document.getElementById("tipoPromocion")?.value || "",
    descripcion: document.getElementById("descripcionPromocion")?.value || "",
    estado: document.getElementById("estadoPromocion")?.value || "",
    creadoEn: new Date().toISOString(),
  };

  // 1. Obtener lista actual de localStorage
  const promocionesActuales = getData("promociones", []);
  
  // 2. Agregar nuevo elemento al inicio
  promocionesActuales.unshift(promocion);

  // 3. Guardar en localStorage
  saveData("promociones", promocionesActuales);

  // 4. Actualizar tabla y cerrar modal
  renderPromociones();
  closeModal();
}

// =====================================================
// DETALLE
// =====================================================

export function viewPromocion(id) {
  const promocion = promociones.find((item) => item.id === id);

  if (!promocion) {
    return;
  }

  const modal = document.getElementById("modalContent");

  modal.innerHTML = `



<div class="form-header">


<span>
Detalle promoción
</span>


<h2>
${escapeHTML(promocion.numero)}
</h2>


</div>






<div class="form-body">


<div class="detail-grid">



<div class="detail-item">

<span>
Expediente
</span>


<strong>
${escapeHTML(promocion.expediente)}
</strong>

</div>





<div class="detail-item">

<span>
Oficio relacionado
</span>


<strong>
${escapeHTML(promocion.oficio)}
</strong>

</div>





<div class="detail-item">

<span>
Tipo
</span>


<strong>
${escapeHTML(promocion.tipo)}
</strong>

</div>





<div class="detail-item">

<span>
Descripción
</span>


<strong>
${escapeHTML(promocion.descripcion)}
</strong>

</div>




</div>


</div>



`;

  document.getElementById("modal").classList.add("show");
}
