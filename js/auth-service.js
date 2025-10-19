// Authentication Service
class AuthService {
    constructor() {
        this.currentUser = null
        this.loadUserFromStorage()
    }

    // Load user from localStorage
    loadUserFromStorage() {
        const userData = localStorage.getItem('trust_user')
        if (userData) {
            this.currentUser = JSON.parse(userData)
        }
    }

    // Save user to localStorage
    saveUserToStorage(user) {
        localStorage.setItem('trust_user', JSON.stringify(user))
        this.currentUser = user
    }

    // Clear user from localStorage
    clearUser() {
        localStorage.removeItem('trust_user')
        this.currentUser = null
    }

    // Login with username/email and password (table-based)
    async login(identifier, password) {
        try {
            // Determine whether identifier is email or username
            const isEmail = typeof identifier === 'string' && identifier.includes('@')
            let query = supabaseClient.from('users').select('*').limit(1)
            query = isEmail ? query.eq('email', identifier) : query.eq('username', identifier)

            const { data: users, error } = await query
            if (error) return { success: false, error: error.message }
            if (!users || users.length === 0) return { success: false, error: 'المستخدم غير موجود' }

            const user = users[0]

            // Plaintext password match (as requested: simpler auth)
            if (!user.password || user.password !== password) {
                return { success: false, error: 'كلمة المرور غير صحيحة' }
            }

            const userData = {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                role: user.role || 'member',
            }

            this.saveUserToStorage(userData)
            return { success: true, user: userData }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Register new user (table-based)
    async register(userData) {
        try {
            // Basic validation
            if (!userData.username || !userData.email || !userData.password || !userData.full_name) {
                return { success: false, error: 'بيانات غير مكتملة' }
            }

            // Ensure username/email uniqueness
            const { data: existing, error: checkErr } = await supabaseClient
                .from('users')
                .select('id')
                .or(`username.eq.${userData.username},email.eq.${userData.email}`)
                .limit(1)

            if (checkErr) return { success: false, error: checkErr.message }
            if (existing && existing.length > 0) return { success: false, error: 'اسم المستخدم أو البريد مستخدم بالفعل' }

            const payload = {
                username: userData.username,
                email: userData.email,
                full_name: userData.full_name,
                country: userData.country || null,
                age: userData.age || null,
                residence: userData.residence || null,
                phone_numbers: userData.phone_numbers || [],
                whatsapp: userData.whatsapp || null,
                role: userData.role || 'member',
                password: userData.password, // plaintext per request (simple auth)
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            const { data, error } = await supabaseClient
                .from('users')
                .insert([payload])
                .select('*')
                .single()

            if (error) return { success: false, error: error.message }

            return { success: true, user: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Logout
    async logout() {
        try {
            // No remote session when using table-based auth
            this.clearUser()
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser
    }

    // Get user ID
    getCurrentUserId() {
        return this.currentUser ? this.currentUser.id : null
    }

    // Update user profile
    async updateProfile(profileData) {
        try {
            const userId = this.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            const { data, error } = await supabaseClient
                .from('users')
                .update(profileData)
                .eq('id', userId)
                .select()
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            // Update current user data
            this.currentUser = { ...this.currentUser, ...data }
            this.saveUserToStorage(this.currentUser)

            return { success: true, user: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// Create global instance
window.authService = new AuthService()
