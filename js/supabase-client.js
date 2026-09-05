// ============================================================================
// Conexión a Supabase.
//
// IMPORTANTE: reemplazá los dos valores de abajo por los de TU proyecto.
// Los encontrás en supabase.com → tu proyecto → "Project Settings" (el
// ícono de engranaje) → "API". Copiá el "Project URL" y la "anon public"
// key (NO la "service_role", esa nunca va en un archivo que subís a GitHub).
// ============================================================================

const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY-ACA';

// El objeto "supabase" global lo trae el script de supabase-js cargado en
// index.html. Acá creamos el cliente y lo dejamos disponible como
// window.db para que el resto de los archivos (api.js, componentes) lo usen.
window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
