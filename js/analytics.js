if (!requireAuth()) {
}

let currentPeriod = 'month';
let categoryChart = null;
let trendChart = null;

document.addEventListener('DOMContentLoaded', function() {
    const currentUser = getCurrentUser();
    console.log('مرحباً ' + currentUser);
    
    // ===== بيانات المستخدم في القائمة الجانبية =====
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    if (userNameEl) userNameEl.textContent = currentUser || 'مستخدم';
    if (userAvatarEl) userAvatarEl.textContent = currentUser ? currentUser.charAt(0).toUpperCase() : 'م';
    
    // ===== زر تسجيل الخروج =====
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                logout();
            }
        });
    }
    
    // Theme
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Render
    renderAnalytics('month');
    
    // ===== EVENTS =====
    document.querySelectorAll('.period-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            renderAnalytics(currentPeriod);
        });
    });
    
    document.getElementById('themeToggle').addEventListener('click', function() {
        const current = getTheme();
        const newTheme = current === 'light' ? 'dark' : 'light';
        saveTheme(newTheme);
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        renderAnalytics(currentPeriod);
    });
});

function renderAnalytics(period) {
    const allTransactions = getTransactions();
    const expenses = getTransactionsForPeriod(allTransactions, period);
    const stats = calculateStats(expenses);
    
    document.getElementById('totalSpending').textContent = formatCurrency(stats.expenses);
    
    if (stats.spending && Object.keys(stats.spending).length > 0) {
        const top = Object.entries(stats.spending).sort(function(a, b) { return b[1] - a[1]; })[0];
        document.getElementById('topCategory').textContent = top[0];
        document.getElementById('topCategoryAmount').textContent = formatCurrency(top[1]);
    } else {
        document.getElementById('topCategory').textContent = '-';
        document.getElementById('topCategoryAmount').textContent = '0.00 ج.م';
    }
    
    const days = new Set(expenses.map(function(t) { return t.date; })).size;
    const avg = days > 0 ? stats.expenses / days : 0;
    document.getElementById('avgDaily').textContent = formatCurrency(avg);
    
    const highest = expenses.reduce(function(max, t) {
        return t.amount > max ? t.amount : max;
    }, 0);
    document.getElementById('highestExpense').textContent = formatCurrency(highest);
    
    renderBreakdown(stats.spending);
    updateCharts(expenses, stats);
}

function getTransactionsForPeriod(allTransactions, period) {
    const now = new Date();
    let filtered = allTransactions.filter(function(t) { return t.type === 'expense'; });
    
    if (period === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(function(t) { return new Date(t.date) >= start; });
    } else if (period === 'quarter') {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        filtered = filtered.filter(function(t) { return new Date(t.date) >= start; });
    } else if (period === 'year') {
        const start = new Date(now.getFullYear(), 0, 1);
        filtered = filtered.filter(function(t) { return new Date(t.date) >= start; });
    }
    return filtered;
}

function renderBreakdown(spending) {
    const container = document.getElementById('breakdownGrid');
    if (!container) return;
    
    const entries = Object.entries(spending);
    if (entries.length === 0) {
        container.innerHTML = '<p class="empty">لا توجد مصروفات في هذه الفترة</p>';
        return;
    }
    
    const sorted = entries.sort(function(a, b) { return b[1] - a[1]; });
    container.innerHTML = sorted.map(function(item) {
        return '<div class="breakdown-item" style="border-right-color: ' + getCategoryColor(item[0]) + '">' +
            '<span><i class="fas ' + getCategoryIcon(item[0]) + '"></i> ' + item[0] + '</span>' +
            '<span>' + formatCurrency(item[1]) + '</span>' +
        '</div>';
    }).join('');
}

function updateCharts(transactions, stats) {
    updateCategoryChart(stats.spending);
    updateTrendChart(transactions);
}

function updateCategoryChart(spending) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }
    
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return;
    }
    
    const categories = Object.keys(spending);
    const amounts = Object.values(spending);
    const colors = categories.map(function(c) { return getCategoryColor(c); });
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#F7FAFC' : '#2D3748';
    const borderColor = isDark ? '#2D3748' : '#FFFFFF';
    
    if (categories.length === 0) {
        categoryChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['لا توجد بيانات'],
                datasets: [{ data: [1], backgroundColor: ['#E2E8F0'] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                }
            }
        });
        return;
    }
    
    categoryChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: borderColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, color: textColor }
                }
            }
        }
    });
}

function updateTrendChart(transactions) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }
    
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return;
    }
    
    const monthly = {};
    transactions.forEach(function(t) {
        const date = new Date(t.date);
        const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
        monthly[key] = (monthly[key] || 0) + t.amount;
    });
    
    const sorted = Object.keys(monthly).sort();
    const amounts = sorted.map(function(k) { return monthly[k]; });
    const labels = sorted.map(function(k) {
        const parts = k.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1).toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' });
    });
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#F7FAFC' : '#2D3748';
    const textSecondary = isDark ? '#A0AEC0' : '#718096';
    
    if (sorted.length === 0) {
        trendChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: ['لا توجد بيانات'],
                datasets: [{
                    label: 'الإنفاق',
                    data: [0],
                    borderColor: '#6C63FF',
                    backgroundColor: 'rgba(108, 99, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { color: textSecondary } },
                    x: { ticks: { color: textSecondary } }
                }
            }
        });
        return;
    }
    
    trendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'الإنفاق الشهري',
                data: amounts,
                borderColor: '#6C63FF',
                backgroundColor: 'rgba(108, 99, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6C63FF',
                pointBorderColor: '#6C63FF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: textSecondary } },
                x: { ticks: { color: textSecondary } }
            }
        }
    });
}