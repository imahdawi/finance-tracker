// auth.js - نظام تسجيل الدخول المتكامل

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth page loaded');
    
    // ===== التحقق من وجود مستخدم مسجل =====
    const currentUser = getCurrentUser();
    if (currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // ===== عناصر الصفحة =====
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const formTitle = document.getElementById('formTitle');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');
    
    // ===== التبديل بين تسجيل الدخول والتسجيل =====
    showRegister.addEventListener('click', function() {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        formTitle.textContent = 'إنشاء حساب جديد';
        loginError.textContent = '';
        registerError.textContent = '';
        // Focus على أول حقل
        document.getElementById('regUsername').focus();
    });
    
    showLogin.addEventListener('click', function() {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        formTitle.textContent = 'تسجيل الدخول إلى حسابك';
        loginError.textContent = '';
        registerError.textContent = '';
        document.getElementById('username').focus();
    });
    
    // ========================================
    // ===== تسجيل الدخول =====
    // ========================================
    document.getElementById('loginBtn').addEventListener('click', function() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        loginError.textContent = '';
        loginError.className = 'error-msg';
        
        // ===== التحقق من الحقول =====
        if (!username || !password) {
            loginError.textContent = '⚠️ الرجاء ملء جميع الحقول';
            return;
        }
        
        // ===== التحقق من طول اسم المستخدم =====
        if (username.length < 3) {
            loginError.textContent = '⚠️ اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
            return;
        }
        
        // ===== التحقق من طول كلمة المرور =====
        if (password.length < 8) {
            loginError.textContent = '⚠️ كلمة المرور يجب أن تكون 8 أحرف على الأقل';
            return;
        }
        
        // ===== البحث عن المستخدم =====
        const user = getUser(username);
        if (!user) {
            loginError.textContent = '❌ اسم المستخدم غير موجود';
            return;
        }
        
        // ===== التحقق من كلمة المرور =====
        if (!verifyPassword(password, user.password)) {
            loginError.textContent = '❌ كلمة المرور غير صحيحة';
            return;
        }
        
        // ===== تسجيل الدخول =====
        setCurrentUser(username);
        loginError.className = 'error-msg success';
        loginError.textContent = '✅ جاري التحويل...';
        
        setTimeout(function() {
            window.location.href = 'index.html';
        }, 500);
    });
    
    // ========================================
    // ===== تسجيل جديد =====
    // ========================================
    document.getElementById('registerBtn').addEventListener('click', function() {
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const confirmPassword = document.getElementById('regConfirmPassword').value.trim();
        
        registerError.textContent = '';
        registerError.className = 'error-msg';
        
        // ===== التحقق من الحقول =====
        if (!username || !password || !confirmPassword) {
            registerError.textContent = '⚠️ الرجاء ملء جميع الحقول';
            return;
        }
        
        // ===== التحقق من طول اسم المستخدم =====
        if (username.length < 3) {
            registerError.textContent = '⚠️ اسم المستخدم يجب أن يكون 3 أحرف على الأقل';
            return;
        }
        
        // ===== التحقق من طول كلمة المرور =====
        if (password.length < 8) {
            registerError.textContent = '⚠️ كلمة المرور يجب أن تكون 8 أحرف على الأقل';
            return;
        }
        
        // ===== التحقق من تطابق كلمة المرور =====
        if (password !== confirmPassword) {
            registerError.textContent = '❌ كلمة المرور غير متطابقة';
            return;
        }
        
        // ===== التحقق من وجود المستخدم =====
        if (getUser(username)) {
            registerError.textContent = '❌ اسم المستخدم موجود بالفعل';
            return;
        }
        
        // ===== إنشاء المستخدم =====
        const result = createUser(username, password);
        if (!result.success) {
            registerError.textContent = '❌ ' + result.error;
            return;
        }
        
        registerError.className = 'error-msg success';
        registerError.textContent = '✅ تم إنشاء الحساب بنجاح! جاري التحويل...';
        
        // ===== تبديل لتسجيل الدخول =====
        setTimeout(function() {
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            formTitle.textContent = 'تسجيل الدخول إلى حسابك';
            document.getElementById('username').value = username;
            document.getElementById('password').value = '';
            registerError.textContent = '';
            loginError.className = 'error-msg success';
            loginError.textContent = '✅ تم إنشاء الحساب! يمكنك تسجيل الدخول الآن';
        }, 1500);
    });
    
    // ========================================
    // ===== Enter Key =====
    // ========================================
    document.getElementById('password').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginBtn').click();
        }
    });
    
    document.getElementById('regConfirmPassword').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('registerBtn').click();
        }
    });
    
    document.getElementById('regUsername').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('regPassword').focus();
        }
    });
    
    document.getElementById('regPassword').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('regConfirmPassword').focus();
        }
    });
    
    console.log('Auth page ready');
});