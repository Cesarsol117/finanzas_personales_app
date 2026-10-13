// ============================================================================
// Dashboard: balance del mes (con aviso si el saldo está en rojo), gráfico
// de gastos por categoría, gasto día a día del mes, últimos 6 meses,
// presupuestos del mes, estadísticas extra y un resumen anual.
// Equivalente a DashboardView.
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
    const chartDiarioRef = useRef(null);
    const chartCatInstance = useRef(null);
    const chartHistInstance = useRef(null);
    const chartDiarioInstance = useRef(null);

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

            // Gasto día a día del mes (para la barra diaria).
            const gastoPorDia = new Array(lastDay).fill(0);
            gastosMes.forEach((t) => {
                const dia = Number(t.date.split('-')[2]);
                if (dia >= 1 && dia <= lastDay) gastoPorDia[dia - 1] += Number(t.amount);
            });

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

            // Resumen anual (todo el año que está mostrando el mes actual).
            const yearTxs = await window.Api.transactions.list({ year });
            const anual = totales(yearTxs);
            const resumenAnual = {
                ingresos: anual.ingresos, gastos: anual.gastos, balance: anual.ingresos - anual.gastos,
            };

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

            setData({
                totalIngresos, totalGastos, balance,
                catLabels, catValues, gastoPorDia, lastDay, historial, presupuestosData,
                categoriaTop, masRecurrente, pagoMasUsado, necesarioAntojo, comparacionMesAnterior,
                resumenAnual,
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
        if (chartDiarioInstance.current) { chartDiarioInstance.current.destroy(); chartDiarioInstance.current = null; }

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

        if (chartDiarioRef.current) {
            chartDiarioInstance.current = new Chart(chartDiarioRef.current, {
                type: 'bar',
                data: {
                    labels: data.gastoPorDia.map((_, i) => String(i + 1)),
                    datasets: [{ label: 'Gasto del día', data: data.gastoPorDia, backgroundColor: '#e74a3b' }],
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { x: { title: { display: true, text: 'Día del mes' } } },
                },
            });
        }

        return () => {
            if (chartCatInstance.current) chartCatInstance.current.destroy();
            if (chartHistInstance.current) chartHistInstance.current.destroy();
            if (chartDiarioInstance.current) chartDiarioInstance.current.destroy();
        };
    }, [data, loading]);

    const prevMonth = () => {
        if (month === 1) { setYear(year - 1); setMonth(12); } else { setMonth(month - 1); }
    };
    const nextMonth = () => {
        if (month === 12) { setYear(year + 1); setMonth(1); } else { setMonth(month + 1); }
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
                    <div className={`alert ${data.balance >= 0 ? 'alert-success' : 'alert-danger'} d-flex align-items-center mb-4`}>
                        <span className="fs-5 me-2">{data.balance >= 0 ? '🟢' : '🔴'}</span>
                        <span>
                            {data.balance >= 0 ? (
                                <>Vas bien este mes: te sobran <strong>{window.Utils.formatMoney(data.balance)}</strong>.</>
                            ) : (
                                <>Vas con saldo en rojo este mes: gastaste <strong>{window.Utils.formatMoney(Math.abs(data.balance))}</strong> más de lo que ingresó.</>
                            )}
                        </span>
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

                    <div className="card p-3 mb-4">
                        <h5>Gasto día a día del mes</h5>
                        <canvas ref={chartDiarioRef} height="120"></canvas>
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
                        <h5><i className="bi bi-calendar3-range"></i> Resumen anual — {year}</h5>
                        <div className={`alert ${data.resumenAnual.balance >= 0 ? 'alert-success' : 'alert-danger'} d-flex align-items-center mt-2 mb-3`}>
                            <span className="fs-5 me-2">{data.resumenAnual.balance >= 0 ? '🟢' : '🔴'}</span>
                            <span>
                                {data.resumenAnual.balance >= 0 ? (
                                    <>En lo que va de {year} vas con saldo positivo: <strong>{window.Utils.formatMoney(data.resumenAnual.balance)}</strong>.</>
                                ) : (
                                    <>En lo que va de {year} vas con saldo en rojo: <strong>{window.Utils.formatMoney(Math.abs(data.resumenAnual.balance))}</strong> de más gastado.</>
                                )}
                            </span>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <div className="text-muted">Ingresos del año</div>
                                <div className="fs-5 text-ingreso">{window.Utils.formatMoney(data.resumenAnual.ingresos)}</div>
                            </div>
                            <div className="col-md-4">
                                <div className="text-muted">Gastos del año</div>
                                <div className="fs-5 text-gasto">{window.Utils.formatMoney(data.resumenAnual.gastos)}</div>
                            </div>
                            <div className="col-md-4">
                                <div className="text-muted">Balance del año</div>
                                <div className={`fs-5 ${data.resumenAnual.balance >= 0 ? 'text-ingreso' : 'text-gasto'}`}>
                                    {window.Utils.formatMoney(data.resumenAnual.balance)}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
