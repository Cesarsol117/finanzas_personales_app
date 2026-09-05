// ============================================================================
// Barra de navegación superior. Solo se muestra si hay una sesión activa
// (equivalente a {% if user.is_authenticated %} en base.html).
// ============================================================================

window.Nav = function Nav({ route, email, onLogout }) {
    const isActive = (prefix) => route.startsWith(prefix) ? 'nav-link active' : 'nav-link';

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
            <div className="container">
                <a className="navbar-brand" href="#/dashboard">
                    <i className="bi bi-wallet2"></i> Mis Finanzas
                </a>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navMenu">
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item"><a className={isActive('#/dashboard')} href="#/dashboard">Dashboard</a></li>
                        <li className="nav-item"><a className={isActive('#/transactions')} href="#/transactions">Movimientos</a></li>
                        <li className="nav-item"><a className={isActive('#/categories')} href="#/categories">Categorías</a></li>
                        <li className="nav-item"><a className={isActive('#/budgets')} href="#/budgets">Presupuestos</a></li>
                        <li className="nav-item"><a className={isActive('#/debts')} href="#/debts">Deudas</a></li>
                    </ul>
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <a className="nav-link" href="#/transactions/new">
                                <i className="bi bi-plus-circle"></i> Nuevo movimiento
                            </a>
                        </li>
                        <li className="nav-item">
                            <button type="button" className="btn btn-link nav-link" style={{ border: 0 }} onClick={onLogout}>
                                Salir ({email})
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};
