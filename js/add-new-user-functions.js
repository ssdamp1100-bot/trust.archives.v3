// Add New User Functions - وظائف إضافة مستخدم جديد

// معالج نموذج تسجيل الدخول السريع
document.addEventListener('DOMContentLoaded', function () {
    const quickLoginForm = document.getElementById('quickLoginForm');
    if (quickLoginForm) {
        quickLoginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const btnText = this.querySelector('.btn-text');
            const loading = this.querySelector('.loading');
            const message = document.getElementById('loginMessage');

            btnText.classList.add('hidden');
            loading.classList.remove('hidden');

            setTimeout(() => {
                const username = document.getElementById('quickUsername')?.value;
                const password = document.getElementById('quickPassword')?.value;

                if (username && password) {
                    message.textContent = 'مرحباً! هذه نسخة عرض - لا يوجد تسجيل دخول فعلي';
                    message.className = 'message success';
                    message.classList.remove('hidden');

                    btnText.classList.remove('hidden');
                    loading.classList.add('hidden');
                } else {
                    message.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور';
                    message.className = 'message error';
                    message.classList.remove('hidden');

                    btnText.classList.remove('hidden');
                    loading.classList.add('hidden');
                }
            }, 1000);
        });
    }
});

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

        const form = document.getElementById('registerForm');
        if (form) {
            form.reset();
        }

        // إعادة تعيين حقول الهاتف الديناميكية
        const phoneFields = document.getElementById('registerPhoneFields');
        if (phoneFields) {
            const extraFields = phoneFields.querySelectorAll('.field-group:not(:first-child)');
            extraFields.forEach(field => field.remove());
        }
    };
}

if (typeof window.addRegisterPhoneField !== 'function') {
    window.addRegisterPhoneField = function addRegisterPhoneField() {
        const phoneFields = document.getElementById('registerPhoneFields');
        if (!phoneFields) return;

        const newField = document.createElement('div');
        newField.className = 'field-group';
        newField.innerHTML = `
            <input type="tel" placeholder="+966 50 123 4567" class="phone-input" required>
            <button type="button" onclick="this.parentElement.remove()" class="add-field-btn" style="background: #e53e3e;">-</button>
        `;
        phoneFields.appendChild(newField);
    };
}

// عرض رسالة
function showMessage(message, type = 'success') {
    const messageEl = document.getElementById('loginMessage') || document.createElement('div');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove('hidden');

    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 3000);
}

// إغلاق النافذة عند النقر على الخلفية
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) closeRegisterModal();
        });
    }
});
