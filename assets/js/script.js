
// ─── State ────────────────────────────────────────────────────────────────────
let pagosRegistrados = JSON.parse(localStorage.getItem('pagos_prestamo') || '[]');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = n => '$' + Number(n).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2});

function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0,10);
}

function daysBetween(d1, d2) {
  const a = new Date(d1 + 'T12:00:00'), b = new Date(d2 + 'T12:00:00');
  return Math.round((b - a) / 86400000);
}

// ─── Amortization engine ─────────────────────────────────────────────────────
// Genera una fila de amortización dado un saldo, tasa, tipo y número de pagos restantes
function calcularFila(saldo, tasaMens, ivaRate, tipo, pagosRestantes, capitalOriginal, pagoNum) {
  const PAGO_MINIMO_CON_IVA = 3360;
  const dias    = 30; // cuotas mensuales exactas
  const interes = saldo * tasaMens;
  const iva     = interes * ivaRate;

  let amort;
  if (tipo === 'igual') {
    amort = pagoNum < pagosRestantes ? saldo / pagosRestantes : saldo;
  } else {
    // PMT recalculado sobre el saldo actual y pagos restantes
    const pmtCalc = pagosRestantes > 1
      ? saldo * tasaMens / (1 - Math.pow(1 + tasaMens, -pagosRestantes))
      : saldo;
    amort = pmtCalc - interes;
    if (amort > saldo) amort = saldo;
  }

  let totalSinIva = amort + interes;
  let totalConIva = totalSinIva + iva;

  // Mínimo de $3,360 con IVA (solo si aún queda saldo después de esta amortización)
  if (totalConIva < PAGO_MINIMO_CON_IVA && amort < saldo) {
    const amortMinimo = PAGO_MINIMO_CON_IVA - interes - iva;
    amort       = Math.min(Math.max(amort, amortMinimo), saldo);
    totalSinIva = amort + interes;
    totalConIva = totalSinIva + iva;
  }

  const nuevoSaldo = Math.max(0, saldo - amort);
  return { interes, iva, amort, totalSinIva, totalConIva, nuevoSaldo };
}

function generarTabla() {
  const capital   = parseFloat(document.getElementById('capital').value)   || 60000;
  const tasaMens  = parseFloat(document.getElementById('tasa').value) / 100 || 0.0225;
  const ivaRate   = parseFloat(document.getElementById('iva').value)  / 100 || 0.16;
  const tipo      = document.getElementById('tipoPlan').value;
  const nTotal    = parseInt(document.getElementById('numPagos').value) || 7;
  const fechaBase = document.getElementById('fechaInicio').value || '2026-07-05';

  const rows  = [];
  let saldo   = capital;
  let numPago = 0; // índice global de fila

  // ── Filas YA PAGADAS: usar el monto real pagado para reducir saldo ──────────
  for (let i = 0; i < pagosRegistrados.length; i++) {
    const pagado = pagosRegistrados[i].monto;
    const fecha  = pagosRegistrados[i].fecha || addMonths(fechaBase, i);
    const nota   = pagosRegistrados[i].nota  || '';

    // Descomponer el pago real: primero cubre interés+IVA, el resto es amortización
    const interes = saldo * tasaMens;
    const iva     = interes * ivaRate;
    const amort   = Math.min(Math.max(0, pagado - interes - iva), saldo);
    const totalSinIva = amort + interes;
    const totalConIva = amort + interes + iva;
    saldo = Math.max(0, saldo - amort);
    numPago++;

    rows.push({
      num: numPago,
      fecha,
      nota,
      amort,
      interes,
      iva,
      totalSinIva,
      totalConIva,
      saldo,
      pagadoReal: pagado,
      diff: pagado - totalConIva,
      esPagado: true
    });

    if (saldo <= 0.01) break;
  }

  // ── Filas FUTURAS: recalcular desde el saldo real ───────────────────────────
  if (saldo > 0.01) {
    const pagosYaHechos   = rows.length;
    const pagosRestantes  = Math.max(nTotal - pagosYaHechos, 1);

    for (let j = 1; j <= pagosRestantes; j++) {
      const fecha = addMonths(fechaBase, pagosYaHechos + j - 1);
      const f     = calcularFila(saldo, tasaMens, ivaRate, tipo, pagosRestantes - j + 1, capital, j);
      numPago++;
      rows.push({
        num: numPago,
        fecha,
        nota: '',
        amort:       f.amort,
        interes:     f.interes,
        iva:         f.iva,
        totalSinIva: f.totalSinIva,
        totalConIva: f.totalConIva,
        saldo:       f.nuevoSaldo,
        pagadoReal:  null,
        diff:        null,
        esPagado:    false
      });
      saldo = f.nuevoSaldo;
      if (saldo <= 0.01) break;
    }
  }

  return rows;
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render() {
  const rows     = generarTabla();
  const nPagados = pagosRegistrados.length;
  const tbody    = document.getElementById('tablaBody');
  tbody.innerHTML = '';

  let totalPagado = 0;
  pagosRegistrados.forEach(p => totalPagado += p.monto);

  // Render table rows
  rows.forEach((r, idx) => {
    const tr     = document.createElement('tr');
    const isNext = idx === nPagados;
    tr.className = r.esPagado ? 'paid-row' : isNext ? 'next-row' : '';

    let badge, montoCell, diffCell = '';
    if (r.esPagado) {
      badge      = '<span class="badge pagado">✓ Pagado</span>';
      montoCell  = `<span style="color:var(--accent2)">${fmt(r.pagadoReal)}</span>`;
      if (Math.abs(r.diff) > 0.5) {
        const color = r.diff >= 0 ? 'var(--accent2)' : 'var(--danger)';
        const sign  = r.diff >= 0 ? '+' : '';
        diffCell = `<span style="color:${color};font-size:.75rem">${sign}${fmt(r.diff)}</span>`;
      }
    } else {
      badge     = isNext
        ? '<span class="badge proximo">Próximo</span>'
        : '<span class="badge pendiente">Pendiente</span>';
      montoCell = fmt(r.totalConIva);
    }

    tr.innerHTML = `
      <td>${r.num}</td>
      <td>${r.fecha}</td>
      <td>${fmt(r.amort)}</td>
      <td>${fmt(r.interes)}</td>
      <td>${fmt(r.iva)}</td>
      <td>${montoCell}${diffCell ? '<br>' + diffCell : ''}</td>
      <td class="saldo">${fmt(r.saldo)}</td>
      <td>${badge}</td>
    `;
    tbody.appendChild(tr);
  });

  // KPIs — saldo real = saldo de la última fila
  const saldoReal  = rows.length > 0 ? rows[rows.length - 1].saldo : 0;
  const saldoDeuda = nPagados > 0 ? rows[nPagados - 1].saldo : parseFloat(document.getElementById('capital').value) || 60000;
  const nextRow    = rows[nPagados];
  const totalProyectado = rows.reduce((s, r) => s + r.totalConIva, 0);
  const pct        = Math.min(100, totalPagado / (totalPagado + rows.filter(r => !r.esPagado).reduce((s, r) => s + r.totalConIva, 0)) * 100);
  const pendientes = rows.filter(r => !r.esPagado).length;

  document.getElementById('kpiSaldo').textContent       = fmt(saldoDeuda);
  document.getElementById('kpiPagado').textContent      = fmt(totalPagado);
  document.getElementById('kpiNumPagos').textContent    = `${nPagados} pagos / ${pendientes} restantes`;
  document.getElementById('kpiProximo').textContent     = nextRow ? fmt(nextRow.totalConIva) : saldoDeuda <= 0.01 ? '¡Liquidado!' : '—';
  document.getElementById('kpiPct').textContent         = pct.toFixed(1) + '%';
  document.getElementById('progressFill').style.width   = pct + '%';

  // Alerta de diferencia acumulada
  const alertaBox = document.getElementById('alertaBox');
  const diffAcum  = rows.filter(r => r.esPagado).reduce((s, r) => s + r.diff, 0);
  if (nPagados > 0 && Math.abs(diffAcum) > 1) {
    alertaBox.style.display = 'block';
    alertaBox.textContent = diffAcum > 0
      ? `✓ Pagaste ${fmt(diffAcum)} extra en total — tu saldo es menor al plan original.`
      : `⚠ Pagaste ${fmt(Math.abs(diffAcum))} menos en total — tu saldo es mayor al plan original.`;
  } else {
    alertaBox.style.display = 'none';
  }

  renderHistorial();
}

function renderHistorial() {
  const el = document.getElementById('historialList');
  if (pagosRegistrados.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="big">📋</div><p>Aún no has registrado ningún pago.</p></div>`;
    return;
  }
  const items = pagosRegistrados.map((p, i) => `
    <div class="payment-item">
      <div class="pi-left">
        <div class="pi-date">${p.fecha} ${p.nota ? '— ' + p.nota : ''}</div>
        <div class="pi-amount">${fmt(p.monto)}</div>
      </div>
      <button class="btn-del" onclick="eliminarPago(${i})">✕ Eliminar</button>
    </div>
  `).join('');
  el.innerHTML = `<div class="payment-list">${items}</div>`;
}

// ─── Actions ─────────────────────────────────────────────────────────────────
function registrarPago() {
  const fecha = document.getElementById('fechaPago').value;
  const monto = parseFloat(document.getElementById('montoPago').value);
  const nota  = document.getElementById('notaPago').value.trim();

  if (!fecha) { alert('Selecciona una fecha.'); return; }
  if (!monto || monto <= 0) { alert('Ingresa un monto válido.'); return; }

  pagosRegistrados.push({ fecha, monto, nota });
  localStorage.setItem('pagos_prestamo', JSON.stringify(pagosRegistrados));

  document.getElementById('montoPago').value = '';
  document.getElementById('notaPago').value  = '';
  render();
  showTab('tabla');
}

function eliminarPago(idx) {
  if (!confirm('¿Eliminar este pago del registro?')) return;
  pagosRegistrados.splice(idx, 1);
  localStorage.setItem('pagos_prestamo', JSON.stringify(pagosRegistrados));
  render();
}

function exportarJSON() {
  const config = {
    capital: document.getElementById('capital').value,
    tasa: document.getElementById('tasa').value,
    iva: document.getElementById('iva').value,
    tipoPlan: document.getElementById('tipoPlan').value,
    numPagos: document.getElementById('numPagos').value,
    fechaInicio: document.getElementById('fechaInicio').value,
  };
  const data = {
    version: '1.0',
    exportado: new Date().toISOString(),
    configuracion: config,
    pagos: pagosRegistrados
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'pagos_prestamo_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importarJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      // Restore config if present
      if (data.configuracion) {
        const c = data.configuracion;
        if (c.capital)     document.getElementById('capital').value     = c.capital;
        if (c.tasa)        document.getElementById('tasa').value        = c.tasa;
        if (c.iva)         document.getElementById('iva').value         = c.iva;
        if (c.tipoPlan)    document.getElementById('tipoPlan').value    = c.tipoPlan;
        if (c.numPagos)    document.getElementById('numPagos').value    = c.numPagos;
        if (c.fechaInicio) document.getElementById('fechaInicio').value = c.fechaInicio;
      }
      // Restore payments — support both wrapped {pagos:[]} and plain array []
      const pagos = Array.isArray(data) ? data : (data.pagos || []);
      if (!Array.isArray(pagos)) throw new Error('Formato inválido');
      pagosRegistrados = pagos;
      localStorage.setItem('pagos_prestamo', JSON.stringify(pagosRegistrados));
      render();
      alert(`✓ ${pagosRegistrados.length} pago(s) importado(s) correctamente.`);
    } catch(err) {
      alert('Error al leer el archivo: ' + err.message);
    }
    event.target.value = ''; // reset so same file can be re-imported
  };
  reader.readAsText(file);
}


// Modifica la función en tu script.js para que quede así:
window.showTab = function(name, event) {
  // Si no se pasa el evento explícitamente, buscamos el global de window
  const e = event || window.event; 
  
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  
  if (e && e.target) {
    e.target.classList.add('active');
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
// Set today's date as default for payment
document.getElementById('fechaPago').value = new Date().toISOString().slice(0,10);

// Re-render on any config change
['capital','tasa','iva','numPagos','tipoPlan','fechaInicio'].forEach(id => {
  document.getElementById(id).addEventListener('input', render);
  document.getElementById(id).addEventListener('change', render);
});

render();