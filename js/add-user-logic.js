// Add User Logic - Admin Panel
document.addEventListener('DOMContentLoaded', async function() {
    // Show modal on page load
    document.getElementById('registerModal').style.display = 'block';
    
    // Check if we're in edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const editUserId = urlParams.get('edit');
    
    if (editUserId) {
        // We're editing an existing user
        await loadUserForEdit(editUserId);
        // Change modal title and button text
        const modalTitle = document.querySelector('.register-modal-content h2');
        if (modalTitle) modalTitle.textContent = 'تعديل بيانات المستخدم';
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'حفظ التعديلات';
    }

    // Registration form handling (table-based, no Supabase Auth)
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('userpassword').value;
        const role = document.getElementById('userRole').value;
        const country = document.getElementById('registerCountry').value.trim();
        const age = document.getElementById('registerAge').value;
        const residence = document.getElementById('registerResidence').value.trim();
        const whatsapp = document.getElementById('registerWhatsapp').value.trim();
        
        // Validate required fields
        if (!name || !email || !username || !password || !role) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        
        // Show loading
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = editUserId ? 'جاري حفظ التعديلات...' : 'جاري إنشاء الحساب...';
        submitBtn.disabled = true;
        
        try {
            if (editUserId) {
                // Update existing user
                const { data: updated, error: updateErr } = await supabaseClient
                    .from('users')
                    .update({ 
                        username: username,
                        email: email,
                        full_name: name,
                        country: country || null,
                        age: parseInt(age) || null,
                        address: residence || null, // Note: using 'address' field
                        whatsapp: whatsapp || null,
                        role: role,
                        password: password,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editUserId)
                    .select('id')
                    .single();

                if (updateErr) throw new Error(updateErr.message);

                alert(`✅ تم تحديث بيانات المستخدم بنجاح!\n\n👤 الاسم: ${name}\n📧 البريد: ${email}\n🔑 اسم المستخدم: ${username}\n👔 الدور: ${role === 'admin' ? 'مدير' : 'عضو'}`);
            } else {
                // Ensure username/email uniqueness (separate queries for robustness)
                const [{ data: u1, error: e1 }, { data: u2, error: e2 }] = await Promise.all([
                    supabaseClient.from('users').select('id').eq('username', username).limit(1),
                    supabaseClient.from('users').select('id').eq('email', email).limit(1)
                ]);
                if (e1) throw new Error(e1.message);
                if (e2) throw new Error(e2.message);
                const existing = ([]).concat(u1 || [], u2 || []);
                if (existing.length > 0) throw new Error('اسم المستخدم أو البريد مستخدم بالفعل');

                // Insert user directly into users table (simple auth)
                const { data: created, error: insertErr } = await supabaseClient
                    .from('users')
                    .insert([{ 
                        username: username,
                        email: email,
                        full_name: name,
                        country: country || null,
                        age: parseInt(age) || null,
                        address: residence || null, // Note: using 'address' field
                        whatsapp: whatsapp || null,
                        role: role,
                        password: password,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select('id')
                    .single();

                if (insertErr) throw new Error(insertErr.message);

                alert(`✅ تم إنشاء الحساب بنجاح!\n\n👤 الاسم: ${name}\n📧 البريد: ${email}\n🔑 اسم المستخدم: ${username}\n👔 الدور: ${role === 'admin' ? 'مدير' : 'عضو'}\n\nيمكن للمستخدم الآن تسجيل الدخول.`);
            }
            
            // Redirect to admin page
            window.location.href = 'admin.html';
        } catch (error) {
            console.error('Error creating/updating user:', error);
            alert(`❌ ${editUserId ? 'فشل في تحديث البيانات' : 'فشل في إنشاء الحساب'}:\n${error.message}`);
        } finally {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});

// Load user data for editing
async function loadUserForEdit(userId) {
    try {
        const { data: user, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        // Wait a bit to ensure DOM is fully loaded
        setTimeout(() => {
            // Fill form fields with existing user data
            const nameField = document.getElementById('registerName');
            const emailField = document.getElementById('registerEmail');
            const usernameField = document.getElementById('username');
            const passwordField = document.getElementById('userpassword');
            const roleField = document.getElementById('userRole');
            const countryField = document.getElementById('registerCountry');
            const ageField = document.getElementById('registerAge');
            const residenceField = document.getElementById('registerResidence');
            const whatsappField = document.getElementById('registerWhatsapp');
            
            if (nameField) nameField.value = user.full_name || '';
            if (emailField) emailField.value = user.email || '';
            if (usernameField) usernameField.value = user.username || '';
            if (passwordField) {
                passwordField.value = user.password || '';
                // Make sure the password is visible in edit mode
                passwordField.type = 'text';
                console.log('Password field set to:', passwordField.value);
            }
            if (roleField) roleField.value = user.role || 'member';
            if (countryField) countryField.value = user.country || '';
            if (ageField) ageField.value = user.age || '';
            if (residenceField) residenceField.value = user.address || '';
            if (whatsappField) whatsappField.value = user.whatsapp || '';
            
            console.log('User data loaded successfully for editing:', user);
        }, 100);
        
    } catch (error) {
        console.error('Error loading user for edit:', error);
        alert('فشل في تحميل بيانات المستخدم: ' + error.message);
    }
}

function closeRegisterModal() {
    window.location.href = 'admin.html';
}
