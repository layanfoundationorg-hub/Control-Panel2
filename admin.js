/**
 * Admin Dashboard Logic - Layan Platform
 */

// Global state
let currentUser = null;
let isMaster = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin Dashboard Loaded');
    
    // Check authentication
    checkAuth();
    
    // Wire logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('هل تريد تسجيل الخروج؟')) {
                localStorage.removeItem('layan_user');
                window.location.href = 'login.html';
            }
        });
    }

    // Initialize Dashboard
    updateDashboardStats();
});

function checkAuth() {
    const userData = localStorage.getItem('layan_user');
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = JSON.parse(userData);
    isMaster = currentUser.Role === 'master_admin';

    // Update top bar with real user name
    const userNameEl = document.getElementById('topbar-username');
    if (userNameEl) userNameEl.textContent = currentUser.Name || 'مستخدم';

    // Show 'add user' button only for master
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn && isMaster) {
        addUserBtn.classList.remove('hidden');
    }
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show target section
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
        target.classList.remove('hidden');
    }
    
    // Update sidebar UI
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('onclick').includes(sectionId)) {
            item.classList.add('active');
        }
    });
    
    // Update Title
    const titleMap = {
        'dashboard': 'الرئيسية',
        'projects': 'إدارة المشاريع',
        'initiatives': 'المبادرات',
        'news': 'إدارة الأخبار',
        'media': 'المركز الإعلامي',
        'users': 'إدارة المستخدمين',
        'stats': 'الإحصائيات'
    };
    document.getElementById('section-title').innerText = titleMap[sectionId] || 'لوحة التحكم';
    
    // Load section specific data
    loadSectionData(sectionId);
}

async function loadSectionData(sectionId) {
    console.log('Loading section:', sectionId);
    const tableIds = {
        'news': 'news-table',
        'projects': 'projects-table',
        'users': 'users-table'
    };
    
    const tableId = tableIds[sectionId];
    if (tableId) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center"><i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i><p class="mt-2 text-slate-500">جاري تحميل البيانات...</p></td></tr>`;
    }

    if (sectionId === 'news') {
        const news = await API.get('getNews');
        renderAdminTable('news-table', news, ['Title', 'Date', 'Category'], 'news', 'Title');
    } else if (sectionId === 'projects') {
        const projects = await API.get('getProjects');
        renderAdminTable('projects-table', projects, ['Title', 'Region', 'Beneficiaries'], 'projects', 'Title');
    } else if (sectionId === 'users') {
        // Get DOM elements here (after page load)
        const warning = document.getElementById('users-permission-warning');
        const addBtn = document.getElementById('add-user-btn');

        if (isMaster) {
            if (warning) warning.classList.add('hidden');
            if (addBtn) addBtn.classList.remove('hidden');
        } else {
            if (warning) warning.classList.remove('hidden');
            if (addBtn) addBtn.classList.add('hidden');
        }

        const users = await API.get('getUsers');
        
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) return;
        if (!users || !Array.isArray(users) || users.length === 0 || users.error) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 italic">لا توجد بيانات</td></tr>`;
        } else {
            tbody.innerHTML = users.map(item => `
                <tr>
                    <td class="p-4 text-slate-700">${item.Name || '-'}</td>
                    <td class="p-4 text-slate-700">${item.Email || '-'}</td>
                    <td class="p-4"><span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">${item.Role || 'مستخدم'}</span></td>
                    <td class="p-4 text-slate-700">${item.CreatedAt || '-'}</td>
                    <td class="p-4">
                        ${isMaster ? `
                        <div class="flex gap-2">
                            <button onclick="deleteItem('Users', '${item.Email}', 'Email')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="حذف المستخدم"><i class="fas fa-trash"></i></button>
                        </div>
                        ` : '<span class="text-xs text-slate-400">غير مصرح</span>'}
                    </td>
                </tr>
            `).join('');
        }
    } else if (sectionId === 'dashboard') {
        updateDashboardStats();
    }
}

function renderAdminTable(tableId, data, fields, sheetName, idField) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;
    
    if (!data || data.length === 0 || data.error) {
        tbody.innerHTML = `<tr><td colspan="${fields.length + 1}" class="p-8 text-center text-slate-400 italic">لا توجد بيانات متاحة</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            ${fields.map(f => `<td class="p-4 text-slate-700">${item[f] || '-'}</td>`).join('')}
            <td class="p-4">
                <div class="flex gap-2">
                    <button onclick="editItem('${sheetName}', '${item[idField]}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteItem('${sheetName}', '${item[idField]}', '${idField}')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function deleteItem(sheet, id, header) {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا العنصر؟')) return;
    
    const result = await API.post('deleteRow', { sheet, id, header });
    if (result.success) {
        alert('تم الحذف بنجاح');
        loadSectionData(sheet.toLowerCase());
    } else {
        alert('خطأ في الحذف: ' + result.error);
    }
}

function updateDashboardStats() {
    // Simulate fetching data
    setTimeout(() => {
        document.getElementById('dash-projects-count').innerText = '142';
        document.getElementById('dash-beneficiaries-count').innerText = '61,200';
    }, 500);
}

// Modal Logic
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const formFields = document.getElementById('form-fields');
const modalForm = document.getElementById('modal-form');
let currentModalType = '';

function openModal(type) {
    currentModalType = type;
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');
    
    let fieldsHtml = '';
    
    switch(type) {
        case 'news':
            modalTitle.innerText = 'إضافة خبر جديد';
            fieldsHtml = `
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">عنوان الخبر</label>
                    <input type="text" name="Title" required class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">المحتوى</label>
                    <textarea name="Content" rows="4" required class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">التصنيف</label>
                        <select name="Category" class="w-full p-3 border rounded-xl outline-none">
                            <option>إغاثة</option>
                            <option>تعليم</option>
                            <option>تنمية</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">الصورة</label>
                        <input type="file" name="ImageFile" accept="image/*" class="w-full p-2 border rounded-xl outline-none text-sm">
                    </div>
                </div>
            `;
            break;
        case 'projects':
            modalTitle.innerText = 'إضافة مشروع جديد';
            fieldsHtml = `
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">اسم المشروع</label>
                    <input type="text" name="Title" required class="w-full p-3 border rounded-xl outline-none">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">المنطقة</label>
                        <input type="text" name="Region" required class="w-full p-3 border rounded-xl outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-slate-700 mb-2">عدد المستفيدين</label>
                        <input type="number" name="Beneficiaries" class="w-full p-3 border rounded-xl outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">الوصف التفصيلي</label>
                    <textarea name="Description" rows="3" required class="w-full p-3 border rounded-xl outline-none"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">صورة المشروع</label>
                    <input type="file" name="ImageFile" accept="image/*" class="w-full p-2 border rounded-xl outline-none text-sm">
                </div>
            `;
            break;
        case 'initiatives':
            modalTitle.innerText = 'إضافة مبادرة جديدة';
            fieldsHtml = `
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">اسم المبادرة</label>
                    <input type="text" name="Title" required class="w-full p-3 border rounded-xl outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">الوصف</label>
                    <textarea name="Description" rows="3" required class="w-full p-3 border rounded-xl outline-none"></textarea>
                </div>
            `;
            break;
        case 'media':
            modalTitle.innerText = 'رفع وسائط جديدة';
            fieldsHtml = `
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">رابط الملف (جوجل درايف أو مباشر)</label>
                    <input type="text" name="URL" required class="w-full p-3 border rounded-xl outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">نوع الملف</label>
                    <select name="Type" class="w-full p-3 border rounded-xl outline-none">
                        <option>صورة</option>
                        <option>فيديو</option>
                        <option>PDF</option>
                    </select>
                </div>
            `;
            break;
        case 'users':
            modalTitle.innerText = 'إضافة مستخدم جديد';
            fieldsHtml = `
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">اسم المستخدم</label>
                    <input type="text" name="Name" required class="w-full p-3 border rounded-xl outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
                    <input type="email" name="Email" required class="w-full p-3 border rounded-xl outline-none text-left" dir="ltr">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
                    <input type="password" name="Password" required class="w-full p-3 border rounded-xl outline-none text-left" dir="ltr">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">الصلاحية</label>
                    <select name="Role" class="w-full p-3 border rounded-xl outline-none">
                        <option value="editor">محرر (نشر أخبار)</option>
                        <option value="admin">مدير (صلاحيات كاملة)</option>
                    </select>
                </div>
                <input type="hidden" name="CreatedAt" value="${new Date().toLocaleDateString('ar-EG')}">
            `;
            break;
    }
    
    formFields.innerHTML = fieldsHtml;
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('flex');
    modalForm.reset();
}

modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(modalForm);
    const data = {};
    formData.forEach((value, key) => {
        if (!(value instanceof File)) {
            data[key] = value;
        }
    });
    
    // Handle File Upload if exists
    const fileInput = modalForm.querySelector('input[type="file"]');
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        const base64 = await readFileAsBase64(file);
        data.FileData = base64;
        data.FileName = file.name;
        data.FileType = file.type;
    }
    
    // Add default fields
    data.Date = new Date().toLocaleDateString('ar-EG');
    data.Status = 'نشط';
    
    const submitBtn = modalForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    
    const actionMap = {
        'news': 'addNews',
        'projects': 'addProject',
        'initiatives': 'addInitiative',
        'media': 'addMedia',
        'users': 'addUser'
    };
    
    const result = await API.post(actionMap[currentModalType], data);
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
    
    if (result.success) {
        alert('تم الحفظ بنجاح!');
        closeModal();
        if (typeof loadSectionData === 'function') loadSectionData(currentModalType);
    } else {
        alert('خطأ في الحفظ: ' + (result.error || 'فشل الاتصال بالقاعدة'));
    }
});

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Sidebar toggle (Mobile)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('-translate-x-full');
}
