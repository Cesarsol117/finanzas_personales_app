// ============================================================================
// Lista de deudas, con la barra de gradiente (uso del límite) o la barra de
// progreso verde (meta de pago), igual que en la versión Django.
// ============================================================================

// Calcula, para una deuda y sus movimientos, el saldo actual y el modo de
// barra a mostrar. Es el mismo cálculo que Debt.saldo_actual / porcentaje_uso
// / porcentaje_pagado y DebtListView.get_context_data en Django.
window.Utils.calcDebtItem = function calcDebtItem(debt, movements) {
    const cargos = window.Utils.sum(movements.filter((m) => m.type === 'cargo'), (m) => m.amount);
    const pagos = window.Utils.sum(movements.filter((m) => m.type === 'pago'), (m) => m.amount);
    const saldo = Number(debt.initial_balance || 0) + cargos - pagos;

    let modo = null;
    let porcentaje = null;

    if (debt.credit_limit) {
        modo = 'limite';
        const pct = (saldo / Number(debt.credit_limit)) * 100;
        porcentaje = Math.round(Math.max(0, Math.min(pct, 100)) * 10) / 10;
    } else if (debt.initial_balance && Number(debt.initial_balance) > 0) {
        const pagado = Number(debt.initial_balance) - saldo;
        const pct = (pagado / Number(debt.initial_balance)) * 100;
        modo = 'pago';
        porcentaje = Math.round(Math.max(0, Math.min(pct, 100)) * 10) / 10;
    }

    const estaSaldada = Number(debt.initial_balance || 0) > 0 && saldo <= 0;

    return { saldo, modo, porcentaje, estaSaldada };
};

window.Debts = function Debts() {
    const { useState, useEffect } = React;
    const [debts, setDebts] = useState([]);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'otro', initial_balance: '', credit_limit: '' });

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [d, m] = await Promise.all([
                window.Api.debts.list(),
                window.Api.debtMovements.listAllForUser(),
            ]);
            setDebts(d);
            setMovements(m);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openNew = () => { setForm({ name: '', type: 'otro', initial_balance: '', credit_limit: '' }); setEditing({}); };
    const openEdit = (d) => {
        setForm({
            name: d.name, type: d.type,
            initial_balance: d.initial_balance || '',
            credit_limit: d.credit_limit || '',
        });
        setEditing(d);
    };
    const closeForm = () => setEditing(null);

    const save = async (e) => {
        e.preventDefault();
        setError('');
        const payload = {
            name: form.name,
            type: form.type,
            initial_balance: form.initial_balance === '' ? 0 : Number(form.initial_balance),
            credit_limit: form.credit_limit === '' ? null : Number(form.credit_limit),
        };
        try {
            if (editing.id) {
                await window.Api.debts.update(editing.id, payload);
            } else {
                await window.Api.debts.create(payload);
            }
            closeForm();
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    const remove = async (d) => {
        if (!window.confirm(`¿Eliminar la deuda "${d.name}" y todos sus movimientos?`)) return;
        try {
            await window.Api.debts.remove(d.id);
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    const debtsData = debts.map((d) => ({
        obj: d,
        ...window.Utils.calcDebtItem(d, movements.filter((m) => m.debt_id === d.id)),
    }));
    const totalDeuda = window.Utils.sum(debtsData, (item) => item.saldo);

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Deudas</h3>
                <button className="btn btn-primary" onClick={openNew}>
                    <i className="bi bi-plus-circle"></i> Nueva deuda
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {editing && (
                <div className="card p-3 mb-4">
                    <h5>{editing.id ? 'Editar deuda' : 'Nueva deuda'}</h5>
                    <form onSubmit={save}>
                        <div className="row g-2">
                            <div className="col-md-4">
                                <label className="form-label">Nombre</label>
                                <input className="form-control" required value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Tipo</label>
                                <select className="form-select" value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    {window.Utils.DEBT_TYPE_CHOICES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Saldo inicial</label>
                                <input type="number" step="0.01" className="form-control" value={form.initial_balance}
                                    onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Límite de crédito (opcional)</label>
                                <input type="number" step="0.01" className="form-control" value={form.credit_limit}
                                    onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
                                <div className="form-text">Si la cargás, se muestra el % de uso del límite.</div>
                            </div>
                        </div>
                        <div className="mt-3">
                            <button type="submit" className="btn btn-primary">Guardar</button>
                            <button type="button" className="btn btn-link" onClick={closeForm}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <p className="text-muted">Cargando…</p>
            ) : debtsData.length === 0 ? (
                <p className="text-muted">Todavía no cargaste ninguna deuda. <a href="#" onClick={(e) => { e.preventDefault(); openNew(); }}>Creá la primera</a>.</p>
            ) : (
                <>
                    <div className="card p-3 mb-4">
                        <div className="text-muted">Total que debés hoy (todas las deudas)</div>
                        <div className="fs-3 text-gasto">{window.Utils.formatMoney(totalDeuda)}</div>
                    </div>

                    <div className="row g-3">
                        {debtsData.map((item) => (
                            <div className="col-md-6" key={item.obj.id}>
                                <div className="card debt-card p-3 h-100">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h5 className="mb-0">{item.obj.name}</h5>
                                            <span className="badge bg-secondary">
                                                {window.Utils.labelFor(window.Utils.DEBT_TYPE_CHOICES, item.obj.type)}
                                            </span>
                                        </div>
                                        <div className="text-end">
                                            <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openEdit(item.obj)}>
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => remove(item.obj)}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className={`saldo mt-2 ${item.saldo > 0 ? 'text-gasto' : 'text-ingreso'}`}>
                                        {window.Utils.formatMoney(item.saldo)}
                                    </div>
                                    {item.estaSaldada && (
                                        <span className="badge bg-success mb-2" style={{ width: 'fit-content' }}>🎉 ¡Saldada!</span>
                                    )}

                                    {item.modo === 'limite' && (
                                        <>
                                            <div className="text-muted small mb-1">
                                                Usaste {item.porcentaje}% de tu límite ({window.Utils.formatMoney(item.obj.credit_limit)})
                                            </div>
                                            <div className="debt-gauge">
                                                <div className="mask" style={{ width: `calc(100% - ${item.porcentaje}%)` }}></div>
                                            </div>
                                        </>
                                    )}
                                    {item.modo === 'pago' && (
                                        <>
                                            <div className="text-muted small mb-1">
                                                Meta: pagar {window.Utils.formatMoney(item.obj.initial_balance)} — llevás el {item.porcentaje}%
                                            </div>
                                            <div className="progress">
                                                <div className="progress-bar bg-success" style={{ width: `${item.porcentaje}%` }}>
                                                    {Math.round(item.porcentaje)}%
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="mt-3">
                                        <a href={`#/debts/${item.obj.id}`} className="btn btn-sm btn-outline-primary">Ver movimientos</a>
                                        {' '}
                                        <a href={`#/debts/${item.obj.id}/movement/new`} className="btn btn-sm btn-primary">Registrar cargo/pago</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
