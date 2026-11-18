// Pruebas de concurrencia y sobreventa
// Uso:
//   en el PC (servidor y MySQL encendidos) -> node pruebas/concurrencia.js
//   contra la pagina publicada              -> node pruebas/concurrencia.js https://api-ticketing-7fsx.onrender.com
const SERVIDOR = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');
const BASE = `${SERVIDOR}/api`;
const AFORO = 10;
const COMPRADORES_SIMULTANEOS = 30;
const VALIDACIONES_SIMULTANEAS = 10;
// Varias personas compran a la vez, para que el limite de 10 boletas por persona
// no sea lo que frene las compras: lo que debe frenarlas es el aforo
const PERSONAS = 5;
// Fecha del evento: un mes despues de hoy, formato 'YYYY-MM-DD HH:MM:SS'
function fechaFutura() {
    const f = new Date();
    f.setMonth(f.getMonth() + 1);
    const dos = n => String(n).padStart(2, '0');
    return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())} 20:00:00`;
}

async function llamar(metodo, ruta, cuerpo, token) {
    const res = await fetch(BASE + ruta, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    let datos = null;
    try { datos = await res.json(); } catch { /* sin cuerpo */ }
    return { status: res.status, datos };
}

function contar(respuestas) {
    const conteo = {};
    for (const r of respuestas) conteo[r.status] = (conteo[r.status] || 0) + 1;
    return conteo;
}

function exigir(respuesta, esperado, descripcion) {
    if (respuesta.status !== esperado) {
        console.error(`No se pudo ${descripcion}: status ${respuesta.status}`, respuesta.datos);
        process.exit(1);
    }
}

async function main() {
    console.log(`Probando contra ${SERVIDOR}`);
    console.log('(si es la pagina publicada y estaba dormida, la primera respuesta puede tardar unos 50 segundos)');

    // 1. Organizador de prueba (viene en schema.sql)
    const loginOrg = await llamar('POST', '/auth/login', {
        email: 'organizador@ticketing.com', password: '123456'
    });
    exigir(loginOrg, 200, 'iniciar sesion como organizador');
    const tokenOrg = loginOrg.datos.token;
    const organizadorId = loginOrg.datos.usuario.id;

    // 2. Compradores nuevos (email unico para poder repetir la prueba)
    const tokensComp = [];
    for (let i = 0; i < PERSONAS; i++) {
        const email = `concurrencia_${Date.now()}_${i}@test.com`;
        const registro = await llamar('POST', '/auth/registro', {
            nombre: `Comprador Concurrencia ${i + 1}`, email, password: '123456', rol: 'comprador'
        });
        exigir(registro, 201, 'registrar al comprador');
        const loginComp = await llamar('POST', '/auth/login', { email, password: '123456' });
        exigir(loginComp, 200, 'iniciar sesion como comprador');
        tokensComp.push(loginComp.datos.token);
    }
    // Cada compra la hace una de las personas, por turnos
    const tokenDe = (i) => tokensComp[i % PERSONAS];

    // 3. Evento con aforo pequeno
    const evento = await llamar('POST', '/eventos', {
        organizador_id: organizadorId,
        nombre: 'Evento prueba concurrencia',
        lugar: 'Bogota',
        fecha: fechaFutura(),
        aforo_total: AFORO,
        precio: 10000
    }, tokenOrg);
    exigir(evento, 201, 'crear el evento');
    const eventoId = evento.datos.id;

    // ---------- PRUEBA 1: sobreventa ----------
    console.log(`\nPRUEBA 1: ${COMPRADORES_SIMULTANEOS} compras simultaneas de ${PERSONAS} personas, aforo ${AFORO}`);
    const compras = await Promise.all(
        Array.from({ length: COMPRADORES_SIMULTANEOS }, (_, i) =>
            llamar('POST', '/compras', { evento_id: eventoId, cantidad: 1 }, tokenDe(i)))
    );
    const conteoCompras = contar(compras);

    // Pagar las compras exitosas (la validacion exige compra pagada); cada quien paga la suya
    const pagos = await Promise.all(
        compras.map((c, i) => c.status === 201
            ? llamar('POST', `/compras/${c.datos.compra_id}/pagar`, null, tokenDe(i))
            : null)
            .filter(Boolean)
    );
    const pagosOk = pagos.filter(p => p.status === 200).length;

    const eventoFinal = await llamar('GET', `/eventos/${eventoId}`);
    const boletas = await llamar('GET', `/boletas?evento_id=${eventoId}`, null, tokenOrg);
    exigir(eventoFinal, 200, 'consultar el evento');
    exigir(boletas, 200, 'listar las boletas');

    console.log('Respuestas:', conteoCompras);
    console.log('Compras pagadas:', pagosOk);
    console.log('aforo_disponible final:', eventoFinal.datos.aforo_disponible);
    console.log('Boletas generadas:', boletas.datos.length);
    const ok1 = conteoCompras[201] === AFORO
        && pagosOk === AFORO
        && eventoFinal.datos.aforo_disponible === 0
        && boletas.datos.length === AFORO;
    console.log(ok1 ? 'RESULTADO: OK, no hubo sobreventa' : 'RESULTADO: FALLO, hubo sobreventa');

    // ---------- PRUEBA 2: validar la misma boleta a la vez ----------
    console.log(`\nPRUEBA 2: ${VALIDACIONES_SIMULTANEAS} validaciones simultaneas de la misma boleta`);
    const boletaValida = boletas.datos.find(b => b.estado === 'valida');
    if (!boletaValida) {
        console.error('No hay boletas validas para probar la Prueba 2');
        process.exit(1);
    }
    const validaciones = await Promise.all(
        Array.from({ length: VALIDACIONES_SIMULTANEAS }, () =>
            llamar('POST', '/boletas/validar', { codigo: boletaValida.codigo }, tokenOrg))
    );
    const conteoVal = contar(validaciones);
    const aceptadas = conteoVal[200] || 0;
    console.log('Respuestas:', conteoVal);
    const rechazo = validaciones.find(v => v.status !== 200);
    if (rechazo) console.log('Mensaje de un rechazo:', rechazo.datos);
    const ok2 = aceptadas === 1;
    console.log(ok2
        ? 'RESULTADO: OK, solo una validacion paso'
        : aceptadas > 1
            ? 'RESULTADO: FALLO, la boleta entro mas de una vez'
            : 'RESULTADO: FALLO, ninguna validacion paso (revisa el mensaje de arriba)');

    process.exit(ok1 && ok2 ? 0 : 1);
}

main().catch(err => { console.error('Error en la prueba:', err); process.exit(1); });