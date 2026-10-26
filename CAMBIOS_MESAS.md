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
