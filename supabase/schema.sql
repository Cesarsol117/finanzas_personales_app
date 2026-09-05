-- ============================================================================
-- Esquema de base de datos para "Mis Finanzas" (versión React + Supabase)
-- ============================================================================
-- Cómo usarlo: entrá a tu proyecto en supabase.com → menú lateral "SQL Editor"
-- → "New query" → pegá TODO este archivo → "Run".
--
-- Qué hace: crea las 5 tablas (equivalentes a los modelos de Django) y les
-- activa "Row Level Security" (RLS) — la regla que hace que cada usuario
-- solo pueda ver y tocar SUS PROPIOS datos. Esto es fundamental acá porque,
-- a diferencia de Django, el código de esta app corre en el navegador de
-- cada persona: sin RLS, cualquiera podría leer los datos de cualquier otro
-- usuario con las herramientas de desarrollador del navegador.
-- ============================================================================

-- Necesario para poder usar gen_random_uuid() como id por defecto.
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name text not null,
    type text not null check (type in ('ingreso', 'gasto')),
    created_at timestamptz not null default now(),
    unique (user_id, name, type)
);

alter table public.categories enable row level security;

drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_update_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;

create policy "categories_select_own" on public.categories
    for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
    for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
    for update using (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
    for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- transactions (movimientos)
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    category_id uuid references public.categories (id) on delete set null,
    type text not null check (type in ('ingreso', 'gasto')),
    payment_type text not null default '' check (
        payment_type in ('', 'efectivo', 'debito', 'credito', 'transferencia', 'otro')
    ),
    necessity text not null default '' check (necessity in ('', 'necesario', 'antojo')),
    amount numeric(12, 2) not null,
    date date not null,
    description text not null default '',
    created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

create policy "transactions_select_own" on public.transactions
    for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
    for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
    for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
    for delete using (auth.uid() = user_id);

create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

-- ----------------------------------------------------------------------------
-- budgets (presupuestos)
-- ----------------------------------------------------------------------------
create table if not exists public.budgets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    category_id uuid not null references public.categories (id) on delete cascade,
    year int not null,
    month int not null check (month between 1 and 12),
    amount numeric(12, 2) not null,
    unique (user_id, category_id, year, month)
);

alter table public.budgets enable row level security;

drop policy if exists "budgets_select_own" on public.budgets;
drop policy if exists "budgets_insert_own" on public.budgets;
drop policy if exists "budgets_update_own" on public.budgets;
drop policy if exists "budgets_delete_own" on public.budgets;

create policy "budgets_select_own" on public.budgets
    for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets
    for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets
    for update using (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets
    for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- debts (deudas)
-- ----------------------------------------------------------------------------
create table if not exists public.debts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name text not null,
    type text not null default 'otro' check (type in ('tarjeta_credito', 'prestamo', 'otro')),
    initial_balance numeric(12, 2) not null default 0,
    credit_limit numeric(12, 2),
    created_at timestamptz not null default now()
);

alter table public.debts enable row level security;

drop policy if exists "debts_select_own" on public.debts;
drop policy if exists "debts_insert_own" on public.debts;
drop policy if exists "debts_update_own" on public.debts;
drop policy if exists "debts_delete_own" on public.debts;

create policy "debts_select_own" on public.debts
    for select using (auth.uid() = user_id);
create policy "debts_insert_own" on public.debts
    for insert with check (auth.uid() = user_id);
create policy "debts_update_own" on public.debts
    for update using (auth.uid() = user_id);
create policy "debts_delete_own" on public.debts
    for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- debt_movements (cargos y pagos de una deuda)
-- ----------------------------------------------------------------------------
-- Esta tabla no tiene su propio user_id: "pertenece" a un usuario a través
-- de la deuda (debt_id). Por eso sus políticas de RLS miran la tabla debts.
create table if not exists public.debt_movements (
    id uuid primary key default gen_random_uuid(),
    debt_id uuid not null references public.debts (id) on delete cascade,
    type text not null check (type in ('cargo', 'pago')),
    amount numeric(12, 2) not null,
    date date not null,
    description text not null default '',
    created_at timestamptz not null default now()
);

alter table public.debt_movements enable row level security;

drop policy if exists "debt_movements_select_own" on public.debt_movements;
drop policy if exists "debt_movements_insert_own" on public.debt_movements;
drop policy if exists "debt_movements_delete_own" on public.debt_movements;

create policy "debt_movements_select_own" on public.debt_movements
    for select using (
        exists (
            select 1 from public.debts
            where debts.id = debt_movements.debt_id and debts.user_id = auth.uid()
        )
    );
create policy "debt_movements_insert_own" on public.debt_movements
    for insert with check (
        exists (
            select 1 from public.debts
            where debts.id = debt_movements.debt_id and debts.user_id = auth.uid()
        )
    );
create policy "debt_movements_delete_own" on public.debt_movements
    for delete using (
        exists (
            select 1 from public.debts
            where debts.id = debt_movements.debt_id and debts.user_id = auth.uid()
        )
    );

-- ============================================================================
-- Listo. Ahora en el dashboard de Supabase:
--  1. Andá a "Authentication" → "Providers" y confirmá que "Email" esté activo.
--  2. En "Authentication" → "Settings", si querés que la cuenta quede activa
--     al toque (sin confirmar por correo, útil para empezar más rápido),
--     podés desactivar "Confirm email".
--  3. Andá a "Project Settings" → "API" y copiá el "Project URL" y la
--     "anon public key" — los vas a necesitar en js/supabase-client.js.
-- ============================================================================
