// ============================================================================
// Conexión a Supabase.
//
// IMPORTANTE: reemplazá los dos valores de abajo por los de TU proyecto.
// Los encontrás en supabase.com → tu proyecto → "Project Settings" (el
// ícono de engranaje) → "API". Copiá el "Project URL" y la "anon public"
// key (NO la "service_role", esa nunca va en un archivo que subís a GitHub).
// ============================================================================

const SUPABASE_URL = 'https://hivsnjfdomfirqrvrvsi.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnNuamZkb21maXJxcnZydnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NjUyNDMsImV4cCI6MjEwNDE0MTI0M30.4jkAf0gP34Uo3ApQCv3R4ol3CvPkro_-0KsWycskYK0';

// El objeto "supabase" global lo trae el script de supabase-js cargado en
// index.html. Acá creamos el cliente y lo dejamos disponible como
// window.db para que el resto de los archivos (api.js, componentes) lo usen.
window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
