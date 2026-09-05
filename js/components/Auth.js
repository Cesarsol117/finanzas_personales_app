// ============================================================================
// Pantalla de login / registro (una sola pantalla, cambia de modo).
// Equivalente a las vistas de registro/login de Django + allauth/auth views.
// ============================================================================

window.Auth = function Auth({ mode }) {
    const { useState } = React;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const isRegister = mode === 'register';

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);
        try {
            if (isRegister) {
                await window.Api.auth.signUp(email, password);
                setInfo('Cuenta creada. Si tu proyecto de Supabase pide confirmar el correo, revisá tu bandeja; si no, ya podés iniciar sesión.');
            } else {
                await window.Api.auth.signIn(email, password);
                window.location.hash = '#/dashboard';
            }
        } catch (err) {
            setError(err.message || 'Ocurrió un error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrap">
            <div className="card p-4">
                <h4 className="mb-3 text-center">
                    <i className="bi bi-wallet2"></i> Mis Finanzas
                </h4>
                <h6 className="text-center text-muted mb-3">
                    {isRegister ? 'Creá tu cuenta' : 'Iniciá sesión'}
                </h6>

                {error && <div className="alert alert-danger py-2">{error}</div>}
                {info && <div className="alert alert-success py-2">{info}</div>}

                <form onSubmit={submit}>
                    <div className="mb-3">
                        <label className="form-label">Correo</label>
                        <input type="email" className="form-control" required value={email}
                            onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Contraseña</label>
                        <input type="password" className="form-control" required minLength={6} value={password}
                            onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {loading ? 'Un momento…' : (isRegister ? 'Registrarme' : 'Entrar')}
                    </button>
                </form>

                <div className="text-center mt-3">
                    {isRegister ? (
                        <a href="#/login">¿Ya tenés cuenta? Iniciá sesión</a>
                    ) : (
                        <a href="#/register">¿No tenés cuenta? Registrate</a>
                    )}
                </div>
            </div>
        </div>
    );
};
