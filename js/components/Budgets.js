// ============================================================================
// CRUD de presupuestos por categoría/mes/año.
// ============================================================================

window.Budgets = function Budgets() {
    const { useState, useEffect } = React;
    const now = new Date();

    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [gastos, setGastos] = useState({}); // category_id -> total gastado en el mes
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ category_id: '', amount: '' });

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [budgets, cats, txs] = await Promise.all([
                window.Api.budgets.list({ year, month }),
                window.Api.categories.list(),
                window.Api.transactions.list({ type: 'gasto', year, month }),
            ]);
            setItems(budgets);
            setCategories(cats.filter((c) => c.type === 'gasto'));
            const porCategoria = {};
            txs.forEach((t) => {
                const key = t.category_id || 'sin_categoria';
                porCategoria[key] = (porCategoria[key] || 0) + Number(t.amount);
            });
            setGastos(porCategoria);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [year, month]);

    const openNew = () => { setForm({ category_id: '', amount: '' }); setEditing({}); };
    const openEdit = (b) => { setForm({ category_id: b.category_id, amount: b.amount }); setEditing(b); };
    const closeForm = () => setEditing(null);

    const save = async (e) => {
        e.preventDefault();
        setError('');
        const payload = { category_id: form.category_id, amount: Number(form.amount), year, month };
        try {
            if (editing.id) {
                await window.Api.budgets.update(editing.id, payload);
            } else {
                await window.Api.budgets.create(payload);
            }
            closeForm();
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    const remove = async (b) => {
        if (!window.confirm('¿Eliminar este presupuesto?')) return;
        try {
            await window.Api.budgets.remove(b.id);
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    const prevMonth = () => {
        if (month === 1) { setYear(year - 1); setMonth(12); } else { setMonth(month - 1); }
    };
    const nextMonth = () => {
        if (month === 12) { setYear(year + 1); setMonth(1); } else { setMonth(month + 1); }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <button className="btn btn-outline-secondary" onClick={prevMonth}>
                    <i className="bi bi-chevron-left"></i>
                </button>
                <h3 className="mb-0">Presupuestos — {window.Utils.MESES_ES[month]} {year}</h3>
                <button className="btn btn-outline-secondary" onClick={nextMonth}>
                    <i className="bi bi-chevron-right"></i>
                </button>
            </div>

            <div className="d-flex justify-content-end mb-3">
                <button className="btn btn-primary" onClick={openNew}>
                    <i className="bi bi-plus-circle"></i> Nuevo presupuesto
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {editing && (
                <div className="card p-3 mb-4">
                    <h5>{editing.id ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h5>
                    <form onSubmit={save}>
                        <div className="row g-2 align-items-end">
                            <div className="col-md-6">
                                <label className="form-label">Categoría</label>
                                <select className="form-select" required value={form.category_id}
                                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                                    <option value="">— Elegí una categoría —</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Monto presupuestado</label>
                                <input type="number" step="0.01" min="0" className="form-control" required
                                    value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                            </div>
                            <div className="col-md-2">
                                <button type="submit" className="btn btn-primary w-100">Guardar</button>
                            </div>
                        </div>
                        <button type="button" className="btn btn-link btn-sm mt-2" onClick={closeForm}>Cancelar</button>
                    </form>
                </div>
            )}

            {loading ? (
                <p className="text-muted">Cargando…</p>
            ) : items.length === 0 ? (
                <p className="text-muted">Todavía no cargaste presupuestos para este mes.</p>
            ) : (
                <div className="card p-3">
                    {items.map((b) => {
                        const gastado = gastos[b.category_id] || 0;
                        const porcentaje = b.amount ? Math.min((gastado / b.amount) * 100, 100) : 0;
                        const excedido = gastado > b.amount;
                        return (
                            <div className="mb-3" key={b.id}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span>{b.category ? b.category.name : '—'}</span>
                                    <span>
                                        <span className={excedido ? 'text-gasto' : ''}>
                                            {window.Utils.formatMoney(gastado)} / {window.Utils.formatMoney(b.amount)}
                                        </span>
                                        <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => openEdit(b)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className="btn btn-sm btn-outline-danger ms-1" onClick={() => remove(b)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </span>
                                </div>
                                <div className="progress">
                                    <div className={`progress-bar ${excedido ? 'bg-danger' : 'bg-success'}`}
                                        style={{ width: `${porcentaje.toFixed(1)}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
