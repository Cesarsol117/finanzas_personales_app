// ============================================================================
// Dashboard: balance del mes, proyección de fin de mes, gráfico de torta de
// gastos por categoría, gráfico de barras de los últimos 6 meses,
// presupuestos del mes y últimos movimientos. Equivalente a DashboardView.
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

            // Gastos por categoría (torta)
            const porCategoria = {};
            monthTxs.filter((t) => t.type === 'gasto').forEach((t) => {
                const label = t.category ? t.category.name : 'Sin categoría';
                porCategoria[label] = (porCategoria[label] || 0) + Number(t.amount);
            });
            const catLabels = Object.keys(porCategoria);
            const catValues = catLabels.map((k) => porCategoria[k]);

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
                    monthTxs.filter((t) => t.type === 'gasto' && t.category_id === b.category_id),
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
