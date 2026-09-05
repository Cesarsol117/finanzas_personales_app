// ============================================================================
// CRUD de movimientos (ingresos/gastos), con los campos extra de tipo de
// pago y necesario/antojo, y filtros por tipo/categoría/mes.
// ============================================================================

window.Transactions = function Transactions({ openId }) {
    const { useState, useEffect } = React;
    const today = window.Utils.todayISO();

    const emptyForm = {
        type: 'gasto', category_id: '', payment_type: '', necessity: '',
        amount: '', date: today, description: '',
    };

    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ type: '', categoryId: '' });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [cats, txs] = await Promise.all([
                window.Api.categories.list(),
                window.Api.transactions.list({
                    type: filters.type || undefined,
                    categoryId: filters.categoryId || undefined,
                }),
            ]);
            setCategories(cats);
            setItems(txs);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, [filters.type, filters.categoryId]);

    // Si App nos pidió abrir el formulario de "nuevo movimiento" (link del navbar).
    useEffect(() => {
        if (openId === 'new') openNew();
    }, [openId]);

    const openNew = () => { setForm(emptyForm); setEditing({}); };
    const openEdit = (t) => {
        setForm({
            type: t.type, category_id: t.category_id || '', payment_type: t.payment_type || '',
            necessity: t.necessity || '', amount: t.amount, date: t.date, description: t.description || '',
        });
        setEditing(t);
    };
    const closeForm = () => setEditing(null);

    const save = async (e) => {
        e.preventDefault();
        setError('');
        const payload = {
            type: form.type,
            category_id: form.category_id || null,
            payment_type: form.payment_type,
            necessity: form.necessity,
            amount: Number(form.amount),
            date: form.date,
            description: form.description,
        };
        try {
            if (editing.id) {
                await window.Api.transactions.update(editing.id, payload);
            } else {
                await window.Api.transactions.create(payload);
            }
            closeForm();
            await loadAll();
        } catch (err) {
            setError(err.message);
        }
    };

    const remove = async (t) => {
        if (!window.confirm('¿Eliminar este movimiento?')) return;
        try {
            await window.Api.transactions.remove(t.id);
            await loadAll();
        } catch (err) {
            setError(err.message);
        }
    };

    const categoriasDelTipo = categories.filter((c) => c.type === form.type);

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Movimientos</h3>
                <button className="btn btn-primary" onClick={openNew}>
                    <i className="bi bi-plus-circle"></i> Nuevo movimiento
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card p-3 mb-3">
                <div className="row g-2">
                    <div className="col-md-4">
                        <label className="form-label small text-muted">Tipo</label>
                        <select className="form-select" value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                            <option value="">Todos</option>
                            {window.Utils.TIPO_CHOICES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label small text-muted">Categoría</label>
                        <select className="form-select" value={filters.categoryId}
                            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}>
                            <option value="">Todas</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {editing && (
                <div className="card p-3 mb-4">
                    <h5>{editing.id ? 'Editar movimiento' : 'Nuevo movimiento'}</h5>
                    <form onSubmit={save}>
                        <div className="row g-2">
                            <div className="col-md-3">
                                <label className="form-label">Tipo</label>
                                <select className="form-select" value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value, category_id: '' })}>
                                    {window.Utils.TIPO_CHOICES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Categoría</label>
                                <select className="form-select" value={form.category_id}
                                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                                    <option value="">— Sin categoría —</option>
                                    {categoriasDelTipo.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
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
                            <div className="col-md-4">
                                <label className="form-label">Tipo de pago</label>
                                <select className="form-select" value={form.payment_type}
                                    onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
                                    {window.Utils.PAYMENT_TYPE_CHOICES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Necesidad/antojo</label>
                                <select className="form-select" value={form.necessity}
                                    onChange={(e) => setForm({ ...form, necessity: e.target.value })}>
                                    {window.Utils.NECESSITY_CHOICES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Descripción</label>
                                <input className="form-control" value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
            ) : items.length === 0 ? (
                <p className="text-muted">No hay movimientos que coincidan con el filtro.</p>
            ) : (
                <div className="card">
                    <table className="table table-sm mb-0">
                        <thead>
                            <tr>
                                <th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Pago</th>
                                <th>Necesidad</th><th>Descripción</th><th className="text-end">Monto</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((t) => (
                                <tr key={t.id}>
                                    <td>{window.Utils.formatDate(t.date)}</td>
                                    <td>
                                        <span className={t.type === 'ingreso' ? 'text-ingreso' : 'text-gasto'}>
                                            {window.Utils.labelFor(window.Utils.TIPO_CHOICES, t.type)}
                                        </span>
                                    </td>
                                    <td>{t.category ? t.category.name : '—'}</td>
                                    <td>{window.Utils.labelFor(window.Utils.PAYMENT_TYPE_CHOICES, t.payment_type)}</td>
                                    <td>{window.Utils.labelFor(window.Utils.NECESSITY_CHOICES, t.necessity)}</td>
                                    <td>{t.description || '—'}</td>
                                    <td className="text-end">{window.Utils.formatMoney(t.amount)}</td>
                                    <td className="text-end text-nowrap">
                                        <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openEdit(t)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => remove(t)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
