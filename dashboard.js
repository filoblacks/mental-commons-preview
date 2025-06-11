// Dashboard Mental Commons - Spazio personale del Depositor

// Variabili globali
let userEmail = null;
let ucmeData = [];
let risposteData = [];

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
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