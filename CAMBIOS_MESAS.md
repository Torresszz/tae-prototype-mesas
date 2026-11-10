# Cambios: firma de la Magistrada, Mesa 3 y Amparos Directos / Indirectos

## Usuarios de prueba (contraseña `123`)
| Usuario | Rol | Ve |
|---|---|---|
| mesa1@example | Secretaría de Acuerdos, Mesa 1 | Solo expedientes **pares** |
| mesa2@example | Secretaría de Acuerdos, Mesa 2 | Solo expedientes **impares** |
| mesa3@example | Secretaría de Acuerdos, Mesa 3 | **OJC** y expedientes de **2021 y anteriores** |
| mesa@example | (anterior) | Todas las mesas |
| magistrada@example | Presidencia | Mesas (todas); única que firma |
| directos@example | Amparos Directos | Solo Amparos Directos |
| indirectos@example | Amparos Indirectos | Solo Amparos Indirectos |
| oficialia@example | Oficialía | Todo menos Mesas y Amparos Directos/Indirectos |

## Asignación de mesa (`mesas.js`, `mesaDeExpediente`)
1. Texto con `OJC` o año <= 2021 -> Mesa 3. 2. Consecutivo par -> Mesa 1. 3. Impar -> Mesa 2.
Acepta `124/2026` y `EXP-2026-001`. Si no se puede leer el número, cae en Mesa 1.

## Amparos
Dos páginas (`mesas-amparos-directos`, `mesas-amparos-indirectos`) con un mismo módulo (`mesasAmparos.js`); el tipo sale de `#mampPage[data-tipo]`.
"Turnar a amparos indirectos/directos" reclasifica y el amparo pasa al otro usuario.


# Fases 6, 7 y 8 (Consultas, Intersindicales, Oficios, Estadística, datos demo)

## Archivos nuevos
`assets/js/modules/mesas/`: `consultas.js` (T-17), `intersindicales.js` (T-18), `oficios.js` (T-19), `estadistica.js` (T-20), `demo.js` + `demoArchivos.js` (T-21). CSS: `assets/css/mesasFase6.css` (enlazado en `index.html`).

## Archivos editados
- `mesas.js`: registra las 4 secciones con `registrarSeccion` y llama `sembrarDemoFases()` al cargar el demo.
- `catalogos.js`: `ACCIONES_CONSULTA`, `DESTINOS_CONSULTA`.
- `demanda.js`: al marcar radicada guarda `radicadoEn` (fecha para Estadística).
- `calificacion.js`: al acordar guarda `concluidaEn`; al revertir lo elimina.

## Claves nuevas de localStorage
`mesasConsultas`, `mesasAcumulados`, `registroOficios` (nunca reutilizar `oficios`).

## Decisiones ⚠️ (implementadas, fáciles de cambiar)
- Consultas: al "regresar" con destino Mesas, la ubicación pasa a `Mesa N` según la asignación del expediente.
- `puedeAcumular()` devuelve siempre true (`// PENDIENTE`); el modal muestra "Regla de acumulación pendiente de definir".
- Acumulado visible para una mesa si cualquiera de sus dos expedientes es suyo; ambos deben existir.
- Oficios: formato `TAE-SA-0006/2026` (`PREFIJO_OFICIO`); consecutivo por año, asignado al guardar; repositorio compartido por todas las mesas.
- Estadística: demandas = categoría Radicado; promociones = registradas; audiencias = Desahogada; calificaciones = Acordado. Fechas con respaldo si falta `radicadoEn`/`concluidaEn`.
- Intersindicales: solo "1. Admisión" con aviso "Pendiente de desarrollar".

## Verificación (T-22)
Pruebas Playwright: 34 + 33 + 22 comprobaciones, 0 fallos, sin errores de consola. No hay estados antiguos en el código.
