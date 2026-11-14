// Pruebas de concurrencia y sobreventa
// Uso: con el servidor y MySQL encendidos -> node pruebas/concurrencia.js
const BASE = 'http://localhost:3000/api';
const AFORO = 10;
const COMPRADORES_SIMULTANEOS = 30;
const VALIDACIONES_SIMULTANEAS = 10;

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

async function main() {
    // 1. Organizador de prueba (viene en schema.sql)
    const loginOrg = await llamar('POST', '/auth/login', {
        email: 'organizador@ticketing.com', password: '123456'
    });
    const tokenOrg = loginOrg.datos.token;
    const organizadorId = loginOrg.datos.usuario.id;

    // 2. Comprador nuevo (email unico para poder repetir la prueba)
    const email = `concurrencia_${Date.now()}@test.com`;
    await llamar('POST', '/auth/registro', {
        nombre: 'Comprador Concurrencia', email, password: '123456', rol: 'comprador'
    });
    const loginComp = await llamar('POST', '/auth/login', { email, password: '123456' });
    const tokenComp = loginComp.datos.token;

    // 3. Evento con aforo pequeno
    const evento = await llamar('POST', '/eventos', {
        organizador_id: organizadorId,
        nombre: 'Evento prueba concurrencia',
        lugar: 'Bogota',
        fecha: '2026-12-30 20:00:00',
        aforo_total: AFORO,
        precio: 10000
    }, tokenOrg);
    const eventoId = evento.datos.id;

    // ---------- PRUEBA 1: sobreventa ----------
    console.log(`\nPRUEBA 1: ${COMPRADORES_SIMULTANEOS} compras simultaneas, aforo ${AFORO}`);
    const compras = await Promise.all(
        Array.from({ length: COMPRADORES_SIMULTANEOS }, () =>
            llamar('POST', '/compras', { evento_id: eventoId, cantidad: 1 }, tokenComp))
    );
    const conteoCompras = contar(compras);
    const eventoFinal = await llamar('GET', `/eventos/${eventoId}`);
    const boletas = await llamar('GET', `/boletas?evento_id=${eventoId}`, null, tokenOrg);

    console.log('Respuestas:', conteoCompras);
    console.log('aforo_disponible final:', eventoFinal.datos.aforo_disponible);
    console.log('Boletas generadas:', boletas.datos.length);
    const ok1 = conteoCompras[201] === AFORO
        && eventoFinal.datos.aforo_disponible === 0
        && boletas.datos.length === AFORO;
    console.log(ok1 ? 'RESULTADO: OK, no hubo sobreventa' : 'RESULTADO: FALLO, hubo sobreventa');

    // ---------- PRUEBA 2: validar la misma boleta a la vez ----------
    console.log(`\nPRUEBA 2: ${VALIDACIONES_SIMULTANEAS} validaciones simultaneas de la misma boleta`);
    const codigo = boletas.datos[0].codigo;
    const validaciones = await Promise.all(
        Array.from({ length: VALIDACIONES_SIMULTANEAS }, () =>
            llamar('POST', '/boletas/validar', { codigo }, tokenOrg))
    );
    const conteoVal = contar(validaciones);
    console.log('Respuestas:', conteoVal);
    const ok2 = conteoVal[200] === 1;
    console.log(ok2 ? 'RESULTADO: OK, solo una validacion paso' : 'RESULTADO: FALLO, la boleta entro mas de una vez');

    process.exit(ok1 && ok2 ? 0 : 1);
}

main().catch(err => { console.error('Error en la prueba:', err); process.exit(1); });