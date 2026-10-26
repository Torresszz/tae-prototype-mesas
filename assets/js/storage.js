// =====================================================
// STORAGE
// Manejo de LocalStorage
// =====================================================

export function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getData(key, fallback = []) {
  try {
    const data = localStorage.getItem(key);

    if (!data) {
      return fallback;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("Error leyendo storage:", key, error);

    return fallback;
  }
}

// Obtiene la lista actualizada de nombres de entes que están activos
export function getEntesActivos() {
  const entes = getData("entes", []);
  
  // Si aún no se han cargado en localStorage, se retorna arreglo vacío 
  // o la lista activa
  return entes
    .filter((ente) => ente.activo)
    .map((ente) => ente.nombre);
}


export function removeData(key) {
  localStorage.removeItem(key);
}

export function clearStorage() {
  localStorage.clear();
}
