// Supabase Configuration
const SUPABASE_URL = 'https://etzbmntrphhaoxjetqtk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0emJtbnRycGhoYW94amV0cXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTUwNDEsImV4cCI6MjA3NjM3MTA0MX0.kyHvpulHKRWgyAEqK-Z51rZYfcV9vfDJJj2CoATt1Do'

// Initialize Supabase client
const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Export for use in other files
window.supabaseClient = supabaseClient
// Feature flags
window.FEATURE_DM_ENABLED = false; // التحكم بإظهار/إخفاء الدردشة الخاصة بين الأعضاء
