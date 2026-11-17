// ============================================================
// AUTENTICACIÓN DEMO
// assets/js/auth.js
// ============================================================
//
// IMPORTANTE:
// Esta autenticación es únicamente para la maqueta.
// Los usuarios y contraseñas están guardados en frontend.
//
// USUARIOS:
//
// mesa@example
// 123
//
// oficialia@example
// 123
//
// admin@example
// 123
//
// Los usuarios viven en localStorage (llave "usuarios") para que el
// Administrador pueda cambiar contraseñas y eliminar usuarios. La
// lista USERS de abajo es solo la semilla inicial. Al migrar, todo
// esto pasa al servidor (las contraseñas NUNCA deben guardarse en
// texto plano fuera de la maqueta).
//
// ============================================================


// ============================================================
// CONFIGURACIÓN
// ============================================================

const SESSION_KEY = "tribunalSession";
const USERS_KEY = "usuarios";


// ============================================================
// USUARIOS DEMO
// ============================================================

const USERS = [

    // ========================================================
    // ADMINISTRADOR
    // Usuarios, catálogos y su propio panel
    // ========================================================
    {
        email: "admin@example",
        password: "123",
        nombre: "Administrador",
        rol: "admin",
        area: "Administración del sistema",
        paginaInicial: "admin"
    },

    // ========================================================
    // SECRETARÍA DE ACUERDOS
    // SOLO PUEDE VER MESAS
    // ========================================================

    {
        email: "mesa@example",

        password: "123",

        nombre: "Mesa",

        rol: "mesa",

        area: "Secretaría de Acuerdos",

        paginaInicial: "mesas"
    },


        // ========================================================
    // PRESIDENCIA (MAGISTRADA)
    // ÚNICA QUE PUEDE FIRMAR ACUERDOS. SOLO VE MESAS
    // ========================================================

    {
        email: "magistrada@example",

        password: "123",

        nombre: "Magistrada",

        rol: "presidencia",

        area: "Presidencia",

        paginaInicial: "mesas"
    },


    // ========================================================
    // MESA DE AMPAROS (DIRECTOS E INDIRECTOS)
    // SOLO PUEDE VER LA MESA DE AMPAROS
    // ========================================================

    {
        email: "directos@example",

        password: "123",

        nombre: "Amparos Directos",

        rol: "amparos-directos",

        area: "Mesa de Amparos Directos",

        paginaInicial: "mesas-amparos-directos"
    },

    {
        email: "indirectos@example",

        password: "123",

        nombre: "Amparos Indirectos",

        rol: "amparos-indirectos",

        area: "Mesa de Amparos Indirectos",

        paginaInicial: "mesas-amparos-indirectos"
    },


    // ========================================================
    // SECRETARÍA DE ACUERDOS POR MESA
    // Mesa 1 = pares · Mesa 2 = impares
    // Mesa 3 = OJC y expedientes de 2021 y anteriores
    // ========================================================

    {
        email: "mesa1@example",
        password: "123",
        nombre: "Mesa 1",
        rol: "mesa",
        mesa: 1,
        area: "Secretaría de Acuerdos · Mesa 1 (pares)",
        paginaInicial: "mesas"
    },

    {
        email: "mesa2@example",
        password: "123",
        nombre: "Mesa 2",
        rol: "mesa",
        mesa: 2,
        area: "Secretaría de Acuerdos · Mesa 2 (impares)",
        paginaInicial: "mesas"
    },

    {
        email: "mesa3@example",
        password: "123",
        nombre: "Mesa 3",
        rol: "mesa",
        mesa: 3,
        area: "Secretaría de Acuerdos · Mesa 3 (OJC y 2021-)",
        paginaInicial: "mesas"
    },


    // ========================================================
    // OFICIALÍA DE PARTES
    // PUEDE VER TODO MENOS MESAS
    // ========================================================

    {
        email: "oficialia@example",

        password: "123",

        nombre: "Oficialía",

        rol: "oficialia",

        area: "Oficialía de Partes",

        paginaInicial: "dashboard"
    }

];


// ============================================================
// LOGIN
// ============================================================

export function login(
    email,
    password
) {

    const cleanEmail =
        String(
            email || ""
        )
        .trim()
        .toLowerCase();


    const cleanPassword =
        String(
            password || ""
        );


    // ========================================================
    // BUSCAR USUARIO
    // ========================================================

    const user =
        getUsuarios().find(
            item =>

                item.email
                    .toLowerCase() ===
                    cleanEmail

                &&

                item.password ===
                    cleanPassword
        );


    // ========================================================
    // CREDENCIALES INCORRECTAS
    // ========================================================

    if (!user) {

        return {

            ok: false,

            message:
                "Usuario o contraseña incorrectos."

        };

    }


    // ========================================================
    // CREAR SESIÓN
    // No guardamos la contraseña
    // ========================================================

    registrarAcceso(user.email);

    const session = {

        email:
            user.email,

        nombre:
            user.nombre,

        rol:
            user.rol,

        area:
            user.area,

        paginaInicial: user.paginaInicial,
        mesa: user.mesa ?? null,

        iniciadoEn:
            new Date()
                .toISOString()

    };


    // ========================================================
    // GUARDAR SESIÓN
    // ========================================================

    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(
            session
        )
    );


    return {

        ok: true,

        session

    };

}


// ============================================================
// OBTENER SESIÓN ACTUAL
// ============================================================

export function getSession() {

    try {

        const value =
            sessionStorage.getItem(
                SESSION_KEY
            );


        if (!value) {

            return null;

        }


        const session =
            JSON.parse(
                value
            );


        // ====================================================
        // VALIDACIÓN BÁSICA
        // ====================================================

        if (
            !session ||
            !session.email ||
            !session.rol
        ) {

            sessionStorage.removeItem(
                SESSION_KEY
            );


            return null;

        }


        return session;

    }
    catch (error) {

        console.error(
            "Error al leer la sesión:",
            error
        );


        sessionStorage.removeItem(
            SESSION_KEY
        );


        return null;

    }

}


// ============================================================
// ¿HAY SESIÓN?
// ============================================================

export function isAuthenticated() {

    return Boolean(
        getSession()
    );

}


// ============================================================
// EXIGIR SESIÓN
// ============================================================

export function requireSession() {

    const session =
        getSession();


    // ========================================================
    // NO HAY SESIÓN
    // ========================================================

    if (!session) {

        window.location.replace(
            "./login.html"
        );


        return null;

    }

    // ========================================================
    // EL USUARIO FUE ELIMINADO POR EL ADMINISTRADOR
    // ========================================================
    if (!buscarUsuario(session.email)) {

        sessionStorage.removeItem(
            SESSION_KEY
        );

        window.location.replace(
            "./login.html"
        );

        return null;
    }


    return session;

}


// ============================================================
// PERMISOS POR PÁGINA
// ============================================================

export function canAccessPage(
    page
) {

    const session =
        getSession();


    if (!session) {

        return false;

    }


    const requestedPage =
        String(
            page || ""
        )
        .trim()
        .toLowerCase();

    // ========================================================
    // PERFIL: cualquier usuario con sesión ve el suyo
    // ========================================================
    if (requestedPage === "perfil") {
        return true;
    }

    // ========================================================
    // ADMINISTRADOR: su panel, usuarios y catálogos
    // Las páginas de administración son solo suyas.
    // ========================================================
    if (session.rol === "admin") {
        return PAGINAS_ADMIN.includes(requestedPage);
    }

    if (PAGINAS_SOLO_ADMIN.includes(requestedPage)) {
        return false;
    }


    // ========================================================
    // USUARIO MESA
    // SOLO PUEDE VER MESAS
    // ========================================================

    if (
        session.rol ===
        "mesa"
    ) {

        return (
            requestedPage ===
            "mesas"
        );

    }


        // ========================================================
    // PRESIDENCIA: SOLO MESAS (AHÍ FIRMA)
    // ========================================================

    if (session.rol === "presidencia") {
        return requestedPage === "mesas";
    }

    // ========================================================
    // MESA DE AMPAROS: SOLO SU MÓDULO
    // ========================================================

    if (session.rol === "amparos-directos") {
        return requestedPage === "mesas-amparos-directos";
    }

    if (session.rol === "amparos-indirectos") {
        return requestedPage === "mesas-amparos-indirectos";
    }

    // ========================================================
    // OFICIALÍA DE PARTES
    // PUEDE VER TODO MENOS MESAS NI MESA DE AMPAROS
    // ========================================================

    if (
        session.rol ===
        "oficialia"
    ) {
        return (
            requestedPage !== "mesas" &&
            !requestedPage.startsWith("mesas-amparos")
        );
    }


    // ========================================================
    // OTROS ROLES FUTUROS
    // Por ahora permitimos acceso.
    // ========================================================

    return true;

}


// ============================================================
// OBTENER PÁGINA INICIAL
// ============================================================

export function getHomePage() {

    const session =
        getSession();


    if (!session) {

        return null;

    }

    if (session.rol === "admin") {
        return "admin";
    }


    // ========================================================
    // MESA
    // ========================================================

    if (
        session.rol ===
        "mesa"
    ) {

        return "mesas";

    }


        if (session.rol === "presidencia") {
        return "mesas";
    }

    if (session.rol === "amparos-directos") {
        return "mesas-amparos-directos";
    }

    if (session.rol === "amparos-indirectos") {
        return "mesas-amparos-indirectos";
    }

    // ========================================================
    // OFICIALÍA
    // ========================================================

    if (
        session.rol ===
        "oficialia"
    ) {
        return "dashboard";
    }


    return (
        session.paginaInicial ||
        "dashboard"
    );

}


// ============================================================
// OBTENER ROL
// ============================================================

export function getRole() {

    const session =
        getSession();


    return (
        session?.rol ||
        null
    );

}


// ============================================================
// ¿ES USUARIO DE MESAS?
// ============================================================

export function isMesaUser() {

    return (
        getRole() ===
        "mesa"
    );

}


// ============================================================
// ¿ES USUARIO DE OFICIALÍA?
// ============================================================

export function isOficialiaUser() {

    return (
        getRole() ===
        "oficialia"
    );

}


// ============================================================
// CERRAR SESIÓN
// ============================================================

export function logout() {

    sessionStorage.removeItem(
        SESSION_KEY
    );


    window.location.replace(
        "./login.html"
    );

}


// ============================================================
// LIMPIAR SESIÓN
// Útil durante desarrollo
// ============================================================

export function clearSession() {

    sessionStorage.removeItem(
        SESSION_KEY
    );

}

// ============================================================
// ¿PUEDE FIRMAR ACUERDOS?
// Solo la Magistrada de Presidencia.
// ============================================================

export function canSign() {
    return getRole() === "presidencia";
}

// ============================================================
// ¿PUEDE SUBIR Y BORRAR PLANTILLAS?
// Solo los secretarios de acuerdos (rol "mesa"). Los demás
// usuarios con acceso a Mesas solo descargan.
// ============================================================

export function canManageTemplates() {
    return getRole() === "mesa";
}

// ============================================================
// PÁGINAS DEL ADMINISTRADOR
// (function, no const: canAccessPage las usa desde arriba)
// ============================================================

const PAGINAS_SOLO_ADMIN = ["admin", "usuarios"];
const PAGINAS_ADMIN = [...PAGINAS_SOLO_ADMIN, "catalogos"];

export function isAdminUser() {
    return getRole() === "admin";
}

// ============================================================
// ALMACÉN DE USUARIOS (localStorage)
// Registro: { email, password, nombre, rol, area, paginaInicial,
//             mesa?, ultimoAcceso? }
// ============================================================

function guardarUsuarios(lista) {
    localStorage.setItem(USERS_KEY, JSON.stringify(lista));
}

export function getUsuarios() {
    let lista = null;

    try {
        lista = JSON.parse(localStorage.getItem(USERS_KEY));
    } catch (error) {
        lista = null;
    }

    if (!Array.isArray(lista)) {
        lista = USERS.map(user => ({ ...user }));
        guardarUsuarios(lista);
    }

    // Siempre debe existir al menos un administrador.
    if (!lista.some(user => user.rol === "admin")) {
        lista = [
            { ...USERS.find(user => user.rol === "admin") },
            ...lista
        ];
        guardarUsuarios(lista);
    }

    return lista;
}

function mismoEmail(a, b) {
    return String(a || "").trim().toLowerCase() ===
        String(b || "").trim().toLowerCase();
}

function buscarUsuario(email) {
    return getUsuarios().find(user => mismoEmail(user.email, email)) || null;
}

// Datos de los usuarios SIN la contraseña (para tablas y perfil).
export function getUsuariosPublicos() {
    return getUsuarios().map(({ password, ...datos }) => datos);
}

export function getUsuarioActual() {
    const session = getSession();

    return getUsuariosPublicos().find(
        user => mismoEmail(user.email, session?.email)
    ) || null;
}

function registrarAcceso(email) {
    const lista = getUsuarios();
    const user = lista.find(item => mismoEmail(item.email, email));

    if (!user) {
        return;
    }

    user.ultimoAcceso = new Date().toISOString();
    guardarUsuarios(lista);
}

// ============================================================
// FUNCIONES DEL ADMINISTRADOR
// Devuelven { ok: true } o { ok: false, message }.
// ============================================================

export function cambiarPasswordUsuario(email, nuevaPassword) {
    if (!isAdminUser()) {
        return { ok: false, message: "Solo el Administrador puede cambiar contraseñas." };
    }

    const password = String(nuevaPassword || "");

    if (!password.trim()) {
        return { ok: false, message: "Escribe la nueva contraseña." };
    }

    const lista = getUsuarios();
    const user = lista.find(item => mismoEmail(item.email, email));

    if (!user) {
        return { ok: false, message: "El usuario ya no existe." };
    }

    user.password = password;
    user.passwordActualizadaEn = new Date().toISOString();
    guardarUsuarios(lista);

    return { ok: true };
}

export function eliminarUsuario(email) {
    if (!isAdminUser()) {
        return { ok: false, message: "Solo el Administrador puede eliminar usuarios." };
    }

    if (mismoEmail(email, getSession()?.email)) {
        return { ok: false, message: "No puedes eliminar tu propio usuario." };
    }

    const lista = getUsuarios();
    const user = lista.find(item => mismoEmail(item.email, email));

    if (!user) {
        return { ok: false, message: "El usuario ya no existe." };
    }

    if (
        user.rol === "admin" &&
        lista.filter(item => item.rol === "admin").length <= 1
    ) {
        return { ok: false, message: "Debe existir al menos un Administrador." };
    }

    guardarUsuarios(lista.filter(item => !mismoEmail(item.email, email)));

    return { ok: true };
}

// Solo para la maqueta: vuelve a los usuarios de demostración.
export function restablecerUsuariosDemo() {
    if (!isAdminUser()) {
        return { ok: false, message: "Solo el Administrador puede restablecer usuarios." };
    }

    guardarUsuarios(USERS.map(user => ({ ...user })));

    return { ok: true };
}
