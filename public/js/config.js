// Verbindung zu Supabase (Coins, Glücksrad, Erfolge, Shop, Google-Login).
// Werte stehen in Supabase unter Project Settings → API: „Project URL“ und „anon public“-Key.
// Der Anon-Key ist für den Browser gedacht und darf öffentlich sein – geschützt wird über
// Row Level Security in der Datenbank. NIEMALS den „service_role“-Key hier eintragen.
// Leer gelassen: Login, Coins und Shop sind ausgeblendet, alle Spiele funktionieren wie bisher.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
