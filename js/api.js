// ============================================================================
// Capa de datos: todas las llamadas a Supabase pasan por acá, agrupadas
// como en las vistas de Django. Cada función devuelve directamente los
// datos, o tira el error (throw) para que el componente que la llamó lo
// pueda mostrar con un try/catch.
//
// No hace falta mandar "user_id" a mano en los inserts: la tabla lo llena
// sola con auth.uid() (ver supabase/schema.sql), que es el usuario logueado
// según el token con el que se hace el pedido.
// ============================================================================

window.Api = {

    auth: {
        async signUp(email, password) {
            const { data, error } = await window.db.auth.signUp({ email, password });
            if (error) throw error;
            return data;
        },
        async signIn(email, password) {
            const { data, error } = await window.db.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data;
        },
        async signOut() {
            const { error } = await window.db.auth.signOut();
            if (error) throw error;
        },
        async getSession() {
            const { data } = await window.db.auth.getSession();
            return data.session;
        },
        onChange(callback) {
            const { data } = window.db.auth.onAuthStateChange((_event, session) => callback(session));
            return () => data.subscription.unsubscribe();
        },
    },

    categories: {
        async list() {
            const { data, error } = await window.db
                .from('categories')
                .select('*')
                .order('type', { ascending: true })
                .order('name', { ascending: true });
            if (error) throw error;
            return data;
        },
        async create(fields) {
            const { data, error } = await window.db.from('categories').insert(fields).select().single();
            if (error) throw error;
            return data;
        },
        async update(id, fields) {
            const { data, error } = await window.db.from('categories').update(fields).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await window.db.from('categories').delete().eq('id', id);
            if (error) throw error;
        },
    },

    transactions: {
        // filtros opcionales: { type, categoryId, year, month }
        async list(filters = {}) {
            let query = window.db
                .from('transactions')
                .select('*, category:categories(id, name, type)')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (filters.type) query = query.eq('type', filters.type);
            if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
            if (filters.year && filters.month) {
                const first = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
                const lastDay = Utils.daysInMonth(filters.year, filters.month);
                const last = `${filters.year}-${String(filters.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                query = query.gte('date', first).lte('date', last);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        async create(fields) {
            const { data, error } = await window.db.from('transactions').insert(fields).select().single();
            if (error) throw error;
            return data;
        },
        async update(id, fields) {
            const { data, error } = await window.db.from('transactions').update(fields).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await window.db.from('transactions').delete().eq('id', id);
            if (error) throw error;
        },
    },

    budgets: {
        async list(filters = {}) {
            let query = window.db
                .from('budgets')
                .select('*, category:categories(id, name)')
                .order('year', { ascending: false })
                .order('month', { ascending: false });
            if (filters.year) query = query.eq('year', filters.year);
            if (filters.month) query = query.eq('month', filters.month);
            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        async create(fields) {
            const { data, error } = await window.db.from('budgets').insert(fields).select().single();
            if (error) throw error;
            return data;
        },
        async update(id, fields) {
            const { data, error } = await window.db.from('budgets').update(fields).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await window.db.from('budgets').delete().eq('id', id);
            if (error) throw error;
        },
    },

    debts: {
        async list() {
            const { data, error } = await window.db.from('debts').select('*').order('name', { ascending: true });
            if (error) throw error;
            return data;
        },
        async get(id) {
            const { data, error } = await window.db.from('debts').select('*').eq('id', id).single();
            if (error) throw error;
            return data;
        },
        async create(fields) {
            const { data, error } = await window.db.from('debts').insert(fields).select().single();
            if (error) throw error;
            return data;
        },
        async update(id, fields) {
            const { data, error } = await window.db.from('debts').update(fields).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await window.db.from('debts').delete().eq('id', id);
            if (error) throw error;
        },
    },

    debtMovements: {
        async listForDebt(debtId) {
            const { data, error } = await window.db
                .from('debt_movements')
                .select('*')
                .eq('debt_id', debtId)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        // Trae TODOS los movimientos del usuario (de todas sus deudas), para
        // poder calcular el saldo de cada deuda sin pedirlos uno por uno.
        async listAllForUser() {
            const { data, error } = await window.db.from('debt_movements').select('*');
            if (error) throw error;
            return data;
        },
        async create(fields) {
            const { data, error } = await window.db.from('debt_movements').insert(fields).select().single();
            if (error) throw error;
            return data;
        },
        async remove(id) {
            const { error } = await window.db.from('debt_movements').delete().eq('id', id);
            if (error) throw error;
        },
    },
};
