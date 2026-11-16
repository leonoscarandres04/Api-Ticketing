// Conexion con la API: guarda la sesion y hace las peticiones con el token

const Sesion = {
    obtener() {
        try {
            return JSON.parse(localStorage.getItem('sesion'));
        } catch {
            return null;
        }
    },
    guardar(token, usuario) {
        localStorage.setItem('sesion', JSON.stringify({ token, usuario }));
    },
    cerrar() {
        localStorage.removeItem('sesion');
    },
    usuario() {
        const sesion = this.obtener();
        return sesion ? sesion.usuario : null;
    }
};

async function api(metodo, ruta, cuerpo) {
    const opciones = { method: metodo, headers: {} };
    const sesion = Sesion.obtener();
    if (sesion) {
        opciones.headers.Authorization = `Bearer ${sesion.token}`;
    }
    if (cuerpo) {
        opciones.headers['Content-Type'] = 'application/json';
        opciones.body = JSON.stringify(cuerpo);
    }

    const respuesta = await fetch(`/api${ruta}`, opciones);
    const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
        // Si el token vencio, se cierra la sesion
        if (respuesta.status === 401 && sesion) {
            Sesion.cerrar();
            location.hash = '#/login';
        }
        // La API responde { mensaje } o { error } segun la ruta
        const mensaje = (datos && (datos.mensaje || datos.error)) || `Error ${respuesta.status}`;
        throw new Error(mensaje);
    }
    return datos;
}
