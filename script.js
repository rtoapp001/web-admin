// Initialize Icons on First Load
lucide.createIcons();

// Check login status on page load
window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const savedUsername = localStorage.getItem('username');

    if (isLoggedIn === 'true' && savedUsername) {
        displayDashboard(savedUsername);
    }
});

function displayDashboard(username) {
    // Transition UI
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
    
    // Set User Data
    document.getElementById('nav-user-name').innerText = username;
    document.getElementById('user-initial').innerText = username.charAt(0).toUpperCase();

    // Trigger icon refresh after dashboard is visible
    setTimeout(() => {
        lucide.createIcons();
    }, 10);
    
    // Change Body Background
    document.body.className = "bg-slate-50 min-h-screen";
}

function attemptLogin() {
    const username = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    if (pass === '12345' && username !== "") {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', username);
        displayDashboard(username);
    } else {
        errorMsg.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    location.reload();
}

// Enter key support for login
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptLogin();
});