# Mis Finanzas (versión React + Supabase)

Misma app de finanzas personales que la versión en Django, pero hecha con
React "sin build" (se corre directo en el navegador, con Babel traduciendo
el JSX al vuelo) y Supabase como base de datos en la nube. Pensada para
desplegarse gratis en GitHub Pages, igual que la app de tu compañero.

## 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com), creá una cuenta (podés
   usar tu cuenta de GitHub) y creá un proyecto nuevo. Elegí una
   contraseña de base de datos y guardala (no la vas a necesitar para esta
   app, pero por si acaso).
2. Esperá a que el proyecto termine de aprovisionarse (1-2 minutos).
3. En el menú lateral, andá a **SQL Editor** → **New query**, pegá todo el
   contenido de [`supabase/schema.sql`](supabase/schema.sql) y apretá
   **Run**. Esto crea las 5 tablas (categorías, movimientos, presupuestos,
   deudas y movimientos de deuda) con Row Level Security activado, para
   que cada usuario solo pueda ver y tocar sus propios datos.
4. Andá a **Authentication** → **Providers** y confirmá que **Email** esté
   habilitado (lo está por defecto).
5. (Opcional, para probar más rápido) En **Authentication** → **Settings**
   podés desactivar **Confirm email**, así una cuenta nueva queda activa
   al toque, sin tener que confirmar por correo.
6. Andá a **Project Settings** (el ícono de engranaje) → **API** y copiá:
   - **Project URL**
   - **anon public** key (⚠️ NO la `service_role` — esa nunca va en este
     proyecto, porque todo el código queda público en GitHub Pages).

## 2. Configurar el proyecto

Abrí [`js/supabase-client.js`](js/supabase-client.js) y reemplazá:

```js
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY-ACA';
```

con los valores que copiaste en el paso anterior.

## 3. Probarlo localmente

Como no hay paso de build, alcanza con abrir `index.html` en el navegador
—pero por las reglas de CORS de los navegadores modernos, es mejor
servirlo con un servidor simple en vez de abrir el archivo directo. Por
ejemplo, parado en esta carpeta:

```bash
python -m http.server 8000
```

y después entrá a `http://localhost:8000` en el navegador.

## 4. Desplegar en GitHub Pages

1. Subí esta carpeta completa a un repositorio en GitHub (puede ser el
   mismo `usuario.github.io` si querés que quede en la raíz de tu dominio
   de GitHub Pages, o cualquier otro repo).
2. En el repo, andá a **Settings** → **Pages**.
3. En **Source**, elegí la rama (`main`) y la carpeta (`/root` si
   `index.html` está en la raíz del repo).
4. Guardá. GitHub te va a dar una URL tipo
   `https://tu-usuario.github.io/tu-repo/` (o `https://tu-usuario.github.io/`
   si usaste el repo especial `usuario.github.io`). Puede tardar uno o dos
   minutos en estar disponible la primera vez.

Listo — desde ahí ya la podés abrir desde el celular o cualquier otra red,
igual que le pasa a tu compañero con la suya. No hace falta un servidor
como PythonAnywhere: los archivos son estáticos (HTML/CSS/JS) y quien los
visita se conecta directo a Supabase con su propia sesión.

## 5. Crear tu usuario

Entrá a la URL de GitHub Pages, hacé clic en **¿No tenés cuenta?
Registrate**, cargá tu correo y contraseña. Si dejaste activado "Confirm
email" en Supabase, revisá tu correo para confirmar la cuenta antes de
poder entrar.

## Estructura del proyecto

```
finanzasPersonalesjsReact/
├── index.html                  # Página única; carga todo lo demás
├── css/styles.css              # Estilos (mismo look que la versión Django)
├── js/
│   ├── supabase-client.js      # Conexión a Supabase (URL + anon key)
│   ├── utils.js                # Constantes, formato de moneda/fecha, choices
│   ├── api.js                  # Todas las llamadas a Supabase, agrupadas
│   ├── app.js                  # Router por hash (#/dashboard, #/debts, etc.) y sesión
│   └── components/
│       ├── Nav.js              # Barra de navegación
│       ├── Auth.js             # Login / registro
│       ├── Dashboard.js        # Balance, proyección, gráficos, presupuestos
│       ├── Categories.js       # CRUD de categorías
│       ├── Transactions.js     # CRUD de movimientos (con tipo de pago y necesidad/antojo)
│       ├── Budgets.js          # CRUD de presupuestos
│       ├── Debts.js            # Lista de deudas con barra de gradiente/progreso
│       └── DebtDetail.js       # Detalle de una deuda + historial de movimientos
└── supabase/schema.sql         # Script SQL para crear las tablas + RLS
```

## Notas de seguridad

- La clave `anon public` en `js/supabase-client.js` está pensada para ser
  pública (queda en el código que baja al navegador de quien visite la
  página). La seguridad real la dan las políticas de **Row Level
  Security** definidas en `supabase/schema.sql`: cada fila solo es visible
  o editable por el usuario dueño de esos datos (`auth.uid() = user_id`).
- Nunca subas la clave `service_role` a este repositorio ni a ningún
  código que corra en el navegador.

## Actualizar la app luego de un cambio

Como no hay build, alcanza con editar los archivos y volver a subirlos
(`git add`, `git commit`, `git push`) — GitHub Pages se actualiza solo en
uno o dos minutos.
