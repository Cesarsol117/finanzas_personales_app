// ============================================================================
// CRUD de categorías (ingreso/gasto).
// ============================================================================

window.Categories = function Categories() {
    const { useState, useEffect } = React;
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null); // null = form cerrado, {} = nuevo, {id,...} = editar
    const [form, setForm] = useState({ name: '', type: 'gasto' });

    const load = async () => {
        setLoading(true);
        try {
            setItems(await window.Api.categories.list());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openNew = () => { setForm({ name: '', type: 'gasto' }); setEditing({}); };
    const openEdit = (cat) => { setForm({ name: cat.name, type: cat.type }); setEditing(cat); };
    const closeForm = () => setEditing(null);

    const save = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editing.id) {
                await window.Api.categories.update(editing.id, form);
            } else {
                await window.Api.categories.create(form);
            }
            closeForm();
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    const remove = async (cat) => {
        if (!window.confirm(`¿Eliminar la categoría "${cat.name}"? Los movimientos que la usaban quedarán sin categoría.`)) return;
        try {
            await window.Api.categories.remove(cat.id);
            await load();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Categorías</h3>
                <button className="btn btn-primary" onClick={openNew}>
                    <i className="bi bi-plus-circle"></i> Nueva categoría
                </button>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {editing && (
                <div className="card p-3 mb-4">
                    <h5>{editing.id ? 'Editar categoría' : 'Nueva categoría'}</h5>
                    <form onSubmit={save}>
                        <div className="row g-2 align-items-end">
                            <div className="col-md-6">
                                <label className="form-label">Nombre</label>
                                <input className="form-control" required value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Tipo</label>
                                <select className="form-select" value={form.type}
                                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    {window.Utils.TIPO_CHOICES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
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
                <p className="text-muted">Todavía no creaste ninguna categoría.</p>
            ) : (
                <div className="card">
                    <table className="table table-sm mb-0">
                        <thead><tr><th>Nombre</th><th>Tipo</th><th className="text-end">Acciones</th></tr></thead>
                        <tbody>
                            {items.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.name}</td>
                                    <td>
                                        <span className={c.type === 'ingreso' ? 'text-ingreso' : 'text-gasto'}>
                                            {window.Utils.labelFor(window.Utils.TIPO_CHOICES, c.type)}
                                        </span>
                                    </td>
                                    <td className="text-end">
                                        <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => openEdit(c)}>
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => remove(c)}>
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
