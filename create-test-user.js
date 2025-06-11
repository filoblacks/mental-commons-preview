// Script per creare un utente di test per Mental Commons
// Esegui questo script nella console del browser per aggiungere un utente di test

function createTestUser() {
    const testUser = {
        id: 'test_user_' + Date.now(),
        email: 'test@mentalcommons.xyz',
        password: '123456',
        name: 'Utente Test',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isPortatore: false
    };
    
    // Recupera utenti esistenti o crea array vuoto
    const users = JSON.parse(localStorage.getItem('mc-users') || '[]');
    
    // Rimuovi utente esistente con la stessa email se presente
    const filteredUsers = users.filter(u => u.email !== testUser.email);
    
    // Aggiungi il nuovo utente
    filteredUsers.push(testUser);
    
    // Salva nel localStorage
    localStorage.setItem('mc-users', JSON.stringify(filteredUsers));
    
    console.log('✅ Utente di test creato:');
    console.log('📧 Email: test@mentalcommons.xyz');
    console.log('🔑 Password: 123456');
    console.log('');
    console.log('Ora puoi fare login con queste credenziali!');
    
    return testUser;
}

// Esegui la funzione
createTestUser(); 