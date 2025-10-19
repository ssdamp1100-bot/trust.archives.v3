// Login Logic - Secure Implementation
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const rememberMeCheckbox = document.getElementById('rememberMe');

    // Check for remembered username only (not auto-login)
    checkRememberedUser();

    // Login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const usernameOrEmail = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
        const btnText = document.querySelector('.btn-text');
        const loading = document.querySelector('.loading');
        
        // Show loading
        btnText.classList.add('hidden');
        loading.classList.remove('hidden');
        
        try {
            // Attempt login with table-based auth using username or email directly
            const result = await window.authService.login(usernameOrEmail, password);
            
            if (result.success) {
                // Save remember me preference
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('rememberedUsername', usernameOrEmail);
                } else {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('rememberedUsername');
                }

                showMessage('تم تسجيل الدخول بنجاح!', 'success');
                
                // Redirect based on user role
                setTimeout(() => {
                    if (result.user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 1000);
            } else {
                showMessage(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
                btnText.classList.remove('hidden');
                loading.classList.add('hidden');
            }
        } catch (error) {
            showMessage('حدث خطأ في تسجيل الدخول', 'error');
            btnText.classList.remove('hidden');
            loading.classList.add('hidden');
        }
    });

    // Check for remembered user
    function checkRememberedUser() {
        const rememberMe = localStorage.getItem('rememberMe');
        const rememberedUsername = localStorage.getItem('rememberedUsername');
        
        if (rememberMe === 'true' && rememberedUsername) {
            document.getElementById('username').value = rememberedUsername;
            if (rememberMeCheckbox) {
                rememberMeCheckbox.checked = true;
            }
        }
    }

    // Show message function
    function showMessage(message, type = 'success') {
        // Remove existing message if any
        const existingMsg = document.querySelector('.auth-message');
        if (existingMsg) existingMsg.remove();

        const messageEl = document.createElement('div');
        messageEl.className = `auth-message auth-message-${type}`;
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        loginForm.appendChild(messageEl);
        
        // Auto hide after 4 seconds
        setTimeout(() => {
            messageEl.classList.add('fade-out');
            setTimeout(() => messageEl.remove(), 300);
        }, 4000);
    }
});

// Quick login function for testing
function quickLogin(username, password) {
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
}

// Browse as guest function
function browseAsGuest() {
    window.location.href = 'dashboard.html';
}
