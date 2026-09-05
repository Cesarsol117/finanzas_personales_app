// ============================================================================
// Raíz de la app: maneja la sesión (login/logout) y el ruteo por hash
// (#/dashboard, #/transactions, etc.), sin necesidad de librerías extra ni
// paso de build — todo corre directo en el navegador.
// ============================================================================

function parseRoute(hash) {
    const path = (hash || '#/dashboard').replace(/^#/, '');
    const parts = path.split('/').filter(Boolean); // ej: ['debts', '123', 'movement', 'new']
    return { path: '#' + path, parts };
}

function App() {
    const { useState, useEffect } = React;
    const [session, setSession] = useState(undefined); // undefined = todavía no se sabe
    const [route, setRoute] = useState(parseRoute(window.location.hash));

    useEffect(() => {
        window.Api.auth.getSession().then(setSession);
        const unsubscribe = window.Api.auth.onChange(setSession);

        const onHashChange = () => setRoute(parseRoute(window.location.hash));
        window.addEventListener('hashchange', onHashChange);

        return () => {
            unsubscribe();
            window.removeEventListener('hashchange', onHashChange);
        };
    }, []);

    // Todavía no sabemos si hay sesión (primer render): mostramos el loader
    // que ya estaba en el HTML, no pintamos nada nuevo encima.
    if (session === undefined) {
        return <div className="boot-loading">Cargando…</div>;
    }

    const isAuthRoute = route.parts[0] === 'login' || route.parts[0] === 'register';

    if (!session) {
        if (!isAuthRoute) {
            window.location.hash = '#/login';
            return null;
        }
        return <window.Auth mode={route.parts[0]} />;
    }

    if (isAuthRoute) {
        window.location.hash = '#/dashboard';
        return null;
    }

    const handleLogout = async () => {
        await window.Api.auth.signOut();
        window.location.hash = '#/login';
    };

    let page = null;
    const [section, a, b, c] = route.parts;

    if (section === 'dashboard' || !section) {
        page = <window.Dashboard />;
    } else if (section === 'transactions') {
        page = <window.Transactions openId={a} />;
    } else if (section === 'categories') {
        page = <window.Categories />;
    } else if (section === 'budgets') {
        page = <window.Budgets />;
    } else if (section === 'debts') {
        if (a) {
            page = <window.DebtDetail debtId={a} openForm={b === 'movement' && c === 'new'} />;
        } else {
            page = <window.Debts />;
        }
    } else {
        page = <window.Dashboard />;
    }

    return (
        <>
            <window.Nav route={route.path} email={session.user.email} onLogout={handleLogout} />
            <div className="container pb-5">
                {page}
            </div>
        </>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
