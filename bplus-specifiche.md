# B+ Gestionale – Specifica Tecnica Completa
> Documento di riferimento per lo sviluppo continuo del gestionale HR Brico+  
> Aggiornato al: Settembre 2026

---

## 1. PANORAMICA PROGETTO

**Tipo:** Progressive Web App (PWA) – single HTML file, zero dipendenze esterne  
**Stack:** HTML5 + CSS3 + JavaScript vanilla  
**Persistenza:** localStorage (chiavi: `bplus_storico_settimane_v1`, `bplus_notifiche_v1`)  
**Tema:** Dark professionale, colore primario `#c62828`  
**Punti vendita:** Brico+ Gaggiolo · Cocquio · Daverio · Varese

---

## 2. STRUTTURA DATI

### 2.1 DIPENDENTE
```js
{
  id, nome, cognome, email, tel, password,
  ruolo,        // 1=Lavoratore, 2=Direttore, 3=Titolare
  negozio,      // 'GAG'|'COC'|'DAV'|'VAR'
  capGenerali,  // 1-5
  cap: {        // flag booleane competenze specifiche
    tintometro, chiavi, muletto, cassa, taglioLegno, kasanova
  },
  contratto,    // 'indeterminato'|'a termine'|'a chiamata'
  oreSett,      // ore settimanali contrattuali
  pausaTipo,    // 'flessibile'|'fissa'
  pausaMinuti,  // minuti se flessibile
  pausaOraIn, pausaOraOut,  // orari se fissa
  policyDom,    // '1 ogni 2'|'1 ogni 3'|'tutte'|'nessuna'
  oreRecupero,  // ore da recuperare
  uscita18: { n, su },  // es. {n:2, su:5} = 2 giorni su 5 uscita alle 18:00
  riposoSett,   // giorno riposo fisso settimanale (es. 'Mercoledì')
  riposoDom,    // ['Lunedì'] | ['casuale'] | [] = nessuno
  mobilita,     // array storeId dove può lavorare
  stato         // 'attivo'|'assente'|'ferie'|'malattia'
}
```

### 2.2 NEGOZIO (STORE)
```js
{
  id,           // 'GAG'|'COC'|'DAV'|'VAR'
  nome, addr,
  dip,          // numero dipendenti (riferimento)
  minGiorno,    // [7 valori Lun→Dom] personale minimo per giorno
  minPausa,     // [7 valori] min. personale fascia 12-15 (N/A se orario spezzato)
  orariApertura, // [7 oggetti] vedi sotto
  chiuso        // [7 bool] giorni di chiusura
}

// Oggetto orario:
{ tipo: 'continuo'|'spezzato'|'chiuso', m1, m2, p1, p2 }
// continuo: m1=apertura, p2=chiusura (m2,p1 ignorati)
// spezzato: m1-m2 mattina, p1-p2 pomeriggio
```

### 2.3 TURNO
```js
{ in, outP, inP, out }  // entrata · uscita pausa · rientro pausa · uscita
// oppure stringa: 'riposo'|'ferie'|'malattia'
```

### 2.4 ASSENZA
```js
{
  id, dipId, dip,   // dip = "Nome Cognome" (stringa)
  tipo,   // 'Ferie'|'Permesso'|'Malattia'|'Corso'|'Infortunio'|'Congedo'
  da, a,  // date ISO 'YYYY-MM-DD'
  stato,  // 'approvato'|'in attesa'|'rifiutato'
  negozio, note
}
```

### 2.5 CORSO
```js
{
  id, titolo, descrizione, ente,
  sessioni: [{ data, oraIn, oraOut }],
  partecipanti: [{ dipId, sessioni:[idx...], stato:'confermato'|'invitato'|'assente' }],
  stato: 'programmato'|'in corso'|'completato'|'annullato',
  obbligatorio: bool, note
}
```

### 2.6 STORICO SETTIMANE (localStorage)
```js
{
  weekStart,      // 'YYYY-MM-DD' (lunedì)
  weekLabel,      // '29 Lug – 4 Ago 2024'
  pubblicatoIl,   // ISOString
  pubblicatoDa,   // nome utente
  shifts: { [dipId]: [7 turni] },
  storeSnapshot: { [storeId]: { minGiorno, minPausa, chiuso } }
}
```

---

## 3. RUOLI E PERMESSI

| Funzione | Titolare (3) | Direttore (2) | Lavoratore (1) |
|---|---|---|---|
| Dashboard | Completa (tutti i negozi) | Solo proprio negozio | Solo turni propri + ferie |
| Dipendenti | CRUD completo | Solo lettura | Non visibile |
| Turni | Tutti i negozi, pubblica, auto-genera | Solo proprio negozio, modifica turni | Non visibile |
| Storico turni | Tutti | Solo proprio negozio + tab ferie | Non visibile |
| Assenze & Ferie | Vista globale + approvazione | Solo proprie richieste | Solo proprie richieste |
| Corsi | CRUD completo | Non visibile | Non visibile |
| Negozi | CRUD completo | Non visibile | Non visibile |
| Report | Sì | Non visibile | Non visibile |
| Notifiche | Riceve tutto incl. modifiche direttore | Riceve conferme proprie azioni | Riceve modifiche turni propri |

**Regola speciale:** Quando il Direttore modifica un turno su settimana pubblicata → notifica push sia al dipendente che al Titolare.

---

## 4. LOGICHE DI BUSINESS

### 4.1 Generazione turni automatica
- Basata sullo storico settimane pubblicate (`STORICO_SETTIMANE`)
- Per ogni dipendente analizza la fascia oraria prevalente (mattina/pomeriggio/sera) per ogni giorno della settimana nelle settimane passate
- Mantiene la continuità: stessa fascia storica + rotazione `+_genCounter` per soluzioni diverse ad ogni chiamata
- Considera: riposo settimanale fisso, policy domenicale, assenze approvate nel periodo, mobilità inter-negozio
- Orario spezzato: ignora il minimo pausa; assegna mattina (m1–m2) o pomeriggio (p1–p2) in base alla fascia
- Uscita 18:00: se il dipendente ha `uscita18.n > 0`, ogni N turni il sistema imposta l'uscita alle 18:00

### 4.2 Policy domenicale
- `tutte` = lavora ogni domenica
- `1 ogni 2` = lavora domeniche 1ª, 3ª, 5ª...
- `1 ogni 3` = lavora domeniche 1ª, 4ª, 7ª...
- `nessuna` = non lavora mai domenica

### 4.3 Recupero domenica su ferie
Quando si inseriscono ferie che includono una domenica "dovuta":
1. Sistema calcola le domeniche dovute in base alla policy
2. Propone recupero su: **domenica precedente** l'inizio ferie O **domenica successiva** alla fine ferie
3. Il recupero viene registrato come "Permesso" con nota esplicativa
4. Il recupero può avvenire SOLO in un'altra domenica

### 4.4 Assegnazioni settimanali per negozio
- `ASSEGNAZIONI_SETTIMANA: { storeId: [dipId...] }` — sovrascrive il filtro base `d.negozio===s.id`
- Permette di aggiungere dipendenti da altri negozi (con mobilità) per singola settimana
- Reset a default (negozio principale) ad ogni nuova settimana
- Caricamento dallo storico quando si naviga su settimana passata

### 4.5 Richiesta ferie con fascia oraria parziale
Per Ferie e Permesso è possibile specificare:
- Fascia oraria specifica (dalle/alle)
- Entrata posticipata (solo orario entrata)
- Uscita anticipata (solo orario uscita)
- Giornata intera (default)
Il dettaglio viene aggiunto nelle note dell'assenza.

### 4.6 Orario spezzato negozio
- `minPausa` non applicabile → mostrato come "N/A"
- Auto-generazione assegna mattina o pomeriggio, non turni continui
- Campo pausa disabilitato nella modale di modifica negozio

---

## 5. SISTEMA NOTIFICHE PUSH

- Service Worker registrato via blob URL (per single-file)
- Chiave localStorage: `bplus_notifiche_v1` (max 200 notifiche)
- Tipi: `info` · `success` · `warning` · `turno` · `assenza` · `sostituzione` · `corso`

### Trigger notifiche automatiche:
| Evento | Destinatari |
|---|---|
| Pubblicazione settimana | Tutti i dipendenti in turno (collettiva + individuale) |
| Modifica turno su settimana pubblicata (da Titolare) | Dipendente interessato |
| Modifica turno su settimana pubblicata (da Direttore) | Dipendente interessato + Titolare |
| Assenza inserita su settimana pubblicata | Alert interno + proposta sostituzione |
| Proposta sostituzione accettata | Sostituto proposto |

---

## 6. CALENDARIO ASSENZE

- Sempre visibile in cima alla sezione Assenze & Ferie (solo Titolare)
- Navigazione mese/anno con ◀ ▶ e bottone "Oggi"
- Filtri: per negozio, per tipo assenza
- Click su riga lista → calendario salta al mese corrispondente + riga evidenziata
- Colori: verde=ferie approvate, blu=permesso, rosso=malattia, teal=corso, arancio=in attesa

---

## 7. SEZIONI APPLICAZIONE

| Sezione | Ruoli | Note |
|---|---|---|
| Dashboard | Tutti (vista diversa per ruolo) | Titolare: turni oggi × negozio, copertura, assenti, alert |
| Dipendenti | Solo Titolare | CRUD con tab Anagrafica / Contratto & Turni / Assenze |
| Turni | Titolare + Direttore | Vista per negozio, aggiungi/rimuovi lavoratori, edit turno a 4 orari |
| Storico turni | Titolare + Direttore | Titolare: tutti i negozi; Direttore: solo proprio + tab ferie |
| Assenze & Ferie | Titolare (globale) / Direttore+Lavoratore (personale) | |
| Corsi | Solo Titolare | Sessioni multiple, flag partecipanti per sessione, auto-assenza |
| Punti Vendita | Solo Titolare | Orario continuo o spezzato per giorno, min. pers., min. pausa |
| Report | Solo Titolare | PDF/Excel, report personalizzato |
| Notifiche | Tutti | Pannello laterale, badge contatore, segna letto |

---

## 8. NOTE IMPLEMENTATIVE

- **Demo ruoli:** Switcher in basso nella sidebar (clicca sul nome utente)
  - Titolare: Marco Rossi
  - Direttore: Marco Ferrari (Gaggiolo)
  - Lavoratore: Laura Bianchi (Varese)
- **Variabili globali chiave:** `RUOLO_CORRENTE`, `NEGOZIO_CORRENTE`, `CURRENT_WEEK_START`, `ASSEGNAZIONI_SETTIMANA`, `_genCounter`
- **Funzione di routing:** `render(page)` + `adaptNavToRole()`
- **Modal riusabile:** `openModal(title, body, confirmLabel, onConfirm, showFooter)`
- **Toast:** `showToast(msg, type)` – type: `'ok'|'err'|'info'`
- **StorageKey storico:** `bplus_storico_settimane_v1`
- **StorageKey notifiche:** `bplus_notifiche_v1`

---

## 9. MODIFICHE FUTURE SUGGERITE

- [ ] Backend REST API + autenticazione reale (JWT)
- [ ] Database reale (PostgreSQL) invece di localStorage
- [ ] Esportazione PDF/Excel reale (jsPDF, SheetJS)
- [ ] Multi-account con sessioni separate per ogni dipendente
- [ ] App mobile nativa (React Native o PWA installabile su iOS/Android)
- [ ] Integrazione calendario Google/Outlook per sync ferie
- [ ] Algoritmo auto-generazione più sofisticato (con constraints solver)
- [ ] Storico modifiche turni (audit log)
