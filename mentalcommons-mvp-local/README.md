# Mental Commons - MVP Locale

> **🧠 Ogni mente è un mondo. Mental Commons è il loro ponte.**

Un MVP web minimale per una piattaforma di riflessione condivisa, completamente sviluppato in locale per test e validazione del concetto.

## 🎯 Obiettivo

Permettere agli utenti (Depositor) di scrivere e inviare pensieri difficili ("UCMe") attraverso un modulo semplice, per successive risposte umane manuali da parte di Portatori formati.

## 🚀 Come utilizzare

### 1. Apertura dell'applicazione
```bash
# Navigare nella directory del progetto
cd mentalcommons-mvp-local

# Aprire index.html nel browser
open index.html
# oppure fare doppio click sul file
```

### 2. Funzionalità principali
- **Scrittura UCMe**: Textarea con validazione 200-600 caratteri
- **Validazione email**: Campo email obbligatorio con controllo formato
- **Consenso**: Checkbox di accettazione obbligatoria
- **Salvataggio locale**: Dati salvati automaticamente nel localStorage del browser
- **Feedback visivo**: Contatore caratteri colorato e messaggio di conferma

### 3. Interfaccia utente
- Design minimalista bianco e nero
- Font Inter per massima leggibilità
- Layout responsive per desktop e mobile
- Animazioni leggere e transizioni fluide

## 🔧 Funzionalità tecniche

### Salvataggio dati
I dati vengono salvati nel `localStorage` del browser con la seguente struttura:
```json
{
  "id": "unique_id",
  "email": "user@email.com",
  "text": "Testo della UCMe...",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "pending",
  "response": null,
  "metadata": {
    "characterCount": 387,
    "userAgent": "Mozilla/5.0...",
    "language": "it-IT"
  }
}
```

### Console per amministratori
Aprire gli Strumenti per sviluppatori (F12) e utilizzare queste funzioni nella console:

```javascript
// Visualizza tutte le UCMe salvate
mentalCommons.getAllUcmes()

// Trova una UCMe specifica per ID
mentalCommons.getUcmeById('id_specifico')

// Esporta tutti i dati in un file JSON
mentalCommons.exportAllData()

// Visualizza statistiche
mentalCommons.getStats()

// Cancella tutti i dati (ATTENZIONE!)
mentalCommons.clearAllData()
```

## 📁 Struttura del progetto

```
mentalcommons-mvp-local/
├── index.html          # Pagina principale
├── style.css           # Stili minimalisti
├── script.js           # Logica JavaScript
├── data.json           # Esempio struttura dati
└── README.md           # Questa documentazione
```

## 🎨 Design

### Colori
- **Principale**: Bianco (#fff) e Nero (#000)
- **Testo secondario**: Grigio scuro (#333, #555)
- **Bordi**: Grigio chiaro (#ccc, #e0e0e0)
- **Accenti**: Rosso (#ff6b6b), Arancione (#ffa726), Verde (#4caf50)

### Tipografia
- **Font**: Inter (300, 400, 500, 600)
- **Titolo principale**: 3.5rem (mobile: 2rem)
- **Sottotitoli**: 2.5rem (mobile: 1.8rem)
- **Testo**: 1rem-1.1rem

### Layout
- **Container max-width**: 800px
- **Form max-width**: 600px
- **Padding**: 24px (mobile: 20px)
- **Spaziature**: Multiple di 8px/16px

## 🔒 Privacy e sicurezza

### Dati locali
- Tutti i dati rimangono nel browser dell'utente
- Nessun invio automatico a server esterni
- Possibilità di export manuale per l'admin

### Validazione
- Email: controllo formato regex
- Testo: lunghezza 200-600 caratteri
- Consenso: obbligatorio per l'invio

## 📊 Metriche da monitorare

L'MVP raccoglie automaticamente:
- Numero totale di UCMe inviate
- Lunghezza media dei testi
- Timestamp di creazione
- Metadati browser (per analytics)

## 🛠 Sviluppo futuro

### Prossimi step
1. **Backend**: Integrazione con database reale (Firebase/Supabase)
2. **Matching**: Sistema automatico Depositor-Portatore
3. **Email**: Notifiche automatiche di conferma
4. **Dashboard**: Interfaccia admin per gestione UCMe
5. **Mobile app**: Versione nativa per iOS/Android

### Possibili integrazioni
- **EmailJS**: Per invio email automatiche
- **Firebase**: Database cloud e autenticazione
- **Stripe**: Sistema di microdonazioni
- **Analytics**: Monitoraggio utilizzo

## ⚠️ Note importanti

- **Non toccare il progetto online**: Questo MVP è completamente separato dal sito web esistente
- **Solo uso locale**: Non fare push su GitHub o deploy su Vercel
- **Dati temporanei**: I dati nel localStorage possono essere persi se si cancella il browser
- **Testing**: Testare su diversi browser e dispositivi

## 📞 Supporto

Per domande o problemi:
1. Controllare la console del browser per errori
2. Verificare che JavaScript sia abilitato
3. Testare su browser diversi (Chrome, Firefox, Safari)
4. Aprire gli Strumenti per sviluppatori per debug

---

**Mental Commons MVP v1.0** - Sviluppato per validazione del concetto di riflessione condivisa 