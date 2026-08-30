if (!requireAuth()) {
}

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
    
    renderDashboard();
    renderSavingGoal();
    
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', openModal);
    }
    
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
    
    const form = document.getElementById('transactionForm');
    if (form) {
        form.addEventListener('submit', function(e) {
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
            
            console.log('📝 إضافة العملية:', data);
            const result = addTransaction(data);
            
            if (result) {
                showToast('✅ تمت الإضافة بنجاح');
                closeModal();
                renderDashboard();
                renderSavingGoal();
            } else {
                showToast('❌ حدث خطأ أثناء الإضافة', 'error');
            }
        });
    }
    
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', function() {
            const current = getTheme();
            const newTheme = current === 'light' ? 'dark' : 'light';
            saveTheme(newTheme);
            const icon = document.querySelector('#themeToggle i');
            if (icon) {
                icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
            renderDashboard();
            renderSavingGoal();
        });
    }
    
    document.getElementById('setSavingGoalBtn').addEventListener('click', function() {
        const input = document.getElementById('savingGoalInput');
        const target = parseFloat(input.value);
        
        if (!target || target <= 0) {
            showToast('الرجاء إدخال مبلغ صحيح', 'error');
            return;
        }
        
        saveSavingGoal(target);
        renderSavingGoal();
        showToast('✅ تم تحديد هدف التحويش');
        input.value = '';
    });
    
    document.getElementById('savingGoalInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('setSavingGoalBtn').click();
        }
    });
});

function renderDashboard() {
    const allTransactions = getTransactions();
    const budget = getBudget();
    const now = new Date();
    
    if (allTransactions.length === 0) {
        document.getElementById('balance').textContent = '0.00 ج.م';
        document.getElementById('totalIncome').textContent = '0.00 ج.م';
        document.getElementById('totalExpenses').textContent = '0.00 ج.م';
        document.getElementById('monthlyBudget').textContent = formatCurrency(budget.amount);
        
        const progress = document.getElementById('budgetProgress');
        const statusEl = document.getElementById('budgetStatus');
        if (progress) {
            progress.style.width = '0%';
            progress.className = '';
        }
        if (statusEl) {
            statusEl.textContent = '✅ متبقي: ' + formatCurrency(budget.amount);
        }
        
        document.getElementById('categoryOverview').innerHTML = '<p class="empty">لا توجد مصروفات</p>';
        document.getElementById('recentTransactions').innerHTML = '<p class="empty">لا توجد عمليات</p>';
        renderSavingGoal();
        return;
    }
    
    const monthTransactions = getTransactionsByMonth(now.getFullYear(), now.getMonth());
    const stats = calculateStats(monthTransactions);
    const allStats = calculateStats(allTransactions);
    
    document.getElementById('balance').textContent = formatCurrency(allStats.balance);
    document.getElementById('totalIncome').textContent = formatCurrency(stats.income);
    document.getElementById('totalExpenses').textContent = formatCurrency(stats.expenses);
    document.getElementById('monthlyBudget').textContent = formatCurrency(budget.amount);
    
    const progress = document.getElementById('budgetProgress');
    const statusEl = document.getElementById('budgetStatus');
    const percentage = budget.amount > 0 ? (stats.expenses / budget.amount) * 100 : 0;
    
    if (progress) {
        progress.style.width = Math.min(percentage, 100) + '%';
        progress.className = '';
        if (percentage >= 100) {
            progress.classList.add('danger');
            statusEl.textContent = '⚠️ تم تجاوز الميزانية!';
        } else if (percentage >= 80) {
            progress.classList.add('warning');
            statusEl.textContent = '⚠️ تنبيه: متبقي ' + formatCurrency(budget.amount - stats.expenses);
        } else {
            statusEl.textContent = '✅ متبقي: ' + formatCurrency(budget.amount - stats.expenses);
        }
    }
    
    const expenseTransactions = allTransactions.filter(function(t) { return t.type === 'expense'; });
    const expenseStats = calculateStats(expenseTransactions);
    renderCategories(expenseStats.spending);
    renderRecentTransactions(allTransactions);
    renderSavingGoal();
}

function renderCategories(spending) {
    const container = document.getElementById('categoryOverview');
    if (!container) return;
    
    const entries = Object.entries(spending);
    if (entries.length === 0) {
        container.innerHTML = '<p class="empty">لا توجد مصروفات</p>';
        return;
    }
    
    const total = entries.reduce(function(sum, item) { return sum + item[1]; }, 0);
    const sorted = entries.sort(function(a, b) { return b[1] - a[1]; });
    
    container.innerHTML = sorted.map(function(item) {
        const percentage = total > 0 ? (item[1] / total * 100).toFixed(1) : 0;
        return '<div class="category-item">' +
            '<span><i class="fas ' + getCategoryIcon(item[0]) + '"></i> ' + getCategoryLabel(item[0]) + '</span>' +
            '<span>' + formatCurrency(item[1]) + ' (' + percentage + '%)</span>' +
        '</div>';
    }).join('');
}

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="empty">لا توجد عمليات</p>';
        return;
    }
    
    const recent = transactions
        .sort(function(a, b) { return new Date(b.date) - new Date(a.date); })
        .slice(0, 5);
    
    container.innerHTML = recent.map(function(t) {
        const icon = t.type === 'income' ? 'fa-wallet' : getCategoryIcon(t.category);
        const label = t.type === 'income' ? 'دخل' : getCategoryLabel(t.category);
        
        return '<div class="transaction-item">' +
            '<div>' +
                '<strong>' + (t.description || label) + '</strong>' +
                '<small>' + formatDate(t.date) + '</small>' +
            '</div>' +
            '<span class="' + (t.type === 'income' ? 'income' : 'expense') + '">' +
                (t.type === 'income' ? '+' : '-') + ' ' + formatCurrency(t.amount) +
            '</span>' +
        '</div>';
    }).join('');
}

function openModal() {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const form = document.getElementById('transactionForm');
    if (form) form.reset();
    
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.value = getTodayDate();
    
    const expenseRadio = document.querySelector('input[name="type"][value="expense"]');
    if (expenseRadio) expenseRadio.checked = true;
    
    const categoryGroup = document.getElementById('categoryGroup');
    if (categoryGroup) categoryGroup.style.display = 'block';
    
    document.getElementById('modalTitle').textContent = 'إضافة عملية جديدة';
    document.getElementById('submitButtonText').textContent = 'إضافة';
}

function closeModal() {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function renderSavingGoal() {
    const progress = getSavingGoalProgress();
    const goal = getSavingGoal();
    
    const displayEl = document.getElementById('savingGoalDisplay');
    if (displayEl) {
        displayEl.textContent = formatCurrency(goal.target || 0);
    }
    
    const progressEl = document.getElementById('savingProgress');
    if (progressEl) {
        if (goal.target > 0) {
            const pct = Math.min(progress.percentage, 100);
            progressEl.textContent = pct.toFixed(0) + '%';
            progressEl.style.color = pct >= 100 ? 'var(--success)' : 'var(--accent)';
        } else {
            progressEl.textContent = '0%';
            progressEl.style.color = 'var(--ink-soft)';
        }
    }
    
    const jarFill = document.getElementById('savingJarFill');
    const jarPercent = document.getElementById('savingJarPercent');
    if (jarFill && jarPercent) {
        const pct = Math.min(progress.percentage, 100);
        jarFill.style.height = pct + '%';
        jarPercent.textContent = pct.toFixed(0) + '%';
    }
    
    const currentEl = document.getElementById('savingCurrent');
    const targetEl = document.getElementById('savingTarget');
    if (currentEl) currentEl.textContent = formatCurrency(progress.current);
    if (targetEl) targetEl.textContent = formatCurrency(progress.target);
    
    const bar = document.getElementById('savingGoalBar');
    if (bar) {
        const pct = Math.min(progress.percentage, 100);
        bar.style.width = pct + '%';
        bar.classList.remove('completed');
        if (progress.isCompleted) {
            bar.classList.add('completed');
        }
    }
    
    const remainingEl = document.getElementById('savingRemaining');
    const statusEl = document.getElementById('savingGoalStatus');
    
    if (remainingEl && statusEl) {
        if (progress.isCompleted) {
            statusEl.innerHTML = '<span style="color:var(--success);">🎉 تهانينا! لقد حققت هدف التحويش!</span>';
            remainingEl.textContent = '0.00 ج.م';
        } else if (progress.target > 0) {
            remainingEl.textContent = formatCurrency(progress.remaining);
            statusEl.innerHTML = 'نسبة التقدم: <strong>' + progress.percentage.toFixed(1) + '%</strong>';
        } else {
            remainingEl.textContent = 'لم يحدد';
            statusEl.innerHTML = 'حدد هدفاً للبدء';
        }
    }
    
    const input = document.getElementById('savingGoalInput');
    if (input) {
        if (goal.target > 0) {
            input.placeholder = 'الهدف الحالي: ' + formatCurrency(goal.target);
        } else {
            input.placeholder = 'حدد هدفك';
        }
    }
}