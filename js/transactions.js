if (!requireAuth()) {
}

let currentTransactions = [];
let editingId = null;
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', function() {
    const currentUser = getCurrentUser();
    console.log('مرحباً ' + currentUser);
    
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    if (userNameEl) userNameEl.textContent = currentUser || 'مستخدم';
    if (userAvatarEl) userAvatarEl.textContent = currentUser ? currentUser.charAt(0).toUpperCase() : 'م';
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                logout();
            }
        });
    }
    
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    const infoBtn = document.getElementById('infoBtn');
    const infoPopover = document.getElementById('infoPopover');
    const popoverClose = document.getElementById('popoverClose');
    
    const overlay = document.createElement('div');
    overlay.className = 'popover-overlay';
    overlay.id = 'popoverOverlay';
    document.body.appendChild(overlay);
    
    function openPopover() {
        infoPopover.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closePopover() {
        infoPopover.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (infoBtn) {
        infoBtn.addEventListener('click', openPopover);
    }
    
    if (popoverClose) {
        popoverClose.addEventListener('click', closePopover);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closePopover);
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePopover();
        }
    });
    
    const incomeRadio = document.getElementById('incomeRadio');
    const expenseRadio = document.getElementById('expenseRadio');
    const categoryGroup = document.getElementById('categoryGroup');
    
    if (incomeRadio && expenseRadio && categoryGroup) {
        incomeRadio.addEventListener('change', function() {
            if (this.checked) {
                categoryGroup.style.display = 'none';
                document.getElementById('category').required = false;
            }
        });
        
        expenseRadio.addEventListener('change', function() {
            if (this.checked) {
                categoryGroup.style.display = 'block';
                document.getElementById('category').required = true;
            }
        });
        
        if (expenseRadio.checked) {
            categoryGroup.style.display = 'block';
            document.getElementById('category').required = true;
        }
    }
    
    renderTransactions();
    
    document.getElementById('addBtn').addEventListener('click', function() {
        openModal('add');
    });
    
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('deleteModalCloseBtn').addEventListener('click', closeDeleteModal);
    
    document.getElementById('transactionModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    document.getElementById('deleteModal').addEventListener('click', function(e) {
        if (e.target === this) closeDeleteModal();
    });
    
    document.getElementById('transactionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const type = document.querySelector('input[name="type"]:checked');
        const amountInput = document.getElementById('amount');
        const category = document.getElementById('category');
        const description = document.getElementById('description');
        const date = document.getElementById('date');
        
        const amountValue = parseFloat(amountInput.value);
        
        if (isNaN(amountValue) || amountValue <= 0) {
            showToast('⚠️ المبلغ غير صحيح', 'error');
            return;
        }
        
        const data = {
            type: type ? type.value : 'expense',
            amount: amountValue,
            category: category ? category.value : 'other',
            description: description ? description.value.trim() : '',
            date: date ? date.value : getTodayDate()
        };
        
        if (data.type === 'income') {
            data.category = 'income';
        }
        
        if (!data.date) {
            showToast('⚠️ التاريخ مطلوب', 'error');
            return;
        }
        
        if (data.type === 'expense' && !data.category) {
            showToast('⚠️ التصنيف مطلوب للمصروفات', 'error');
            return;
        }
        
        if (data.type === 'income' && !data.description) {
            showToast('⚠️ الوصف مطلوب للدخل', 'error');
            return;
        }
        
        if (data.type === 'expense' && data.amount > 1000) {
            console.log('🔔 مصروف كبير: ' + data.amount);
            
            const confirmBig = confirm(
                '⚠️ تنبيه: أنت تقوم بإضافة مصروف كبير (' + formatCurrency(data.amount) + ')\n' +
                'التصنيف: ' + getCategoryLabel(data.category) + '\n' +
                'الوصف: ' + (data.description || 'بدون وصف') + '\n\n' +
                'هل أنت متأكد من هذه العملية؟'
            );
            
            if (!confirmBig) {
                showToast('❌ تم إلغاء العملية', 'warning');
                return;
            }
        }
        
        console.log('📝 ' + (editingId ? 'تعديل' : 'إضافة') + ' العملية:', data);
        
        let result;
        if (editingId) {
            result = updateTransaction(editingId, data);
        } else {
            result = addTransaction(data);
        }
        
        if (result) {
            showToast(editingId ? '✅ تم التعديل بنجاح' : '✅ تمت الإضافة بنجاح');
            closeModal();
            renderTransactions();
        } else {
            showToast('❌ حدث خطأ', 'error');
        }
    });
    
    document.getElementById('confirmDelete').addEventListener('click', function() {
        if (deleteTargetId) {
            deleteTransaction(deleteTargetId);
            showToast('تم الحذف بنجاح');
            closeDeleteModal();
            renderTransactions();
        }
    });
    
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    
    document.getElementById('searchInput').addEventListener('input', renderTransactions);
    document.getElementById('categoryFilter').addEventListener('change', renderTransactions);
    document.getElementById('typeFilter').addEventListener('change', renderTransactions);
    
    document.getElementById('dateFilter').addEventListener('change', function() {
        const custom = document.getElementById('customDateRange');
        custom.style.display = this.value === 'custom' ? 'flex' : 'none';
        renderTransactions();
    });
    
    document.getElementById('applyDateRange').addEventListener('click', renderTransactions);
    document.getElementById('startDate').addEventListener('change', renderTransactions);
    document.getElementById('endDate').addEventListener('change', renderTransactions);
    
    document.getElementById('themeToggle').addEventListener('click', function() {
        const current = getTheme();
        const newTheme = current === 'light' ? 'dark' : 'light';
        saveTheme(newTheme);
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    });
});

function renderTransactions() {
    const filters = getFilters();
    currentTransactions = getTransactions();
    const filtered = filterTransactions(currentTransactions, filters);
    
    const container = document.getElementById('transactionsList');
    if (!container) return;
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">' +
            '<p>لا توجد عمليات</p>' +
            '<p class="hint">' + (currentTransactions.length === 0 ? 'ابدأ بإضافة أول عملية' : 'لا توجد عمليات تطابق الفلترة') + '</p>' +
        '</div>';
    } else {
        container.innerHTML = filtered.map(function(t) {
            const icon = t.type === 'income' ? 'fa-wallet' : getCategoryIcon(t.category);
            const label = t.type === 'income' ? 'دخل' : getCategoryLabel(t.category);
            const arrowIcon = t.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down';
            
            return '<div class="transaction-item-full" data-id="' + t.id + '">' +
                '<div class="transaction-icon ' + t.type + '">' +
                    '<i class="fas ' + arrowIcon + '"></i>' +
                '</div>' +
                '<div class="transaction-info">' +
                    '<div class="title">' + (t.description || label) + '</div>' +
                    '<div class="meta">' +
                        '<span><i class="fas ' + icon + '"></i> ' + label + '</span>' +
                        '<span>' + formatDate(t.date) + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="transaction-amount ' + t.type + '">' +
                    (t.type === 'income' ? '+' : '-') + ' ' + formatCurrency(t.amount) +
                '</div>' +
                '<div class="transaction-actions">' +
                    '<button class="edit-btn" data-id="' + t.id + '"><i class="fas fa-edit"></i></button>' +
                    '<button class="delete-btn" data-id="' + t.id + '"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</div>';
        }).join('');
    }
    
    const total = filtered.reduce(function(sum, t) {
        if (t.type === 'income') {
            return sum + t.amount;
        } else {
            return sum - t.amount;
        }
    }, 0);
    
    const totalIncome = filtered.filter(function(t) { return t.type === 'income'; })
        .reduce(function(sum, t) { return sum + t.amount; }, 0);
    const totalExpenses = filtered.filter(function(t) { return t.type === 'expense'; })
        .reduce(function(sum, t) { return sum + t.amount; }, 0);
    
    document.getElementById('transactionCount').textContent = filtered.length + ' عملية';
    
    if (total >= 0) {
        document.getElementById('filteredTotal').textContent = 'صافي الرصيد: +' + formatCurrency(total);
    } else {
        document.getElementById('filteredTotal').textContent = 'صافي الرصيد: ' + formatCurrency(total);
    }
    
    const detailsEl = document.getElementById('filteredDetails');
    if (detailsEl) {
        detailsEl.textContent = 'دخل: ' + formatCurrency(totalIncome) + ' | مصروفات: ' + formatCurrency(totalExpenses);
    }
    
    document.querySelectorAll('.edit-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const transaction = currentTransactions.find(function(t) { return t.id === id; });
            if (transaction) openModal('edit', transaction);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const transaction = currentTransactions.find(function(t) { return t.id === id; });
            if (transaction) openDeleteModal(transaction);
        });
    });
}

function getFilters() {
    return {
        search: document.getElementById('searchInput').value,
        category: document.getElementById('categoryFilter').value,
        type: document.getElementById('typeFilter').value,
        dateRange: document.getElementById('dateFilter').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value
    };
}

function openModal(mode, transaction) {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const form = document.getElementById('transactionForm');
    if (form) form.reset();
    
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = getTodayDate();
    
    const expenseRadio = document.querySelector('input[name="type"][value="expense"]');
    const categoryGroup = document.getElementById('categoryGroup');
    
    if (mode === 'edit' && transaction) {
        editingId = transaction.id;
        document.getElementById('modalTitle').textContent = 'تعديل العملية';
        document.getElementById('submitButtonText').textContent = 'حفظ التعديلات';
        
        document.querySelector('input[name="type"][value="' + transaction.type + '"]').checked = true;
        document.getElementById('amount').value = transaction.amount;
        
        if (transaction.type === 'income') {
            if (categoryGroup) categoryGroup.style.display = 'none';
            document.getElementById('category').required = false;
        } else {
            const categoryOptions = document.getElementById('category').options;
            let found = false;
            for (let i = 0; i < categoryOptions.length; i++) {
                if (categoryOptions[i].value === transaction.category) {
                    categoryOptions[i].selected = true;
                    found = true;
                    break;
                }
            }
            if (!found) {
                document.getElementById('category').value = 'other';
            }
            
            if (categoryGroup) categoryGroup.style.display = 'block';
            document.getElementById('category').required = true;
        }
        
        document.getElementById('description').value = transaction.description || '';
        document.getElementById('date').value = transaction.date;
    } else {
        editingId = null;
        document.getElementById('modalTitle').textContent = 'إضافة عملية جديدة';
        document.getElementById('submitButtonText').textContent = 'إضافة';
        
        if (expenseRadio) expenseRadio.checked = true;
        if (categoryGroup) categoryGroup.style.display = 'block';
        document.getElementById('category').required = true;
    }
}

function closeModal() {
    document.getElementById('transactionModal').classList.remove('active');
    document.body.style.overflow = '';
    editingId = null;
}

function openDeleteModal(transaction) {
    deleteTargetId = transaction.id;
    const label = transaction.type === 'income' ? 'دخل' : (transaction.description || transaction.category);
    document.getElementById('deleteDetails').textContent = label + ' - ' + formatCurrency(transaction.amount);
    document.getElementById('deleteModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    document.body.style.overflow = '';
    deleteTargetId = null;
}