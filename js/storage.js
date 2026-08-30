function encodeData(data) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeData(encoded) {
    try {
        return JSON.parse(decodeURIComponent(escape(atob(encoded))));
    } catch(e) {
        return null;
    }
}

function secureSetItem(key, data) {
    try {
        localStorage.setItem(key + '_enc', encodeData(data));
        return true;
    } catch(e) {
        return false;
    }
}

function secureGetItem(key) {
    try {
        const encoded = localStorage.getItem(key + '_enc');
        if (!encoded) return null;
        return decodeData(encoded);
    } catch(e) {
        return null;
    }
}

const SESSION_TIMEOUT = 30 * 60 * 1000;

function setSession(username) {
    const session = {
        username: username,
        loginTime: Date.now(),
        expires: Date.now() + SESSION_TIMEOUT
    };
    secureSetItem('session', session);
}

function getSession() {
    const session = secureGetItem('session');
    if (!session) return null;
    if (Date.now() > session.expires) {
        localStorage.removeItem('session_enc');
        return null;
    }
    return session;
}

function clearSession() {
    localStorage.removeItem('session_enc');
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash).toString(36);
}

function verifyPassword(input, stored) {
    const hashed = simpleHash(input);
    return hashed === stored;
}

function getUsers() {
    const data = secureGetItem('users');
    return data || {};
}

function saveUsers(users) {
    secureSetItem('users', users);
}

function getUser(username) {
    const users = getUsers();
    return users[username] || null;
}

function createUser(username, password) {
    if (username.length < 3) {
        return { success: false, error: 'اسم المستخدم 3 أحرف على الأقل' };
    }
    if (password.length < 8) {
        return { success: false, error: 'كلمة المرور 8 أحرف على الأقل' };
    }
    
    const users = getUsers();
    if (users[username]) {
        return { success: false, error: 'اسم المستخدم موجود بالفعل' };
    }
    
    const hashedPassword = simpleHash(password);
    
    users[username] = {
        password: hashedPassword,
        createdAt: new Date().toISOString()
    };
    saveUsers(users);
    
    const userKey = 'user_' + username;
    secureSetItem(userKey + '_transactions', []);
    secureSetItem(userKey + '_budget', { amount: 5000 });
    secureSetItem(userKey + '_subBudgets', {
        food: 2000, transport: 500, education: 1000,
        entertainment: 1000, shopping: 800, bills: 1500,
        health: 500, other: 500
    });
    secureSetItem(userKey + '_savingGoal', { amount: 0, target: 0 });
    
    return { success: true };
}

function getCurrentUser() {
    const session = getSession();
    return session ? session.username : null;
}

function setCurrentUser(username) {
    setSession(username);
}

function logout() {
    clearSession();
    window.location.href = 'login.html';
}

function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function getUserKey(key) {
    const user = getCurrentUser();
    if (!user) return key;
    return 'user_' + user + '_' + key;
}

function getTransactions() {
    const key = getUserKey('transactions');
    const data = secureGetItem(key);
    return (data && Array.isArray(data)) ? data : [];
}

function saveTransactions(transactions) {
    const key = getUserKey('transactions');
    secureSetItem(key, transactions);
}

function addTransaction(data) {
    const transactions = getTransactions();
    
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
        console.error('❌ المبلغ غير صحيح:', data.amount);
        return null;
    }
    
    const newTransaction = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        type: data.type,
        amount: amount,
        category: data.category || 'other',
        description: data.description || '',
        date: data.date || new Date().toISOString().split('T')[0]
    };
    
    transactions.unshift(newTransaction);
    saveTransactions(transactions);
    updateSavingGoal();
    
    console.log('✅ تم إضافة العملية:', newTransaction);
    return newTransaction;
}

function deleteTransaction(id) {
    let transactions = getTransactions();
    transactions = transactions.filter(function(t) { return t.id !== id; });
    saveTransactions(transactions);
    updateSavingGoal();
    return true;
}

function updateTransaction(id, data) {
    const transactions = getTransactions();
    const index = transactions.findIndex(function(t) { return t.id === id; });
    if (index === -1) return false;
    
    transactions[index] = {
        ...transactions[index],
        type: data.type,
        amount: parseFloat(data.amount),
        category: data.category || 'other',
        description: data.description || '',
        date: data.date
    };
    saveTransactions(transactions);
    updateSavingGoal();
    return true;
}

function getTransactionsByMonth(year, month) {
    const transactions = getTransactions();
    return transactions.filter(function(t) {
        const date = new Date(t.date);
        return date.getFullYear() === year && date.getMonth() === month;
    });
}

function getBudget() {
    const key = getUserKey('budget');
    const data = secureGetItem(key);
    return data || { amount: 5000 };
}

function saveBudget(amount) {
    const key = getUserKey('budget');
    const now = new Date();
    const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    secureSetItem(key, { amount: parseFloat(amount), month: monthKey });
}

function getSubBudgets() {
    const key = getUserKey('subBudgets');
    const data = secureGetItem(key);
    return data || {
        food: 2000, transport: 500, education: 1000,
        entertainment: 1000, shopping: 800, bills: 1500,
        health: 500, other: 500
    };
}

function saveSubBudgets(subBudgets) {
    const key = getUserKey('subBudgets');
    secureSetItem(key, subBudgets);
}

function getSubBudgetProgress(category) {
    const transactions = getTransactions();
    const budgets = getSubBudgets();
    const spent = transactions
        .filter(function(t) { return t.type === 'expense' && t.category === category; })
        .reduce(function(sum, t) { return sum + t.amount; }, 0);
    
    const budget = budgets[category] || 0;
    return {
        budget: budget,
        spent: spent,
        remaining: budget - spent,
        percentage: budget > 0 ? (spent / budget) * 100 : 0
    };
}

function getAllSubBudgetsProgress() {
    const categories = ['food', 'transport', 'education', 'entertainment', 'shopping', 'bills', 'health', 'other'];
    const result = {};
    categories.forEach(function(cat) {
        result[cat] = getSubBudgetProgress(cat);
    });
    return result;
}

function getSavingGoal() {
    const key = getUserKey('savingGoal');
    const data = secureGetItem(key);
    return data || { amount: 0, target: 0 };
}

function saveSavingGoal(target) {
    const key = getUserKey('savingGoal');
    const current = getSavingGoal();
    current.target = parseFloat(target) || 0;
    secureSetItem(key, current);
    updateSavingGoal();
    return true;
}

function updateSavingGoal() {
    const key = getUserKey('savingGoal');
    const transactions = getTransactions();
    const stats = calculateStats(transactions);
    const goal = getSavingGoal();
    goal.amount = stats.balance;
    secureSetItem(key, goal);
    return goal;
}

function getSavingGoalProgress() {
    const goal = getSavingGoal();
    const transactions = getTransactions();
    const stats = calculateStats(transactions);
    
    const current = stats.balance;
    const target = goal.target || 0;
    
    return {
        current: current,
        target: target,
        remaining: target - current,
        percentage: target > 0 ? (current / target) * 100 : 0,
        isCompleted: target > 0 && current >= target
    };
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

function getTheme() {
    return localStorage.getItem('theme') || 'light';
}

function saveTheme(theme) {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
}

function clearAllData() {
    const user = getCurrentUser();
    if (!user) return false;
    
    const userKey = 'user_' + user;
    localStorage.removeItem(userKey + '_transactions_enc');
    localStorage.removeItem(userKey + '_budget_enc');
    localStorage.removeItem(userKey + '_subBudgets_enc');
    localStorage.removeItem(userKey + '_savingGoal_enc');
    return true;
}