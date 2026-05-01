// ================================================
// estadisticas.js — Dashboard financiero
// Cruza: admin_pagos + admin_servicios + admin_gastos
// ================================================

const Estadisticas = {
  data: { pagos: [], servicios: [], gastos: [] },
  mes: null,

  async render() {
    const hoy  = new Date();
    this.mes   = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('mainContent').innerHTML =
      '<div class="loading-spinner"><div class="spinner-ring"></div></div>';
    await this._load(this.mes);
    this._draw();
  },

  async _load(mes) {
    this.mes = mes;
    try {
      const [pSnap, sSnap, gSnap] = await Promise.all([
        db.collection('admin_pagos').get().catch(() => ({ docs: [] })),
        db.collection('admin_servicios').get().catch(() => ({ docs: [] })),
        db.collection('admin_gastos').get().catch(() => ({ docs: [] }))
      ]);
      this.data.pagos     = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.data.servicios = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.data.gastos    = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { this.data = { pagos: [], servicios: [], gastos: [] }; }
  },

  _draw() {
    const mes = this.mes;

    // Filtrar por mes
    const pagosM    = this.data.pagos.filter(p => (p.fecha || '').startsWith(mes));
    const serviciosM = this.data.servicios.filter(s => (s.fechaEvento || '').startsWith(mes));
    const gastosM   = this.data.gastos.filter(g => (g.mes || g.fecha?.slice(0, 7)) === mes);

    // Cálculos
    const totalCobrado   = pagosM.reduce((a, p) => a + (p.monto || 0), 0);
    const totalServicios = serviciosM.reduce((a, s) => a + (s.total || 0), 0);
    const deudaPendiente = Math.max(0, totalServicios - totalCobrado);

    const gastosFijos = gastosM.filter(g => g.tipo === 'fijo').reduce((a, g) => a + (g.monto || 0), 0);
    const gastosVar   = gastosM.filter(g => g.tipo === 'variable').reduce((a, g) => a + (g.monto || 0), 0);
    const totalGastos = gastosFijos + gastosVar;

    const gananciaReal = totalCobrado - totalGastos;

    document.getElementById('mainContent').innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>Estadísticas financieras</h3>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Período</label>
            <input type="month" id="statsMes" value="${mes}" class="filter-input-inline">
          </div>
        </div>

        <!-- KPIs principales -->
        <div class="stats-grid">
          <div class="stat-card income">
            <div class="stat-label">💰 Ingresos cobrados</div>
            <div class="stat-value">$${totalCobrado.toLocaleString('es-AR')}</div>
            <div class="stat-sub">${pagosM.length} pago${pagosM.length !== 1 ? 's' : ''} en el período</div>
          </div>
          <div class="stat-card expense">
            <div class="stat-label">📉 Total egresos</div>
            <div class="stat-value">$${totalGastos.toLocaleString('es-AR')}</div>
            <div class="stat-sub">${gastosM.length} gasto${gastosM.length !== 1 ? 's' : ''} registrado${gastosM.length !== 1 ? 's' : ''}</div>
          </div>
          <div class="stat-card ${gananciaReal >= 0 ? 'profit' : 'expense'}">
            <div class="stat-label">📊 Ganancia real</div>
            <div class="stat-value" style="color:${gananciaReal >= 0 ? 'var(--success)' : 'var(--error)'}">
              ${gananciaReal >= 0 ? '' : '−'}$${Math.abs(gananciaReal).toLocaleString('es-AR')}
            </div>
            <div class="stat-sub">Ingresos − Egresos</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-label">⏳ Deuda pendiente</div>
            <div class="stat-value">$${deudaPendiente.toLocaleString('es-AR')}</div>
            <div class="stat-sub">${serviciosM.length} servicio${serviciosM.length !== 1 ? 's' : ''} en el período</div>
          </div>
        </div>

        <!-- Gráficos de tendencia -->
        <div class="charts-section">
          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-title">Pagos cobrados por mes ($)</div>
              <canvas id="chartPagos" height="200"></canvas>
            </div>
            <div class="chart-card">
              <div class="chart-title">Egresos por mes ($)</div>
              <canvas id="chartGastos" height="200"></canvas>
            </div>
          </div>
          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-title">Ganancia mensual ($)</div>
              <canvas id="chartGanancia" height="200"></canvas>
            </div>
            <div class="chart-card">
              <div class="chart-title">Productos más vendidos (bocados)</div>
              <canvas id="chartProductos" height="200"></canvas>
            </div>
          </div>
        </div>

        <!-- Desglose en dos columnas -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
          <div class="detail-section" style="background:var(--blanco);padding:16px 18px;border-radius:var(--radius);box-shadow:var(--shadow-sm)">
            <div class="detail-section-title">Desglose de egresos</div>
            <div class="detail-row">
              <span class="dlabel">Gastos fijos</span>
              <span class="dvalue">$${gastosFijos.toLocaleString('es-AR')}</span>
            </div>
            <div class="detail-row">
              <span class="dlabel">Gastos variables</span>
              <span class="dvalue">$${gastosVar.toLocaleString('es-AR')}</span>
            </div>
            <div class="detail-row" style="font-weight:700;border-top:2px solid var(--bordo-mid);margin-top:6px;padding-top:8px">
              <span class="dlabel" style="color:var(--negro);font-weight:700">Total egresos</span>
              <span class="dvalue">$${totalGastos.toLocaleString('es-AR')}</span>
            </div>
          </div>
          <div class="detail-section" style="background:var(--blanco);padding:16px 18px;border-radius:var(--radius);box-shadow:var(--shadow-sm)">
            <div class="detail-section-title">Ventas del período</div>
            <div class="detail-row">
              <span class="dlabel">Total servicios</span>
              <span class="dvalue">$${totalServicios.toLocaleString('es-AR')}</span>
            </div>
            <div class="detail-row">
              <span class="dlabel">Cobrado</span>
              <span class="dvalue" style="color:var(--success)">$${totalCobrado.toLocaleString('es-AR')}</span>
            </div>
            <div class="detail-row">
              <span class="dlabel">Pendiente de cobro</span>
              <span class="dvalue" style="color:var(--warning)">$${deudaPendiente.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        ${gastosM.length > 0 ? `
        <!-- Gastos por categoría -->
        <div style="background:var(--blanco);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:16px 18px;margin-bottom:20px">
          <div class="detail-section-title">Gastos por categoría</div>
          <div class="table-wrapper">
            <table class="admin-table">
              <thead><tr><th>Categoría</th><th>Tipo</th><th>Monto</th></tr></thead>
              <tbody>
                ${this._groupByCategory(gastosM).map(cat => `
                  <tr>
                    <td>${this._esc(cat.categoria || '—')}</td>
                    <td><span class="badge ${cat.tipo === 'fijo' ? 'badge-info' : 'badge-warning'}">${cat.tipo === 'fijo' ? 'Fijo' : 'Variable'}</span></td>
                    <td style="font-weight:700">$${cat.total.toLocaleString('es-AR')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        ${serviciosM.length > 0 ? `
        <!-- Servicios del mes -->
        <div style="background:var(--blanco);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:16px 18px">
          <div class="detail-section-title">Servicios del período</div>
          <div class="table-wrapper">
            <table class="admin-table">
              <thead><tr><th>#</th><th>Cliente</th><th>Fecha</th><th>Tipo</th><th>Personas</th><th>Total</th><th>Cobrado</th><th>Saldo</th><th>Estado pago</th></tr></thead>
              <tbody>
                ${serviciosM.map(s => {
                  const pagosS  = this.data.pagos.filter(p => p.servicioId === s.id);
                  const cobrado = pagosS.reduce((a, p) => a + (p.monto || 0), 0);
                  const saldo   = Math.max(0, (s.total || 0) - cobrado);
                  const ep      = s.estadoPago || 'sin_pago';
                  const bMap    = { sin_pago: 'badge-error', parcial: 'badge-warning', completo: 'badge-success' };
                  const lMap    = { sin_pago: 'Sin pago', parcial: 'Parcial', completo: 'Completo' };
                  return `
                    <tr>
                      <td><strong>#${String(s.numero || '').padStart(3, '0')}</strong></td>
                      <td>${this._esc(s.cliente?.nombre || '—')}</td>
                      <td>${this._formatDate(s.fechaEvento)}</td>
                      <td>${this._esc(s.tipoEvento || '—')}</td>
                      <td>${s.personas || '—'}</td>
                      <td>$${Math.round(s.total || 0).toLocaleString('es-AR')}</td>
                      <td style="color:var(--success);font-weight:600">$${cobrado.toLocaleString('es-AR')}</td>
                      <td style="color:var(--warning);font-weight:600">$${saldo.toLocaleString('es-AR')}</td>
                      <td><span class="badge ${bMap[ep]}">${lMap[ep]}</span></td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}
      </div>`;

    document.getElementById('statsMes').addEventListener('change', async (e) => {
      document.getElementById('mainContent').innerHTML =
        '<div class="loading-spinner"><div class="spinner-ring"></div></div>';
      await this._load(e.target.value);
      this._draw();
    });

    // Dibujar gráficos después del render
    requestAnimationFrame(() => this._drawCharts());
  },

  // ── Gráficos Chart.js ────────────────────────────

  _getLastMonths(n) {
    const months = [];
    const d = new Date(this.mes + '-01');
    for (let i = n - 1; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  },

  _monthLabel(ym) {
    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const [y, m] = ym.split('-');
    return `${MESES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
  },

  _drawCharts() {
    if (typeof Chart === 'undefined') return;
    const months = this._getLastMonths(6);
    const labels = months.map(m => this._monthLabel(m));

    const pagosData    = months.map(m =>
      this.data.pagos.filter(p => (p.fecha || '').startsWith(m)).reduce((a, p) => a + (p.monto || 0), 0)
    );
    const gastosData   = months.map(m => {
      const g = this.data.gastos.filter(x => (x.mes || (x.fecha || '').slice(0,7)) === m);
      return g.reduce((a, x) => a + (x.monto || 0), 0);
    });
    const gananciaData = months.map((_, i) => pagosData[i] - gastosData[i]);

    // Colores
    const bordo = '#8B2E3A';
    const rosaClaro = 'rgba(139,46,58,0.15)';
    const green  = '#4A7C59';
    const greenL = 'rgba(74,124,89,0.15)';
    const orange = '#9C6B1E';
    const orangeL= 'rgba(156,107,30,0.15)';

    const defaults = {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { ticks: { font: { size: 11 }, callback: v => '$' + v.toLocaleString('es-AR') }, grid: { color: 'rgba(0,0,0,.05)' } }
      }
    };

    // Chart Pagos
    const ctxP = document.getElementById('chartPagos');
    if (ctxP) {
      if (ctxP._chart) ctxP._chart.destroy();
      ctxP._chart = new Chart(ctxP, {
        type: 'bar',
        data: { labels, datasets: [{ data: pagosData, backgroundColor: bordo, borderRadius: 6 }] },
        options: { ...defaults }
      });
    }

    // Chart Gastos
    const ctxG = document.getElementById('chartGastos');
    if (ctxG) {
      if (ctxG._chart) ctxG._chart.destroy();
      ctxG._chart = new Chart(ctxG, {
        type: 'bar',
        data: { labels, datasets: [{ data: gastosData, backgroundColor: orange, borderRadius: 6 }] },
        options: { ...defaults }
      });
    }

    // Chart Ganancia (línea)
    const ctxN = document.getElementById('chartGanancia');
    if (ctxN) {
      if (ctxN._chart) ctxN._chart.destroy();
      ctxN._chart = new Chart(ctxN, {
        type: 'line',
        data: { labels, datasets: [{
          data: gananciaData,
          borderColor: green, backgroundColor: greenL,
          pointBackgroundColor: green, tension: 0.3, fill: true, borderWidth: 2
        }] },
        options: {
          ...defaults,
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { ticks: { font: { size: 11 }, callback: v => '$' + v.toLocaleString('es-AR') }, grid: { color: 'rgba(0,0,0,.05)' } }
          }
        }
      });
    }

    // Chart Productos más vendidos (del mes seleccionado)
    const serviciosM = this.data.servicios.filter(s => (s.fechaEvento || '').startsWith(this.mes));
    const prodMap = {};
    serviciosM.forEach(s => {
      (s.items || []).forEach(it => {
        const key = it.nombre || it.id || '?';
        prodMap[key] = (prodMap[key] || 0) + (it.cantidad || 0);
      });
    });
    const sorted = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const ctxR = document.getElementById('chartProductos');
    if (ctxR) {
      if (ctxR._chart) ctxR._chart.destroy();
      if (sorted.length === 0) {
        ctxR.parentElement.innerHTML = `<div class="chart-title">Productos más vendidos (bocados)</div>
          <p style="text-align:center;color:var(--text-muted);padding:40px 0;font-size:.82rem">Sin datos en este período</p>`;
      } else {
        ctxR._chart = new Chart(ctxR, {
          type: 'bar',
          data: {
            labels: sorted.map(([k]) => k.length > 18 ? k.slice(0, 16) + '…' : k),
            datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: rosaClaro, borderColor: bordo, borderWidth: 1.5, borderRadius: 6 }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 10 } } },
              y: { ticks: { font: { size: 10 } } }
            }
          }
        });
      }
    }
  },

  _groupByCategory(gastos) {
    const map = {};
    gastos.forEach(g => {
      const key = `${g.categoria || 'Sin categoría'}|${g.tipo}`;
      if (!map[key]) map[key] = { categoria: g.categoria || 'Sin categoría', tipo: g.tipo, total: 0 };
      map[key].total += g.monto || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  },

  _formatDate(str) {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  },

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
