# SPRINT-4 – Sistema Risposte UCMe

> Versione database: `2024-06-25-fase0`

## Obiettivi
1. Separare i ruoli **Depositori** e **Portatori**.
2. Introdurre tabella `risposte` per memorizzare le risposte dei Portatori alle UCMe.
3. Garantire RLS per privacy data-centriche.

## Schema introdotto
```sql
-- vedi `supabase-optimized-schema.sql`, sezione *FASE 0 – RUOLI PORTATORI & RISPOSTE*
```

### Tabella `portatori`
| Colonna | Tipo | Note |
|---------|------|------|
| id | UUID PK | generato da `gen_random_uuid()` |
| user_id | UUID UNIQUE NOT NULL | FK `users(id)` – 1:1 con utente |
| bio | TEXT | Bio pubblica opzionale |
| attivo | BOOLEAN DEFAULT TRUE | Soft-delete del Portatore |
| created_at | TIMESTAMPTZ | default `now()` |
| updated_at | TIMESTAMPTZ | auto-update trigger |

### Tabella `risposte`
| Colonna | Tipo | Note |
|---------|------|------|
| id | UUID PK |
| ucme_id | UUID FK | verso `ucmes(id)` |
| portatore_id | UUID FK | verso `portatori(id)` |
| testo | TEXT NOT NULL | corpo della risposta |
| visibile | BOOLEAN DEFAULT TRUE | moderazione |
| letto_da_utente | BOOLEAN DEFAULT FALSE | stato di lettura |
| created_at | TIMESTAMPTZ | default `now()` |

## RLS
* **portatori**: accesso limitato allʼowner (`user_id = auth.uid()`).
* **risposte**:
  * SELECT da parte del **Portatore autore** o del **Depositor** della UCMe.
  * INSERT/UPDATE/DELETE consentiti solo al Portatore autore.

## Triggers
* Sync flag `users.is_portatore` a `TRUE/FALSE` su INSERT/DELETE di `portatori`.
* Auto-update campo `updated_at` in `portatori`.

## Passi di deploy
1. `supabase db push` o `supabase migration apply`.
2. Verificare che tutte le policy siano attive con `supabase db inspect`.
3. Test automatici:
   ```bash
   supabase db remote commit -m "Test Fase0"
   ```

## Note future
* Implementare vista `ucmes_with_risposte` per ridurre join in FE.
* Considerare soft-delete logico anche su `risposte`. 