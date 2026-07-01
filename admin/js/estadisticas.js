// ================================================
// estadisticas.js — Dashboard financiero
// Cruza: admin_pagos + admin_servicios + admin_gastos
// ================================================

const Estadisticas = {
  data: { pagos: [], servicios: [], gastos: [], productos: [], pedidosWeb: [] },
  mes: null,
  // modo: 'mes' | 'rango'
  modo: 'mes',
  desde: null,
  hasta: null,
  vistaStats: 'resumen',

  async render() {
    const hoy  = new Date();
    this.mes   = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    this.modo  = 'mes';
    this.desde = null;
    this.hasta = null;
    document.getElementById('mainContent').innerHTML =
      '<div class="loading-spinner"><div class="spinner-ring"></div></div>';
    await this._load();
    this._draw();
  },

  async _load() {
    try {
      const [pSnap, sSnap, gSnap, prodSnap, oSnap] = await Promise.all([
        db.collection('admin_pagos').get().catch(() => ({ docs: [] })),
        db.collection('admin_servicios').get().catch(() => ({ docs: [] })),
        db.collection('admin_gastos').get().catch(() => ({ docs: [] })),
        db.collection('admin_productos').get().catch(() => ({ docs: [] })),
        db.collection('orders').get().catch(() => ({ docs: [] }))
      ]);
      const totalUpdates = [];
      this.data.pagos      = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.data.servicios  = sSnap.docs.map(d => {
        const servicio = this._normalizarServicio({ id: d.id, ...d.data() });
        if (servicio.subtotalBruto > 0 && servicio.descuento > 0 && Math.round(Number(d.data().total || 0)) !== servicio.total) {
          totalUpdates.push(d.ref.update({ total: servicio.total }).catch(e => console.warn('No se pudo normalizar total de servicio', d.id, e)));
        }
        return servicio;
      });
      this.data.servicios = this._dedupePedidosWeb(this.data.servicios);
      this.data.gastos     = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.data.productos  = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.data.pedidosWeb = oSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(o => ['paid', 'pagado', 'aprobado', 'approved'].includes((o.status || '').toLowerCase()));
      if (totalUpdates.length) await Promise.all(totalUpdates);
    } catch (e) { this.data = { pagos: [], servicios: [], gastos: [], productos: [], pedidosWeb: [] }; }
  },

  _totalServicioFinal(s = {}) {
    const subtotal = Number(s.subtotalBruto || 0);
    const descuento = Number(s.descuento || 0);
    if (subtotal > 0 && descuento > 0) return Math.round(subtotal * (1 - descuento / 100));
    return Math.round(Number(s.total || 0));
  },

  _normalizarServicio(s = {}) {
    return { ...s, total: this._totalServicioFinal(s) };
  },

  // Filtra según el modo activo
  // Pagos: por fecha de cobro. Gastos: por fecha del gasto. Servicios: por fecha del evento.
  _servicioPedidoKey(s = {}) {
    if (s.tipoServicio !== 'pedido' && !s.solicitudId && !s.orderId && !s.codigoPedido) {
      return `servicio:${s.id}`;
    }
    if (s.solicitudId) return `pedido:sol:${s.solicitudId}`;
    if (s.orderId) return `pedido:order:${s.orderId}`;
    if (s.codigoPedido) return `pedido:codigo:${s.codigoPedido}`;
    return `servicio:${s.id}`;
  },

  _servicioDedupeScore(s = {}) {
    let score = 0;
    if (s.estadoPago === 'completo') score += 30;
    else if (s.estadoPago === 'parcial') score += 20;
    else if (Number(s.montoPagado || 0) > 0) score += 10;
    if (String(s.id || '').startsWith('solicitud_')) score += 5;
    if (s.orderId) score += 3;
    if (s.solicitudId) score += 3;
    return score;
  },

  _dedupePedidosWeb(servicios = []) {
    const byKey = new Map();
    servicios.forEach(s => {
      const key = this._servicioPedidoKey(s);
      const prev = byKey.get(key);
      if (!prev || this._servicioDedupeScore(s) > this._servicioDedupeScore(prev)) {
        byKey.set(key, s);
      }
    });
    return Array.from(byKey.values());
  },

  _filtrar() {
    const getDateStr = raw => {
      if (!raw) return '';
      if (typeof raw === 'string') return raw.slice(0, 10);
      if (raw.toDate) return raw.toDate().toISOString().slice(0, 10);
      if (raw.seconds) return new Date(raw.seconds * 1000).toISOString().slice(0, 10);
      return '';
    };
    if (this.modo === 'mes') {
      const mes = this.mes;
      return {
        pagos:      this.data.pagos.filter(p => (p.fecha || '').startsWith(mes)),
        servicios:  this.data.servicios.filter(s => (s.fechaEvento || '').startsWith(mes)),
        gastos:     this.data.gastos.filter(g => (g.mes || (g.fecha || '').slice(0, 7)) === mes),
        pedidosWeb: this.data.pedidosWeb.filter(o => {
          const d = getDateStr(o.fechaEntrega || o.fechaPedido || o.fecha);
          return d.startsWith(mes);
        })
      };
    } else {
      const desde = this.desde || '0000-00-00';
      const hasta = this.hasta || '9999-99-99';
      return {
        pagos:      this.data.pagos.filter(p => (p.fecha || '') >= desde && (p.fecha || '') <= hasta),
        servicios:  this.data.servicios.filter(s => (s.fechaEvento || '') >= desde && (s.fechaEvento || '') <= hasta),
        gastos:     this.data.gastos.filter(g => (g.fecha || '') >= desde && (g.fecha || '') <= hasta),
        pedidosWeb: this.data.pedidosWeb.filter(o => {
          const d = getDateStr(o.fechaEntrega || o.fechaPedido || o.fecha);
          return d >= desde && d <= hasta;
        })
      };
    }
  },

  _draw() {
    const { pagos: pagosM, servicios: serviciosM, gastos: gastosM, pedidosWeb: pedidosWebM } = this._filtrar();
    const vista = this.vistaStats;

    // Cálculos
    const totalPagosAdmin  = pagosM.reduce((a, p) => a + (p.monto || 0), 0);
    const totalPedidosWeb  = pedidosWebM.reduce((a, o) => a + (o.total || o.subtotal || 0), 0);
    const totalCobrado     = totalPagosAdmin + totalPedidosWeb;

    // Solo servicios no cancelados del período
    const svcsActivos = serviciosM.filter(s => (s.estado || '') !== 'cancelado');
    const totalServicios = svcsActivos.reduce((a, s) => a + (s.total || 0), 0);

    // Deuda: suma de saldos individuales usando TODOS los pagos históricos de cada servicio.
    // Esto evita que un pago hecho este mes por un servicio de otro mes distorsione la deuda del período.
    const deudaPendiente = svcsActivos.reduce((acc, s) => {
      const todosPagos = this.data.pagos
        .filter(p => p.servicioId === s.id)
        .reduce((a, p) => a + (p.monto || 0), 0);
      return acc + Math.max(0, (s.total || 0) - todosPagos);
    }, 0);
    const cantConSaldo = svcsActivos.filter(s => {
      const todosPagos = this.data.pagos.filter(p => p.servicioId === s.id).reduce((a, p) => a + (p.monto || 0), 0);
      return (s.total || 0) > todosPagos;
    }).length;

    const gastosFijos = gastosM.filter(g => g.tipo === 'fijo').reduce((a, g) => a + (g.monto || 0), 0);
    const gastosVar   = gastosM.filter(g => g.tipo === 'variable').reduce((a, g) => a + (g.monto || 0), 0);
    const totalGastos = gastosFijos + gastosVar;

    const gananciaReal = totalCobrado - totalGastos;

    document.getElementById('mainContent').innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>ESTADÍSTICAS</h3>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <div class="stats-period-tabs">
              <button class="spt-btn ${this.modo === 'mes' ? 'active' : ''}" data-modo="mes">Por mes</button>
              <button class="spt-btn ${this.modo === 'rango' ? 'active' : ''}" data-modo="rango">Rango</button>
            </div>
            <div id="statsFilterMes" style="display:${this.modo === 'mes' ? 'flex' : 'none'};align-items:center;gap:6px">
              <input type="month" id="statsMes" value="${this.mes}" class="filter-input-inline">
            </div>
            <div id="statsFilterRango" style="display:${this.modo === 'rango' ? 'flex' : 'none'};align-items:center;gap:6px;flex-wrap:wrap">
              <input type="date" id="statsDesde" value="${this.desde || ''}" class="filter-input-inline" placeholder="Desde" title="Desde">
              <span style="font-size:.75rem;color:var(--text-muted)">→</span>
              <input type="date" id="statsHasta" value="${this.hasta || ''}" class="filter-input-inline" placeholder="Hasta" title="Hasta">
            </div>
          </div>
        </div>

        <!-- Solapas Resumen / Gráficos -->
        <div class="stats-view-tabs">
          <button class="svt-btn ${vista === 'resumen' ? 'active' : ''}" data-vista="resumen">📋 Resumen</button>
          <button class="svt-btn ${vista === 'graficos' ? 'active' : ''}" data-vista="graficos">📈 Gráficos</button>
        </div>

        <!-- KPIs principales -->
        <div class="stats-grid">
          <div class="stat-card income">
            <div class="stat-label">💰 Ingresos cobrados</div>
            <div class="stat-value">$${totalCobrado.toLocaleString('es-AR')}</div>
            <div class="stat-sub">${pagosM.length} pago${pagosM.length !== 1 ? 's' : ''} + ${pedidosWebM.length} pedido${pedidosWebM.length !== 1 ? 's' : ''} web</div>
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
            <div class="stat-sub">${cantConSaldo} servicio${cantConSaldo !== 1 ? 's' : ''} con saldo sin cobrar</div>
          </div>
        </div>

 

        ${vista === 'resumen' ? `
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
            <div class="detail-section-title">Ingresos del período</div>
            <div class="detail-row">
              <span class="dlabel">Pagos admin (servicios)</span>
              <span class="dvalue" style="color:var(--success)">$${totalPagosAdmin.toLocaleString('es-AR')}</span>
            </div>
            <div class="detail-row">
              <span class="dlabel">Pedidos web pagados</span>
              <span class="dvalue" style="color:var(--success)">$${totalPedidosWeb.toLocaleString('es-AR')}</span>
            </div>
            <div class="detail-row" style="font-weight:700;border-top:2px solid var(--bordo-mid);margin-top:6px;padding-top:8px">
              <span class="dlabel" style="color:var(--negro);font-weight:700">Total cobrado</span>
              <span class="dvalue">$${totalCobrado.toLocaleString('es-AR')}</span>
            </div>
            <div class="detail-row">
              <span class="dlabel">Total facturado (servicios activos)</span>
              <span class="dvalue">$${totalServicios.toLocaleString('es-AR')}</span>
            </div>
            <div class="detail-row">
              <span class="dlabel">Deuda real (saldos pendientes)</span>
              <span class="dvalue" style="color:var(--warning)">$${deudaPendiente.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        ${pedidosWebM.length > 0 ? `
        <div style="background:var(--blanco);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:16px 18px;margin-bottom:20px">
          <div class="detail-section-title">🛒 Pedidos web del período</div>
          <div class="table-wrapper">
            <table class="admin-table">
              <thead><tr><th>ID</th><th>Cliente</th><th>Fecha entrega</th><th>Estado</th><th>Total</th></tr></thead>
              <tbody>
                ${pedidosWebM.map(o => {
                  const raw = o.fechaEntrega || o.fechaPedido || o.fecha;
                  const dateStr = !raw ? '—' : typeof raw === 'string' ? this._formatDate(raw.slice(0,10)) : (raw.toDate ? this._formatDate(raw.toDate().toISOString().slice(0,10)) : '—');
                  return `
                    <tr>
                      <td><strong>${this._esc(o.orderId || o.id || '—')}</strong></td>
                      <td>${this._esc(o.cliente?.nombre || o.nombre || '—')}</td>
                      <td>${dateStr}</td>
                      <td><span class="badge badge-success">Pagado</span></td>
                      <td style="font-weight:700;color:var(--success)">$${Math.round(o.total || o.subtotal || 0).toLocaleString('es-AR')}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        ${gastosM.length > 0 ? `
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
        </div>` : `<p style="text-align:center;color:var(--text-muted);padding:32px 0;font-size:.85rem">Sin servicios en este período.</p>`}

        ${(() => {
          const mapMenus = {};
          serviciosM.forEach(s => {
            (s.items || []).forEach(it => {
              if (it.tipo !== 'menu') return;
              const k = it.nombre || '?';
              if (!mapMenus[k]) mapMenus[k] = { nombre: k, veces: 0, personas: 0, total: 0 };
              mapMenus[k].veces++;
              mapMenus[k].personas += +(it.cantidad || 0);
              mapMenus[k].total   += +(it.subtotal || 0);
            });
          });
          const topMenus = Object.values(mapMenus).sort((a, b) => b.veces - a.veces);
          if (!topMenus.length) return '';
          return `
          <div style="background:var(--blanco);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:16px 18px;margin-top:16px">
            <div class="detail-section-title">🍽️ Top menús más pedidos</div>
            <div class="table-wrapper">
              <table class="admin-table">
                <thead><tr><th>Menú</th><th style="text-align:center">Veces pedido</th><th style="text-align:center">Bocados totales</th><th style="text-align:right">Facturado</th></tr></thead>
                <tbody>
                  ${topMenus.map((m, i) => `
                    <tr>
                      <td><strong>${i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}${Estadisticas._esc(m.nombre)}</strong></td>
                      <td style="text-align:center">${m.veces}</td>
                      <td style="text-align:center">${m.personas}</td>
                      <td style="text-align:right;font-weight:700">$${Math.round(m.total).toLocaleString('es-AR')}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
        })()}
        ` : `
        <!-- Graficos -->
        <div class="charts-section">
          <div class="charts-row">
            <div class="chart-card chart-card-tall">
              <div class="chart-title">Top menus mas pedidos</div>
              <div style="position:relative;height:300px"><canvas id="chartTopMenus"></canvas></div>
            </div>
            <div class="chart-card chart-card-tall">
              <div class="chart-title">Top 10 productos mas vendidos</div>
              <div style="position:relative;height:300px"><canvas id="chartTop10Ventas"></canvas></div>
            </div>
          </div>
          <div class="charts-row">
            <div class="chart-card chart-card-tall">
              <div class="chart-title">💰 Top 10 mayor ganancia neta</div>
              <div style="position:relative;height:300px"><canvas id="chartTop10Ganancia"></canvas></div>
            </div>
          </div>
          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-title">🥧 Gastos por categoría</div>
              <div style="position:relative;height:240px"><canvas id="chartPieGastos"></canvas></div>
            </div>
            <div class="chart-card">
              <div class="chart-title">💵 Cobros por mes</div>
              <canvas id="chartCobros" height="200"></canvas>
            </div>
          </div>
          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-title">📉 Gastos por mes</div>
              <canvas id="chartGastosMes" height="200"></canvas>
            </div>
            <div class="chart-card">
              <div class="chart-title">📊 Ganancia neta por mes</div>
              <canvas id="chartGananciaMes" height="200"></canvas>
            </div>
          </div>
          <!-- Análisis detallado -->
          <div id="statsAnalisisDetallado"></div>
        </div>
        `}
      </div>`;

    // Solapas Resumen / Gráficos
    document.querySelectorAll('.svt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.vistaStats = btn.dataset.vista;
        this._draw();
      });
    });

    // Tabs modo período
    document.querySelectorAll('.spt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.modo = btn.dataset.modo;
        this._draw();
      });
    });

    // Selector de mes
    const statsMesEl = document.getElementById('statsMes');
    if (statsMesEl) {
      statsMesEl.addEventListener('change', (e) => {
        this.mes = e.target.value;
        this._draw();
      });
    }

    // Rango de fechas
    const desdeEl = document.getElementById('statsDesde');
    const hastaEl = document.getElementById('statsHasta');
    const onRango = () => {
      this.desde = desdeEl?.value || null;
      this.hasta = hastaEl?.value || null;
      this._draw();
    };
    if (desdeEl) desdeEl.addEventListener('change', onRango);
    if (hastaEl) hastaEl.addEventListener('change', onRango);

    // Dibujar gráficos si estamos en esa vista
    if (vista === 'graficos') {
      requestAnimationFrame(() => this._drawCharts());
    }
  },

  // ── Gráficos Chart.js ────────────────────────────

  _getLastMonths(n) {
    const months = [];
    let refMes = this.mes;
    if (this.modo === 'rango' && (this.hasta || this.desde)) {
      refMes = (this.hasta || this.desde).slice(0, 7);
    }
    // Parsear componentes directamente para evitar conversión UTC→local
    // (new Date('YYYY-MM-01') se interpreta en UTC y en UTC-3 queda en el mes anterior)
    const [year, month] = (refMes || this.mes).split('-').map(Number);
    for (let i = n - 1; i >= 0; i--) {
      const dt = new Date(year, month - 1 - i, 1);
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

    // Helper: convierte fecha Firestore (Timestamp o string) a string YYYY-MM-DD
    const getFecha = v => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (v.toDate) return v.toDate().toISOString().slice(0, 10);
      if (v.seconds) return new Date(v.seconds * 1000).toISOString().slice(0, 10);
      return '';
    };

    const bordo   = '#8B2E3A';
    const green   = '#4A7C59';
    const orange  = '#9C6B1E';
    const PALETTE = [
      '#8B2E3A','#4A7C59','#9C6B1E','#2E5E8B','#7B4EA0',
      '#2E8B8B','#8B6E2E','#4E8B2E','#8B2E6E','#2E4E8B'
    ];

    const mkChart = (id, config) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el._chart) el._chart.destroy();
      el._chart = new Chart(el, config);
    };

    const noData = (canvasId, msg) => {
      const el = document.getElementById(canvasId);
      if (!el) return;
      const wrap = el.closest('[style*="height"]') || el.parentElement;
      wrap.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:60px 0;font-size:.82rem">${msg}</p>`;
    };

    // ── Datos filtrados por período seleccionado ──────
    const { servicios: svcsF, gastos: gastosF } = this._filtrar();

    // ── Top menús más pedidos ────────────────────────
    const mapMenus = {};
    svcsF.forEach(s => {
      (s.items || []).forEach(it => {
        if (it.tipo !== 'menu') return;
        const k = it.nombre || '?';
        if (!mapMenus[k]) mapMenus[k] = { nombre: k, veces: 0, personas: 0 };
        mapMenus[k].veces++;
        mapMenus[k].personas += +(it.cantidad || 0);
      });
    });
    const topMenus = Object.values(mapMenus).sort((a, b) => b.veces - a.veces).slice(0, 10);

    if (!topMenus.length) {
      noData('chartTopMenus', 'Sin menús en este período');
    } else {
      mkChart('chartTopMenus', {
        type: 'bar',
        data: {
          labels: topMenus.map(m => m.nombre),
          datasets: [{
            label: 'Veces pedido',
            data: topMenus.map(m => m.veces),
            backgroundColor: topMenus.map((_, i) => PALETTE[i % PALETTE.length] + 'BB'),
            borderColor:     topMenus.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 1.5, borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} veces · ${topMenus[ctx.dataIndex].personas} bocados` } }
          },
          scales: {
            x: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 11 }, stepSize: 1 } },
            y: { ticks: { font: { size: 11 } } }
          }
        }
      });
    }

    // ── Top 10 más vendidos (bocados) ─────────────────
    const mapV = {};
    svcsF.forEach(s => {
      (s.items || []).forEach(it => {
        const k = it.nombre || '?';
        if (!mapV[k]) mapV[k] = { nombre: k, cantidad: 0 };
        mapV[k].cantidad += +(it.cantidad || 0);
      });
    });
    const top10V = Object.values(mapV).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);

    if (!top10V.length) {
      noData('chartTop10Ventas', 'Sin datos de productos en este período');
    } else {
      mkChart('chartTop10Ventas', {
        type: 'bar',
        data: {
          labels: top10V.map(p => p.nombre),
          datasets: [{
            data: top10V.map(p => p.cantidad),
            backgroundColor: top10V.map((_, i) => PALETTE[i % PALETTE.length] + 'BB'),
            borderColor:     top10V.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 1.5, borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} bocados` } }
          },
          scales: {
            x: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 11 } } },
            y: { ticks: { font: { size: 11 } } }
          }
        }
      });
    }

    // ── Top 10 mayor ganancia neta ────────────────────
    const mapG = {};
    svcsF.forEach(s => {
      (s.items || []).forEach(it => {
        const k = it.nombre || '?';
        if (!mapG[k]) mapG[k] = { nombre: k, margen: 0, ingreso: 0 };
        const cant   = +(it.cantidad || 0);
        const precio = +(it.precioUnitario || it.precio || 0);
        const prod   = it.id ? this.data.productos.find(p => p.id === it.id) : null;
        const costo  = +(prod?.precioCoste || it.costo || 0);
        mapG[k].ingreso += precio * cant;
        mapG[k].margen  += (precio - costo) * cant;
      });
    });
    const top10G = Object.values(mapG).sort((a, b) => b.margen - a.margen).slice(0, 10);

    if (!top10G.length || top10G.every(p => p.margen === 0)) {
      noData('chartTop10Ganancia', 'Sin datos de costo en este período');
    } else {
      mkChart('chartTop10Ganancia', {
        type: 'bar',
        data: {
          labels: top10G.map(p => p.nombre),
          datasets: [{
            data: top10G.map(p => Math.round(p.margen)),
            backgroundColor: top10G.map((_, i) => PALETTE[i % PALETTE.length] + 'BB'),
            borderColor:     top10G.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 1.5, borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` $${Math.round(ctx.parsed.x).toLocaleString('es-AR')} ganancia` } }
          },
          scales: {
            x: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 11 }, callback: v => '$' + v.toLocaleString('es-AR') } },
            y: { ticks: { font: { size: 11 } } }
          }
        }
      });
    }

    // ── Pie: gastos por categoría (período) ───────────
    const catMap = {};
    gastosF.forEach(g => {
      const k = g.categoria || 'Sin categoría';
      catMap[k] = (catMap[k] || 0) + (+(g.monto) || 0);
    });
    const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    if (!catEntries.length) {
      noData('chartPieGastos', 'Sin gastos en este período');
    } else {
      mkChart('chartPieGastos', {
        type: 'doughnut',
        data: {
          labels: catEntries.map(([k]) => k),
          datasets: [{
            data: catEntries.map(([, v]) => v),
            backgroundColor: catEntries.map((_, i) => PALETTE[i % PALETTE.length] + 'CC'),
            borderColor: '#fff', borderWidth: 2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { font: { size: 11 }, padding: 12, boxWidth: 14 } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: $${ctx.parsed.toLocaleString('es-AR')}` } }
          }
        }
      });

    }

    // ── Tendencias mensuales (últimos 6 meses) ────────
    const months = this._getLastMonths(6);
    const labels = months.map(m => this._monthLabel(m));

    const cobrosData = months.map(m => {
      const pagoAdmin = this.data.pagos
        .filter(p => getFecha(p.fecha).startsWith(m))
        .reduce((a, p) => a + (+(p.monto) || 0), 0);
      const pedidoWeb = this.data.pedidosWeb
        .filter(o => {
          const d = getFecha(o.fechaEntrega || o.fechaPedido || o.fecha);
          return d.startsWith(m);
        })
        .reduce((a, o) => a + (+(o.total || o.subtotal) || 0), 0);
      return pagoAdmin + pedidoWeb;
    });
    const gastosData = months.map(m =>
      this.data.gastos
        .filter(g => {
          const f = getFecha(g.fecha);
          return (g.mes || f.slice(0, 7)) === m;
        })
        .reduce((a, g) => a + (+(g.monto) || 0), 0)
    );
    const gananciaData = months.map((_, i) => cobrosData[i] - gastosData[i]);

    const barOpts = {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { ticks: { font: { size: 11 }, callback: v => '$' + v.toLocaleString('es-AR') }, grid: { color: 'rgba(0,0,0,.05)' } }
      }
    };

    // Cobros por mes
    mkChart('chartCobros', {
      type: 'bar',
      data: { labels, datasets: [{ data: cobrosData, backgroundColor: bordo, borderRadius: 6 }] },
      options: { ...barOpts }
    });

    // Gastos por mes
    mkChart('chartGastosMes', {
      type: 'bar',
      data: { labels, datasets: [{ data: gastosData, backgroundColor: orange, borderRadius: 6 }] },
      options: { ...barOpts }
    });

    // Ganancia neta por mes (barras coloreadas verde/rojo)
    mkChart('chartGananciaMes', {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: gananciaData,
          backgroundColor: gananciaData.map(v => v >= 0 ? green + 'BB' : '#D94040BB'),
          borderColor:     gananciaData.map(v => v >= 0 ? green : '#D94040'),
          borderWidth: 1.5, borderRadius: 6
        }]
      },
      options: { ...barOpts }
    });

    // ── Sección de análisis detallado ─────────────────────
    this._renderAnalisis({ top10V, top10G, catEntries, cobrosData, gastosData, gananciaData, labels, months });
  },

  _renderAnalisis({ top10V, top10G, catEntries, cobrosData, gastosData, gananciaData, labels, months }) {
    const el = document.getElementById('statsAnalisisDetallado');
    if (!el) return;

    const fmt = v => '$' + Math.round(v).toLocaleString('es-AR');
    const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

    // ── Tendencias ──────────────────────────────────
    const totalCobros6  = cobrosData.reduce((a, v) => a + v, 0);
    const totalGastos6  = gastosData.reduce((a, v) => a + v, 0);
    const totalGanancia6 = gananciaData.reduce((a, v) => a + v, 0);
    const promCobros    = Math.round(totalCobros6 / months.length);
    const promGastos    = Math.round(totalGastos6 / months.length);
    const promGanancia  = Math.round(totalGanancia6 / months.length);

    const mejorMesCobros   = cobrosData.indexOf(Math.max(...cobrosData));
    const peorMesCobros    = cobrosData.indexOf(Math.min(...cobrosData.filter(v => v > 0).length ? cobrosData : [0]));
    const mejorMesGanancia = gananciaData.indexOf(Math.max(...gananciaData));
    const mesesPositivos   = gananciaData.filter(v => v > 0).length;
    const mesesNegativos   = gananciaData.filter(v => v < 0).length;

    // Tendencia cobros: último mes vs penúltimo
    const tendCobros = cobrosData.length >= 2
      ? cobrosData[cobrosData.length - 1] - cobrosData[cobrosData.length - 2]
      : 0;
    const tendCobrosColor = tendCobros >= 0 ? 'var(--success)' : 'var(--error)';
    const tendCobrosIcon  = tendCobros >= 0 ? '↑' : '↓';

    // Margen global 6 meses
    const margenGlobal = pct(totalGanancia6, totalCobros6);
    const margenColor  = margenGlobal >= 30 ? 'var(--success)' : margenGlobal >= 0 ? 'var(--warning)' : 'var(--error)';

    // ── Productos ───────────────────────────────────
    const totalBocados6 = top10V.reduce((a, p) => a + p.cantidad, 0);
    const liderVentas   = top10V[0] || null;
    const liderGanancia = top10G[0] || null;

    // Top 3 rentabilidad: solo productos con ingreso > 0
    const top3Rent = top10G
      .filter(p => p.ingreso > 0)
      .map(p => ({ ...p, rentPct: pct(p.margen, p.ingreso) }))
      .sort((a, b) => b.rentPct - a.rentPct)
      .slice(0, 3);

    // ── Gastos ──────────────────────────────────────
    const topCat       = catEntries[0] || null;
    const totalCatSum  = catEntries.reduce((a, [, v]) => a + v, 0);

    el.innerHTML = `
      <div style="margin-top:28px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
          <div style="width:4px;height:28px;background:var(--bordo);border-radius:2px"></div>
          <h4 style="margin:0;font-size:1.05rem;font-weight:700;color:var(--negro);font-family:'Cormorant Garamond',serif;letter-spacing:.02em">
            Análisis detallado — últimos 6 meses
          </h4>
        </div>

        <!-- Fila 1: KPIs de tendencia -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
          <div class="analisis-card">
            <div class="analisis-label">Total cobrado (6 m)</div>
            <div class="analisis-val">${fmt(totalCobros6)}</div>
            <div class="analisis-sub">Prom. ${fmt(promCobros)}/mes</div>
          </div>
          <div class="analisis-card">
            <div class="analisis-label">Total gastos (6 m)</div>
            <div class="analisis-val" style="color:var(--warning)">${fmt(totalGastos6)}</div>
            <div class="analisis-sub">Prom. ${fmt(promGastos)}/mes</div>
          </div>
          <div class="analisis-card ${totalGanancia6 >= 0 ? 'analisis-pos' : 'analisis-neg'}">
            <div class="analisis-label">Ganancia neta (6 m)</div>
            <div class="analisis-val" style="color:${totalGanancia6 >= 0 ? 'var(--success)' : 'var(--error)'}">${fmt(totalGanancia6)}</div>
            <div class="analisis-sub">Prom. ${fmt(promGanancia)}/mes</div>
          </div>
          <div class="analisis-card">
            <div class="analisis-label">Margen global</div>
            <div class="analisis-val" style="color:${margenColor}">${margenGlobal}%</div>
            <div class="analisis-sub">Ganancia / cobros</div>
          </div>
        </div>

        <!-- Fila 2: Análisis meses -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:var(--blanco);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:16px 18px">
            <div class="detail-section-title" style="margin-bottom:12px">📅 Comportamiento mensual</div>
            <div class="analisis-row">
              <span>Mejor mes (cobros)</span>
              <span class="analisis-badge analisis-badge-pos">${labels[mejorMesCobros]} — ${fmt(cobrosData[mejorMesCobros])}</span>
            </div>
            <div class="analisis-row">
              <span>Mejor mes (ganancia)</span>
              <span class="analisis-badge analisis-badge-pos">${labels[mejorMesGanancia]} — ${fmt(gananciaData[mejorMesGanancia])}</span>
            </div>
            <div class="analisis-row">
              <span>Tendencia último mes</span>
              <span style="font-weight:700;color:${tendCobrosColor}">${tendCobrosIcon} ${fmt(Math.abs(tendCobros))} vs mes anterior</span>
            </div>
            <div class="analisis-row">
              <span>Meses con ganancia positiva</span>
              <span class="analisis-badge ${mesesPositivos >= 4 ? 'analisis-badge-pos' : mesesPositivos >= 2 ? 'analisis-badge-mid' : 'analisis-badge-neg'}">${mesesPositivos} de ${months.length}</span>
            </div>
            ${mesesNegativos > 0 ? `
            <div class="analisis-row">
              <span>Meses en déficit</span>
              <span class="analisis-badge analisis-badge-neg">${mesesNegativos} mes${mesesNegativos > 1 ? 'es' : ''}</span>
            </div>` : ''}
          </div>

          <div style="background:var(--blanco);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:16px 18px">
            <div class="detail-section-title" style="margin-bottom:12px">🥧 Composición de gastos</div>
            ${catEntries.length === 0
              ? `<p style="color:var(--text-muted);font-size:.82rem">Sin gastos registrados.</p>`
              : catEntries.slice(0, 5).map(([cat, monto]) => `
                <div class="analisis-row">
                  <span>${cat}</span>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:80px;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
                      <div style="width:${pct(monto, totalCatSum)}%;height:100%;background:var(--bordo);border-radius:3px"></div>
                    </div>
                    <span style="font-weight:700;font-size:.82rem;min-width:60px;text-align:right">${fmt(monto)}</span>
                    <span style="color:var(--text-muted);font-size:.75rem;min-width:32px;text-align:right">${pct(monto, totalCatSum)}%</span>
                  </div>
                </div>`).join('')}
            ${catEntries.length > 5 ? `<p style="font-size:.75rem;color:var(--text-muted);margin-top:6px">+ ${catEntries.length - 5} categorías más</p>` : ''}
          </div>
        </div>

        <!-- Fila 3: Productos destacados -->
        ${(top10V.length > 0 || top10G.length > 0) ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:var(--blanco);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:16px 18px">
            <div class="detail-section-title" style="margin-bottom:12px">💰 Productos con mayor ganancia neta</div>
            ${top10G.slice(0, 5).map((p, i) => `
              <div class="analisis-row">
                <span style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:.72rem;font-weight:700;color:var(--text-muted);min-width:16px">#${i + 1}</span>
                  ${p.nombre}
                </span>
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:60px;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
                    <div style="width:${pct(p.margen, top10G[0].margen)}%;height:100%;background:var(--bordo);border-radius:3px"></div>
                  </div>
                  <span style="font-weight:700;font-size:.82rem;color:var(--success)">${fmt(p.margen)}</span>
                </div>
              </div>`).join('')}
            ${liderGanancia ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">Total ganancia top 5: <strong style="color:var(--negro)">${fmt(top10G.slice(0,5).reduce((a,p)=>a+p.margen,0))}</strong></div>` : ''}
          </div>

          <div style="background:var(--blanco);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:16px 18px">
            <div class="detail-section-title" style="margin-bottom:12px">💎 Rentabilidad por producto</div>
            ${top3Rent.length === 0
              ? `<p style="color:var(--text-muted);font-size:.82rem">Sin datos de costo para calcular rentabilidad.</p>`
              : top3Rent.map((p, i) => `
                <div class="analisis-row">
                  <span style="display:flex;align-items:center;gap:6px">
                    <span style="font-size:.72rem;font-weight:700;color:var(--text-muted);min-width:16px">#${i + 1}</span>
                    ${p.nombre}
                  </span>
                  <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-weight:700;font-size:.82rem;color:var(--success)">${fmt(p.margen)}</span>
                    <span class="analisis-badge ${p.rentPct >= 40 ? 'analisis-badge-pos' : 'analisis-badge-mid'}">${p.rentPct}%</span>
                  </div>
                </div>`).join('')}
            ${liderGanancia ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-size:.78rem;color:var(--text-muted)">Mayor ganancia bruta: <strong style="color:var(--negro)">${liderGanancia.nombre}</strong> (${fmt(liderGanancia.margen)})</div>` : ''}
          </div>
        </div>` : ''}

        <!-- Insight final -->
        ${(totalCobros6 > 0 || totalGastos6 > 0) ? `
        <div style="background:linear-gradient(135deg,var(--bordo) 0%,#6B1E2A 100%);border-radius:var(--radius);padding:16px 20px;color:white;margin-bottom:8px">
          <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;opacity:.7;margin-bottom:6px">Resumen del período</div>
          <div style="font-size:.9rem;line-height:1.6">
            ${totalGanancia6 >= 0
              ? `En los últimos 6 meses se generó una ganancia neta de <strong>${fmt(totalGanancia6)}</strong> con un margen del <strong>${margenGlobal}%</strong>.
                 El mejor mes fue <strong>${labels[mejorMesCobros]}</strong> con ${fmt(cobrosData[mejorMesCobros])} cobrados.`
              : `En los últimos 6 meses el negocio registró un déficit de <strong>${fmt(Math.abs(totalGanancia6))}</strong>.
                 Los gastos (${fmt(totalGastos6)}) superaron los cobros (${fmt(totalCobros6)}).`}
            ${liderVentas ? ` El producto más demandado fue <strong>${liderVentas.nombre}</strong> con ${liderVentas.cantidad} bocados.` : ''}
          </div>
        </div>` : ''}
      </div>`;
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
