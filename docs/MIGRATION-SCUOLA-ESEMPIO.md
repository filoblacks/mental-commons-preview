# Migrazione: Aggiunta Scuola Esempio

## 📋 Panoramica

Questa migrazione aggiunge la "Scuola Esempio" nella tabella `schools` del database Supabase con un codice di riferimento semplice per test e dimostrazione.

## 🏫 Dettagli Scuola

- **Nome**: Scuola Esempio
- **Codice Riferimento**: `SCUOLA001`
- **Tipo Pacchetto**: `essenziale`
- **Stato**: Attiva

## 📁 File Creati

1. **`supabase/migrations/20241220_add_scuola_esempio.sql`** - File di migrazione SQL
2. **`scripts/add-scuola-esempio-simple.js`** - Script Node.js per eseguire la migrazione
3. **`scripts/add-scuola-esempio-demo.js`** - Script demo che mostra il contenuto della migrazione

## 🚀 Come Eseguire la Migrazione

### Opzione 1: Script Node.js (Raccomandato)

1. **Configura le variabili ambiente Supabase**:
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_KEY="your-service-key"
   ```

2. **Esegui lo script**:
   ```bash
   node scripts/add-scuola-esempio-simple.js
   ```

### Opzione 2: Query SQL Diretta

Esegui direttamente nel database Supabase:

```sql
-- Inserimento della Scuola Esempio
INSERT INTO schools (name, code, package_type, is_active)
VALUES (
  'Scuola Esempio',
  'SCUOLA001',
  'essenziale',
  TRUE
)
ON CONFLICT (code) DO NOTHING;

-- Verifica inserimento
SELECT 
  name as "Nome Scuola",
  code as "Codice Riferimento",
  package_type as "Tipo Pacchetto",
  is_active as "Attiva",
  created_at as "Data Creazione"
FROM schools 
WHERE code = 'SCUOLA001';
```

## 🔍 Verifica

Dopo l'esecuzione, verifica che la scuola sia stata aggiunta correttamente:

```sql
SELECT * FROM schools WHERE code = 'SCUOLA001';
```

Dovresti vedere:
- `name`: "Scuola Esempio"
- `code`: "SCUOLA001"
- `package_type`: "essenziale"
- `is_active`: `true`
- `created_at`: timestamp corrente

## 🛡️ Sicurezza

- La migrazione usa `ON CONFLICT (code) DO NOTHING` per evitare duplicati
- Il codice `SCUOLA001` è semplice ma univoco
- La scuola è marcata come attiva (`is_active = true`)

## 📝 Note

- Questa scuola è destinata a test e dimostrazione
- Il codice `SCUOLA001` può essere utilizzato per testare le funzionalità di Mental Commons
- La scuola è configurata con il pacchetto "essenziale" che è il livello base

## 🔧 Risoluzione Problemi

### Variabili ambiente mancanti
Se ricevi l'errore "Variabili ambiente Supabase mancanti":
1. Verifica che `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` siano configurate
2. Controlla che le credenziali siano corrette
3. Assicurati di avere i permessi necessari sul database

### Errore di duplicazione
Se la scuola esiste già, lo script mostrerà un messaggio informativo e continuerà senza errori.

## 📞 Supporto

Per problemi con questa migrazione, consulta:
- La documentazione Supabase
- I log del database
- Il team di sviluppo Mental Commons 