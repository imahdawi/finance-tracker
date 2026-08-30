function formatCurrency(amount) {
    return amount.toFixed(2) + ' ج.م';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getCategoryIcon(category) {
    if (category === 'income') return 'fa-wallet';
    
    const icons = {
        food: 'fa-utensils',
        transport: 'fa-car',
        education: 'fa-graduation-cap',
        entertainment: 'fa-gamepad',
        shopping: 'fa-shopping-bag',
        bills: 'fa-file-invoice',
        health: 'fa-heartbeat',
        other: 'fa-home'
    };
    return icons[category] || 'fa-tag';
}

function getCategoryLabel(category) {
    if (category === 'income') return 'دخل';
    
    const labels = {
        food: 'طعام',
        transport: 'مواصلات',
        education: 'تعليم',
        entertainment: 'ترفيه',
        shopping: 'تسوق',
        bills: 'فواتير',
        health: 'صحة',
        other: 'أخرى'
    };
    return labels[category] || category;
}

function getCategoryColor(category) {
    if (category === 'income') {
        return '#00C853';
    }
    
    const colors = {
        food: '#FF6B6B',
        transport: '#4ECDC4',
        education: '#45B7D1',
        entertainment: '#96CEB4',
        shopping: '#FFEAA7',
        bills: '#FF9800',
        health: '#E91E63',
        other: '#DDA0DD'
    };
    return colors[category] || '#95A5A6';
}

function calculateStats(transactions) {
    const income = transactions.filter(function(t) { return t.type === 'income'; })
        .reduce(function(sum, t) { return sum + t.amount; }, 0);
    const expenses = transactions.filter(function(t) { return t.type === 'expense'; })
        .reduce(function(sum, t) { return sum + t.amount; }, 0);
    
    const spending = {};
    transactions.filter(function(t) { return t.type === 'expense'; }).forEach(function(t) {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
    });
    
    return { income: income, expenses: expenses, balance: income - expenses, spending: spending };
}

function filterTransactions(transactions, filters) {
    return transactions.filter(function(t) {
        if (filters.type && filters.type !== 'all' && t.type !== filters.type) return false;
        if (filters.category && filters.category !== 'all' && t.category !== filters.category) return false;
        
        if (filters.search && filters.search.trim()) {
            const search = filters.search.toLowerCase().trim();
            const desc = (t.description || '').toLowerCase();
            const cat = t.category.toLowerCase();
            if (!desc.includes(search) && !cat.includes(search)) return false;
        }
        
        if (filters.dateRange && filters.dateRange !== 'all') {
            const date = new Date(t.date);
            const today = new Date();
            
            if (filters.dateRange === 'today') {
                return date.toDateString() === today.toDateString();
            }
            if (filters.dateRange === 'week') {
                const weekStart = new Date(today);
                const day = today.getDay() || 7;
                weekStart.setDate(today.getDate() - day + 1);
                weekStart.setHours(0, 0, 0, 0);
                return date >= weekStart;
            }
            if (filters.dateRange === 'month') {
                return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            }
            if (filters.dateRange === 'custom') {
                if (filters.startDate && filters.endDate) {
                    const start = new Date(filters.startDate);
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59, 999);
                    return date >= start && date <= end;
                }
            }
        }
        return true;
    });
}

function importFromCSV(csvText) {
    try {
        const lines = csvText.split('\n').filter(function(line) {
            return line.trim() !== '';
        });
        
        if (lines.length < 2) {
            showToast('الملف فارغ أو غير صحيح', 'error');
            return [];
        }
        
        const headers = lines[0].split(',').map(function(h) {
            return h.trim().replace(/^"|"$/g, '');
        });
        
        const expectedHeaders = ['التاريخ', 'النوع', 'المبلغ', 'التصنيف', 'الوصف'];
        const isMatch = expectedHeaders.every(function(h, i) {
            return headers[i] && headers[i].includes(h);
        });
        
        if (!isMatch) {
            showToast('تنسيق الملف غير صحيح', 'error');
            return [];
        }
        
        const transactions = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(function(v) {
                return v.trim().replace(/^"|"$/g, '');
            });
            
            if (values.length < 3) continue;
            
            const type = values[1] === 'دخل' ? 'income' : 'expense';
            const amount = parseFloat(values[2]);
            
            if (isNaN(amount) || amount <= 0) continue;
            
            const transaction = {
                date: values[0] || new Date().toISOString().split('T')[0],
                type: type,
                amount: amount,
                category: values[3] || 'other',
                description: values[4] || ''
            };
            
            transactions.push(transaction);
        }
        
        return transactions;
    } catch (error) {
        console.error('خطأ في الاستيراد:', error);
        showToast('حدث خطأ أثناء قراءة الملف', 'error');
        return [];
    }
}

function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<span>' + message + '</span>';
    container.appendChild(toast);
    
    setTimeout(function() {
        if (toast.parentNode) toast.remove();
    }, 3000);
}