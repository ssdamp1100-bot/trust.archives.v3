document.addEventListener('DOMContentLoaded', async () => {
    // Page protection: Redirect if not logged in
    if (!window.authService.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    const currentUser = window.authService.getCurrentUser();

    // 1. Update Welcome Message
    const welcomeElement = document.getElementById('WelcomeUsername');
    if (welcomeElement && currentUser) {
        welcomeElement.innerHTML = `<i class="fa-solid fa-face-smile"></i> أهلاً بك ${currentUser.full_name || currentUser.username}`;
    }

    // 2. Update Statistics (products/suppliers/members)
    async function fetchStats() {
        try {
            const { count: productsCount, error: productsError } = await supabaseClient
                .from('products')
                .select('id', { count: 'exact', head: true });
            const { count: suppliersCount, error: suppliersError } = await supabaseClient
                .from('suppliers')
                .select('id', { count: 'exact', head: true });
            const { count: usersCount, error: usersError } = await supabaseClient
                .from('users')
                .select('id', { count: 'exact', head: true });

            if (productsError) throw productsError;
            if (suppliersError) throw suppliersError;
            if (usersError) throw usersError;

            const productsEl = document.getElementById('productsCount') || document.querySelector('.Data-Snapshot-box:nth-child(1) .Data-Snapshot-number');
            const suppliersEl = document.getElementById('suppliersCount') || document.querySelector('.Data-Snapshot-box:nth-child(2) .Data-Snapshot-number');
            const membersEl = document.getElementById('membersCount') || document.querySelector('.Data-Snapshot-box:nth-child(3) .Data-Snapshot-number');

            if (productsEl) productsEl.textContent = String(productsCount || 0);
            if (suppliersEl) suppliersEl.textContent = String(suppliersCount || 0);
            if (membersEl) membersEl.textContent = String(usersCount || 0);

        } catch (error) {
            console.error('Error fetching stats:', error);
            // Keep default values if fetching fails
        }
    }

    // 3. Fetch and display team members in the slider
    async function populateTeamSlider() {
        const coverflow = document.getElementById('coverflow');
        if (!coverflow) return;

        try {
            const { data: users, error } = await supabaseClient
                .from('users')
                .select('full_name, username, profile_image_url') // Assuming a 'profile_image_url' column exists
                .limit(10); // Limit to 10 members for the slider

            if (error) throw error;

            // Clear static content if any
            coverflow.innerHTML = ''; 

            if (users && users.length > 0) {
                // Replace the static teamMembers array with data from Supabase
                window.teamMembers = users.map(user => ({
                    name: user.full_name || user.username,
                    image: user.profile_image_url || 'https://randomuser.me/api/portraits/men/1.jpg', // Fallback image
                    products: 0, // Placeholder, needs a query to calculate
                    points: 0      // Placeholder, needs a query to calculate
                }));

                // Re-initialize the slider with dynamic data
                if (window.initSlider) {
                    window.initSlider();
                }
            } else {
                coverflow.innerHTML = '<p>لا يوجد أعضاء لعرضهم حالياً.</p>';
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
            // If fetching fails, the slider might remain empty or show a static version if not cleared.
        }
    }

    // Run all dynamic functions
    await fetchStats();
    // Update honor board (لوحة التكريم)
    await loadHonorBoard();
    // The slider initialization is complex, for now we will just fetch stats and welcome message.
    // await populateTeamSlider(); // This function is ready but depends on slider logic refactoring.
});

// ===== Honor Board =====
async function loadHonorBoard() {
    try {
        const honorNameEl = document.getElementById('WeekHonorUdser');
        const honorBody = document.querySelector('.honor-body');
        const honorPointsEl = document.getElementById('UserPoints');
        if (!honorNameEl || !honorBody) return;

        // 1) ابحث عن أحدث تكريم في جدول notes
        const { data: honorNotes, error } = await supabaseClient
            .from('notes')
            .select('id, user_id, created_at')
            .eq('category', 'honor')
            .order('created_at', { ascending: false })
            .limit(1);
        if (error) throw error;

        if (!honorNotes || honorNotes.length === 0) {
            // لا يوجد تكريم: أعد الحالة الافتراضية
            honorNameEl.textContent = 'قريباً';
            const info = honorBody.querySelector('.honor-message');
            if (info) info.textContent = 'من سيكون أول عضو سيتم تكريمه  ؟؟ سنرى 😁 سيتم اختيار عضو الأسبوع من قبل الإدارة بحسب النشاط المحقق , ';
            if (honorPointsEl) honorPointsEl.textContent = '0 نقطة';
            return;
        }

        const honoredUserId = honorNotes[0].user_id;

        // 2) جلب بيانات المستخدم المكرّم
        const { data: user, error: userErr } = await supabaseClient
            .from('users')
            .select('id, full_name, username')
            .eq('id', honoredUserId)
            .single();
        if (userErr) throw userErr;

        const displayName = (user.full_name && user.full_name.trim()) ? user.full_name : (user.username || 'عضو');
        honorNameEl.textContent = displayName;

        // 3) حساب نقاط المستخدم من notes(category='point')
        let points = 0;
        try {
            const { data: pointsRows } = await supabaseClient
                .from('notes')
                .select('id')
                .eq('user_id', honoredUserId)
                .eq('category', 'point');
            points = pointsRows ? pointsRows.length : 0;
        } catch {}
        if (honorPointsEl) honorPointsEl.textContent = `${points} نقطة`;

        // 4) تحديث الرسالة إن لزم
        const info = honorBody.querySelector('.honor-message');
        if (info) info.textContent = 'تم اختيار عضو الأسبوع بناءً على نشاطه الملحوظ. مبارك!';
    } catch (e) {
        console.warn('loadHonorBoard error:', e);
    }
}
