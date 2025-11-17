// Login Functions - وظائف تسجيل الدخول

// معالج نموذج تسجيل الدخول
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // إغلاق نافذة التسجيل عند النقر على الخلفية
    const registerModal = document.getElementById('registerModal');
    if (registerModal) {
        registerModal.addEventListener('click', function (e) {
            if (e.target === this) closeRegisterModal();
        });
    }
});

// معالج تسجيل الدخول
function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;

    if (username && password) {
        alert('مرحباً بك! هذه نسخة عرض فقط - لا يوجد اتصال بقاعدة البيانات');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }
}

// معالج التسجيل
function handleRegister(e) {
    e.preventDefault();
    alert('شكراً لتسجيلك! هذه نسخة عرض فقط - لا يوجد اتصال بقاعدة البيانات');
    closeRegisterModal();
}

// قسم واجهة التسجيل: دوال موحّدة مع حماية من التكرار
if (typeof window.showRegisterModal !== 'function') {
    window.showRegisterModal = function showRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'block';
        }
    };
}

if (typeof window.closeRegisterModal !== 'function') {
    window.closeRegisterModal = function closeRegisterModal() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };
}

if (typeof window.addRegisterPhoneField !== 'function') {
    window.addRegisterPhoneField = function addRegisterPhoneField() {
        const container = document.getElementById('registerPhoneFields');
        if (!container) return;

        const newField = document.createElement('div');
        newField.className = 'field-group';
        newField.innerHTML = `
            <input type="tel" placeholder="+966 50 123 4567" class="phone-input" required>
            <button type="button" onclick="this.parentElement.remove()" class="add-field-btn">-</button>
        `;
        container.appendChild(newField);
    };
}
