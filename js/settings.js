if (!requireAuth()) {
}

function exportToCSV() {
    const transactions = getTransactions();
    if (!transactions || transactions.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'warning');
        return null;
    }
    
    const goal = getSavingGoal();
    const progress = getSavingGoalProgress();
    
    const headers = ['التاريخ', 'النوع', 'المبلغ', 'التصنيف', 'الوصف'];
    const rows = transactions.map(function(t) {
        return [
            t.date,
            t.type === 'income' ? 'دخل' : 'مصروف',
            t.amount.toFixed(2),
            t.category || 'أخرى',
            t.description || ''
        ];
    });
    
    const summaryRows = [
        [],
        ['--- ملخص التحويش ---'],
        ['هدف التحويش', goal.target || 0],
        ['المبلغ المدخر', progress.current],
        ['نسبة التقدم', progress.percentage.toFixed(1) + '%']
    ];
    
    const allRows = [...rows, ...summaryRows];
    const csvContent = [headers.join(','), ...allRows.map(r => r.join(','))].join('\n');
    return csvContent;
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
    
    loadSettings();
    loadSubBudgets();
    
    document.getElementById('saveBudget').addEventListener('click', saveBudgetHandler);
    document.getElementById('budgetAmount').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') saveBudgetHandler();
    });
    
    document.getElementById('exportData').addEventListener('click', function() {
        const transactions = getTransactions();
        if (!transactions || transactions.length === 0) {
            showToast('لا توجد بيانات للتصدير', 'warning');
            return;
        }

        const csv = exportToCSV();
        if (!csv) return;

        const now = new Date();
        const dateStr = now.getFullYear() + '-' + 
                        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(now.getDate()).padStart(2, '0');
        
        const blob = new Blob(['\uFEFF' + csv], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'تحويش-العمليات-' + dateStr + '.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        showToast('✅ تم تصدير ' + transactions.length + ' عملية بنجاح');
    });
    
    document.getElementById('importData').addEventListener('click', function() {
        document.getElementById('importFile').click();
    });
    
    document.getElementById('importFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
            showToast('❌ الملف يجب أن يكون بصيغة CSV', 'error');
            e.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                let csvText = event.target.result;
                
                if (csvText.charCodeAt(0) === 0xFEFF) {
                    csvText = csvText.substring(1);
                }
                
                console.log('📄 تم قراءة الملف، الحجم:', csvText.length, 'حرف');
                
                const imported = importFromCSV(csvText);
                
                if (!imported || imported.length === 0) {
                    showToast('❌ الملف غير صحيح أو لا يحتوي على بيانات صالحة', 'error');
                    return;
                }
                
                const preview = imported.slice(0, 3);
                
                const confirmMsg = '📊 سيتم استيراد ' + imported.length + ' عملية.\n\n' +
                                  'المعاينة (أول 3 عمليات):\n' +
                                  preview.map(function(t) {
                                      return '  - ' + t.date + ' | ' + (t.type === 'income' ? 'دخل' : 'مصروف') + ' | ' + t.amount + ' ج.م';
                                  }).join('\n') +
                                  '\n\nهل أنت متأكد من الاستيراد؟';
                
                if (!confirm(confirmMsg)) {
                    return;
                }
                
                let added = 0;
                imported.forEach(function(t) {
                    const result = addTransaction(t);
                    if (result) added++;
                });
                
                showToast('✅ تم استيراد ' + added + ' عملية بنجاح');
                
                loadSettings();
                loadSubBudgets();
                
                if (typeof renderDashboard === 'function') {
                    renderDashboard();
                }
                if (typeof renderSavingGoal === 'function') {
                    renderSavingGoal();
                }
                
            } catch (error) {
                console.error('❌ خطأ في قراءة الملف:', error);
                showToast('❌ حدث خطأ أثناء قراءة الملف: ' + error.message, 'error');
            }
        };
        
        reader.onerror = function() {
            showToast('❌ حدث خطأ في قراءة الملف', 'error');
        };
        
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    });
    
    document.getElementById('clearData').addEventListener('click', function() {
        const transactions = getTransactions();
        document.getElementById('clearDetails').textContent = 
            'سيتم حذف ' + transactions.length + ' عملية';
        document.getElementById('clearModal').classList.add('active');
    });
    
    document.getElementById('clearModalCloseBtn').addEventListener('click', closeClearModal);
    document.getElementById('cancelClear').addEventListener('click', closeClearModal);
    document.getElementById('clearModal').addEventListener('click', function(e) {
        if (e.target === this) closeClearModal();
    });
    
    document.getElementById('confirmClear').addEventListener('click', function() {
        const result = clearAllData();
        if (result) {
            showToast('تم مسح جميع البيانات');
            closeClearModal();
            loadSettings();
            loadSubBudgets();
            if (typeof renderDashboard === 'function') {
                renderDashboard();
            }
            if (typeof renderSavingGoal === 'function') {
                renderSavingGoal();
            }
        }
    });
    
    document.getElementById('saveSubBudgets').addEventListener('click', function() {
        const inputs = document.querySelectorAll('.sub-budget-input');
        const subBudgets = getSubBudgets();
        
        inputs.forEach(function(input) {
            const category = input.dataset.category;
            const value = parseFloat(input.value);
            if (value >= 0) {
                subBudgets[category] = value;
            }
        });
        
        saveSubBudgets(subBudgets);
        showToast('تم حفظ الميزانيات الفرعية');
        loadSubBudgets();
    });
    
    document.getElementById('themeToggle').addEventListener('click', function() {
        const current = getTheme();
        const newTheme = current === 'light' ? 'dark' : 'light';
        saveTheme(newTheme);
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        if (typeof renderDashboard === 'function') {
            renderDashboard();
        }
        if (typeof renderSavingGoal === 'function') {
            renderSavingGoal();
        }
    });
});

function loadSettings() {
    const budget = getBudget();
    const transactions = getTransactions();
    
    document.getElementById('budgetAmount').value = budget.amount;
    
    const now = new Date();
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                       'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthLabel = document.getElementById('currentMonth');
    if (monthLabel) {
        monthLabel.textContent = 'الشهر الحالي: ' + monthNames[now.getMonth()] + ' ' + now.getFullYear();
    }
    
    const income = transactions.filter(function(t) { return t.type === 'income'; })
        .reduce(function(s, t) { return s + t.amount; }, 0);
    const expenses = transactions.filter(function(t) { return t.type === 'expense'; })
        .reduce(function(s, t) { return s + t.amount; }, 0);
    
    document.getElementById('totalTransactions').textContent = transactions.length + ' عملية';
    document.getElementById('totalIncome').textContent = formatCurrency(income) + ' دخل';
    document.getElementById('totalExpenses').textContent = formatCurrency(expenses) + ' مصروفات';
}

function saveBudgetHandler() {
    const amount = parseFloat(document.getElementById('budgetAmount').value);
    if (!amount || amount < 0) {
        showToast('المبلغ غير صحيح', 'error');
        return;
    }
    saveBudget(amount);
    showToast('تم حفظ الميزانية للشهر الحالي');
    loadSettings();
    if (typeof renderDashboard === 'function') {
        renderDashboard();
    }
}

function loadSubBudgets() {
    const subBudgets = getSubBudgets();
    const progress = getAllSubBudgetsProgress();
    const container = document.getElementById('subBudgetsGrid');
    if (!container) return;
    
    const categoryNames = {
        food: '🍔 طعام',
        transport: '🚗 مواصلات',
        education: '📚 تعليم',
        entertainment: '🎮 ترفيه',
        shopping: '🛒 تسوق',
        bills: '📄 فواتير',
        health: '💊 صحة',
        other: '🏠 أخرى'
    };
    
    let html = '';
    let hasWarning = false;
    let hasDanger = false;
    let warningMessages = [];
    
    Object.keys(subBudgets).forEach(function(cat) {
        const data = progress[cat] || { budget: 0, spent: 0, remaining: 0, percentage: 0 };
        const percent = Math.min(data.percentage, 100);
        let barClass = '';
        let statusText = '';
        let statusIcon = '';
        
        if (percent >= 100) {
            barClass = 'danger';
            statusIcon = '🔴';
            statusText = 'تم تجاوز الميزانية!';
            hasDanger = true;
            warningMessages.push('🔴 ' + categoryNames[cat] + ': تم تجاوز الميزانية (' + formatCurrency(data.spent) + ' من ' + formatCurrency(data.budget) + ')');
        } else if (percent >= 80) {
            barClass = 'warning';
            statusIcon = '⚠️';
            statusText = 'تنبيه: قارب على الانتهاء';
            hasWarning = true;
            warningMessages.push('⚠️ ' + categoryNames[cat] + ': متبقي ' + formatCurrency(data.remaining));
        }
        
        html += `
            <div class="sub-budget-item ${barClass}">
                <label><i class="fas ${getCategoryIcon(cat)}"></i> ${categoryNames[cat] || cat}</label>
                <div class="budget-input">
                    <input type="number" class="sub-budget-input" data-category="${cat}" 
                           value="${data.budget}" min="0" step="100" placeholder="0">
                    <span>ج.م</span>
                </div>
                <div class="sub-budget-progress">
                    <div class="stats">
                        <span>صرف: ${formatCurrency(data.spent)}</span>
                        <span>${data.percentage.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="fill ${barClass}" style="width: ${percent}%"></div>
                    </div>
                    ${statusText ? `<div class="status-text ${barClass}">${statusIcon} ${statusText}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // ===== عرض التحذيرات =====
    if (hasDanger) {
        showToast('🔴 تم تجاوز ميزانية بعض التصنيفات!', 'error');
    } else if (hasWarning) {
        showToast('⚠️ تنبيه: بعض التصنيفات قاربت على الانتهاء', 'warning');
    }
    
    // ===== عرض رسائل تفصيلية في الكونسول =====
    if (warningMessages.length > 0) {
        console.log('📊 تنبيهات الميزانيات الفرعية:');
        warningMessages.forEach(function(msg) {
            console.log('  ' + msg);
        });
    }
}

function closeClearModal() {
    document.getElementById('clearModal').classList.remove('active');
}