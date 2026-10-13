// ============================================================================
// Dashboard: balance del mes, proyección de fin de mes, gráfico de torta de
// gastos por categoría, gráfico de barras de los últimos 6 meses,
// presupuestos del mes, estadísticas extra y últimos movimientos.
// Equivalente a DashboardView. Además permite descargar un resumen en CSV.
// ============================================================================

window.Dashboard = function Dashboard() {
    const { useState, useEffect, useRef } = React;
    const today = new Date();

    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    const chartCatRef = useRef(null);
    const chartHistRef = useRef(null);
    const chartCatInstance = useRef(null);
    const chartHistInstance = useRef(null);

    const totales = (txs) => {
        let ingresos = 0, gastos = 0;
        txs.forEach((t) => {
            if (t.type === 'ingreso') ingresos += Number(t.amount);
            else gastos += Number(t.amount);
        });
        return { ingresos, gastos };
    };

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const lastDay = window.Utils.daysInMonth(year, month);
            const monthTxs = await window.Api.transactions.list({ year, month });
            const { ingresos: totalIngresos, gastos: totalGastos } = totales(monthTxs);
            const balance = totalIngresos - totalGastos;
            const gastosMes = monthTxs.filter((t) => t.type === 'gasto');

            const esMesActual = year === today.getFullYear() && month === today.getMonth() + 1;
            let proyeccion = null;
            if (esMesActual) {
                const diasTranscurridos = today.getDate();
                const proyIngresos = (totalIngresos / diasTranscurridos) * lastDay;
                const proyGastos = (totalGastos / diasTranscurridos) * lastDay;
                proyeccion = {
                    ingresos: proyIngresos, gastos: proyGastos, balance: proyIngresos - proyGastos,
                    diasTranscurridos, diasTotales: lastDay,
                };
            }

            // Gastos por categoría (torta) — también sirve para "categoría con más gasto"
            const porCategoria = {};
            gastosMes.forEach((t) => {
                const label = t.category ? t.category.name : 'Sin categoría';
                porCategoria[label] = (porCategoria[label] || 0) + Number(t.amount);
            });
            const catLabels = Object.keys(porCategoria);
            const catValues = catLabels.map((k) => porCategoria[k]);

            let categoriaTop = null;
            catLabels.forEach((label, i) => {
                if (!categoriaTop || catValues[i] > categoriaTop.total) {
                    categoriaTop = { nombre: label, total: catValues[i] };
                }
            });

            // Gasto más recurrente: la categoría con más CANTIDAD de movimientos
            // (no la que más plata se llevó, sino la que se repite más seguido).
            const conteoPorCategoria = {};
            gastosMes.forEach((t) => {
                const label = t.category ? t.category.name : 'Sin categoría';
                conteoPorCategoria[label] = (conteoPorCategoria[label] || 0) + 1;
            });
            let masRecurrente = null;
            Object.keys(conteoPorCategoria).forEach((label) => {
                if (!masRecurrente || conteoPorCategoria[label] > masRecurrente.veces) {
                    masRecurrente = { nombre: label, veces: conteoPorCategoria[label] };
                }
            });

            // Tipo de pago más usado (por cantidad de veces), entre los gastos.
            const conteoPorPago = {};
            const totalPorPago = {};
            gastosMes.forEach((t) => {
                const key = t.payment_type || '';
                conteoPorPago[key] = (conteoPorPago[key] || 0) + 1;
                totalPorPago[key] = (totalPorPago[key] || 0) + Number(t.amount);
            });
            let pagoMasUsado = null;
            Object.keys(conteoPorPago).forEach((key) => {
                if (!pagoMasUsado || conteoPorPago[key] > pagoMasUsado.veces) {
                    pagoMasUsado = { tipo: key, veces: conteoPorPago[key], total: totalPorPago[key] };
                }
            });

            // Necesario vs. antojo, entre los gastos.
            let necesario = 0, antojo = 0, sinClasificar = 0;
            gastosMes.forEach((t) => {
                if (t.necessity === 'necesario') necesario += Number(t.amount);
                else if (t.necessity === 'antojo') antojo += Number(t.amount);
                else sinClasificar += Number(t.amount);
            });
            const necesarioAntojo = {
                necesario, antojo, sinClasificar,
                pctNecesario: totalGastos ? (necesario / totalGastos) * 100 : 0,
                pctAntojo: totalGastos ? (antojo / totalGastos) * 100 : 0,
            };

            // Comparación con el mes anterior.
            let prevY = year, prevM = month - 1;
            if (prevM === 0) { prevM = 12; prevY -= 1; }
            const prevTxs = await window.Api.transactions.list({ year: prevY, month: prevM });
            const prevTotales = totales(prevTxs);
            const diffGastos = totalGastos - prevTotales.gastos;
            const comparacionMesAnterior = {
                label: `${window.Utils.MESES_ES[prevM]} ${prevY}`,
                gastos: prevTotales.gastos,
                diffGastos,
                pctGastos: prevTotales.gastos ? (diffGastos / prevTotales.gastos) * 100 : null,
            };

            // Últimos 6 meses (barras)
            let y = year, m = month;
            const meses = [];
            for (let i = 0; i < 6; i++) {
                meses.push([y, m]);
                m -= 1;
                if (m === 0) { m = 12; y -= 1; }
            }
            meses.reverse();
            const historial = await Promise.all(
                meses.map(async ([y2, m2]) => {
                    const txs = await window.Api.transactions.list({ year: y2, month: m2 });
                    const t = totales(txs);
                    return { label: `${window.Utils.MESES_ES[m2].slice(0, 3)} ${y2}`, ...t };
                })
            );

            // Presupuestos del mes
            const [budgets, categories] = await Promise.all([
                window.Api.budgets.list({ year, month }),
                window.Api.categories.list(),
            ]);
            const presupuestosData = budgets.map((b) => {
                const gastado = window.Utils.sum(
                    gastosMes.filter((t) => t.category_id === b.category_id),
                    (t) => t.amount
                );
                const porcentaje = b.amount ? Math.min((gastado / b.amount) * 100, 100) : 0;
                return {
                    categoria: b.category ? b.category.name : '—',
                    presupuesto: Number(b.amount), gastado, restante: Number(b.amount) - gastado,
                    porcentaje, excedido: gastado > b.amount,
                };
            });

            const ultimosMovimientos = monthTxs.slice(0, 5);

            setData({
                totalIngresos, totalGastos, balance, proyeccion, esMesActual,
                catLabels, catValues, historial, presupuestosData, ultimosMovimientos,
                categoriaTop, masRecurrente, pagoMasUsado, necesarioAntojo, comparacionMesAnterior,
                movimientosMes: monthTxs,
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [year, month]);

    useEffect(() => {
        if (!data || loading) return;

        if (chartCatInstance.current) { chartCatInstance.current.destroy(); chartCatInstance.current = null; }
        if (chartHistInstance.current) { chartHistInstance.current.destroy(); chartHistInstance.current = null; }

        if (data.catLabels.length > 0 && chartCatRef.current) {
            chartCatInstance.current = new Chart(chartCatRef.current, {
                type: 'pie',
                data: {
                    labels: data.catLabels,
                    datasets: [{
                        data: data.catValues,
                        backgroundColor: ['#4e73df', '#e74a3b', '#1cc88a', '#f6c23e', '#36b9cc', '#858796', '#fd7e14', '#6f42c1'],
                    }],
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
            });
        }

        if (chartHistRef.current) {
            chartHistInstance.current = new Chart(chartHistRef.current, {
                type: 'bar',
                data: {
                    labels: data.historial.map((h) => h.label),
                    datasets: [
                        { label: 'Ingresos', data: data.historial.map((h) => h.ingresos), backgroundColor: '#1cc88a' },
                        { label: 'Gastos', data: data.historial.map((h) => h.gastos), backgroundColor: '#e74a3b' },
                    ],
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
            });
        }

        return () => {
            if (chartCatInstance.current) chartCatInstance.current.destroy();
            if (chartHistInstance.current) chartHistInstance.current.destroy();
        };
    }, [data, loading]);

    const prevMonth = () => {
        if (month === 1) { setYear(year - 1); setMonth(12); } else { setMonth(month - 1); }
    };
    const nextMonth = () => {
        if (month === 12) { setYear(year + 1); setMonth(1); } else { setMonth(month + 1); }
    };

    // --------------------------------------------------------------------
    // Descarga del resumen del mes en CSV (se abre bien en Excel/Sheets).
    // --------------------------------------------------------------------
    const csvField = (value) => {
        const s = String(value ?? '');
        if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };
    const csvRow = (...campos) => campos.map(csvField).join(';');

    const descargarResumenCSV = () => {
        if (!data) return;
        const num = (n) => Number(n || 0).toFixed(2);
        const nombreMes = `${window.Utils.MESES_ES[month]} ${year}`;
        const filas = [];

        filas.push(csvRow(`Resumen de ${nombreMes}`));
        filas.push('');
        filas.push(csvRow('Ingresos del mes', num(data.totalIngresos)));
        filas.push(csvRow('Gastos del mes', num(data.totalGastos)));
        filas.push(csvRow('Balance del mes', num(data.balance)));
        filas.push('');

        filas.push(csvRow('Comparación con el mes anterior'));
        filas.push(csvRow('Mes anterior', data.comparacionMesAnterior.label));
        filas.push(csvRow('Gastos mes anterior', num(data.comparacionMesAnterior.gastos)));
        filas.push(csvRow(
            'Diferencia en gastos',
            `${data.comparacionMesAnterior.diffGastos >= 0 ? '+' : ''}${num(data.comparacionMesAnterior.diffGastos)}`
        ));
        filas.push(csvRow(
            'Variación %',
            data.comparacionMesAnterior.pctGastos === null ? 'N/D' : `${data.comparacionMesAnterior.pctGastos.toFixed(1)}%`
        ));
        filas.push('');

        filas.push(csvRow('Categoría con más gasto', data.categoriaTop ? data.categoriaTop.nombre : '—',
            data.categoriaTop ? num(data.categoriaTop.total) : ''));
        filas.push(csvRow('Gasto más recurrente (categoría)', data.masRecurrente ? data.masRecurrente.nombre : '—',
            data.masRecurrente ? `${data.masRecurrente.veces} veces` : ''));
        filas.push(csvRow('Tipo de pago más usado',
            data.pagoMasUsado ? window.Utils.labelFor(window.Utils.PAYMENT_TYPE_CHOICES, data.pagoMasUsado.tipo) : '—',
            data.pagoMasUsado ? `${data.pagoMasUsado.veces} veces, $${num(data.pagoMasUsado.total)}` : ''));
        filas.push('');

        filas.push(csvRow('Necesario vs. antojo'));
        filas.push(csvRow('Necesario', num(data.necesarioAntojo.necesario), `${data.necesarioAntojo.pctNecesario.toFixed(1)}%`));
        filas.push(csvRow('Antojo', num(data.necesarioAntojo.antojo), `${data.necesarioAntojo.pctAntojo.toFixed(1)}%`));
        if (data.necesarioAntojo.sinClasificar > 0) {
            filas.push(csvRow('Sin clasificar', num(data.necesarioAntojo.sinClasificar)));
        }
        filas.push('');

        filas.push(csvRow('Movimientos del mes'));
        filas.push(csvRow('Fecha', 'Tipo', 'Categoría', 'Tipo de pago', 'Necesidad', 'Descripción', 'Monto'));
        data.movimientosMes.forEach((t) => {
            filas.push(csvRow(
                window.Utils.formatDate(t.date),
                window.Utils.labelFor(window.Utils.TIPO_CHOICES, t.type),
                t.category ? t.category.name : 'Sin categoría',
                window.Utils.labelFor(window.Utils.PAYMENT_TYPE_CHOICES, t.payment_type),
                window.Utils.labelFor(window.Utils.NECESSITY_CHOICES, t.necessity),
                t.description || '',
                num(t.amount)
            ));
        });

        const csvContent = '﻿' + filas.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumen_${year}_${String(month).padStart(2, '0')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <button className="btn btn-outline-secondary" onClick={prevMonth}>
                    <i className="bi bi-chevron-left"></i> Mes anterior
                </button>
                <h3 className="mb-0">{window.Utils.MESES_ES[month]} {year}</h3>
                <button className="btn btn-outline-secondary" onClick={nextMonth}>
                    Mes siguiente <i className="bi bi-chevron-right"></i>
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {loading || !data ? (
                <p className="text-muted">Cargando…</p>
            ) : (
                <>
                    <div className="d-flex justify-content-end mb-3">
                        <button className="btn btn-outline-primary btn-sm" onClick={descargarResumenCSV}>
                            <i className="bi bi-download"></i> Descargar resumen (.csv)
                        </button>
                    </div>

                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <div className="card stat-card p-3">
                                <div className="text-muted">Ingresos del mes</div>
                                <div className="value text-ingreso">{window.Utils.formatMoney(data.totalIngresos)}</div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card stat-card p-3">
                                <div className="text-muted">Gastos del mes</div>
                                <div className="value text-gasto">{window.Utils.formatMoney(data.totalGastos)}</div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card stat-card p-3">
                                <div className="text-muted">Balance del mes</div>
                                <div className={`value ${data.balance >= 0 ? 'text-ingreso' : 'text-gasto'}`}>
                                    {window.Utils.formatMoney(data.balance)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {data.proyeccion && (
                        <div className="card p-3 mb-4">
                            <h5><i className="bi bi-graph-up-arrow"></i> Proyección de fin de mes</h5>
                            <p className="text-muted mb-2">
                                Basada en tu ritmo de los primeros {data.proyeccion.diasTranscurridos} de {data.proyeccion.diasTotales} días del mes.
                            </p>
                            <div className="row text-center">
                                <div className="col-md-4">
                                    <div className="text-muted">Ingresos proyectados</div>
                                    <div className="fs-5 text-ingreso">{window.Utils.formatMoney(data.proyeccion.ingresos)}</div>
                                </div>
                                <div className="col-md-4">
                                    <div className="text-muted">Gastos proyectados</div>
                                    <div className="fs-5 text-gasto">{window.Utils.formatMoney(data.proyeccion.gastos)}</div>
                                </div>
                                <div className="col-md-4">
                                    <div className="text-muted">Balance proyectado</div>
                                    <div className={`fs-5 ${data.proyeccion.balance >= 0 ? 'text-ingreso' : 'text-gasto'}`}>
                                        {window.Utils.formatMoney(data.proyeccion.balance)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card p-3 mb-4">
                        <h5><i className="bi bi-bar-chart-line"></i> Estadísticas del mes</h5>
                        <div className="row g-3 mt-1">
                            <div className="col-md-6">
                                <div className="text-muted small">Categoría con más gasto</div>
                                <div>
                                    {data.categoriaTop ? (
                                        <>{data.categoriaTop.nombre} — <strong>{window.Utils.formatMoney(data.categoriaTop.total)}</strong></>
                                    ) : '—'}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="text-muted small">Gasto más recurrente</div>
                                <div>
                                    {data.masRecurrente ? (
                                        <>{data.masRecurrente.nombre} — <strong>{data.masRecurrente.veces} veces</strong></>
                                    ) : '—'}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="text-muted small">Tipo de pago más usado</div>
                                <div>
                                    {data.pagoMasUsado ? (
                                        <>
                                            {window.Utils.labelFor(window.Utils.PAYMENT_TYPE_CHOICES, data.pagoMasUsado.tipo)} —{' '}
                                            <strong>{data.pagoMasUsado.veces} veces</strong> ({window.Utils.formatMoney(data.pagoMasUsado.total)})
                                        </>
                                    ) : '—'}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="text-muted small">Vs. {data.comparacionMesAnterior.label}</div>
                                <div className={data.comparacionMesAnterior.diffGastos > 0 ? 'text-gasto' : 'text-ingreso'}>
                                    Gastaste{' '}
                                    <strong>{window.Utils.formatMoney(Math.abs(data.comparacionMesAnterior.diffGastos))}</strong>
                                    {data.comparacionMesAnterior.diffGastos >= 0 ? ' más' : ' menos'}
                                    {data.comparacionMesAnterior.pctGastos !== null && (
                                        <> ({data.comparacionMesAnterior.pctGastos >= 0 ? '+' : ''}{data.comparacionMesAnterior.pctGastos.toFixed(1)}%)</>
                                    )}
                                </div>
                            </div>
                            <div className="col-md-12">
                                <div className="text-muted small mb-1">
                                    Necesario vs. antojo — {data.necesarioAntojo.pctNecesario.toFixed(0)}% / {data.necesarioAntojo.pctAntojo.toFixed(0)}%
                                </div>
                                <div className="progress">
                                    <div className="progress-bar bg-success" style={{ width: `${data.necesarioAntojo.pctNecesario.toFixed(1)}%` }}>
                                        Necesario {window.Utils.formatMoney(data.necesarioAntojo.necesario)}
                                    </div>
                                    <div className="progress-bar bg-warning" style={{ width: `${data.necesarioAntojo.pctAntojo.toFixed(1)}%` }}>
                                        Antojo {window.Utils.formatMoney(data.necesarioAntojo.antojo)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-3 mb-4">
                        <div className="col-md-6">
                            <div className="card p-3">
                                <h5>Gastos por categoría</h5>
                                {data.catLabels.length > 0 ? (
                                    <canvas ref={chartCatRef} height="220"></canvas>
                                ) : (
                                    <p className="text-muted mb-0">Todavía no hay gastos registrados este mes.</p>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="card p-3">
                                <h5>Últimos 6 meses</h5>
                                <canvas ref={chartHistRef} height="220"></canvas>
                            </div>
                        </div>
                    </div>

                    {data.presupuestosData.length > 0 && (
                        <div className="card p-3 mb-4">
                            <h5><i className="bi bi-piggy-bank"></i> Presupuestos del mes</h5>
                            {data.presupuestosData.map((p, i) => (
                                <div className="mb-3" key={i}>
                                    <div className="d-flex justify-content-between">
                                        <span>{p.categoria}</span>
                                        <span className={p.excedido ? 'text-gasto' : ''}>
                                            {window.Utils.formatMoney(p.gastado)} / {window.Utils.formatMoney(p.presupuesto)}
                                        </span>
                                    </div>
                                    <div className="progress">
                                        <div className={`progress-bar ${p.excedido ? 'bg-danger' : 'bg-success'}`}
                                            style={{ width: `${p.porcentaje.toFixed(1)}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="card p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Últimos movimientos</h5>
                            <a href="#/transactions" className="btn btn-sm btn-outline-primary">Ver todos</a>
                        </div>
                        {data.ultimosMovimientos.length > 0 ? (
                            <table className="table table-sm">
                                <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th className="text-end">Monto</th></tr></thead>
                                <tbody>
                                    {data.ultimosMovimientos.map((t) => (
                                        <tr key={t.id}>
                                            <td>{window.Utils.formatDate(t.date)}</td>
                                            <td>
                                                {t.type === 'ingreso'
                                                    ? <span className="text-ingreso">Ingreso</span>
                                                    : <span className="text-gasto">Gasto</span>}
                                            </td>
                                            <td>{t.category ? t.category.name : '—'}</td>
                                            <td>{t.description || '—'}</td>
                                            <td className="text-end">{window.Utils.formatMoney(t.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-muted mb-0">
                                No hay movimientos este mes todavía. <a href="#/transactions/new">Agregá el primero</a>.
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
