// =====================================================
// DASHBOARD HOME
// =====================================================


import {
    getData
}
from "../storage.js";


import {
    escapeHTML,
    escapeJS,
    formatDate
}
from "../utils.js";



import {
    updateDailySummary
}
from "./resumen.js";





let expedientes = [];




// =====================================================
// INICIALIZAR
// =====================================================


export function initDashboard(){


    window.initDashboardPage =
        initDashboardPage;



}









// =====================================================
// CARGAR DASHBOARD
// =====================================================


export function initDashboardPage(){



    expedientes =
        getData(
            "expedientes",
            []
        );



    setupSearch();



    renderRecentExpedientes();



    updateDailySummary();



    setDashboardDate();



}









// =====================================================
// BUSCADOR
// =====================================================


function setupSearch(){



    const input =
        document.getElementById(
            "expedienteSearch"
        );



    const button =
        document.getElementById(
            "searchExpedienteBtn"
        );



    if(
        !input ||
        !button
    ){

        return;

    }






    button.onclick = ()=>{


        searchExpediente(
            input.value
        );


    };



}









function searchExpediente(
numero
){



    const result =
        document.getElementById(
            "searchResult"
        );



    if(!result){

        return;

    }





    if(
        !numero.trim()
    ){


        result.innerHTML = `

        <p class="error-text">

        Ingresa un número de expediente.

        </p>

        `;


        return;

    }






    const expediente =
        expedientes.find(

            item =>

            item.numero
            .toLowerCase()
            .includes(
                numero
                .toLowerCase()
            )

        );






    if(!expediente){


        result.innerHTML = `

        <div class="empty-result">

        No se encontró el expediente.

        <br>

        Puedes crear uno nuevo.

        </div>

        `;


        return;


    }







    result.innerHTML = `


<div class="search-result-card">


<h3>

Expediente encontrado

</h3>



<p>

<strong>
Número:
</strong>

${escapeHTML(
    expediente.numero
)}

</p>




<p>

<strong>
Actor:
</strong>

${escapeHTML(
    expediente.actor
)}

</p>



<p>

<strong>
Demandado:
</strong>

${escapeHTML(
    expediente.demandado
)}

</p>




<button

class="primary-btn"

onclick="
viewExpediente('${escapeJS(expediente.numero)}')
"

>

Ver expediente

</button>



</div>


`;



}









// =====================================================
// EXPEDIENTES RECIENTES
// =====================================================


function renderRecentExpedientes(){



    const table =
        document.getElementById(
            "recentTable"
        );



    if(!table){

        return;

    }





    if(
        expedientes.length === 0
    ){


        table.innerHTML = `


<tr>

<td colspan="6">

No hay expedientes registrados.

</td>

</tr>


`;


        return;

    }






    table.innerHTML =

    expedientes

    .slice(
        0,
        5
    )

    .map(

        item => `



<tr>


<td>

<strong>

${escapeHTML(
    item.numero
)}

</strong>

</td>





<td>

${escapeHTML(
    item.actor
)}

</td>





<td>

${escapeHTML(
    item.demandado
)}

</td>





<td>

<span class="badge">

${escapeHTML(
    item.estado
)}

</span>

</td>





<td>

${escapeHTML(
    item.ubicacion
)}

</td>





<td>


<button

class="table-action"

onclick="
viewExpediente('${escapeJS(item.numero)}')
"

>

Ver

</button>


</td>



</tr>



`

    )

    .join("");

}









// =====================================================
// FECHA DASHBOARD
// =====================================================


function setDashboardDate(){



    const element =
        document.getElementById(
            "dailyDate"
        );



    if(!element){

        return;

    }





    element.textContent =

    new Date()
    .toLocaleDateString(
        "es-MX",
        {

            day:"2-digit",

            month:"long",

            year:"numeric"

        }

    );


}