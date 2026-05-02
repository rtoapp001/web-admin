// Initialize Icons on First Load
lucide.createIcons();

function attemptLogin() {
    const username = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    if (pass === '12345' && username !== "") {
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
    } else {
        errorMsg.classList.remove('hidden');
    }
}

// Enter key support for login
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptLogin();
});
