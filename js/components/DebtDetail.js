// ============================================================================
// Detalle de una deuda: saldo actual, barra (gradiente o progreso), y el
// historial de cargos/pagos, con formulario para registrar uno nuevo.
// ============================================================================

window.DebtDetail = function DebtDetail({ debtId, openForm }) {
    const { useState, useEffect } = React;
    const today = window.Utils.todayISO();

    const [debt, setDebt] = useState(null);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ type: 'cargo', amount: '', date: today, description: '' });

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [d, m] = await Promise.all([
                window.Api.debts.get(debtId),
                window.Api.debtMovements.listForDebt(debtId),
            ]);
            setDebt(d);
            setMovements(m);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [debtId]);
    useEffect(() => { if (openForm) setShowForm(true); }, [openForm]);

    const save = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await window.Api.debtMovements.create({
                debt_id: debtId,
                type: form.type,
                amount: Number(form.amount),
                date: form.date,
                description: form.description,
            });
            setShowForm(false);
            setForm({ type: 'cargo', amount: '', date: today, description: '' });
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    const removeMovement = async (m) => {
        if (!window.confirm('¿Eliminar este movimiento?')) return;
        try {
            await window.Api.debtMovements.remove(m.id);
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <p className="text-muted">Cargando…</p>;
    if (error && !debt) return <div className="alert alert-danger">{error}</div>;
    if (!debt) return null;

    const item = window.Utils.calcDebtItem(debt, movements);

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h3 className="mb-0">{debt.name}</h3>
                    <span className="badge bg-secondary">
                        {window.Utils.labelFor(window.Utils.DEBT_TYPE_CHOICES, debt.type)}
                    </span>
                </div>
                <a href="#/debts" className="btn btn-outline-secondary btn-sm">
                    <i className="bi bi-arrow-left"></i> Volver a deudas
                </a>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card p-3 mb-4">
                <div className="row align-items-center">
                    <div className="col-md-4">
                        <div className="text-muted">Saldo actual</div>
                        <div className={`fs-3 ${item.saldo > 0 ? 'text-gasto' : 'text-ingreso'}`}>
                            {window.Utils.formatMoney(item.saldo)}
                        </div>
                        {item.estaSaldada && <span className="badge bg-success mt-1">🎉 ¡Deuda saldada!</span>}
                    </div>

                    {item.modo === 'limite' && (
                        <div className="col-md-8">
                            <div className="text-muted small mb-1">
                                Usaste {item.porcentaje}% de tu límite ({window.Utils.formatMoney(debt.credit_limit)})
                            </div>
                            <div className="debt-gauge">
                                <div className="mask" style={{ width: `calc(100% - ${item.porcentaje}%)` }}></div>
                            </div>
                        </div>
                    )}
                    {item.modo === 'pago' && (
                        <div className="col-md-8">
                            <div className="text-muted small mb-1">
                                Meta: pagar {window.Utils.formatMoney(debt.initial_balance)} — llevás el {item.porcentaje}%
                            </div>
                            <div className="progress">
                                <div className="progress-bar bg-success" style={{ width: `${item.porcentaje}%` }}>
                                    {Math.round(item.porcentaje)}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-3">
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                        <i className="bi bi-plus-circle"></i> Registrar cargo o pago
                    </button>
                </div>

                {showForm && (
                    <form className="mt-3 border-top pt-3" onSubmit={save}>
                        <div className="row g-2">
                            <div className="col-md-3">
                                <label className="form-label">Tipo</label>
                                <select className="form-select" value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    {window.Utils.DEBT_MOVEMENT_CHOICES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Monto</label>
                                <input type="number" step="0.01" min="0" className="form-control" required
                                    value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Fecha</label>
                                <input type="date" className="form-control" required
                                    value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Descripción</label>
                                <input className="form-control" value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>
                        <div className="mt-2">
                            <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
                            <button type="button" className="btn btn-link btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                        </div>
                    </form>
                )}
            </div>

            <div className="card p-3">
                <h5 className="mb-3">Historial</h5>
                {movements.length === 0 ? (
                    <p className="text-muted mb-0">
                        Todavía no registraste cargos ni pagos para esta deuda (el saldo actual es solo el saldo inicial que cargaste).
                    </p>
                ) : (
                    <table className="table table-sm mb-0">
                        <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th className="text-end">Monto</th><th></th></tr></thead>
                        <tbody>
                            {movements.map((m) => (
                                <tr key={m.id}>
                                    <td>{window.Utils.formatDate(m.date)}</td>
                                    <td>
                                        {m.type === 'cargo'
                                            ? <span className="badge bg-danger">Cargo</span>
                                            : <span className="badge bg-success">Pago</span>}
                                    </td>
                                    <td>{m.description || '—'}</td>
                                    <td className="text-end">{window.Utils.formatMoney(m.amount)}</td>
                                    <td className="text-end">
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeMovement(m)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
