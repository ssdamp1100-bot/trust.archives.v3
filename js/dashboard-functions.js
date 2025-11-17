// Dashboard Functions - وظائف لوحة التحكم

// بيانات أعضاء الفريق
let teamMembers = [];
const defaultAvatar = 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/user.svg';

// متغيرات السلايدر
let currentIndex = 0;
let isAutoplay = true;
let autoplayInterval;

// تحميل بيانات أعضاء الفريق من قاعدة البيانات
async function loadTeamMembers() {
    try {
        if (!window.supabaseClient) {
            console.warn('Supabase client not available - using fallback members');
            teamMembers = getFallbackMembers();
            return;
        }

        const { data, error } = await window.supabaseClient
            .from('users')
            .select('id, full_name, username, profile_image_url')
            .order('created_at', { ascending: true })
            .limit(30);

        if (error) throw error;

        // بناء خرائط الأعداد: عدد المنتجات لكل مستخدم، وعدد النقاط
        const [prodRes, pointsRes] = await Promise.all([
            window.supabaseClient.from('products').select('user_id'),
            window.supabaseClient.from('notes').select('user_id').eq('category', 'point')
        ]);

        const productsMap = new Map();
        (prodRes.data || []).forEach(r => {
            const k = r.user_id;
            productsMap.set(k, (productsMap.get(k) || 0) + 1);
        });

        const pointsMap = new Map();
        (pointsRes.data || []).forEach(r => {
            const k = r.user_id;
            pointsMap.set(k, (pointsMap.get(k) || 0) + 1);
        });

        teamMembers = (data || []).map(u => ({
            id: u.id,
            name: (u.full_name && u.full_name.trim()) ? u.full_name : (u.username || 'عضو'),
            image: u.profile_image_url || defaultAvatar,
            products: productsMap.get(u.id) || 0,
            points: pointsMap.get(u.id) || 0
        }));
        if (!teamMembers || teamMembers.length === 0) {
            teamMembers = getFallbackMembers();
        }
    } catch (e) {
        console.error('فشل جلب المستخدمين:', e);
        teamMembers = getFallbackMembers();
    }
}

// تحميل أرقام الإحصائيات
async function loadSnapshotCounts() {
    const productsEl = document.getElementById('productsCount');
    const suppliersEl = document.getElementById('suppliersCount');
    const membersEl = document.getElementById('membersCount');

    if (productsEl) productsEl.textContent = '0';
    if (suppliersEl) suppliersEl.textContent = '0';

    try {
        if (!window.supabaseClient) return;

        const { count, error } = await window.supabaseClient
            .from('users')
            .select('id', { count: 'exact', head: true });

        if (error) throw error;
        if (membersEl) membersEl.textContent = String(count || 0);
    } catch (e) {
        console.warn('تعذر جلب عدد الأعضاء:', e);
        if (membersEl) membersEl.textContent = '0';
    }
}

// تهيئة السلايدر
function initSlider() {
    const coverflow = document.getElementById('coverflow');
    const dotsContainer = document.getElementById('dots');

    if (!coverflow || !dotsContainer) return;
    if (!teamMembers || teamMembers.length === 0) return;

    // إنشاء عناصر السلايدر
    teamMembers.forEach((member, index) => {
        const item = document.createElement('div');
        item.className = `coverflow-item ${index === 0 ? 'active' : ''}`;
        item.dataset.index = index;

        item.innerHTML = `
            <div class="cover">
                <img src="${member.image}" alt="${member.name}" loading="lazy" onerror="this.onerror=null; this.src='${defaultAvatar}';">
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-stats">
                        <div>
                            <span>المنتجات</span>
                            <span class="stat3-value">${member.products}</span>
                        </div>
                        <div>
                            <span>النقاط</span>
                            <span class="stat3-value">${member.points}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        coverflow.appendChild(item);

        // إنشاء نقاط التنقل
        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.dataset.index = index;
        dotsContainer.appendChild(dot);

        // حدث النقر للنقطة
        dot.addEventListener('click', () => goToSlide(index));
    });

    updateSlides();
    startAutoplay();
}

// بيانات أعضاء افتراضية للتجربة عند غياب قاعدة البيانات
function getFallbackMembers() {
    const names = ['أحمد', 'فاطمة', 'محمد', 'سارة', 'خالد', 'ريم'];
    return names.map((n, i) => ({
        id: `demo-${i+1}`,
        name: n,
        image: defaultAvatar,
        products: 5 + (i * 2),
        points: 10 + (i * 7)
    }));
}

// تحديث مواضع العناصر في السلايدر
function updateSlides() {
    const items = document.querySelectorAll('.coverflow-item');
    const dots = document.querySelectorAll('.dot');

    items.forEach((item, index) => {
        const position = index - currentIndex;
        let transform = '';
        let zIndex = 0;
        let opacity = 1;

        if (position === 0) {
            transform = 'translateX(0) translateZ(0) scale(1.1)';
            zIndex = 100;
        } else if (position === -1) {
            transform = 'translateX(280px) translateZ(-100px) rotateY(-15deg) scale(0.9)';
            zIndex = 90;
            opacity = 0.8;
        } else if (position === 1) {
            transform = 'translateX(-280px) translateZ(-100px) rotateY(15deg) scale(0.9)';
            zIndex = 90;
            opacity = 0.8;
        } else if (position < -1) {
            const offset = Math.abs(position) - 1;
            transform = `translateX(${280 + offset * 100}px) translateZ(-${100 + offset * 50}px) rotateY(-25deg) scale(0.7)`;
            zIndex = 80 - Math.abs(position);
            opacity = Math.max(0.1, 0.6 - offset * 0.1);
        } else if (position > 1) {
            const offset = Math.abs(position) - 1;
            transform = `translateX(-${280 + offset * 100}px) translateZ(-${100 + offset * 50}px) rotateY(25deg) scale(0.7)`;
            zIndex = 80 - Math.abs(position);
            opacity = Math.max(0.1, 0.6 - offset * 0.1);
        }

        item.style.transform = transform;
        item.style.zIndex = zIndex;
        item.style.opacity = opacity;

        dots[index].classList.toggle('active', index === currentIndex);
    });
}

// الانتقال إلى شريحة محددة
function goToSlide(index) {
    currentIndex = index;
    if (currentIndex >= teamMembers.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = teamMembers.length - 1;

    updateSlides();

    if (isAutoplay) {
        clearInterval(autoplayInterval);
        startAutoplay();
    }
}

// التنقل بين الشرائح
function navigate(direction) {
    goToSlide(currentIndex + direction);
}

// بدء التشغيل التلقائي
function startAutoplay() {
    if (isAutoplay) {
        autoplayInterval = setInterval(() => navigate(1), 3000);
    }
}

// تبديل التشغيل التلقائي
function toggleAutoplay() {
    isAutoplay = !isAutoplay;
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');

    if (isAutoplay) {
        if (playIcon) playIcon.style.display = 'none';
        if (pauseIcon) pauseIcon.style.display = 'inline';
        startAutoplay();
    } else {
        if (playIcon) playIcon.style.display = 'inline';
        if (pauseIcon) pauseIcon.style.display = 'none';
        clearInterval(autoplayInterval);
    }
}

// دعم السحب على الأجهزة التي تعمل باللمس
function initTouchSupport() {
    let startX = 0;
    let endX = 0;

    const container = document.querySelector('.coverflow-container');
    if (!container) return;

    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    container.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        const swipeThreshold = 50;
        const diff = startX - endX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                navigate(1);
            } else {
                navigate(-1);
            }
        }
    });
}

// تهيئة لوحة التحكم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    // تحميل المستخدمين وتهيئة السلايدر
    await loadTeamMembers();
    initSlider();

    // تحميل الإحصائيات
    await loadSnapshotCounts();

    // إضافة أحداث الأزرار
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');

    if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));
    if (playPauseBtn) playPauseBtn.addEventListener('click', toggleAutoplay);

    // دعم لوحة المفاتيح
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') navigate(-1);
        if (e.key === 'ArrowLeft') navigate(1);
        if (e.key === ' ') {
            e.preventDefault();
            toggleAutoplay();
        }
    });

    // دعم اللمس
    initTouchSupport();
});
