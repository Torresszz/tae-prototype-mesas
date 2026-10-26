# Tribunal Mockup

Sistema web para la gestión jurídica del Tribunal.

El proyecto está construido actualmente con **HTML, CSS y JavaScript modular**, sin React ni frameworks, con el objetivo de mantener una arquitectura clara y facilitar una futura migración.

## 1. Objetivo del proyecto

La aplicación permite registrar, consultar y organizar movimientos jurídicos como:

- Expedientes
- Demandas
- Amparos
- Exhortos
- Promociones
- Oficios
- Resumen histórico
- Resumen diario de capturas

El sistema todavía funciona como prototipo frontend y utiliza principalmente `localStorage` y archivos `.json` para datos de prueba.

## 2. Tecnologías

- HTML5
- CSS3
- JavaScript ES Modules
- Font Awesome
- LocalStorage
- JSON
- Live Server para desarrollo local

No agregar React, Vue, Angular, Bootstrap, Tailwind u otro framework sin acuerdo del equipo.

## 3. Estructura general del proyecto

```text
tribunal-mockup/
│
├── index.html
├── README.md
├── assets/
│   ├── css/
│   │   ├── styles.css
│   │   ├── demandas.css
│   │   ├── amparos.css
│   │   ├── historico.css
│   │   └── [modulo].css
│   ├── data/
│   │   ├── entes.json
│   │   ├── acciones-reclamadas.json
│   │   ├── expedientes-ejemplo.json
│   │   ├── amparos-ejemplo.json
│   │   └── historico-ejemplo.json
│   ├── icons/
│   └── js/
│       ├── app.js
│       ├── storage.js
│       ├── utils.js
│       ├── dashboard/
│       │   └── dashboard.js
│       ├── modules/
│       │   ├── expedientes.js
│       │   ├── demandas.js
│       │   ├── amparos.js
│       │   ├── exhortos.js
│       │   ├── promociones.js
│       │   ├── oficios.js
│       │   └── historico.js
│       └── forms/
│           ├── formHelper.js
│           ├── expedienteForm.js
│           ├── demandaForm.js
│           ├── amparoForm.js
│           ├── exhortoForm.js
│           ├── promocionForm.js
│           └── oficioForm.js
├── components/
│   └── [componentes compartidos]
└── pages/
    ├── inicio.html
    ├── expedientes.html
    ├── demandas.html
    ├── amparos.html
    ├── exhortos.html
    ├── promociones.html
    ├── oficios.html
    └── resumenHistorico.html
```

## 4. Cómo ejecutar el proyecto

No abrir `index.html` directamente con doble clic.

Se recomienda usar **Live Server** en VS Code.

1. Abrir la carpeta raíz del proyecto.
2. Abrir `index.html`.
3. Ejecutar `Open with Live Server`.
4. Abrir normalmente:

```text
http://127.0.0.1:5500/
```

Esto es necesario porque el proyecto utiliza `fetch(...)`, módulos ES y archivos JSON.

## 5. Regla principal de arquitectura

Cada módulo tiene responsabilidades separadas.

```text
pages/*.html
        ↓
estructura visual

assets/css/[modulo].css
        ↓
diseño del módulo

assets/js/modules/[modulo].js
        ↓
lógica de la página / tabla

assets/js/forms/[modulo]Form.js
        ↓
formulario modal

assets/data/*.json
        ↓
catálogos / datos demo

storage.js
        ↓
lectura y escritura en localStorage
```

No colocar toda la lógica nuevamente dentro de `app.js`.

## 6. Responsabilidad de app.js

`app.js` es el punto central de inicialización y navegación.

Debe encargarse de:

- Inicializar los módulos.
- Inicializar formularios.
- Controlar navegación.
- Cargar páginas/componentes cuando corresponda.
- Ejecutar el inicializador correcto después de cargar una página.

No debe contener formularios completos ni cientos de líneas específicas de un módulo.

Ejemplo:

```javascript
import { initDemandas } from "./modules/demandas.js";
import { initAmparosPage } from "./modules/amparos.js";

import { initDemandaForm } from "./forms/demandaForm.js";
import { initAmparoForm } from "./forms/amparoForm.js";

function initModules() {
    initDemandas();
    initAmparosPage();

    initDemandaForm();
    initAmparoForm();
}
```

## 7. Páginas cargadas dinámicamente

Si una página se inserta con `fetch()`, su inicialización debe ocurrir **después de agregar el HTML al DOM**.

Correcto:

```javascript
const response = await fetch("./pages/amparos.html");
const html = await response.text();

content.innerHTML = html;

initAmparosPage();
```

Incorrecto:

```javascript
initAmparosPage();
content.innerHTML = html;
```

El segundo caso falla porque elementos como:

```html
<tbody id="amparosTable"></tbody>
```

todavía no existen.

## 8. Convención de módulos

Cada archivo de `modules/` debe controlar únicamente su página.

Ejemplo: `modules/amparos.js`.

Responsabilidades:

- Renderizar tabla.
- Buscar registros.
- Manejar botones de fila.
- Actualizar la vista.
- Leer información desde storage.
- Abrir formularios cuando sea necesario.

Ejemplo:

```javascript
export function initAmparosPage() {
    window.renderAmparos = renderAmparos;

    setupSearch();
    setupButtons();
    renderAmparos();
}
```

## 9. Convención de formularios

Los formularios van en:

```text
assets/js/forms/
```

Nunca poner el formulario completo dentro de `pages/`.

Responsabilidades:

- Abrir modal.
- Generar HTML del formulario.
- Validar.
- Autocompletar información.
- Guardar.
- Cerrar modal.
- Actualizar la tabla correspondiente.

Ejemplo:

```javascript
export function initAmparoForm() {
    window.openAmparoForm = openAmparoForm;
}
```

Después cualquier módulo puede hacer:

```javascript
window.openAmparoForm();
```

## 10. Modal global

Todos los formularios deben utilizar el mismo modal.

No crear un modal diferente por módulo.

Debe existir una estructura equivalente a:

```html
<div id="modal" class="modal">
    <div class="modal-card">

        <button
            id="modalCloseBtn"
            class="modal-close"
            type="button"
            aria-label="Cerrar"
        >
            <i class="fa-solid fa-xmark"></i>
        </button>

        <div id="modalContent"></div>

    </div>
</div>
```

### Reglas obligatorias

Todos los modales deben:

- Tener botón `X`.
- Tener botón Cancelar cuando aplique.
- Mantener el mismo diseño.
- No cerrarse haciendo clic fuera.
- Mantener scroll interno.
- No cortar inputs, selects o textareas.
- No permitir que los textos salgan de los botones.

No agregar lógica para cerrar el modal al pulsar el fondo.

## 11. Reglas visuales generales

Todo el sistema debe parecer una sola aplicación.

### Colores principales

Azul principal:

```css
#2b72d6
```

Azul oscuro / textos:

```css
#102b45
```

Fondo general:

```css
#f5f7fa
```

Bordes:

```css
#dce3ea
```

Azul muy claro:

```css
#e8f1ff
```

Evitar agregar colores nuevos sin necesidad.

## 12. Escala y zoom

La interfaz principal ya fue ajustada para que no se vea demasiado alejada.

No cambiar el zoom global sin revisar todas las vistas.

Actualmente se ha trabajado aproximadamente con:

```css
.app {
    zoom: 1.12;
}
```

Los formularios modales como Demandas y Amparos usan una escala independiente cercana a:

```css
zoom: 1.08;
```

Si se modifica el zoom:

1. Revisar Dashboard.
2. Revisar Sidebar.
3. Revisar tablas.
4. Revisar formularios.
5. Revisar que nada quede cortado.

No solucionar problemas de layout aumentando el zoom de manera arbitraria.

## 13. Estilo de páginas

Todas las páginas deben mantener la misma estructura visual:

```text
EYEBROW

Título principal
Descripción

[acción principal]

┌──────────────────────────────────┐
│ Buscador / filtros               │
├──────────────────────────────────┤
│ Tabla                            │
└──────────────────────────────────┘
```

## 14. Estilo de formularios

Todos los formularios nuevos deben seguir la estructura usada en Demandas y Amparos.

```text
MÓDULO
Registrar nuevo ...

Descripción

┌────────────────────────────────────────┐
│ 1  Identificación                     │
│    Descripción corta                  │
├────────────────────────────────────────┤
│ Campo              Campo              │
│ [...............]  [...............]   │
└────────────────────────────────────────┘

                 Cancelar   Registrar
```

Cada sección debe usar:

- Número visual.
- Título.
- Descripción corta.
- Card.
- Inputs alineados.
- Espaciado uniforme.

## 15. Espaciado recomendado

Labels:

```css
margin-bottom: 6px;
```

Inputs:

```css
height: 39px;
```

Separación entre campos:

```css
gap: 12px 14px;
```

Padding de secciones:

```css
padding: 13px;
```

Border radius:

```css
border-radius: 7px;
```

Secciones principales:

```css
border-radius: 9px;
```

No pegar un label directamente sobre un input.

## 16. Botones

Todos los botones deben cuidar que el texto nunca se salga.

```css
button {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    gap: 6px;

    white-space: nowrap;
}
```

Botón principal:

```css
background: #2b72d6;
color: #ffffff;
```

Botón secundario:

```css
background: #ffffff;
color: #1768cf;
border: 1px solid #b9cde3;
```

## 17. CSS por módulo

No seguir agregando todo a `styles.css`.

`styles.css` debe contener únicamente estilos globales:

- Reset
- Body
- Layout principal
- Sidebar
- Topbar
- Botones comunes
- Modal global
- Clases reutilizables

Después usar archivos separados:

```text
demandas.css
amparos.css
historico.css
exhortos.css
oficios.css
promociones.css
```

## 18. Convención de clases CSS

Usar prefijos por módulo.

Ejemplos:

```css
.demanda-form-shell
.demanda-section-header
.demanda-party-card

.amparo-form-shell
.amparo-section-header
.amparos-table

.historico-summary-card
.historico-send-btn
```

Evitar clases demasiado genéricas como:

```css
.card
.title
.box
.container2
```

## 19. LocalStorage

Mientras no exista backend, la información principal se guarda en `localStorage`.

Ejemplo:

```javascript
const amparos = getData("amparos", []);

amparos.unshift(nuevoAmparo);

saveData("amparos", amparos);
```

Claves actuales:

```text
expedientes
demandas
amparos
exhortos
promociones
oficios
enviosMesas
```

No cambiar los nombres de las claves sin revisar todos los módulos relacionados.

## 20. storage.js

Todo acceso a `localStorage` debe realizarse preferentemente mediante helpers.

Ejemplo:

```javascript
export function getData(key, fallback = []) {
    try {
        return JSON.parse(
            localStorage.getItem(key)
        ) ?? fallback;
    }
    catch {
        return fallback;
    }
}

export function saveData(key, data) {
    localStorage.setItem(
        key,
        JSON.stringify(data)
    );
}
```

## 21. JSON y catálogos

Los catálogos y datos de prueba van en:

```text
assets/data/
```

Ejemplos:

```text
entes.json
acciones-reclamadas.json
expedientes-ejemplo.json
amparos-ejemplo.json
historico-ejemplo.json
```

No colocar catálogos gigantes dentro de archivos JS.

## 22. Catálogos

Estructura recomendada:

```json
{
  "entes": [
    {
      "id": "secretaria-salud",
      "nombre": "Secretaría de Salud",
      "grupo": "Poder Ejecutivo",
      "activo": true
    }
  ]
}
```

Los catálogos deben utilizar IDs estables.

## 23. Expedientes existentes y autollenado

Cuando un formulario solicite un expediente, primero debe comprobar si ya existe.

Si existe:

- reutilizar datos ya capturados;
- evitar información duplicada;
- mostrar qué expediente se encontró;
- no sobrescribir información que el usuario ya escribió manualmente.

## 24. Demandas

El formulario actual contempla:

```text
1. Identificación
   - Número de expediente
   - Fecha
   - Observaciones de recepción

2. Actor y demandado
   - Persona física
   - Persona moral
   - Catálogo de entes

3. Terceros
   - Catálogo
   - Captura manual opcional

4. Acción reclamada
   - Selección por catálogo

5. Seguimiento
   - Estado
```

## 25. Amparos

El formulario actual contempla:

```text
1. Recepción
   - Día
   - Hora
   - Número de expediente

2. Información del amparo
   - Promovente
   - Número asignado por juzgado
   - Número de oficio
   - Estado

3. Acto reclamado

4. Acciones a realizar

5. Observaciones
```

Si se ingresa un expediente existente, se deben completar datos relacionados cuando corresponda.

La tabla de Amparos incluye:

```text
Anexar oficio
```

Esta acción debe abrir el formulario de Oficios manteniendo referencia al amparo y expediente correspondiente.

## 26. Resumen histórico

Debe mostrar movimientos de:

- Demandas
- Amparos
- Exhortos
- Promociones
- Oficios

Además incluye:

- Buscador.
- Tabla.
- Totales.
- Resumen por tipo.
- Botón `Mandar a mesas`.
- Modal de confirmación.
- Resumen del último envío.

## 27. Datos demo

Los datos demo son únicamente para visualizar y probar componentes.

Idealmente los módulos deben poder diferenciar:

```text
Datos reales → localStorage / API futura
Datos demo   → assets/data/*.json
```

Antes de producción deberán eliminarse o desactivarse los datos de prueba.

## 28. Actualizar una tabla después de guardar

Después de guardar un registro:

```javascript
saveData("amparos", amparos);
```

actualizar la tabla:

```javascript
if (window.renderAmparos) {
    window.renderAmparos();
}
```

## 29. Convenciones JavaScript

Funciones:

```javascript
camelCase
```

Ejemplos:

```javascript
renderAmparos()
openAmparoForm()
setupSearch()
saveDemanda()
```

IDs HTML:

```text
camelCase
```

Ejemplos:

```html
id="amparosTable"
id="demActorTipo"
id="sendToMesasBtn"
```

Clases CSS:

```text
kebab-case
```

Ejemplo:

```css
.amparo-form-header
.historico-summary-card
```

## 30. Evitar duplicados

Antes de crear o importar una función, buscarla con `Ctrl + F`.

Evitar:

```javascript
import { initHistorico } from "./modules/historico.js";
import { initHistorico } from "./modules/historico.js";
```

También evitar declarar una función local con el mismo nombre que un import.

## 31. Errores 404 en JSON

Si aparece:

```text
Failed to load resource: 404
```

revisar:

1. Nombre exacto del archivo.
2. Carpeta correcta.
3. Ruta en `fetch`.
4. Extensión `.json`.
5. Live Server activo.

## 32. No modificar estilos globales sin revisar todo

Un cambio en:

```css
input
button
table
.page
.modal-card
```

puede romper varios módulos.

Preferir:

```css
.amparo-field input
```

en lugar de:

```css
input
```

## 33. Responsive

Todos los formularios y páginas deben tener al menos una adaptación básica.

En escritorio evitar scroll horizontal siempre que sea posible.

En móvil sí se permite:

```css
overflow-x: auto;
```

cuando la tabla lo requiera.

## 34. Flujo recomendado para crear un módulo nuevo

Ejemplo: `notificaciones`.

1. Crear `pages/notificaciones.html`.
2. Crear `assets/css/notificaciones.css`.
3. Crear `assets/js/modules/notificaciones.js`.
4. Si necesita formulario, crear `assets/js/forms/notificacionForm.js`.
5. Si necesita catálogo, crear `assets/data/notificaciones.json`.
6. Importar CSS en `index.html`.
7. Importar inicializador en `app.js`.
8. Agregar navegación.
9. Probar navegación, tabla, formulario, modal, guardado, actualización, responsive y consola.

## 35. Flujo Git recomendado

Antes de comenzar:

```bash
git pull
```

Crear rama:

```bash
git checkout -b feature/nombre-modulo
```

Ejemplos:

```text
feature/amparos-oficios
feature/resumen-historico
fix/modal-amparos
fix/sidebar
```

Después:

```bash
git add .
git commit -m "feat: agrega formulario de amparos"
git push origin feature/amparos-oficios
```

No trabajar todos directamente sobre la misma rama si varias personas modificarán archivos al mismo tiempo.

## 36. Convención de commits

Usar mensajes claros:

```text
feat: agrega tabla de amparos
feat: agrega resumen diario
fix: corrige tamaño del modal de demandas
fix: evita cierre del modal al hacer clic fuera
style: ajusta espaciado del formulario
refactor: separa lógica de demandas
data: agrega catálogo de entes
```

## 37. Antes de hacer commit

- [ ] No hay errores rojos en consola.
- [ ] No hay archivos JSON con 404.
- [ ] La navegación funciona.
- [ ] El Sidebar conserva su diseño.
- [ ] El Dashboard sigue funcionando.
- [ ] Los modales tienen botón cerrar.
- [ ] El modal no cierra al hacer clic fuera.
- [ ] Los botones no desbordan texto.
- [ ] Labels e inputs tienen espacio correcto.
- [ ] La tabla se actualiza después de guardar.
- [ ] No se duplicaron imports.
- [ ] No existen funciones con nombres repetidos.
- [ ] No se modificaron estilos globales innecesariamente.
- [ ] Se probó con `Ctrl + Shift + R`.

## 38. Antes de integrar cambios de otro compañero

Revisar especialmente:

```text
app.js
styles.css
index.html
storage.js
formHelper.js
```

Estos son archivos compartidos y un cambio puede afectar varios módulos.

Si dos personas necesitan tocar el mismo archivo, coordinar antes.

## 39. Principio principal del proyecto

Antes de agregar una solución rápida, revisar si ya existe:

- un componente;
- un helper;
- una función;
- un estilo;
- un modal;
- un catálogo;
- una estructura equivalente.

Prioridad:

```text
Consistencia
↓
Modularidad
↓
Reutilización
↓
Funcionalidad
↓
Escalabilidad
```

El objetivo no es solamente que funcione, sino que cada nueva pantalla se sienta parte del mismo sistema.

## 40. Estado actual

Actualmente se está trabajando en:

- Dashboard.
- Resumen diario.
- Expedientes.
- Demandas.
- Amparos.
- Exhortos.
- Promociones.
- Oficios.
- Resumen Histórico.
- Catálogos JSON.
- Vinculación de oficios con amparos.
- Autollenado mediante expedientes existentes.
- Envío de resumen a mesas como demostración.

La arquitectura actual está pensada para facilitar una futura migración a React u otra tecnología si el proyecto lo requiere.

## Equipo

Cuando hagan cambios importantes de arquitectura, nombres de archivos, claves de `localStorage`, catálogos o comportamiento de componentes compartidos, deben avisar al resto del equipo antes de integrarlos.
