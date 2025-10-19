// Supabase Configuration
const SUPABASE_URL = 'https://vfifgrpwdhhykaxayxvs.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaWZncnB3ZGhoeWtheGF5eHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NjI0MTksImV4cCI6MjA3NTIzODQxOX0.LxCNGqwzIDJWVbGJ9e4KWeAvj3hxa1QPcgCy9v0UwPA'

// Initialize Supabase client
const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Export for use in other files
window.supabaseClient = supabaseClient
// Feature flags
window.FEATURE_DM_ENABLED = false; // التحكم بإظهار/إخفاء الدردشة الخاصة بين الأعضاء
