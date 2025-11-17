        // Navigation Functions
        function toggleMenu() {
            const menu = document.getElementById('mainMenu');
            menu.classList.toggle('active');
        }

        function showSection(sectionName) {
            // Hide all sections
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => section.classList.remove('active'));
            
            // Remove active class from all nav buttons
            const navBtns = document.querySelectorAll('.nav-btn');
            navBtns.forEach(btn => btn.classList.remove('active'));
            
            // Show selected section
            document.getElementById(sectionName + '-section').classList.add('active');
            
            // Add active class to clicked button
            event.target.classList.add('active');
        }

        // Products Functions
        function filterProducts() {
            const searchTerm = document.getElementById('searchProducts').value.toLowerCase();
            const categoryFilter = document.getElementById('categoryFilter').value;
            const sortFilter = document.getElementById('sortFilter').value;
            
            const productCards = document.querySelectorAll('.product-card');
            const noResultsMsg = document.getElementById('noProductsFound');
            let visibleCount = 0;
            
            // Convert NodeList to Array for sorting
            let productsArray = Array.from(productCards);
            
            // Filter products
            productsArray.forEach(card => {
                const title = card.querySelector('.product-title').textContent.toLowerCase();
                const description = card.querySelector('.product-description').textContent.toLowerCase();
                const category = card.getAttribute('data-category');
                
                const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
                const matchesCategory = !categoryFilter || category === categoryFilter;
                
                if (matchesSearch && matchesCategory) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Sort visible products
            if (sortFilter && visibleCount > 0) {
                const visibleProducts = productsArray.filter(card => card.style.display !== 'none');
                const container = document.getElementById('productsGrid');
                
                visibleProducts.sort((a, b) => {
                    switch (sortFilter) {
                        case 'name':
                            return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'), 'ar');
                        case 'date':
                            return new Date(b.getAttribute('data-date')) - new Date(a.getAttribute('data-date'));
                        default:
                            return 0;
                    }
                });
                
                // Re-append sorted products
                visibleProducts.forEach(product => container.appendChild(product));
            }
            
            // Show/hide no results message
            if (visibleCount === 0) {
                noResultsMsg.classList.remove('hidden');
            } else {
                noResultsMsg.classList.add('hidden');
            }
        }
        
        function clearFilters() {
            document.getElementById('searchProducts').value = '';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('sortFilter').value = 'date';
            filterProducts();
        }
        
        function viewProduct(productId) {
            alert(`عرض تفاصيل المنتج رقم ${productId} (محاكاة)`);
        }
        
        function editProduct(productId) {
            alert(`تعديل المنتج رقم ${productId} (محاكاة)`);
        }
        
        function deleteProduct(productId) {
            if (confirm('هل تريد حذف هذا المنتج؟')) {
                const productCard = document.querySelector(`[onclick*="viewProduct(${productId})"]`).closest('.product-card');
                productCard.remove();
                alert('تم حذف المنتج بنجاح!');
                filterProducts(); // Refresh the view
            }
        }
        
        function shareProduct(productId, platform) {
            const productCard = document.querySelector(`[onclick*="viewProduct(${productId})"]`).closest('.product-card');
            const productName = productCard.querySelector('.product-title').textContent;
            const productDesc = productCard.querySelector('.product-description').textContent;
            const productUrl = `${window.location.origin}/product.html?id=${productId}`;
            const message = `${productName} - ${productDesc.substring(0, 100)}...`;
            
            let shareUrl = '';
            
            switch(platform) {
                case 'whatsapp':
                    shareUrl = `https://wa.me/?text=${encodeURIComponent(message + '\n' + productUrl)}`;
                    break;
                case 'telegram':
                    shareUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(message)}`;
                    break;
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(productUrl)}`;
                    break;
            }
            
            if (shareUrl) {
                window.open(shareUrl, '_blank');
            }
        }
        
        function copyProductLink(productId) {
            const productUrl = `${window.location.origin}/product.html?id=${productId}`;
            navigator.clipboard.writeText(productUrl).then(() => {
                alert('تم نسخ رابط المنتج!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = productUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('تم نسخ رابط المنتج!');
            });
        }

        // Tasks Functions
        function addTodoItem() {
            const todoInput = document.querySelector('.todo-input');
            const todoText = todoInput.value.trim();
            
            if (todoText) {
                const todoList = document.getElementById('todoList');
                const newTodo = document.createElement('li');
                newTodo.className = 'todo-item';
                newTodo.innerHTML = `
                    <span>${todoText}</span>
                    <button class="remove-todo-btn" onclick="removeTodoItem(this)"><i class="fa-solid fa-check"></i></button>
                `;
                newTodo.onclick = function() { toggleTodo(this); };
                
                todoList.appendChild(newTodo);
                todoInput.value = '';
            }
        }

        function toggleTodo(element) {
            if (event.target.classList.contains('remove-todo-btn')) {
                return; // Don't toggle if clicking remove button
            }
            element.classList.toggle('done');
        }

        function removeTodoItem(button) {
            button.parentElement.remove();
        }

        function startAdminTask(button) {
            button.textContent = 'تم البدء';
            button.style.background = 'var(--extra2-color)';
            button.disabled = true;
            
            // Simulate notifying admin
            alert('تم إشعار الإدارة ببدء المهمة');
        }

        // Notes Functions
        function addNewNote() {
            const title = prompt('عنوان الملاحظة:');
            const content = prompt('محتوى الملاحظة:');
            const category = prompt('فئة الملاحظة (أعمال، اجتماعات، تسويق، شخصي، أفكار، مالية):', 'أعمال');
            
            if (title && content) {
                const notesGrid = document.getElementById('notesGrid');
                const newNote = document.createElement('div');
                const noteId = Date.now();
                const categoryClass = getCategoryClass(category);
                
                newNote.className = 'note-card';
                newNote.setAttribute('data-category', category);
                newNote.onclick = function() { editNote(noteId); };
                newNote.innerHTML = `
                    <div class="note-header">
                        <div class="note-title">${title}</div>
                        <div class="note-category ${categoryClass}">${category}</div>
                    </div>
                    <div class="note-content">${content}</div>
                    <div class="note-footer">
                        <div class="note-date">${new Date().toLocaleDateString('ar-SA')}</div>
                        <button class="delete-note-btn" onclick="deleteNote(${noteId}, event)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                notesGrid.appendChild(newNote);
            }
        }

        function getCategoryClass(category) {
            const categoryMap = {
                'أعمال': 'business',
                'اجتماعات': 'meeting',
                'تسويق': 'marketing',
                'شخصي': 'personal',
                'أفكار': 'ideas',
                'مالية': 'finance'
            };
            return categoryMap[category] || 'business';
        }

        function editNote(noteId) {
            if (event.target.classList.contains('delete-note-btn') || event.target.closest('.delete-note-btn')) {
                return; // Don't edit if clicking delete button
            }
            
            const noteCard = event.target.closest('.note-card');
            const title = noteCard.querySelector('.note-title').textContent;
            const content = noteCard.querySelector('.note-content').textContent;
            const currentCategory = noteCard.getAttribute('data-category');
            
            const newTitle = prompt('تعديل العنوان:', title);
            const newContent = prompt('تعديل المحتوى:', content);
            const newCategory = prompt('تعديل الفئة:', currentCategory);
            
            if (newTitle && newContent) {
                noteCard.querySelector('.note-title').textContent = newTitle;
                noteCard.querySelector('.note-content').textContent = newContent;
                noteCard.querySelector('.note-date').textContent = new Date().toLocaleDateString('ar-SA');
                
                if (newCategory && newCategory !== currentCategory) {
                    noteCard.setAttribute('data-category', newCategory);
                    const categoryElement = noteCard.querySelector('.note-category');
                    categoryElement.textContent = newCategory;
                    categoryElement.className = `note-category ${getCategoryClass(newCategory)}`;
                }
            }
        }

        function deleteNote(noteId, event) {
            event.stopPropagation(); // Prevent triggering edit
            if (confirm('هل تريد حذف هذه الملاحظة؟')) {
                event.target.closest('.note-card').remove();
            }
        }

        // Links Functions
        function addNewLink() {
            const name = prompt('اسم الرابط:');
            const url = prompt('عنوان الرابط (URL):');
            const description = prompt('وصف الرابط (اختياري):');
            const category = prompt('فئة الرابط (تعليمي، مالي، أعمال، تقني، تسويق):', 'أعمال');
            
            if (name && url) {
                const linksList = document.getElementById('linksList');
                const newLink = document.createElement('div');
                const categoryClass = getLinkCategoryClass(category);
                
                newLink.className = 'link-item';
                newLink.setAttribute('data-category', category);
                newLink.innerHTML = `
                    <div class="link-info">
                        <div class="link-header">
                            <h4>${name}</h4>
                            <span class="link-category ${categoryClass}">${category}</span>
                        </div>
                        <a href="${url}" class="link-url" target="_blank">
                            <i class="fas fa-external-link-alt"></i>
                            ${url}
                        </a>
                        ${description ? `<div class="link-description">${description}</div>` : ''}
                    </div>
                    <div class="link-actions">
                        <button class="copy-link-btn" onclick="copyLink('${url}')">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="delete-link-btn" onclick="deleteLink(this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                linksList.appendChild(newLink);
            }
        }

        function getLinkCategoryClass(category) {
            const categoryMap = {
                'تعليمي': 'educational',
                'مالي': 'financial',
                'أعمال': 'business',
                'تقني': 'technical',
                'تسويق': 'marketing'
            };
            return categoryMap[category] || 'business';
        }

        function copyLink(url) {
            navigator.clipboard.writeText(url).then(() => {
                alert('تم نسخ الرابط!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('تم نسخ الرابط!');
            });
        }

        function deleteLink(button) {
            if (confirm('هل تريد حذف هذا الرابط؟')) {
                button.closest('.link-item').remove();
            }
        }

        // Account Functions
        function uploadAvatar() {
            // Simulate file upload
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        // Update avatar images
                        document.querySelector('.current-avatar').src = e.target.result;
                        document.querySelector('.profile-avatar').src = e.target.result;
                        alert('تم تحديث الصورة الشخصية بنجاح!');
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        }

        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            const button = input.nextElementSibling;
            const icon = button.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        }

        function checkPasswordStrength(password) {
            const strengthBar = document.querySelector('.strength-fill');
            const strengthText = document.querySelector('.strength-text');
            
            let strength = 0;
            let strengthLabel = 'ضعيفة';
            
            // Check password criteria
            if (password.length >= 8) strength++;
            if (/[a-z]/.test(password)) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            // Update strength display
            strengthBar.className = 'strength-fill';
            
            switch (strength) {
                case 0:
                case 1:
                    strengthBar.classList.add('weak');
                    strengthLabel = 'ضعيفة';
                    break;
                case 2:
                    strengthBar.classList.add('medium');
                    strengthLabel = 'متوسطة';
                    break;
                case 3:
                case 4:
                    strengthBar.classList.add('strong');
                    strengthLabel = 'قوية';
                    break;
                case 5:
                    strengthBar.classList.add('very-strong');
                    strengthLabel = 'قوية جداً';
                    break;
            }
            
            strengthText.textContent = `قوة كلمة المرور: ${strengthLabel}`;
        }

        function validatePasswordMatch() {
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (newPassword && confirmPassword && newPassword !== confirmPassword) {
                alert('كلمات المرور غير متطابقة');
                return false;
            }
            return true;
        }

        function saveAccountInfo(event) {
            event.preventDefault();
            
            // Validate required fields
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            
            if (!username || !email) {
                alert('يرجى ملء الحقول المطلوبة');
                return;
            }
            
            // Validate password if changing
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            
            if (newPassword) {
                if (!currentPassword) {
                    alert('يرجى إدخال كلمة المرور الحالية');
                    return;
                }
                
                if (!validatePasswordMatch()) {
                    return;
                }
            }
            
            // Simulate saving account info
            setTimeout(() => {
                alert('تم حفظ معلومات الحساب بنجاح!');
                
                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
                
                // Reset password strength indicator
                const strengthBar = document.querySelector('.strength-fill');
                const strengthText = document.querySelector('.strength-text');
                strengthBar.className = 'strength-fill weak';
                strengthText.textContent = 'قوة كلمة المرور: ضعيفة';
            }, 500);
        }

        // Enhanced profile functionality with Supabase
        let currentUser = null;
        let userStats = null;

        // Initialize page
        document.addEventListener('DOMContentLoaded', async function() {
            // Check authentication
            if (!window.authService.isLoggedIn()) {
                window.location.href = 'index.html';
                return;
            }

            // Initialize profile
            await initializeProfile();
            
            // Load user data
            await loadUserData();
            
            // Load user products
            await loadUserProducts();
            
            // Load user suppliers
            await loadUserSuppliers();
            
            // Load user tasks
            await loadUserTasks();
            
            // Load user notes
            await loadUserNotes();
            
            // Add event listeners for filters
            document.getElementById('searchProducts').addEventListener('input', filterProducts);
            document.getElementById('categoryFilter').addEventListener('change', filterProducts);
            document.getElementById('sortFilter').addEventListener('change', filterProducts);
            
            // Add event listener for todo input
            document.querySelector('.todo-input').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addTodoItem();
                }
            });
            
            // Add event listeners for admin task buttons
            document.querySelectorAll('.start-task-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    startAdminTask(this);
                });
            });
        });

        async function initializeProfile() {
            // Set active section
            showSection('products');
            
            // Request notification permission for chat
            await window.chatService.requestNotificationPermission();
        }

        async function loadUserData() {
            try {
                currentUser = window.authService.getCurrentUser();
                
                // Load user statistics
                const statsResult = await window.tasksService.getUserStats();
                if (statsResult.success) {
                    userStats = statsResult.stats;
                    updateProfileStats(userStats);
                }
                
                // Update profile display
                updateProfileDisplay(currentUser);
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        }

        function updateProfileStats(stats) {
            // Update profile stats display
            const statsElements = {
                'total-products': stats.totalProducts,
                'total-suppliers': stats.totalSuppliers,
                'total-tasks': stats.totalTasks,
                'completed-tasks': stats.completedTasks,
                'total-notes': stats.totalNotes
            };

            Object.entries(statsElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
        }

        function updateProfileDisplay(userData) {
            // Update profile info
            const profileElements = {
                'profile-username': userData.username,
                'profile-full-name': userData.full_name,
                'profile-email': userData.email,
                'profile-country': userData.country,
                'profile-age': userData.age,
                'profile-residence': userData.residence,
                'profile-whatsapp': userData.whatsapp
            };

            Object.entries(profileElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element && value) {
                    element.textContent = value;
                }
            });
            
            // Update phone numbers
            if (userData.phone_numbers && userData.phone_numbers.length > 0) {
                const phoneNumbersList = document.getElementById('phone-numbers-list');
                if (phoneNumbersList) {
                    phoneNumbersList.innerHTML = '';
                    userData.phone_numbers.forEach(phone => {
                        const li = document.createElement('li');
                        li.textContent = phone;
                        phoneNumbersList.appendChild(li);
                    });
                }
            }
        }

        async function loadUserProducts() {
            try {
                const result = await window.productsService.getProducts({ user: currentUser.id });
                if (result.success) {
                    renderUserProducts(result.products);
                } else {
                    console.error('Error loading user products:', result.error);
                }
            } catch (error) {
                console.error('Error loading user products:', error);
            }
        }

        function renderUserProducts(products) {
            const productsList = document.getElementById('user-products-list');
            if (!productsList) return;
            
            productsList.innerHTML = '';
            
            products.forEach(product => {
                const productItem = document.createElement('div');
                productItem.className = 'product-item';
                productItem.innerHTML = `
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p>الفئة: ${product.categories?.name || 'غير محدد'}</p>
                        <span class="status ${product.status === 'active' ? 'active' : 'inactive'}">${product.status === 'active' ? 'نشط' : 'غير نشط'}</span>
                    </div>
                    <div class="product-actions">
                        <button onclick="editProduct('${product.id}')">تعديل</button>
                        <button onclick="deleteProduct('${product.id}')">حذف</button>
                    </div>
                `;
                productsList.appendChild(productItem);
            });
        }

        async function loadUserSuppliers() {
            try {
                const result = await window.suppliersService.getSuppliers({ user: currentUser.id });
                if (result.success) {
                    renderUserSuppliers(result.suppliers);
                } else {
                    console.error('Error loading user suppliers:', result.error);
                }
            } catch (error) {
                console.error('Error loading user suppliers:', error);
            }
        }

        function renderUserSuppliers(suppliers) {
            const suppliersList = document.getElementById('user-suppliers-list');
            if (!suppliersList) return;
            
            suppliersList.innerHTML = '';
            
            suppliers.forEach(supplier => {
                const supplierItem = document.createElement('div');
                supplierItem.className = 'supplier-item';
                supplierItem.innerHTML = `
                    <div class="supplier-info">
                        <h4>${supplier.name}</h4>
                        <p>البلد: ${supplier.country || 'غير محدد'}</p>
                        <p>المجال: ${supplier.industry || 'غير محدد'}</p>
                    </div>
                    <div class="supplier-actions">
                        <button onclick="editSupplier('${supplier.id}')">تعديل</button>
                        <button onclick="deleteSupplier('${supplier.id}')">حذف</button>
                    </div>
                `;
                suppliersList.appendChild(supplierItem);
            });
        }

        async function loadUserTasks() {
            try {
                const result = await window.tasksService.getTasks();
                if (result.success) {
                    renderUserTasks(result.tasks);
                } else {
                    console.error('Error loading user tasks:', result.error);
                }
            } catch (error) {
                console.error('Error loading user tasks:', error);
            }
        }

        function renderUserTasks(tasks) {
            const tasksList = document.getElementById('user-tasks-list');
            if (!tasksList) return;
            
            tasksList.innerHTML = '';
            
            tasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                taskItem.innerHTML = `
                    <div class="task-info">
                        <h4>${task.title}</h4>
                        <p>${task.description || 'لا يوجد وصف'}</p>
                        <div class="task-meta">
                            <span class="status ${task.status === 'completed' ? 'completed' : 'pending'}">${task.status === 'completed' ? 'مكتملة' : 'قيد التنفيذ'}</span>
                            <span class="priority ${task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low'}">${task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button onclick="editTask('${task.id}')">تعديل</button>
                        <button onclick="deleteTask('${task.id}')">حذف</button>
                    </div>
                `;
                tasksList.appendChild(taskItem);
            });
        }

        async function loadUserNotes() {
            try {
                const result = await window.tasksService.getNotes();
                if (result.success) {
                    renderUserNotes(result.notes);
                } else {
                    console.error('Error loading user notes:', result.error);
                }
            } catch (error) {
                console.error('Error loading user notes:', error);
            }
        }

        function renderUserNotes(notes) {
            const notesList = document.getElementById('user-notes-list');
            if (!notesList) return;
            
            notesList.innerHTML = '';
            
            notes.forEach(note => {
                const noteItem = document.createElement('div');
                noteItem.className = 'note-item';
                noteItem.innerHTML = `
                    <div class="note-info">
                        <h4>${note.title}</h4>
                        <p>${note.content}</p>
                        <span class="category">${note.category || 'عام'}</span>
                    </div>
                    <div class="note-actions">
                        <button onclick="editNote('${note.id}')">تعديل</button>
                        <button onclick="deleteNote('${note.id}')">حذف</button>
                    </div>
                `;
                notesList.appendChild(noteItem);
            });
        }
