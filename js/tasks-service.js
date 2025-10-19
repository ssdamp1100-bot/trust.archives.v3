// Tasks and Notes Service
class TasksService {
    constructor() {
        this.currentTasks = []
        this.currentNotes = []
    }

    // Get all tasks for current user
    async getTasks(filters = {}) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            let query = supabaseClient
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            // Apply filters
            if (filters.status) {
                query = query.eq('status', filters.status)
            }
            if (filters.priority) {
                query = query.eq('priority', filters.priority)
            }
            if (filters.search) {
                query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
            }

            const { data, error } = await query

            if (error) {
                return { success: false, error: error.message }
            }

            this.currentTasks = data || []
            return { success: true, tasks: this.currentTasks }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Create new task
    async createTask(taskData) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            const task = {
                ...taskData,
                user_id: userId,
                created_at: new Date().toISOString()
            }

            const { data, error } = await supabaseClient
                .from('tasks')
                .insert([task])
                .select()
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, task: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Update task
    async updateTask(taskId, updateData) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            const { data, error } = await supabaseClient
                .from('tasks')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId)
                .eq('user_id', userId)
                .select()
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, task: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Delete task
    async deleteTask(taskId) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            const { error } = await supabaseClient
                .from('tasks')
                .delete()
                .eq('id', taskId)
                .eq('user_id', userId)

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Get all notes for current user
    async getNotes(filters = {}) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            let query = supabaseClient
                .from('notes')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            // Apply filters
            if (filters.category) {
                query = query.eq('category', filters.category)
            }
            if (filters.search) {
                query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
            }

            const { data, error } = await query

            if (error) {
                return { success: false, error: error.message }
            }

            this.currentNotes = data || []
            return { success: true, notes: this.currentNotes }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Create new note
    async createNote(noteData) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            const note = {
                ...noteData,
                user_id: userId,
                created_at: new Date().toISOString()
            }

            const { data, error } = await supabaseClient
                .from('notes')
                .insert([note])
                .select()
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, note: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Update note
    async updateNote(noteId, updateData) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            const { data, error } = await supabaseClient
                .from('notes')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', noteId)
                .eq('user_id', userId)
                .select()
                .single()

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, note: data }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Delete note
    async deleteNote(noteId) {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            const { error } = await supabaseClient
                .from('notes')
                .delete()
                .eq('id', noteId)
                .eq('user_id', userId)

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // Get user statistics
    async getUserStats() {
        try {
            const userId = window.authService.getCurrentUserId()
            if (!userId) {
                return { success: false, error: 'المستخدم غير مسجل الدخول' }
            }

            // Get tasks count by status
            const { data: tasksData, error: tasksError } = await supabaseClient
                .from('tasks')
                .select('status')
                .eq('user_id', userId)

            if (tasksError) {
                return { success: false, error: tasksError.message }
            }

            // Get notes count
            const { data: notesData, error: notesError } = await supabaseClient
                .from('notes')
                .select('id')
                .eq('user_id', userId)

            if (notesError) {
                return { success: false, error: notesError.message }
            }

            // Get products count
            const { data: productsData, error: productsError } = await supabaseClient
                .from('products')
                .select('id')
                .eq('user_id', userId)

            if (productsError) {
                return { success: false, error: productsError.message }
            }

            // Get suppliers count
            const { data: suppliersData, error: suppliersError } = await supabaseClient
                .from('suppliers')
                .select('id')
                .eq('user_id', userId)

            if (suppliersError) {
                return { success: false, error: suppliersError.message }
            }

            const stats = {
                totalTasks: tasksData.length,
                completedTasks: tasksData.filter(task => task.status === 'completed').length,
                pendingTasks: tasksData.filter(task => task.status === 'pending').length,
                totalNotes: notesData.length,
                totalProducts: productsData.length,
                totalSuppliers: suppliersData.length
            }

            return { success: true, stats }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}

// Create global instance
window.tasksService = new TasksService()
