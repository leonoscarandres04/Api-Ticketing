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

// Dibuja el codigo QR (SVG) con el codigo de la boleta, para escanearlo en la entrada
function codigoQR(texto) {
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

// ---------- Escaner de QR con la camara ----------

const escaner = { stream: null, activo: false };

// Brillo promedio de una imagen (0 = negro total), mirando uno de cada 50 pixeles
function brillo(imagen) {
    let suma = 0;
    let cuantos = 0;
    for (let i = 0; i < imagen.data.length; i += 4 * 50) {
        suma += imagen.data[i] + imagen.data[i + 1] + imagen.data[i + 2];
        cuantos++;
    }
    return suma / (cuantos * 3);
}

// Prende la camara (la escogida, o la trasera en el celular) y revisa cada cuadro
// del video hasta encontrar un QR. alVerNegro avisa si la camara solo manda negro
async function iniciarEscaner(video, alLeer, { camaraId, alVerNegro } = {}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('sin-camara');
    }
    const pedido = camaraId ? { deviceId: { exact: camaraId } } : { facingMode: { ideal: 'environment' } };
    escaner.stream = await navigator.mediaDevices.getUserMedia({ video: pedido });
    video.srcObject = escaner.stream;
    await video.play();
    escaner.activo = true;

    const lienzo = document.createElement('canvas');
    const contexto = lienzo.getContext('2d', { willReadFrequently: true });
    let cuadros = 0;
    const revisar = () => {
        if (!escaner.activo) return;
        if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth) {
            lienzo.width = video.videoWidth;
            lienzo.height = video.videoHeight;
            contexto.drawImage(video, 0, 0);
            const imagen = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
            const qr = jsQR(imagen.data, imagen.width, imagen.height);
            if (qr && qr.data) {
                alLeer(qr.data);
                return;
            }
            // Despues de unos 2 segundos se revisa si la imagen es completamente negra
            cuadros++;
            if (cuadros === 60 && alVerNegro && brillo(imagen) < 6) alVerNegro();
        }
        requestAnimationFrame(revisar);
    };
    requestAnimationFrame(revisar);
}

// Camaras del equipo (los nombres solo aparecen despues de dar permiso)
async function listarCamaras() {
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    return dispositivos.filter((d) => d.kind === 'videoinput');
}

function camaraGuardada() {
    try {
        return localStorage.getItem('camara') || null;
    } catch {
        return null;
    }
}

function guardarCamara(id) {
    try {
        localStorage.setItem('camara', id);
    } catch {
        // si el navegador no deja guardar, solo no se recuerda la camara
    }
}

function detenerEscaner() {
    escaner.activo = false;
    if (escaner.stream) {
        escaner.stream.getTracks().forEach((pista) => pista.stop());
        escaner.stream = null;
    }
}

function mensajeCamara(error) {
    if (error.name === 'NotAllowedError') return 'No diste permiso para usar la cámara. Actívalo en el candado de la barra de direcciones.';
    if (error.name === 'NotFoundError') return 'No se encontró ninguna cámara en este equipo.';
    if (error.name === 'NotReadableError') return 'La cámara está siendo usada por otra aplicación.';
    if (error.message === 'sin-camara') return 'Este navegador no permite usar la cámara aquí. Ábrelo en http://localhost:3000.';
    return 'No se pudo prender la cámara.';
}

function cargando() {
    app.innerHTML = '<p class="vacio">Cargando...</p>';
}

// Va a una pantalla; si ya se esta en ella, la vuelve a dibujar
// (cambiar location.hash al mismo valor no dispara el cambio de pantalla)
function irA(hash) {
    if (location.hash === hash) {
        navegar();
    } else {
        location.hash = hash;
    }
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
            irA('#/eventos');
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
    irA(usuario.rol === 'organizador' ? '#/organizador' : '#/eventos');
}

// ---------- Eventos y compra ----------

const MAX_BOLETAS = 10;   // maximo de boletas por persona en cada evento (igual que en la API)

function barraAforo(evento) {
    const porcentaje = evento.aforo_total ? (evento.aforo_disponible / evento.aforo_total) * 100 : 0;
    const clase = evento.aforo_disponible === 0 ? 'agotado' : porcentaje <= 20 ? 'poco' : '';
    return `<div class="aforo ${clase}"><div style="width:${porcentaje}%"></div></div>`;
}

// Imagen del evento; si no tiene (o el link no carga) queda un fondo de color con la inicial
function imagenEvento(evento, clase = 'portada') {
    const inicial = texto((evento.nombre || '?').trim().charAt(0).toUpperCase());
    const imagen = evento.imagen_url
        ? `<img src="${texto(evento.imagen_url)}" alt="" loading="lazy" onerror="this.remove()">`
        : '';
    return `<div class="${clase}"><span>${inicial}</span>${imagen}</div>`;
}

function fechaCorta(valor) {
    const d = new Date(valor.replace(' ', 'T'));
    return d.toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function tarjetaEvento(evento, usuario) {
    const agotado = evento.aforo_disponible === 0;
    const activo = evento.estado === 'activo';
    const numerado = evento.tipo === 'numerado';
    let compra = '';
    if (!activo) {
        compra = '';
    } else if (agotado) {
        compra = '<p class="dato"><b>Agotado</b></p>';
    } else if (numerado) {
        compra = `<a href="#/evento/${evento.id}" class="boton ancho">💺 Escoger sillas</a>`;
    } else if (!usuario) {
        compra = '<a href="#/login" class="boton secundario ancho">Inicia sesión para comprar</a>';
    } else if (usuario.rol === 'comprador') {
        compra = `
            <form class="comprar" data-evento="${evento.id}">
                <input type="number" min="1" max="${Math.min(MAX_BOLETAS, evento.aforo_disponible)}" value="1" aria-label="Cantidad">
                <button class="boton">Comprar</button>
            </form>`;
    }

    return `
        <article class="tarjeta evento">
            ${imagenEvento(evento)}
            ${activo ? '' : `<span class="etiqueta sobre-imagen ${evento.estado}">${evento.estado}</span>`}
            <div class="evento-cuerpo">
                <p class="evento-fecha">${fechaCorta(evento.fecha)}</p>
                <h2>${texto(evento.nombre)}</h2>
                <p class="dato">📍 ${texto(evento.lugar)}</p>
                <p class="dato">${numerado ? '💺 Sillas numeradas' : '🎫 Entrada general'}</p>
                <p class="precio">${pesos(evento.precio)}</p>
                ${barraAforo(evento)}
                <p class="dato">${evento.aforo_disponible} de ${evento.aforo_total} cupos disponibles</p>
                ${compra}
            </div>
        </article>`;
}

// Aplica el buscador y los filtros sobre la lista de eventos
function filtrarEventos(eventos, filtros) {
    const buscar = filtros.buscar.trim().toLowerCase();
    const ahora = new Date();
    const limite = { semana: 7, mes: 30 }[filtros.cuando];
    let lista = eventos.filter((e) => {
        if (buscar && !`${e.nombre} ${e.lugar}`.toLowerCase().includes(buscar)) return false;
        if (filtros.lugar && e.lugar !== filtros.lugar) return false;
        if (filtros.tipo && e.tipo !== filtros.tipo) return false;
        if (filtros.disponibles && (e.aforo_disponible === 0 || e.estado !== 'activo')) return false;
        if (limite) {
            const dias = (new Date(e.fecha.replace(' ', 'T')) - ahora) / 86400000;
            if (dias < 0 || dias > limite) return false;
        }
        return true;
    });
    if (filtros.orden === 'precio-asc') lista = [...lista].sort((a, b) => a.precio - b.precio);
    if (filtros.orden === 'precio-desc') lista = [...lista].sort((a, b) => b.precio - a.precio);
    return lista;
}

async function pantallaEventos() {
    cargando();
    const usuario = Sesion.usuario();
    const eventos = await api('GET', '/eventos');
    const lugares = [...new Set(eventos.map((e) => e.lugar))].sort();

    app.innerHTML = `
        <section class="hero">
        <h1>Encuentra tu próximo evento</h1>
        <p class="subtitulo">Conciertos, partidos y obras de teatro. Compra tus boletas en segundos.</p>
        <div class="filtros">
            <input id="f-buscar" type="search" placeholder="🔎 Buscar por nombre o lugar" aria-label="Buscar">
            <select id="f-lugar" aria-label="Lugar">
                <option value="">Todos los lugares</option>
                ${lugares.map((l) => `<option value="${texto(l)}">${texto(l)}</option>`).join('')}
            </select>
            <select id="f-cuando" aria-label="Fecha">
                <option value="">Cualquier fecha</option>
                <option value="semana">Próximos 7 días</option>
                <option value="mes">Próximos 30 días</option>
            </select>
            <select id="f-tipo" aria-label="Tipo de entrada">
                <option value="">Todo tipo de entrada</option>
                <option value="general">Entrada general</option>
                <option value="numerado">Sillas numeradas</option>
            </select>
            <select id="f-orden" aria-label="Ordenar">
                <option value="fecha">Ordenar por fecha</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
            </select>
            <label class="casilla"><input type="checkbox" id="f-disponibles"> Solo con cupos</label>
        </div>
        </section>
        <div id="lista-eventos"></div>`;

    const valor = (id) => document.getElementById(id);
    const pintarLista = () => {
        const lista = filtrarEventos(eventos, {
            buscar: valor('f-buscar').value,
            lugar: valor('f-lugar').value,
            cuando: valor('f-cuando').value,
            tipo: valor('f-tipo').value,
            orden: valor('f-orden').value,
            disponibles: valor('f-disponibles').checked
        });
        valor('lista-eventos').innerHTML = lista.length
            ? `<div class="rejilla">${lista.map((e) => tarjetaEvento(e, usuario)).join('')}</div>`
            : `<p class="vacio">${eventos.length ? 'Ningún evento coincide con los filtros.' : 'No hay eventos todavía.'}</p>`;
        conectarCompras();
    };
    ['f-buscar', 'f-lugar', 'f-cuando', 'f-tipo', 'f-orden', 'f-disponibles'].forEach((id) => {
        valor(id).addEventListener('input', pintarLista);
    });
    pintarLista();
}

function conectarCompras() {
    document.querySelectorAll('form.comprar').forEach((form) => {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const cantidad = Number(form.querySelector('input').value);
            const boton = form.querySelector('button');
            boton.disabled = true;
            try {
                const compra = await api('POST', '/compras', { evento_id: Number(form.dataset.evento), cantidad });
                avisar(`Compra exitosa: ${compra.boletas_generadas.length} boleta(s) por ${pesos(compra.total)}. Tienes 15 minutos para pagarla.`);
                // Despues de comprar, lo siguiente es pagar: se lleva a "Mis compras"
                location.hash = '#/compras';
            } catch (error) {
                avisar(error.message, 'mal');
                boton.disabled = false;
            }
        };
    });
}

// ---------- Mapa de sillas (eventos numerados) ----------

async function pantallaSillas(eventoId) {
    cargando();
    const usuario = Sesion.usuario();
    const [evento, sillas] = await Promise.all([
        api('GET', `/eventos/${eventoId}`),
        api('GET', `/eventos/${eventoId}/sillas`)
    ]);
    const elegidas = new Map();   // id -> nombre (ej. "A5")

    const filas = {};
    sillas.forEach((s) => { (filas[s.fila] ||= []).push(s); });
    const puedeComprar = usuario && usuario.rol === 'comprador' && evento.estado === 'activo';

    const mapa = Object.entries(filas).map(([fila, lista]) => `
        <div class="fila-sillas">
            <span class="letra">${fila}</span>
            ${lista.map((s) => `
                <button class="silla" data-id="${s.id}" data-nombre="${fila}${s.numero}"
                        ${s.ocupada || !puedeComprar ? 'disabled' : ''} ${s.ocupada ? 'data-ocupada' : ''}
                        title="Fila ${fila}, silla ${s.numero}${s.ocupada ? ' (ocupada)' : ''}">${s.numero}</button>`).join('')}
            <span class="letra">${fila}</span>
        </div>`).join('');

    let aviso = '';
    if (!usuario) aviso = '<a href="#/login" class="boton">Inicia sesión para comprar</a>';
    else if (usuario.rol !== 'comprador') aviso = '<p class="dato">Solo los compradores pueden escoger sillas.</p>';
    else if (evento.estado !== 'activo') aviso = `<p class="dato">Este evento está ${evento.estado}.</p>`;

    app.innerHTML = `
        <p><a href="#/eventos">← Volver a eventos</a></p>
        <div class="tarjeta cabecera-evento">
            ${imagenEvento(evento, 'miniatura')}
            <div>
                <h1>${texto(evento.nombre)}</h1>
                <p class="dato">📅 ${fecha(evento.fecha)} · 📍 ${texto(evento.lugar)}</p>
                <p class="dato">${pesos(evento.precio)} por silla · ${evento.aforo_disponible} de ${evento.aforo_total} libres</p>
            </div>
        </div>
        <div class="tarjeta mapa-sillas">
            <div class="leyenda">
                <span><i class="silla"></i> Libre</span>
                <span><i class="silla elegida"></i> Tu selección</span>
                <span><i class="silla" data-ocupada></i> Ocupada</span>
            </div>
            <div class="desplazable">
                <div class="mapa">
                    <div class="escenario">ESCENARIO</div>
                    ${mapa}
                </div>
            </div>
        </div>
        <div class="tarjeta resumen-sillas">
            <div>
                <b id="sillas-elegidas">No has escogido sillas</b>
                <p class="dato">Puedes escoger hasta ${MAX_BOLETAS} sillas por evento.</p>
            </div>
            <div class="resumen-total">
                <span id="total-sillas" class="precio">${pesos(0)}</span>
                ${aviso || '<button id="btn-comprar-sillas" class="boton" disabled>Comprar</button>'}
            </div>
        </div>`;

    const resumen = document.getElementById('sillas-elegidas');
    const total = document.getElementById('total-sillas');
    const botonComprar = document.getElementById('btn-comprar-sillas');
    const actualizar = () => {
        // Ordenadas por fila y numero (A1, A5, B3...), no en el orden en que se tocaron
        const nombres = [...elegidas.values()].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
        resumen.textContent = nombres.length ? `Sillas: ${nombres.join(', ')}` : 'No has escogido sillas';
        total.textContent = pesos(nombres.length * evento.precio);
        if (botonComprar) botonComprar.disabled = nombres.length === 0;
    };

    app.querySelectorAll('.mapa .silla').forEach((boton) => {
        boton.onclick = () => {
            const id = Number(boton.dataset.id);
            if (elegidas.has(id)) {
                elegidas.delete(id);
            } else if (elegidas.size >= MAX_BOLETAS) {
                avisar(`Puedes escoger máximo ${MAX_BOLETAS} sillas`, 'mal');
                return;
            } else {
                elegidas.set(id, boton.dataset.nombre);
            }
            boton.classList.toggle('elegida', elegidas.has(id));
            actualizar();
        };
    });

    if (botonComprar) {
        botonComprar.onclick = async () => {
            botonComprar.disabled = true;
            try {
                const compra = await api('POST', '/compras', { evento_id: evento.id, sillas: [...elegidas.keys()] });
                avisar(`Compra exitosa: sillas ${compra.sillas.join(', ')} por ${pesos(compra.total)}. Tienes 15 minutos para pagarla.`);
                location.hash = '#/compras';
            } catch (error) {
                avisar(error.message, 'mal');
                // Alguien pudo ocupar una silla mientras escogias: se recarga el mapa
                pantallaSillas(eventoId);
            }
        };
    }
}

// ---------- Mis compras y boletas ----------

let relojCompras = null;   // intervalo del contador de los 15 minutos

function minutosYSegundos(segundos) {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// Actualiza cada segundo los contadores de las compras pendientes
function iniciarContadores() {
    clearInterval(relojCompras);
    const actualizar = () => {
        document.querySelectorAll('[data-vence]').forEach((contador) => {
            const quedan = Math.max(0, Math.round((Number(contador.dataset.vence) - Date.now()) / 1000));
            const boton = document.querySelector(`[data-pagar="${contador.dataset.compra}"]`);
            if (quedan === 0) {
                contador.textContent = '⌛ Se venció el tiempo para pagar';
                contador.className = 'contador vencido';
                if (boton) boton.remove();
            } else {
                contador.textContent = `⏱ Te quedan ${minutosYSegundos(quedan)} para pagar`;
                contador.classList.toggle('urgente', quedan <= 120);
            }
        });
    };
    actualizar();
    relojCompras = setInterval(actualizar, 1000);
}

function nombreSilla(boleta) {
    return boleta.fila ? `Fila ${boleta.fila} · Silla ${boleta.silla}` : '';
}

async function pantallaCompras() {
    cargando();
    const [compras, eventos, boletas] = await Promise.all([
        api('GET', '/compras'),
        api('GET', '/eventos'),
        api('GET', '/boletas')
    ]);
    const eventoPorId = Object.fromEntries(eventos.map((e) => [e.id, e]));

    const lista = compras.map((compra) => {
        const evento = eventoPorId[compra.evento_id] || { nombre: `Evento ${compra.evento_id}` };
        const suyas = boletas.filter((b) => b.compra_id === compra.id);
        const pendiente = compra.estado === 'pendiente';
        const sillas = suyas.filter((b) => b.fila).map((b) => `${b.fila}${b.silla}`);

        let detalle;
        if (compra.estado === 'pagada') {
            detalle = `
                <div class="boletas">
                    ${suyas.map((b) => `
                        <div class="boleta">
                            <div class="qr">${b.estado === 'valida' ? codigoQR(b.codigo) : ''}</div>
                            <div class="codigo">${texto(b.codigo)}</div>
                            ${nombreSilla(b) ? `<div class="silla-boleta">${nombreSilla(b)}</div>` : ''}
                            <span class="etiqueta ${b.estado}">${b.estado}</span>
                        </div>`).join('')}
                </div>`;
        } else if (pendiente) {
            detalle = `
                <p class="contador" data-compra="${compra.id}" data-vence="${Date.now() + compra.segundos_para_pagar * 1000}"></p>
                ${sillas.length ? `<p class="dato">Sillas apartadas: ${sillas.join(', ')}</p>` : ''}
                <p class="dato">Cuando pagues verás aquí los códigos QR de tus boletas.</p>`;
        } else {
            detalle = '<p class="dato">Esta compra venció porque no se pagó en 15 minutos.</p>';
        }

        return `
            <article class="tarjeta compra">
                <div class="compra-cabecera">
                    ${imagenEvento(evento, 'miniatura')}
                    <div class="compra-info">
                        <h2>${texto(evento.nombre)}</h2>
                        <span class="dato">Compra #${compra.id} · ${fecha(compra.creado_en)} · ${compra.cantidad} boleta(s) · <b>${pesos(compra.total)}</b></span>
                    </div>
                    <div class="compra-acciones">
                        <span class="etiqueta ${compra.estado}">${compra.estado}</span>
                        ${pendiente ? `<button class="boton exito chico" data-pagar="${compra.id}">Pagar</button>` : ''}
                    </div>
                </div>
                ${detalle}
            </article>`;
    }).join('');

    app.innerHTML = `
        <h1>Mis compras</h1>
        <p class="subtitulo">Aquí ves tus compras y los códigos de tus boletas para entrar al evento.</p>
        ${compras.length ? `<div class="pila">${lista}</div>` : '<p class="vacio">Todavía no has comprado nada. <a href="#/eventos">Ver eventos</a></p>'}`;

    iniciarContadores();

    document.querySelectorAll('[data-pagar]').forEach((boton) => {
        boton.onclick = async () => {
            boton.disabled = true;
            try {
                await api('POST', `/compras/${boton.dataset.pagar}/pagar`);
                avisar('Pago simulado aprobado. ¡Ya tienes tus boletas!');
                pantallaCompras();
            } catch (error) {
                avisar(error.message, 'mal');
                pantallaCompras();
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
            <td>${e.tipo === 'numerado' ? `💺 ${e.filas} filas × ${e.sillas_por_fila}` : '🎫 General'}</td>
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
                <button type="button" id="btn-escanear" class="boton secundario ancho">📷 Escanear QR con la cámara</button>
                <div id="escaner" class="escaner oculto">
                    <div id="caja-camaras" class="oculto">
                        <label for="camaras">Cámara</label>
                        <select id="camaras"></select>
                    </div>
                    <video id="video" playsinline muted autoplay></video>
                    <p class="dato">Apunta la cámara al código QR de la boleta.</p>
                    <p id="aviso-camara" class="resultado mal oculto">La cámara solo muestra negro. Escoge otra cámara en la lista de arriba o revisa que no esté tapada.</p>
                </div>
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
                    <label for="e-fecha">Fecha y hora</label>
                    <input id="e-fecha" type="datetime-local" required>
                    <label for="e-tipo">Tipo de entrada</label>
                    <select id="e-tipo">
                        <option value="general">🎫 Entrada general (sin puesto fijo)</option>
                        <option value="numerado">💺 Sillas numeradas (cada quien escoge su silla)</option>
                    </select>
                    <div id="campos-general">
                        <label for="e-aforo">Aforo</label>
                        <input id="e-aforo" type="number" min="1">
                    </div>
                    <div id="campos-numerado" class="oculto">
                        <div class="fila mitades">
                            <div>
                                <label for="e-filas">Filas (máx. 26)</label>
                                <input id="e-filas" type="number" min="1" max="26">
                            </div>
                            <div>
                                <label for="e-sillas">Sillas por fila (máx. 40)</label>
                                <input id="e-sillas" type="number" min="1" max="40">
                            </div>
                        </div>
                        <p class="dato" id="aforo-calculado"></p>
                    </div>
                    <label for="e-precio">Precio (COP)</label>
                    <input id="e-precio" type="number" min="0" step="1000" value="0">
                    <label for="e-imagen">Link de la imagen (opcional)</label>
                    <input id="e-imagen" type="url" placeholder="https://...">
                    <div id="vista-imagen" class="vista-imagen oculto"></div>
                    <button class="boton ancho">Crear evento</button>
                </form>
            </section>
        </div>

        <section class="tarjeta" style="margin-top:16px">
            <h2>📋 Mis eventos</h2>
            ${eventos.length ? `
                <div class="desplazable">
                    <table class="tabla">
                        <thead><tr><th>Evento</th><th>Entrada</th><th>Cupos</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>` : '<p class="vacio">Aún no has creado eventos.</p>'}
        </section>

        <section id="boletas-evento"></section>`;

    // Validar boleta (escribiendo el codigo o escaneando el QR)
    const campo = document.getElementById('codigo');
    const resultado = document.getElementById('resultado-validar');
    const botonEscanear = document.getElementById('btn-escanear');
    const cajaEscaner = document.getElementById('escaner');

    async function validarCodigo(codigo) {
        try {
            const respuesta = await api('POST', '/boletas/validar', { codigo: codigo.trim().toUpperCase() });
            resultado.innerHTML = `<div class="resultado ok">✔ ${texto(codigo)}: ${texto(respuesta.mensaje)}</div>`;
            campo.value = '';
        } catch (error) {
            resultado.innerHTML = `<div class="resultado mal">✖ ${texto(codigo)}: ${texto(error.message)}</div>`;
        }
    }

    function cerrarEscaner() {
        detenerEscaner();
        cajaEscaner.classList.add('oculto');
        botonEscanear.textContent = '📷 Escanear QR con la cámara';
    }

    document.getElementById('form-validar').onsubmit = (e) => {
        e.preventDefault();
        validarCodigo(campo.value);
    };

    const listaCamaras = document.getElementById('camaras');
    const avisoCamara = document.getElementById('aviso-camara');

    async function abrirCamara(camaraId) {
        detenerEscaner();
        avisoCamara.classList.add('oculto');
        resultado.innerHTML = '';
        cajaEscaner.classList.remove('oculto');
        botonEscanear.textContent = '✖ Cerrar cámara';
        try {
            await iniciarEscaner(document.getElementById('video'), (codigo) => {
                cerrarEscaner();
                campo.value = codigo;
                validarCodigo(codigo);
            }, { camaraId, alVerNegro: () => avisoCamara.classList.remove('oculto') });
        } catch (error) {
            // Si la camara guardada ya no existe, se intenta con la que escoja el navegador
            if (camaraId && error.name === 'OverconstrainedError') return abrirCamara(null);
            cerrarEscaner();
            resultado.innerHTML = `<div class="resultado mal">✖ ${texto(mensajeCamara(error))}</div>`;
            return;
        }
        // Con el permiso ya dado se puede mostrar la lista de camaras para escoger
        const camaras = await listarCamaras();
        const actual = escaner.stream.getVideoTracks()[0].getSettings().deviceId;
        document.getElementById('caja-camaras').classList.toggle('oculto', camaras.length < 2);
        listaCamaras.innerHTML = camaras.map((c, i) => `
            <option value="${texto(c.deviceId)}" ${c.deviceId === actual ? 'selected' : ''}>${texto(c.label || `Cámara ${i + 1}`)}</option>`).join('');
    }

    listaCamaras.onchange = () => {
        guardarCamara(listaCamaras.value);
        abrirCamara(listaCamaras.value);
    };

    botonEscanear.onclick = () => {
        if (escaner.activo) {
            cerrarEscaner();
            return;
        }
        abrirCamara(camaraGuardada());
    };

    // Crear evento: segun el tipo se pide el aforo o las filas y sillas
    const campo$ = (id) => document.getElementById(id);
    const mostrarCamposTipo = () => {
        const numerado = campo$('e-tipo').value === 'numerado';
        campo$('campos-general').classList.toggle('oculto', numerado);
        campo$('campos-numerado').classList.toggle('oculto', !numerado);
        const total = Number(campo$('e-filas').value) * Number(campo$('e-sillas').value);
        campo$('aforo-calculado').textContent = total ? `Aforo: ${total} sillas` : '';
    };
    ['e-tipo', 'e-filas', 'e-sillas'].forEach((id) => campo$(id).addEventListener('input', mostrarCamposTipo));
    campo$('e-imagen').addEventListener('input', () => {
        const link = campo$('e-imagen').value.trim();
        const vista = campo$('vista-imagen');
        vista.classList.toggle('oculto', !/^https?:\/\//.test(link));
        vista.innerHTML = /^https?:\/\//.test(link) ? `<img src="${texto(link)}" alt="Vista previa" onerror="this.parentNode.textContent='No se pudo cargar la imagen'">` : '';
    });

    document.getElementById('form-evento').onsubmit = async (e) => {
        e.preventDefault();
        const numerado = campo$('e-tipo').value === 'numerado';
        try {
            await api('POST', '/eventos', {
                nombre: campo$('e-nombre').value,
                lugar: campo$('e-lugar').value,
                descripcion: campo$('e-descripcion').value || null,
                fecha: campo$('e-fecha').value.replace('T', ' ') + ':00',
                tipo: numerado ? 'numerado' : 'general',
                ...(numerado
                    ? { filas: Number(campo$('e-filas').value), sillas_por_fila: Number(campo$('e-sillas').value) }
                    : { aforo_total: Number(campo$('e-aforo').value) }),
                precio: Number(campo$('e-precio').value),
                imagen_url: campo$('e-imagen').value.trim() || null
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
            <td>${b.fila ? `${b.fila}${b.silla}` : '—'}</td>
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
                        <thead><tr><th>Código</th><th>Silla</th><th>Compra</th><th>Estado</th><th>Usada</th><th></th></tr></thead>
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
    // Si se cambia de pantalla con la camara o el contador prendidos, se apagan
    detenerEscaner();
    clearInterval(relojCompras);

    // Mapa de sillas de un evento: #/evento/3
    const sillas = location.hash.match(/^#\/evento\/(\d+)$/);
    const pantalla = sillas ? { pintar: () => pantallaSillas(Number(sillas[1])) } : pantallas[location.hash];
    if (!pantalla) {
        location.hash = '#/eventos';
        return;
    }
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
