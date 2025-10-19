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
        // Reset to default state (no honored member)
        const honorNameEl = document.getElementById('WeekHonorUdser');
        const honorBody = document.querySelector('.honor-body');
        if (!honorNameEl || !honorBody) return;
        honorNameEl.textContent = 'قريباً';
        const info = honorBody.querySelector('.honor-message');
        if (info) {
            info.textContent = 'من سيكون أول عضو سيتم تكريمه  ؟؟ سنرى 😁 سيتم اختيار عضو الأسبوع من قبل الإدارة بحسب النشاط المحقق , ';
        }
        // Intentionally skip reading honor notes to keep default state
    } catch (e) {
        console.warn('loadHonorBoard error:', e);
    }
}
