// ============================================================================
// CRUD de movimientos (ingresos/gastos), con los campos extra de tipo de
// pago y necesario/antojo, filtros por tipo/categoría/mes, y descarga en
// CSV de lo que esté filtrado en pantalla.
// ============================================================================

window.Transactions = function Transactions({ openId }) {
    const { useState, useEffect } = React;
    const today = window.Utils.todayISO();
    const ahora = new Date();

    const emptyForm = {
        type: 'gasto', category_id: '', payment_type: '', necessity: '',
        amount: '', date: today, description: '',
    };

    // Por defecto se muestra el mes actual (no la lista completa) — se
    // puede pasar a "Todos" en cualquiera de los dos selects.
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        type: '', categoryId: '',
        year: String(ahora.getFullYear()), month: String(ahora.getMonth() + 1),
    });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const aniosDisponibles = [];
    for (let a = ahora.getFullYear() + 1; a >= ahora.getFullYear() - 5; a--) aniosDisponibles.push(a);

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [cats, txs] = await Promise.all([
                window.Api.categories.list(),
                window.Api.transactions.list({
                    type: filters.type || undefined,
                    categoryId: filters.categoryId || undefined,
                    year: filters.year || undefined,
                    month: filters.month || undefined,
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

    useEffect(() => { loadAll(); }, [filters.type, filters.categoryId, filters.year, filters.month]);

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

    const descargarCSV = () => {
        if (items.length === 0) return;
        const ingresos = window.Utils.sum(items.filter((t) => t.type === 'ingreso'), (t) => t.amount);
        const gastos = window.Utils.sum(items.filter((t) => t.type === 'gasto'), (t) => t.amount);
        const num = (n) => Number(n || 0).toFixed(2);

        const nombreMes = filters.month ? window.Utils.MESES_ES[Number(filters.month)] : 'Todos los meses';
        const nombreAnio = filters.year || 'todos los años';

        const filas = [];
        filas.push(window.Utils.csvRow(`Movimientos — ${nombreMes} ${nombreAnio}`));
        filas.push('');
        filas.push(window.Utils.csvRow('Ingresos', num(ingresos)));
        filas.push(window.Utils.csvRow('Gastos', num(gastos)));
        filas.push(window.Utils.csvRow('Balance', num(ingresos - gastos)));
        filas.push('');
        filas.push(window.Utils.csvRow('Fecha', 'Tipo', 'Categoría', 'Tipo de pago', 'Necesidad', 'Descripción', 'Monto'));
        items.forEach((t) => {
            filas.push(window.Utils.csvRow(
                window.Utils.formatDate(t.date),
                window.Utils.labelFor(window.Utils.TIPO_CHOICES, t.type),
                t.category ? t.category.name : 'Sin categoría',
                window.Utils.labelFor(window.Utils.PAYMENT_TYPE_CHOICES, t.payment_type),
                window.Utils.labelFor(window.Utils.NECESSITY_CHOICES, t.necessity),
                t.description || '',
                num(t.amount)
            ));
        });

        const sufijo = filters.year
            ? `${filters.year}${filters.month ? '_' + String(filters.month).padStart(2, '0') : ''}`
            : 'todos';
        window.Utils.downloadCSV(`movimientos_${sufijo}.csv`, filas);
    };

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
                    <div className="col-md-3">
                        <label className="form-label small text-muted">Año</label>
                        <select className="form-select" value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
                            <option value="">Todos</option>
                            {aniosDisponibles.map((a) => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small text-muted">Mes</label>
                        <select className="form-select" value={filters.month}
                            onChange={(e) => setFilters({ ...filters, month: e.target.value })}>
                            <option value="">Todos</option>
                            {window.Utils.MESES_ES.slice(1).map((nombre, i) => (
                                <option key={i + 1} value={i + 1}>{nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small text-muted">Tipo</label>
                        <select className="form-select" value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                            <option value="">Todos</option>
                            {window.Utils.TIPO_CHOICES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
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
                <div className="d-flex justify-content-end mt-3">
                    <button className="btn btn-outline-primary btn-sm" onClick={descargarCSV} disabled={items.length === 0}>
                        <i className="bi bi-download"></i> Descargar CSV de este filtro
                    </button>
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
