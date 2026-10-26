// ============================================================
// LOGIN
// ============================================================

import {
    login,
    getSession
} from "./auth.js";


// ============================================================
// SI YA EXISTE SESIÓN
// ============================================================

const currentSession =
    getSession();


if (currentSession) {

    window.location.replace(
        "./index.html"
    );

}


// ============================================================
// FORMULARIO
// ============================================================

const form =
    document.getElementById(
        "loginForm"
    );


const emailInput =
    document.getElementById(
        "loginEmail"
    );


const passwordInput =
    document.getElementById(
        "loginPassword"
    );


const error =
    document.getElementById(
        "loginError"
    );


form.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        error.hidden =
            true;


        const result =
            login(
                emailInput.value,
                passwordInput.value
            );


        if (!result.ok) {

            error.textContent =
                result.message;

            error.hidden =
                false;

            return;

        }


        window.location.replace(
            "./index.html"
        );

    }
);