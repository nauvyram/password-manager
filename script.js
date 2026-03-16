// --- Crypto Utilities ---
const saltBufferLength = 16;
const ivBufferLength = 12;

// Derives an AES-GCM key from a master password and salt using PBKDF2
async function deriveKey(password, saltUint8) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: saltUint8,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Encrypt plain string to Base64 (ciphertext + salt + iv)
async function encryptData(plaintext, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(saltBufferLength));
    const iv = window.crypto.getRandomValues(new Uint8Array(ivBufferLength));
    const key = await deriveKey(password, salt);
    const encoder = new TextEncoder();
    
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoder.encode(plaintext)
    );
    
    // Combine salt, iv, and ciphertext to save to storage
    return {
        s: arrayBufferToBase64(salt),
        i: arrayBufferToBase64(iv),
        c: arrayBufferToBase64(ciphertextBuffer)
    };
}

// Decrypt Base64 package back to plain string
async function decryptData(encryptedObj, password) {
    try {
        const salt = base64ToArrayBuffer(encryptedObj.s);
        const iv = base64ToArrayBuffer(encryptedObj.i);
        const ciphertext = base64ToArrayBuffer(encryptedObj.c);
        
        const key = await deriveKey(password, salt);
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (e) {
        throw new Error("Decryption failed. Incorrect password or tampered data.");
    }
}

// Utils
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

// --- Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Auth
    const authContainer = document.getElementById('auth-container');
    const setupScreen = document.getElementById('setup-screen');
    const unlockScreen = document.getElementById('unlock-screen');
    const setupForm = document.getElementById('setup-form');
    const unlockForm = document.getElementById('unlock-form');
    const setupError = document.getElementById('setup-error');
    const unlockError = document.getElementById('unlock-error');
    const resetVaultBtn = document.getElementById('reset-vault-btn');
    
    // DOM Elements - App
    const appContainer = document.getElementById('app-container');
    const credentialForm = document.getElementById('credential-form');
    const togglePasswordBtn = document.getElementById('toggle-password-visibility');
    const passwordInput = document.getElementById('password');
    const listContainer = document.getElementById('credentials-list');
    const searchInput = document.getElementById('search-input');
    const lockBtn = document.getElementById('lock-btn');

    // App State
    let vault = [];
    let currentMasterPassword = null;
    const STORAGE_KEY = 'vaultify_encrypted_data';

    // Initialization
    function init() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            // Found existing encrypted vault
            showScreen('unlock');
        } else {
            // No vault found, prompt setup
            showScreen('setup');
        }
    }

    function showScreen(screen) {
        authContainer.classList.add('hidden');
        setupScreen.classList.add('hidden');
        unlockScreen.classList.add('hidden');
        appContainer.classList.add('hidden');

        if (screen === 'setup') {
            authContainer.classList.remove('hidden');
            setupScreen.classList.remove('hidden');
        } else if (screen === 'unlock') {
            authContainer.classList.remove('hidden');
            unlockScreen.classList.remove('hidden');
            document.getElementById('unlock-password').focus();
        } else if (screen === 'app') {
            appContainer.classList.remove('hidden');
            renderVault();
        }
    }

    // Auth Flows
    setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = document.getElementById('setup-password').value;
        const confirm = document.getElementById('setup-confirm').value;

        if (pwd !== confirm) {
            setupError.classList.remove('hidden');
            return;
        }

        setupError.classList.add('hidden');
        currentMasterPassword = pwd;
        vault = []; // Empty start
        
        await saveVault();
        setupForm.reset();
        showScreen('app');
    });

    unlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = document.getElementById('unlock-password').value;
        const storedDataStr = localStorage.getItem(STORAGE_KEY);
        
        try {
            const encryptedObj = JSON.parse(storedDataStr);
            const decryptedStr = await decryptData(encryptedObj, pwd);
            vault = JSON.parse(decryptedStr);
            
            // Success
            unlockError.classList.add('hidden');
            currentMasterPassword = pwd;
            unlockForm.reset();
            showScreen('app');
        } catch (error) {
            console.error(error);
            unlockError.classList.remove('hidden');
        }
    });

    lockBtn.addEventListener('click', () => {
        currentMasterPassword = null;
        vault = [];
        listContainer.innerHTML = '';
        showScreen('unlock');
    });

    resetVaultBtn.addEventListener('click', () => {
        if (confirm("Are you absolutely sure? This will delete all your encrypted passions forever.")) {
            localStorage.removeItem(STORAGE_KEY);
            vault = [];
            currentMasterPassword = null;
            showScreen('setup');
        }
    });

    // Vault App Flows
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.innerHTML = isPassword 
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    });

    credentialForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const website = document.getElementById('website').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!website || !username || !password || !currentMasterPassword) return;

        const newCred = {
            id: Date.now().toString(),
            website,
            username,
            password,
            createdAt: new Date().toISOString()
        };

        vault.push(newCred);
        await saveVault();
        renderVault();
        
        credentialForm.reset();
        passwordInput.type = 'password';
    });

    searchInput.addEventListener('input', (e) => {
        renderVault(e.target.value.toLowerCase());
    });

    listContainer.addEventListener('click', async (e) => {
        const cardMenuBtn = e.target.closest('.copy-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (cardMenuBtn) {
            const id = cardMenuBtn.dataset.id;
            const cred = vault.find(c => c.id === id);
            if (cred) {
                try {
                    await navigator.clipboard.writeText(cred.password);
                    
                    const originalHTML = cardMenuBtn.innerHTML;
                    cardMenuBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
                    cardMenuBtn.style.color = 'var(--success)';
                    
                    setTimeout(() => {
                        cardMenuBtn.innerHTML = originalHTML;
                        cardMenuBtn.style.color = '';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy text: ', err);
                }
            }
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('Are you sure you want to delete this credential?')) {
                vault = vault.filter(c => c.id !== id);
                await saveVault();
                renderVault(searchInput.value.toLowerCase());
            }
        }
    });

    async function saveVault() {
        if (!currentMasterPassword) return;
        const vaultStr = JSON.stringify(vault);
        const encrypted = await encryptData(vaultStr, currentMasterPassword);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
    }

    function renderVault(filterQuery = '') {
        const filtered = vault.filter(cred => 
            cred.website.toLowerCase().includes(filterQuery) || 
            cred.username.toLowerCase().includes(filterQuery)
        );

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                    <p>${vault.length === 0 ? "Your vault is empty. Save a credential to get started." : "No credentials matched your search."}</p>
                </div>
            `;
            return;
        }

        filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        listContainer.innerHTML = filtered.map(cred => {
            const letter = cred.website.charAt(0).toUpperCase();
            return `
                <div class="credential-card">
                    <div class="card-header">
                        <div class="site-icon">${letter}</div>
                        <div class="site-info">
                            <div class="site-name" title="${cred.website}">${cred.website}</div>
                            <div class="site-username" title="${cred.username}">${cred.username}</div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="action-btn copy-btn" data-id="${cred.id}" aria-label="Copy password">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copy Password
                        </button>
                        <button class="action-btn delete-btn" data-id="${cred.id}" aria-label="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Start App
    init();
});
