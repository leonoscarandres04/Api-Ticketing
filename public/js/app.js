// Pantallas de la pagina: login, eventos, mis compras y panel del organizador

const app = document.getElementById('app');

// ---------- Utilidades ----------

// Evita que el texto que viene de la base de datos se interprete como HTML
function texto(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function pesos(valor) {
    return Number(valor).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function fecha(valor) {
    if (!valor) return '';
    const d = new Date(valor.replace(' ', 'T'));
    return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

let temporizadorAviso;
function avisar(mensaje, tipo = 'ok') {
    const aviso = document.getElementById('aviso');
    aviso.textContent = mensaje;
    aviso.className = `aviso ${tipo}`;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.add('oculto'), 3500);
}

function cargando() {
    app.innerHTML = '<p class="vacio">Cargando...</p>';
}

// ---------- Menu ----------

function pintarMenu() {
    const usuario = Sesion.usuario();
    const ruta = location.hash;
    const enlace = (href, nombre) => `<a href="${href}" class="${ruta === href ? 'activo' : ''}">${nombre}</a>`;

    let html = enlace('#/eventos', 'Eventos');
    if (usuario && usuario.rol === 'comprador') html += enlace('#/compras', 'Mis compras');
    if (usuario && usuario.rol === 'organizador') html += enlace('#/organizador', 'Panel organizador');

    if (usuario) {
        html += `<span class="usuario">👤 ${texto(usuario.nombre)} (${usuario.rol})</span>`;
        html += '<button id="salir">Salir</button>';
    } else {
        html += enlace('#/login', 'Iniciar sesión');
    }

    const menu = document.getElementById('menu');
    menu.innerHTML = html;
    const salir = document.getElementById('salir');
    if (salir) {
        salir.onclick = () => {
            Sesion.cerrar();
            avisar('Sesión cerrada');
            location.hash = '#/eventos';
        };
    }
}

// ---------- Login y registro ----------

function pantallaLogin() {
    app.innerHTML = `
        <div class="tarjeta login">
            <div class="pestanas">
                <button data-pestana="entrar" class="activo">Iniciar sesión</button>
                <button data-pestana="registro">Crear cuenta</button>
            </div>

            <form id="form-entrar">
                <label for="email">Email</label>
                <input id="email" type="email" required autocomplete="username">
                <label for="password">Contraseña</label>
                <input id="password" type="password" required autocomplete="current-password">
                <button class="boton ancho">Entrar</button>
                <p class="ayuda">Usuarios de prueba (contraseña <b>123456</b>):<br>
                    organizador@ticketing.com · comprador@ticketing.com</p>
            </form>

            <form id="form-registro" class="oculto">
                <label for="r-nombre">Nombre</label>
                <input id="r-nombre" required>
                <label for="r-email">Email</label>
                <input id="r-email" type="email" required autocomplete="username">
                <label for="r-password">Contraseña (mínimo 6 caracteres)</label>
                <input id="r-password" type="password" minlength="6" required autocomplete="new-password">
                <label for="r-rol">Tipo de cuenta</label>
                <select id="r-rol">
                    <option value="comprador">Comprador</option>
                    <option value="organizador">Organizador</option>
                </select>
                <button class="boton ancho">Crear cuenta</button>
            </form>
        </div>`;

    const formEntrar = document.getElementById('form-entrar');
    const formRegistro = document.getElementById('form-registro');

    document.querySelectorAll('[data-pestana]').forEach((boton) => {
        boton.onclick = () => {
            document.querySelectorAll('[data-pestana]').forEach((b) => b.classList.toggle('activo', b === boton));
            formEntrar.classList.toggle('oculto', boton.dataset.pestana !== 'entrar');
            formRegistro.classList.toggle('oculto', boton.dataset.pestana !== 'registro');
        };
    });

    formEntrar.onsubmit = async (e) => {
        e.preventDefault();
        try {
            await entrar(document.getElementById('email').value, document.getElementById('password').value);
        } catch (error) {
            avisar(error.message, 'mal');
        }
    };

    formRegistro.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('r-email').value;
        const password = document.getElementById('r-password').value;
        try {
            await api('POST', '/auth/registro', {
                nombre: document.getElementById('r-nombre').value,
                email,
                password,
                rol: document.getElementById('r-rol').value
            });
            // Despues de registrarse entra de una vez
            await entrar(email, password);
        } catch (error) {
            avisar(error.message, 'mal');
        }
    };
}

async function entrar(email, password) {
    const { token, usuario } = await api('POST', '/auth/login', { email, password });
    Sesion.guardar(token, usuario);
    avisar(`¡Bienvenido, ${usuario.nombre}!`);
    location.hash = usuario.rol === 'organizador' ? '#/organizador' : '#/eventos';
}

// ---------- Eventos y compra ----------

function barraAforo(evento) {
    const porcentaje = evento.aforo_total ? (evento.aforo_disponible / evento.aforo_total) * 100 : 0;
    const clase = evento.aforo_disponible === 0 ? 'agotado' : porcentaje <= 20 ? 'poco' : '';
    return `<div class="aforo ${clase}"><div style="width:${porcentaje}%"></div></div>`;
}

async function pantallaEventos() {
    cargando();
    const usuario = Sesion.usuario();
    const eventos = await api('GET', '/eventos');

    const tarjetas = eventos.map((evento) => {
        const agotado = evento.aforo_disponible === 0;
        const activo = evento.estado === 'activo';
        let compra = '';
        if (!usuario) {
            compra = '<a href="#/login" class="boton secundario ancho">Inicia sesión para comprar</a>';
        } else if (usuario.rol === 'comprador' && activo && !agotado) {
            compra = `
                <form class="comprar" data-evento="${evento.id}">
                    <input type="number" min="1" max="${evento.aforo_disponible}" value="1" aria-label="Cantidad">
                    <button class="boton">Comprar</button>
                </form>`;
        } else if (agotado) {
            compra = '<p class="dato"><b>Agotado</b></p>';
        }

        return `
            <article class="tarjeta evento">
                <h2>${texto(evento.nombre)}</h2>
                <span class="etiqueta ${evento.estado}">${evento.estado}</span>
                <p class="dato">📅 ${fecha(evento.fecha)}</p>
                <p class="dato">📍 ${texto(evento.lugar)}</p>
                ${evento.descripcion ? `<p class="dato">${texto(evento.descripcion)}</p>` : ''}
                <p class="precio">${pesos(evento.precio)}</p>
                ${barraAforo(evento)}
                <p class="dato">${evento.aforo_disponible} de ${evento.aforo_total} cupos disponibles</p>
                ${compra}
            </article>`;
    }).join('');

    app.innerHTML = `
        <h1>Eventos</h1>
        <p class="subtitulo">Elige un evento y compra tus boletas.</p>
        ${eventos.length ? `<div class="rejilla">${tarjetas}</div>` : '<p class="vacio">No hay eventos todavía.</p>'}`;

    document.querySelectorAll('form.comprar').forEach((form) => {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const cantidad = Number(form.querySelector('input').value);
            const boton = form.querySelector('button');
            boton.disabled = true;
            try {
                const compra = await api('POST', '/compras', { evento_id: Number(form.dataset.evento), cantidad });
                avisar(`Compra exitosa: ${compra.boletas_generadas.length} boleta(s) por ${pesos(compra.total)}. Págala en "Mis compras".`);
                pantallaEventos();
            } catch (error) {
                avisar(error.message, 'mal');
                boton.disabled = false;
            }
        };
    });
}

// ---------- Mis compras y boletas ----------

async function pantallaCompras() {
    cargando();
    const [compras, eventos, boletas] = await Promise.all([
        api('GET', '/compras'),
        api('GET', '/eventos'),
        api('GET', '/boletas')
    ]);
    const nombreEvento = Object.fromEntries(eventos.map((e) => [e.id, e.nombre]));

    const lista = compras.map((compra) => {
        const suyas = boletas.filter((b) => b.compra_id === compra.id);
        const pagada = compra.estado === 'pagada';
        return `
            <article class="tarjeta">
                <div class="compra-cabecera">
                    <div>
                        <h2>${texto(nombreEvento[compra.evento_id] || `Evento ${compra.evento_id}`)}</h2>
                        <span class="dato">Compra #${compra.id} · ${fecha(compra.creado_en)} · ${compra.cantidad} boleta(s) · <b>${pesos(compra.total)}</b></span>
                    </div>
                    <div>
                        <span class="etiqueta ${compra.estado}">${compra.estado}</span>
                        ${compra.estado === 'pendiente' ? `<button class="boton exito chico" data-pagar="${compra.id}">Pagar</button>` : ''}
                    </div>
                </div>
                ${pagada ? `
                    <div class="boletas">
                        ${suyas.map((b) => `
                            <div class="boleta">
                                <div class="codigo">${texto(b.codigo)}</div>
                                <span class="etiqueta ${b.estado}">${b.estado}</span>
                            </div>`).join('')}
                    </div>` : '<p class="dato">Paga la compra para ver los códigos de tus boletas.</p>'}
            </article>`;
    }).join('');

    app.innerHTML = `
        <h1>Mis compras</h1>
        <p class="subtitulo">Aquí ves tus compras y los códigos de tus boletas para entrar al evento.</p>
        ${compras.length ? `<div class="pila">${lista}</div>` : '<p class="vacio">Todavía no has comprado nada. <a href="#/eventos">Ver eventos</a></p>'}`;

    document.querySelectorAll('[data-pagar]').forEach((boton) => {
        boton.onclick = async () => {
            boton.disabled = true;
            try {
                await api('POST', `/compras/${boton.dataset.pagar}/pagar`);
                avisar('Pago simulado aprobado. ¡Ya tienes tus boletas!');
                pantallaCompras();
            } catch (error) {
                avisar(error.message, 'mal');
                boton.disabled = false;
            }
        };
    });
}

// ---------- Panel del organizador ----------

async function pantallaOrganizador() {
    cargando();
    const usuario = Sesion.usuario();
    const eventos = (await api('GET', '/eventos')).filter((e) => e.organizador_id === usuario.id);

    const filas = eventos.map((e) => `
        <tr>
            <td><b>${texto(e.nombre)}</b><br><span class="dato">${fecha(e.fecha)}</span></td>
            <td>${e.aforo_disponible} / ${e.aforo_total}</td>
            <td>${pesos(e.precio)}</td>
            <td><span class="etiqueta ${e.estado}">${e.estado}</span></td>
            <td class="acciones">
                <button class="boton secundario chico" data-ver="${e.id}">Boletas</button>
                ${e.estado === 'activo' ? `<button class="boton peligro chico" data-cancelar="${e.id}">Cancelar</button>` : ''}
                <button class="boton peligro chico" data-eliminar="${e.id}">Eliminar</button>
            </td>
        </tr>`).join('');

    app.innerHTML = `
        <h1>Panel del organizador</h1>
        <p class="subtitulo">Crea tus eventos y valida las boletas en la entrada.</p>

        <div class="dos-columnas">
            <section class="tarjeta">
                <h2>✅ Validar boleta en la entrada</h2>
                <form id="form-validar">
                    <label for="codigo">Código de la boleta</label>
                    <input id="codigo" required placeholder="Ej: B03461E4" style="text-transform:uppercase">
                    <button class="boton ancho">Validar</button>
                </form>
                <div id="resultado-validar"></div>
            </section>

            <section class="tarjeta">
                <h2>➕ Crear evento</h2>
                <form id="form-evento">
                    <label for="e-nombre">Nombre</label>
                    <input id="e-nombre" required>
                    <label for="e-lugar">Lugar</label>
                    <input id="e-lugar" required>
                    <label for="e-descripcion">Descripción</label>
                    <input id="e-descripcion">
                    <div class="fila">
                        <div>
                            <label for="e-fecha">Fecha y hora</label>
                            <input id="e-fecha" type="datetime-local" required>
                        </div>
                        <div>
                            <label for="e-aforo">Aforo</label>
                            <input id="e-aforo" type="number" min="1" required>
                        </div>
                    </div>
                    <label for="e-precio">Precio (COP)</label>
                    <input id="e-precio" type="number" min="0" step="1000" value="0">
                    <button class="boton ancho">Crear evento</button>
                </form>
            </section>
        </div>

        <section class="tarjeta" style="margin-top:16px">
            <h2>📋 Mis eventos</h2>
            ${eventos.length ? `
                <div class="desplazable">
                    <table class="tabla">
                        <thead><tr><th>Evento</th><th>Cupos</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>` : '<p class="vacio">Aún no has creado eventos.</p>'}
        </section>

        <section id="boletas-evento"></section>`;

    // Validar boleta
    document.getElementById('form-validar').onsubmit = async (e) => {
        e.preventDefault();
        const campo = document.getElementById('codigo');
        const resultado = document.getElementById('resultado-validar');
        try {
            const respuesta = await api('POST', '/boletas/validar', { codigo: campo.value.trim().toUpperCase() });
            resultado.innerHTML = `<div class="resultado ok">✔ ${texto(respuesta.mensaje)}</div>`;
            campo.value = '';
        } catch (error) {
            resultado.innerHTML = `<div class="resultado mal">✖ ${texto(error.message)}</div>`;
        }
    };

    // Crear evento
    document.getElementById('form-evento').onsubmit = async (e) => {
        e.preventDefault();
        try {
            await api('POST', '/eventos', {
                organizador_id: usuario.id,
                nombre: document.getElementById('e-nombre').value,
                lugar: document.getElementById('e-lugar').value,
                descripcion: document.getElementById('e-descripcion').value || null,
                fecha: document.getElementById('e-fecha').value.replace('T', ' ') + ':00',
                aforo_total: Number(document.getElementById('e-aforo').value),
                precio: Number(document.getElementById('e-precio').value)
            });
            avisar('Evento creado');
            pantallaOrganizador();
        } catch (error) {
            avisar(error.message, 'mal');
        }
    };

    // Acciones de la tabla
    document.querySelectorAll('[data-cancelar]').forEach((boton) => {
        boton.onclick = async () => {
            if (!confirm('¿Cancelar este evento? Ya no se podrán comprar boletas.')) return;
            try {
                await api('PUT', `/eventos/${boton.dataset.cancelar}`, { estado: 'cancelado' });
                avisar('Evento cancelado');
                pantallaOrganizador();
            } catch (error) {
                avisar(error.message, 'mal');
            }
        };
    });
    document.querySelectorAll('[data-eliminar]').forEach((boton) => {
        boton.onclick = async () => {
            if (!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
            try {
                await api('DELETE', `/eventos/${boton.dataset.eliminar}`);
                avisar('Evento eliminado');
                pantallaOrganizador();
            } catch (error) {
                avisar(error.message, 'mal');
            }
        };
    });
    document.querySelectorAll('[data-ver]').forEach((boton) => {
        boton.onclick = () => verBoletas(eventos.find((e) => e.id === Number(boton.dataset.ver)));
    });
}

async function verBoletas(evento) {
    const contenedor = document.getElementById('boletas-evento');
    const boletas = await api('GET', `/boletas?evento_id=${evento.id}`);

    const filas = boletas.map((b) => `
        <tr>
            <td class="codigo"><b>${texto(b.codigo)}</b></td>
            <td>Compra #${b.compra_id}</td>
            <td><span class="etiqueta ${b.estado}">${b.estado}</span></td>
            <td>${b.usada_en ? fecha(b.usada_en) : '—'}</td>
            <td>${b.estado === 'valida' ? `<button class="boton peligro chico" data-anular="${b.id}">Anular</button>` : ''}</td>
        </tr>`).join('');

    contenedor.innerHTML = `
        <div class="tarjeta" style="margin-top:16px">
            <h2>🎫 Boletas de "${texto(evento.nombre)}"</h2>
            ${boletas.length ? `
                <div class="desplazable">
                    <table class="tabla">
                        <thead><tr><th>Código</th><th>Compra</th><th>Estado</th><th>Usada</th><th></th></tr></thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>` : '<p class="vacio">Este evento todavía no tiene boletas vendidas.</p>'}
        </div>`;
    contenedor.scrollIntoView({ behavior: 'smooth' });

    contenedor.querySelectorAll('[data-anular]').forEach((boton) => {
        boton.onclick = async () => {
            if (!confirm('¿Anular esta boleta? El cupo vuelve a quedar disponible.')) return;
            try {
                await api('PATCH', `/boletas/${boton.dataset.anular}/anular`);
                avisar('Boleta anulada y cupo devuelto');
                await pantallaOrganizador();
                verBoletas(evento);
            } catch (error) {
                avisar(error.message, 'mal');
            }
        };
    });
}

// ---------- Navegacion ----------

const pantallas = {
    '#/login': { pintar: pantallaLogin },
    '#/eventos': { pintar: pantallaEventos },
    '#/compras': { pintar: pantallaCompras, rol: 'comprador' },
    '#/organizador': { pintar: pantallaOrganizador, rol: 'organizador' }
};

async function navegar() {
    if (!pantallas[location.hash]) {
        location.hash = '#/eventos';
        return;
    }
    const pantalla = pantallas[location.hash];
    const usuario = Sesion.usuario();

    // Las pantallas con rol piden haber iniciado sesion con ese rol
    if (pantalla.rol && (!usuario || usuario.rol !== pantalla.rol)) {
        location.hash = usuario ? '#/eventos' : '#/login';
        return;
    }

    pintarMenu();
    try {
        await pantalla.pintar();
    } catch (error) {
        app.innerHTML = `<p class="vacio">No se pudo cargar: ${texto(error.message)}</p>`;
    }
}

window.addEventListener('hashchange', navegar);
navegar();
