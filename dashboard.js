// Dashboard Mental Commons - Spazio personale del Depositor

// Variabili globali
let userEmail = null;
let ucmeData = [];
let risposteData = [];

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    initializeNavigation();
});

async function initializeDashboard() {
    console.log('Inizializzazione dashboard...');
    
    // Controlla se l'utente ha accesso
    const hasAccess = checkUserAccess();
    
    if (!hasAccess) {
        showNoAccess();
        return;
    }
    
    // Carica i dati
    await loadData();
    
    // Mostra la dashboard
    showDashboard();
}

function checkUserAccess() {
    // Controlla localStorage per email salvata
    const savedEmail = localStorage.getItem('mc-email');
    
    // Controlla parametro URL
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    
    if (savedEmail) {
        userEmail = savedEmail;
        console.log('Email trovata in localStorage:', userEmail);
        return true;
    } else if (emailParam) {
        userEmail = emailParam;
        // Salva in localStorage per future visite
        localStorage.setItem('mc-email', userEmail);
        console.log('Email trovata in URL:', userEmail);
        return true;
    }
    
    console.log('Nessuna email trovata');
    return false;
}

async function loadData() {
    try {
        // Carica UCMe
        const ucmeResponse = await fetch('data.json');
        const ucmeJson = await ucmeResponse.json();
        ucmeData = ucmeJson.ucmes || [];
        
        // Carica risposte
        const risposteResponse = await fetch('risposte.json');
        const risposteJson = await risposteResponse.json();
        risposteData = risposteJson.risposte || [];
        
        console.log('Dati caricati:', {
            ucmes: ucmeData.length,
            risposte: risposteData.length
        });
    } catch (error) {
        console.error('Errore nel caricamento dati:', error);
        showErrorMessage('Impossibile caricare i tuoi dati. Riprova più tardi.');
    }
}

function showDashboard() {
    // Nascondi il messaggio di caricamento
    document.getElementById('user-verification').style.display = 'none';
    
    // Mostra il contenuto della dashboard
    document.getElementById('dashboard-content').style.display = 'block';
    
    // Filtra e mostra le UCMe dell'utente
    const userUcmes = ucmeData.filter(ucme => ucme.email === userEmail);
    
    if (userUcmes.length === 0) {
        showNoUcmes();
    } else {
        renderUcmeBlocks(userUcmes);
    }
    
    // Inizializza gestione profilo
    initializeProfileManagement();
}

function showNoAccess() {
    document.getElementById('user-verification').style.display = 'none';
    document.getElementById('no-access').style.display = 'block';
}

function showNoUcmes() {
    const ucmeBlocks = document.getElementById('ucme-blocks');
    ucmeBlocks.innerHTML = `
        <div class="no-ucmes">
            <h3>Nessun pensiero ancora affidato</h3>
            <p>Il tuo spazio mentale è ancora vuoto. Affida il tuo primo pensiero per iniziare.</p>
        </div>
    `;
}

function renderUcmeBlocks(userUcmes) {
    const ucmeBlocks = document.getElementById('ucme-blocks');
    
    // Ordina le UCMe dalla più recente alla più vecchia
    const sortedUcmes = userUcmes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const blocks = sortedUcmes.map(ucme => createUcmeBlock(ucme)).join('');
    ucmeBlocks.innerHTML = blocks;
}

function createUcmeBlock(ucme) {
    // Cerca la risposta corrispondente
    const risposta = risposteData.find(r => r.ucmeId === ucme.id);
    
    // Formatta la data
    const date = formatDate(ucme.timestamp);
    
    // Determina lo stato
    const status = risposta ? 'risposto' : 'in-attesa';
    const statusText = risposta ? '✅ Risposto' : '🕓 In attesa';
    
    let rispostaHtml = '';
    if (risposta) {
        const rispostaDate = formatDate(risposta.timestamp);
        rispostaHtml = `
            <div class="ucme-response">
                <h4>Risposta ricevuta</h4>
                <p class="response-text">${risposta.risposta}</p>
                <div class="response-meta">
                    <span class="response-date">${rispostaDate}</span>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="ucme-block ${status}">
            <div class="ucme-header">
                <span class="ucme-status">${statusText}</span>
                <span class="ucme-date">${date}</span>
            </div>
            
            <div class="ucme-content">
                <div class="ucme-text">
                    <p>${ucme.text}</p>
                </div>
                
                <div class="ucme-meta">
                    <span class="ucme-tone">Tono: ${ucme.tone}</span>
                </div>
                
                ${rispostaHtml}
            </div>
        </div>
    `;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('it-IT', options);
}

function showErrorMessage(message) {
    const ucmeBlocks = document.getElementById('ucme-blocks');
    ucmeBlocks.innerHTML = `
        <div class="error-message">
            <h3>Errore</h3>
            <p>${message}</p>
        </div>
    `;
}

// ========================================
// GESTIONE NAVIGAZIONE E LOGIN STATE
// ========================================

function initializeNavigation() {
    // Controlla se l'utente è loggato
    const currentUser = JSON.parse(localStorage.getItem('mc-user') || 'null');
    
    const navLogin = document.getElementById('nav-login');
    const navDashboard = document.getElementById('nav-dashboard');
    const navLogout = document.getElementById('nav-logout');
    
    if (currentUser) {
        // Utente loggato
        if (navLogin) navLogin.style.display = 'none';
        if (navDashboard) navDashboard.style.display = 'block';
        if (navLogout) {
            navLogout.style.display = 'block';
            navLogout.onclick = function() {
                localStorage.removeItem('mc-user');
                localStorage.removeItem('mc-email');
                window.location.href = 'index.html';
            };
        }
    } else {
        // Utente guest
        if (navLogin) navLogin.style.display = 'block';
        if (navDashboard) navDashboard.style.display = 'none';
        if (navLogout) navLogout.style.display = 'none';
    }
}

// ========================================
// GESTIONE PROFILO
// ========================================

function initializeProfileManagement() {
    // Popola informazioni profilo
    populateProfileInfo();
    
    // Setup event listeners
    setupProfileEventListeners();
}

function populateProfileInfo() {
    const currentUser = JSON.parse(localStorage.getItem('mc-user') || 'null');
    
    if (!currentUser) {
        console.warn('Nessun utente trovato per popolare il profilo');
        return;
    }
    
    // Popola i campi delle informazioni
    document.getElementById('profile-email').textContent = currentUser.email;
    document.getElementById('profile-name').textContent = currentUser.name || 'Non specificato';
    document.getElementById('profile-created').textContent = formatDate(currentUser.createdAt);
    document.getElementById('profile-last-login').textContent = formatDate(currentUser.lastLogin);
}

function setupProfileEventListeners() {
    // Pulsante modifica profilo
    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
        editBtn.addEventListener('click', showEditForm);
    }
    
    // Pulsante annulla modifica
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideEditForm);
    }
    
    // Form modifica profilo
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Pulsante esporta dati
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportUserData);
    }
    
    // Pulsante elimina account
    const deleteBtn = document.getElementById('delete-account-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteAccount);
    }
}

function showEditForm() {
    const currentUser = JSON.parse(localStorage.getItem('mc-user') || 'null');
    
    if (!currentUser) return;
    
    // Popola il form con i dati attuali
    document.getElementById('edit-name').value = currentUser.name || '';
    document.getElementById('edit-email').value = currentUser.email;
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-confirm-password').value = '';
    
    // Mostra il form e nascondi le info
    document.getElementById('edit-profile-form').style.display = 'block';
    document.getElementById('profile-info').style.display = 'none';
}

function hideEditForm() {
    // Nascondi il form e mostra le info
    document.getElementById('edit-profile-form').style.display = 'none';
    document.getElementById('profile-info').style.display = 'block';
    
    // Reset form
    document.getElementById('profile-form').reset();
}

function handleProfileUpdate(event) {
    event.preventDefault();
    
    const currentUser = JSON.parse(localStorage.getItem('mc-user') || 'null');
    if (!currentUser) {
        showProfileMessage('Errore: utente non trovato', 'error');
        return;
    }
    
    // Raccogli dati dal form
    const newName = document.getElementById('edit-name').value.trim();
    const newEmail = document.getElementById('edit-email').value.trim();
    const newPassword = document.getElementById('edit-password').value;
    const confirmPassword = document.getElementById('edit-confirm-password').value;
    
    // Validazioni
    if (!isValidEmail(newEmail)) {
        showProfileMessage('Email non valida', 'error');
        return;
    }
    
    if (newPassword && newPassword.length < 6) {
        showProfileMessage('La password deve essere di almeno 6 caratteri', 'error');
        return;
    }
    
    if (newPassword && newPassword !== confirmPassword) {
        showProfileMessage('Le password non coincidono', 'error');
        return;
    }
    
    // Controlla se email è già usata da altro utente
    const allUsers = JSON.parse(localStorage.getItem('mc-users') || '[]');
    const emailExists = allUsers.find(u => u.email === newEmail && u.id !== currentUser.id);
    
    if (emailExists) {
        showProfileMessage('Questa email è già utilizzata da un altro account', 'error');
        return;
    }
    
    // Aggiorna i dati utente
    const updatedUser = {
        ...currentUser,
        name: newName || 'Anonimo',
        email: newEmail
    };
    
    // Aggiorna password se fornita
    if (newPassword) {
        updatedUser.password = newPassword;
    }
    
    // Salva utente aggiornato
    const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        allUsers[userIndex] = updatedUser;
        localStorage.setItem('mc-users', JSON.stringify(allUsers));
    }
    
    // Aggiorna utente corrente
    localStorage.setItem('mc-user', JSON.stringify(updatedUser));
    localStorage.setItem('mc-email', updatedUser.email); // Per la dashboard
    
    // Aggiorna email globale se cambiata
    if (newEmail !== userEmail) {
        userEmail = newEmail;
    }
    
    // Aggiorna UI
    populateProfileInfo();
    hideEditForm();
    
    showProfileMessage('Profilo aggiornato con successo!', 'success');
    
    console.log('Profilo aggiornato:', updatedUser.email);
}

function exportUserData() {
    const currentUser = JSON.parse(localStorage.getItem('mc-user') || 'null');
    if (!currentUser) {
        showProfileMessage('Errore: utente non trovato', 'error');
        return;
    }
    
    // Raccogli tutti i dati dell'utente
    const userUcmes = ucmeData.filter(ucme => ucme.email === currentUser.email);
    const userResponses = risposteData.filter(resp => 
        userUcmes.some(ucme => ucme.id === resp.ucmeId)
    );
    
    const exportData = {
        user: currentUser,
        ucmes: userUcmes,
        responses: userResponses,
        exportDate: new Date().toISOString(),
        totalUcmes: userUcmes.length,
        totalResponses: userResponses.length
    };
    
    // Crea e scarica file JSON
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mental-commons-dati-${currentUser.email.replace('@', '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showProfileMessage('Dati esportati con successo!', 'success');
    console.log('Dati utente esportati');
}

function handleDeleteAccount() {
    const confirmed = confirm(
        'Sei sicuro di voler eliminare il tuo account?\n\n' +
        'Questa azione:\n' +
        '• Eliminerà tutti i tuoi pensieri (UCMe)\n' +
        '• Eliminerà tutte le risposte ricevute\n' +
        '• Eliminerà il tuo profilo\n' +
        '• NON PUÒ ESSERE ANNULLATA\n\n' +
        'Digita "ELIMINA" per confermare:'
    );
    
    if (!confirmed) return;
    
    const finalConfirm = prompt(
        'Per confermare l\'eliminazione, digita esattamente: ELIMINA'
    );
    
    if (finalConfirm !== 'ELIMINA') {
        showProfileMessage('Eliminazione annullata', 'info');
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('mc-user') || 'null');
    if (!currentUser) {
        showProfileMessage('Errore: utente non trovato', 'error');
        return;
    }
    
    // Rimuovi utente dalla lista
    const allUsers = JSON.parse(localStorage.getItem('mc-users') || '[]');
    const filteredUsers = allUsers.filter(u => u.id !== currentUser.id);
    localStorage.setItem('mc-users', JSON.stringify(filteredUsers));
    
    // Rimuovi dati locali dell'utente
    localStorage.removeItem('mc-user');
    localStorage.removeItem('mc-email');
    
    // Nota: In una implementazione reale, dovresti anche eliminare
    // UCMe e risposte dal server/database
    
    alert('Account eliminato con successo.\nSarai reindirizzato alla homepage.');
    
    // Reindirizza alla homepage
    window.location.href = 'index.html';
}

function showProfileMessage(message, type) {
    // Crea elemento messaggio se non esiste
    let messageEl = document.getElementById('profile-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'profile-message';
        messageEl.style.cssText = `
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        `;
        document.querySelector('.profile-section').insertBefore(
            messageEl, 
            document.querySelector('.profile-info')
        );
    }
    
    // Stili in base al tipo
    const styles = {
        success: 'background: #2d5a2d; border: 1px solid #4a8a4a; color: #90ee90;',
        error: 'background: #5a2d2d; border: 1px solid #8a4a4a; color: #ff6b6b;',
        info: 'background: #2d3a5a; border: 1px solid #4a5a8a; color: #87ceeb;'
    };
    
    messageEl.style.cssText += styles[type] || styles.info;
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Auto-hide dopo 5 secondi
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
} 