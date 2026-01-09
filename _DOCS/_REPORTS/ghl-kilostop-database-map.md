# GoHighLevel Kilostop - Database Map
> Raport comprehensiv generat pe 7 Ianuarie 2026
> Ultima actualizare: 7 Ianuarie 2026 (investigație aprofundată)

---

## Executive Summary

| Metric | Valoare | Notă |
|--------|---------|------|
| **Total Contacte** | 107,236 | +7 față de raportul inițial |
| **Total Oportunități** | 57,171 | Distribuite în 5 pipelines |
| **Total Conversații** | 68,256 | Predominant email automatizat |
| **Email Campaigns** | 375 | Active |
| **Workflows** | 100+ | Published |
| **Calendare** | 46 | 20 medici + speciale |
| **Custom Fields** | 118 | Pentru contacte |
| **Tags** | 192 | Organizate pe categorii |
| **Email Templates** | 370+ | În 16 foldere |
| **Produse** | 8 | Doar 2 disponibile |
| **Survey-uri** | 7 | NPS + feedback |
| **Pipelines** | 5 | Vezi breakdown detaliat |
| **Tasks** | 7 | Nefolosit sistematic |
| **Orders** | 2 | Doar teste |
| **Transactions** | 8 | Doar teste |
| **Blog Sites** | 0 | Nefolosit |
| **Custom Objects** | 0 | Doar cele sistem |

---

## 1. Location Details

```
Nume:     Clinica Kilostop
Email:    cristian.panaite@kilostop.ro
Telefon:  +40720900690
Website:  https://www.kilostop.ro
Adresă:   Soseaua Nicolae Titulescu 88B, București, România
Timezone: Europe/Bucharest
```

### Setări Location
- **Allow Duplicate Contact**: Nu
- **Allow Duplicate Opportunity**: Nu
- **Contact Unique Identifiers**: Phone, Email
- **SaaS Mode**: Activat

---

## 2. Sales Pipelines

### 2.1 Main Funnel (48,716 oportunități)
Pipeline-ul principal de vânzări cu 8 stage-uri:

| # | Stage | Count | % | Descriere |
|---|-------|-------|---|-----------|
| 1 | SM - Social Media | 4 | 0.01% | Contacte din social media |
| 2 | **P - Prospect** | **38,442** | **78.9%** | Prospecți (majoritate) |
| 3 | E - Engaged Prospect | 0 | 0% | Prospecți angajați (nefolosit) |
| 4 | Q - Qualified Prospect | 5,313 | 10.9% | Prospecți calificați (solicitare S0) |
| 5 | CI - Client Inițial | 848 | 1.7% | Clienți care au făcut prima consultație |
| 6 | CA - Client Actual | 681 | 1.4% | Clienți actuali în programe |
| 7 | CV - Client Vechi | 3,428 | 7.0% | Foști clienți |
| 8 | Client Vechi - Orice Program | 0 | 0% | Clienți vechi generali (nefolosit) |

**Legendă**: SM = Social Media, P = Prospect, E = Engaged, Q = Qualified, CI = Client Inițial, CA = Client Actual, CV = Client Vechi

**Insight**: 78.9% din oportunități sunt în stadiul de Prospect. Conversion funnel: P→Q = 13.8%, Q→CI = 16.0%, CI→CA = 80.3%

### 2.2 Clienti Vechi Reactivare (7,778 oportunități)
Pipeline pentru reactivarea clienților vechi prin WhatsApp:

| # | Stage | Count | % | Status |
|---|-------|-------|---|--------|
| 1 | Trimis Mesaj | 352 | 4.5% | În curs |
| 2 | A Răspuns | 17 | 0.2% | În curs |
| 3 | **Menținut** ✅ | **2,531** | **32.5%** | Succes |
| 4 | Nemenținte - Followup IN CURS - nu a răspuns | 1 | 0.01% | În curs |
| 5 | Nemenținte - Followup IN CURS - vrea programare | 8 | 0.1% | În curs |
| 6 | Nemenținte - Followup FINALIZAT | 1,231 | 15.8% | Finalizat |
| 7 | Nemenținte - Nu mai vrea | 211 | 2.7% | Pierdut |
| 8 | **Programat** 👍 | **226** | **2.9%** | Succes |
| 9 | Nu mai vrea Kilostop 🛑 | 229 | 2.9% | Pierdut |
| 10 | **Nu Răspuns după 3** | **2,526** | **32.5%** | Blocat |
| 11 | Abandonat 30 zile | 0 | 0% | - |
| 12 | Nemenținte - Followup | 0 | 0% | - |
| 13 | Mesaj netrimis - Nu are WhatsApp | 446 | 5.7% | Blocat |

**Insight Reactivare**:
- **Succes total**: 2,757 (35.4%) - Menținut + Programat
- **Blocați**: 2,972 (38.2%) - Nu răspuns + Fără WhatsApp
- **Pierduți**: 440 (5.7%) - Nu mai vor
- **În curs/Finalizat**: 1,609 (20.7%)

### 2.3 Webinars (543 oportunități)
Tracking pentru webinar funnel:

| # | Stage |
|---|-------|
| 1 | Registered Webinar |
| 2 | Attended Webinar |
| 3 | Clicked on Offer |
| 4 | S0 Cereri - adaugă în Main Funnel |

### 2.4 Sales S0 (0 oportunități active)
Procesul de vânzări pentru consultații S0:

| # | Stage |
|---|-------|
| 1 | Solicitări S0 |
| 2 | Nu răspunde |
| 3 | De Revenit |
| 4 | Renunțări |
| 5 | Programat S0 |
| 6 | Efectuat S0 |
| 7 | Nu acum |
| 8 | Not A Good Fit |

### 2.5 Tmp - Sortare pacienți vechi (134 oportunități)
Pipeline temporar pentru sortare:

| # | Stage |
|---|-------|
| 1 | Toți pacienții vechi |
| 2 | Pacienți ok de reactivat |
| 3 | Are deja programare în curând |
| 4 | Programare în KS nu apare în ALF - investigare |
| 5 | Reactivați - adăugați în funnel reactivare |

---

## 3. Custom Objects & Associations

### 3.1 Obiecte Disponibile (doar sistem-defined)
Nu există custom objects create. Doar cele 3 obiecte sistem:

| Object | Required | Searchable | Type |
|--------|----------|------------|------|
| **Contact** | `contact.email` | name, email, businessName, tags, phone | SYSTEM_DEFINED |
| **Opportunity** | `opportunity.name` | name, contactPhone, contactEmail, businessName, tags, contactName | SYSTEM_DEFINED |
| **Company (Business)** | `business.name` | business.name | SYSTEM_DEFINED |

### 3.2 Asocieri (2 total)
| Asociere | Tip | Prima Entitate | A Doua Entitate |
|----------|-----|----------------|-----------------|
| OPPORTUNITIES_CONTACTS | SYSTEM_DEFINED | Opportunity → Contact | Contact → Opportunity |
| BUSINESSES_CONTACTS | SYSTEM_DEFINED | Primary Company → Business | Contact → Contact |

**Notă**: Nu există asocieri custom definite.

---

## 4. Custom Fields pentru Contacte (118 total)

### 4.1 Informații Generale
| Field | Key | Tip |
|-------|-----|-----|
| Ce vârstă ai? | `contact.ce_varsta_ai` | TEXT |
| Data nașterii | `contact.data_naterii` | TEXT |
| Ești femeie sau bărbat? | `contact.esti_femeie_sau_barbat` | TEXT |
| Câte Kg vrei să slăbești? | `contact.cate_kg_vrei_sa_slabesti_pana_la_greutatea_ideala` | TEXT |

### 4.2 Informații Clinică/Pacient
| Field | Key | Tip |
|-------|-----|-----|
| Nume Clinică | `contact.nume_clinica` | TEXT |
| Medic | `contact.medic` | TEXT |
| Pachet | `contact.pachet` | TEXT |
| Manoperă | `contact.manopera` | TEXT |
| Suma plătită în Total | `contact.suma_platita` | NUMERICAL |
| Ultima Comunicare | `contact.ultima_comunicare` | TEXT |
| Kilosoft ID | `contact.kilosoft_id` | NUMERICAL |

### 4.3 Vouchers (Kilosoft Integration)
| Field | Key | Tip |
|-------|-----|-----|
| Tip Voucher | `contact.kilosoft_voucher_tip` | TEXT |
| Valoare Voucher Curent | `contact.kilosoft_voucher_curent_valoare` | NUMERICAL |
| Total Acumulat | `contact.kilosoft_voucher_total_acumulat` | NUMERICAL |
| Primul Voucher Care Expiră (Data) | `contact.kilosoft_voucher_expira_primul_data` | TEXT |
| Primul Voucher Care Expiră (Valoare) | `contact.kilosoft_voucher_expira_primul_valoare` | NUMERICAL |

### 4.4 Quiz 4O (Tipare de Obezitate)
| Field | Key | Tip |
|-------|-----|-----|
| Creier Nesătul | `contact.creier_nesatul` | NUMERICAL |
| Intestin Nesătul | `contact.intestin_nesatul` | NUMERICAL |
| Mâncat Emoțional | `contact.mancat_emotional` | NUMERICAL |
| Arderi Lente | `contact.arderi_lente` | NUMERICAL |
| 4O Quiz Highest Result | `contact.4o_quiz_highest_result` | TEXT |
| 4O Quiz Results Raport Link | `contact.4o_quiz_results_raport_link` | TEXT |
| 4O Quiz Nr Kilograme Answer | `contact.4o_quiz_nr_kilograme_answer` | NUMERICAL |
| 4O Quiz Motivație Slăbit Answer | `contact.4o_quiz_motivatie_slabit_answer` | TEXT |
| Quiz Lucrat cu Nutriționist | `contact.quiz_lucrat_cu_nutritionist` | TEXT |
| Quiz Schimbări Stil Viață | `contact.quiz_schimbari_stil_viata` | TEXT |

### 4.5 Programări/Appointments
| Field | Key | Tip |
|-------|-----|-----|
| Data Ultima Programare | `contact.data_ultima_programare` | TEXT |
| Data Calendaristică Ultima Programare | `contact.data_calendaristica_ultima_programare` | DATE |
| Appointment Title | `contact.appointment_title` | TEXT |
| Appointment Start Time | `contact.appt_start_time` | TEXT |
| Appointment End Time | `contact.appt_end_time` | TEXT |
| Appointment Duration | `contact.appt_duration` | NUMERICAL |
| Ziua Programării | `contact.ziua_programarii` | TEXT |
| Data Programare Formatată | `contact.data_programare_formatata` | TEXT |
| Medic Appointment Owner | `contact.medic_appointment_owner` | TEXT |
| RMR Start Time | `contact.rmr_start_time` | TEXT |
| Appointment Title RMR | `contact.appointment_title_rmr` | TEXT |

### 4.6 Confirmări Automate
| Field | Key | Tip | Opțiuni |
|-------|-----|-----|---------|
| Confirmare automată - status prezență | `contact.confirmari_automate_status_prezenta` | RADIO | DA, confirm / NU, nu pot veni |
| Confirmare automată - format consultație | `contact.confirmari_automate_format_consultatie` | RADIO | Fizic, la clinică / Online, de la distanță |
| Status prezență consultație | `contact.status_prezenta_consultatie` | SINGLE_OPTIONS | Da, confirm / Nu, nu pot veni |
| Motiv neprezentare consultație | `contact.motiv_neprezentare_consultatie` | LARGE_TEXT | - |

### 4.7 NPS & Feedback
| Field | Key | Tip |
|-------|-----|-----|
| Nota NPS | `contact.nota_nps` | NUMERICAL |
| Stele Medici | `contact.feedback_stars_medic` | RADIO (1-5 stele) |
| Stele Recepție | `contact.feedback_stars_receptie` | RADIO (1-5 stele) |
| Experiența cu MEDICUL | `contact.rating_rat584_56s1` | NUMERICAL |
| Experiența cu RECEPȚIA | `contact.rating_rat584_6phw` | NUMERICAL |
| Sugestie Îmbunătățire | `contact.sugestie_imbunatatire_feedback_scurt` | LARGE_TEXT |

#### NPS Promotori (nota 9-10)
| Field | Key |
|-------|-----|
| Care a fost elementul cheie în succes? | `contact.nps_promotor_q1` |
| Cum v-a schimbat viața programul? | `contact.nps_promotor_q2` |
| Ați împărtăși povestea de succes? | `contact.nps_promotor_q3` |

#### NPS Pasivi (nota 7-8)
| Field | Key |
|-------|-----|
| Ce aspecte v-au plăcut cel mai mult? | `contact.nps_pasiv_q1` |
| Care aspecte ar putea fi îmbunătățite? | `contact.nps_pasiv_q2` |
| Alte aspecte de îmbunătățit? | `contact.nps_pasiv_q3` |
| Ce servicii adiționale v-ar fi de folos? | `contact.nps_pasiv_q4` |

#### NPS Detractori (nota 1-6)
| Field | Key |
|-------|-----|
| Principalul motiv nemulțumire | `contact.nps_detractor_q1` |
| Ce aspecte v-au creat dificultăți? | `contact.nps_detractor_q2` |
| Alte aspecte care au creat dificultăți? | `contact.nps_detractor_q3` |
| Ce ar trebui să schimbăm? | `contact.nps_detractor_q4` |
| Doriți să fiți contactat? | `contact.nps_detractor_q5` |

### 4.8 Ziua Porților Deschise Feedback
| Field | Key | Tip |
|-------|-----|-----|
| La ce clinică ai fost? | `contact.feedback_zpd_q1_clinica` | CHECKBOX |
| La ce activități ai participat? | `contact.feedback_zpd_q2_activitati` | CHECKBOX |
| Ce ți-a plăcut/nu ți-a plăcut? | `contact.feedback_zpd_q3_placut` | LARGE_TEXT |
| Ce am putea îmbunătăți? | `contact.feedback_zpd_q4_imbunatatire` | LARGE_TEXT |
| Cum evaluezi experiența? | `contact.rating_rat584_cum_evaluezi_experiena` | NUMERICAL |

### 4.9 Formular Online
| Field | Key | Tip |
|-------|-----|-----|
| _Preț | `contact._pret` | TEXT |
| _Bonus | `contact._bonus` | TEXT |
| _Flyercod | `contact._flyercod` | TEXT |
| _CLtipprogram | `contact._cltipprogram` | TEXT |
| Vrei să ne transmiți și altceva? | `contact.vrei_sa_ne_transmiti_si_altceva` | TEXT |

### 4.10 Webinar Fields
| Field | Key | Tip |
|-------|-----|-----|
| Last Webinar | `contact.last_webinar` | TEXT |
| Webinar Link Personal Demio | `contact.webinar_link_personal_demio` | TEXT |
| Webinar Replay Requested | `contact.webinar_replay_requested` | TEXT |

### 4.11 Alte Fields
| Field | Key | Tip |
|-------|-----|-----|
| Mesaj de Trimis | `contact.mesaj_de_trimis` | TEXT |
| Sumar Evoluție | `contact.sumar_evolutie` | LARGE_TEXT |
| Unsubscribed Date | `contact.unsubscribed_date` | DATE |
| GDPR | `contact.gdpr` | CHECKBOX |
| Password | `contact.password` | TEXT |
| P.028 workflow entered date | `contact.p028_workflow_entered_date` | DATE |
| P.030 workflow entered date | `contact.p030_workflow_entered_date` | DATE |

---

## 5. Calendare (46 total)

### 5.1 Calendare Medici
| Calendar |
|----------|
| Programări Dr. Amalia Arhire |
| Programări Dr. Ancuța Leonte |
| Programări Dr. Andra Neacșu |
| Programări Dr. Andreea Bărbulescu |
| Programări Dr. Andrei Panaite |
| Programări Dr. Ana Vochiță |
| Programări Dr. Adelina Păunescu |
| Programări Dr. Bianca Biban |
| Programări Dr. Cristian Panaite |
| Programări Dr. Elena Pușca |
| Programări Dr. Elena Țambrea |
| Programări Dr. Gabriela Profir |
| Programări Dr. Ioana Stavrositu |
| Programări Dr. Khadija Mourid |
| Programări Dr. Mădălina Alexandra Chițu |
| Programări Dr. Mădălina Piștea |
| Programări Dr. Mihaela Matei |
| Programări Dr. Mircea Munteanu |
| Programări Dr. Miruna Vlădică |
| Programări Dr. Teodora Pănescu |

### 5.2 Calendare Speciale
| Calendar | Descriere |
|----------|-----------|
| Analiza Compoziției Corporale (ACC) Unirii | Cadou gratuit |
| Analiza Compoziției Corporale (ACC) Victoriei | Cadou gratuit |
| Descoperă Clinica Kilostop Unirii | Analiză corporală gratuită |
| Descoperă Clinica Kilostop Victoriei | Analiză corporală gratuită |
| Investigație de metabolism Unirii | RMR gratuit |
| Programare la Grupul de Suport Kilostop | Grup suport |

---

## 6. Tags (192 total)

### 6.1 Tags pentru Liste
| Tag | Descriere |
|-----|-----------|
| `list clienti actuali` | Clienți în programe active |
| `list clienti vechi` | Foști clienți |
| `list newsletter` | Abonați newsletter |
| `list oferta` | Abonați oferte |
| `list personal kilostop` | Angajați |
| `list prospecti` | Prospecți potențiali |

### 6.2 Tags pentru Campanii
| Tag | Descriere |
|-----|-----------|
| `campanie - precalificare quiz 4o - prospect calificat` | Prospect calificat din quiz |
| `campanie - precalificare quiz 4o - prospect necalificat` | Prospect necalificat din quiz |
| `campanie - reactivare cv - *` | Multiple stage-uri pentru reactivare |
| `campanie - programare acc gratis - 2024` | Campanie ACC gratuit |
| `campanie - vara increderii - 2024` | Campanie vară |

### 6.3 Tags pentru Quiz 4O
| Tag |
|-----|
| `appscore - facut quiz 4o` |
| `appscore - 4o quiz finished` |
| `appscore - 4o quiz finished pacienti` |
| `appscore - 4o quiz finished prospecti` |
| `appscore - quiz oferta 03.25` |

### 6.4 Tags pentru Webinar
| Tag |
|-----|
| `webinar registration` |
| `attended webinar 09.12.2025` |
| `attended webinar 10.10.2024` |
| `inregistrare webinar participant` |
| `inregistrare webinar neparticipant dar bifat casuta` |

### 6.5 Tags pentru Formulare
| Tag |
|-----|
| `completat formular online programare` |
| `completat formular campanie vara 2024` |
| `optin ebook` |
| `opt-in - articulatii` |
| `opt-in - prediabet` |
| `bribe blog ks/tds` |

### 6.6 Tags pentru WhatsApp/Comunicare
| Tag |
|-----|
| `[whatsapp] - contact is not registered on whatsapp` |
| `[whatsapp] - lead capture` |
| `[whatsapp] - phone device is disconnected` |
| `[device] - default` |
| `[device] - kilostop unirii` |
| `[device] - kilostop victoriei` |

### 6.7 Tags pentru Pabbly Integration
| Tag |
|-----|
| `workflow - pabbly - adaugat in agenda telefonului - call center` |
| `workflow - pabbly - adaugat in agenda telefonului - unirii` |
| `workflow - pabbly - adaugat in agenda telefonului - victoriei` |

### 6.8 Tags pentru NPS/Feedback
| Tag |
|-----|
| `nps - feedback provided` |
| `stars - feedback negativ fara raspuns` |
| `stars - feedback provided - wa` |

### 6.9 Tags pentru Status
| Tag |
|-----|
| `nu deranjati - in vanzare` |
| `consultatie efectuata` |
| `confirmari automate - a confirmat` |
| `programat calendar alf` |
| `spam complaint` |
| `unengaged 30 days` |
| `unengaged 90 days` |
| `unsubscribed newsletter` |
| `unsubscribed oferta` |
| `unsubscribed feedback` |
| `unsubscribed secventa` |
| `verificat email invalid` |

### 6.10 Tags Temporare (tmp-)
| Tag | Descriere |
|-----|-----------|
| `tmp - new contact` | Contact nou neprocesat |
| `tmp - confirmare * in curs` | Confirmare în așteptare |
| `tmp - grupa 1-20 - contacte newsletter cu email yahoo 2025` | Segmentare Yahoo |
| `tmp - programare s0/s1/rmr *` | Status programare |
| `tmp - reactivare cv` | În proces de reactivare |

### 6.11 Tags pentru Evenimente
| Tag |
|-----|
| `event - acc unirii - ziua portilor deschise - 07.2025` |
| `event - rmr victoriei - ziua portilor deschise - 07.2025` |
| `event - workshop amalia arhire - ziua portilor deschise - 07.2025` |
| `feedback - ziua portilor deschise` |

---

## 7. Email Marketing

### 7.1 Email Campaigns (375 total)
Campanii active și arhivate pentru newsletter și oferte.

**Statistici Newsletter Recent (06.01.2026)**:
- Gmail segment: 19,642 destinatari → 18,385 succesuri (93.6%)
- Yahoo grup 1-10: 9,739 destinatari → 9,360 succesuri (96.1%)
- Yahoo grup 11-20: 9,852 destinatari → 9,450 succesuri (95.9%)

### 7.2 Email Templates (370+ în 16 foldere)
| Folder | Templates |
|--------|-----------|
| Newslettere trimise în 2021 | 71 |
| Newslettere trimise în 2022 | 93 |
| Newslettere trimise în 2023 | 90 |
| Templates for Q workflows | 5 |
| Templates for P workflows | 40 |
| Templates for E workflows | 53 |
| Templates for M workflows | 4 |
| General templates | 7 |
| Archive | 4 |
| Test | 6 |

---

## 8. Workflows (100+ automatizări)

### 8.1 Categorii Workflow
| Prefix | Descriere |
|--------|-----------|
| `0️⃣-7️⃣ workflow *` | Lead magnet, tags, quiz |
| `CA.*` | Confirmări automate |
| `P.*` | Prospect workflows |
| `Q.*` | Solicitare S0 workflows |
| `E.*` | Webinar workflows |
| `M.*` | Mentenanță workflows |

### 8.2 Workflow-uri Principale (Published)
| Workflow | Descriere |
|----------|-----------|
| CA.001 - send confirmation email | Confirmări programări |
| CA.002 - dezabonare feedback | Unsubscribe handling |
| Abonat kilostop.ro/resurse | Resurse download |
| Form Confirmare Completat - * | Confirmări formulare |

### 8.3 Integrări Externe în Workflows
- **Pabbly** - Adăugare în agenda telefonului
- **Demio** - Link-uri webinar personalizate
- **Slack** - Notificări interne
- **Kilosoft** - Sincronizare pacienți

---

## 9. Survey-uri (7 total)

| Survey | Descriere |
|--------|-----------|
| SCA.021 - NPS - Detractori (Notele 1-6) | Feedback nemulțumiți |
| SCA.022 - NPS - Pasivi (Notele 7-8) | Feedback neutri |
| SCA.023 - NPS - Promotori (Notele 9-10) | Feedback mulțumiți |
| feedback general 5 stele | Rating general |
| feedback scurt 1-4 stele | Feedback negativ rapid |
| Survey 8 | Survey general |

---

## 10. Produse (8 total)

| Produs | Tip | Status |
|--------|-----|--------|
| Learning - Programul Ozempic Amalia Arhire 3 luni | SERVICE | Not Available |
| Ozempic Gratis Test (3 variante) | SERVICE | Not Available |
| Test Ozempic Gratuit | SERVICE | Not Available |
| Abonament 08.04 | DIGITAL | **Available** |
| Test digital 08.04.2024 | DIGITAL | **Available** |
| Test produs | SERVICE | Not Available |

---

## 11. Surse de Trafic

### 11.1 Attribution Tracking
Contactele au tracking complet pentru:
- **UTM Parameters**: source, medium, campaign, content, keyword, matchtype
- **Ad Platform IDs**: gclid (Google), fbclid (Facebook), campaign_id, ad_group_id, ad_id
- **User Data**: IP, user agent, referrer, GA Client ID, FBP/FBC cookies

### 11.2 Surse Principale
| Sursă | Tip |
|-------|-----|
| Google Ads | Paid Search (campaign IDs active) |
| Facebook/Instagram Ads | Paid Social (targeting București) |
| Direct traffic | Formulare site |
| Organic | Newsletter, referrals |

### 11.3 Landing Pages Monitorizate
- `/oferta-zilei` - LP principal
- `/oferta-zilei-2` - A/B test
- `/gratuit-deserturi-fara-zahar` - Lead magnet

---

## 12. Social Media

**Status**: Niciun cont conectat în GHL

---

## 13. Integrații Externe

| Integrare | Scop |
|-----------|------|
| **Kilosoft** | Sincronizare pacienți, vouchere, ID-uri |
| **Pabbly** | Automatizări telefon, agenda call center |
| **Demio** | Webinare, link-uri personalizate |
| **Slack** | Notificări interne echipă |
| **Twilio** | SMS (markup 10%, dezactivat) |
| **ALF** | Verificare programări |

---

## 14. Structura Contactelor

### 14.1 Contact Type
- **lead** - Prospecți noi

### 14.2 Lifecycle Stages
```
SM (Social Media) → P (Prospect) → E (Engaged) → Q (Qualified) → CI (Client Inițial) → CA (Client Actual) → CV (Client Vechi)
```

**Fluxul tipic**:
- Lead nou din ads → **P** (Prospect)
- Completează quiz/formular → **Q** (Qualified - solicitare S0)
- Face prima consultație → **CI** (Client Inițial)
- Începe program → **CA** (Client Actual)
- Finalizează/abandonează → **CV** (Client Vechi)

### 14.3 DND Settings
Fiecare contact poate avea DND pe:
- Call
- Email
- SMS
- Facebook
- GMB (Google My Business)
- WhatsApp

---

## 15. API & MCP Tools

### 15.1 Domenii Disponibile (19)
| Domeniu | Tools | Descriere |
|---------|-------|-----------|
| calendar | 39 | Programări, disponibilitate |
| contacts | 31 | Management contacte |
| locations | 24 | Setări sub-account |
| conversations | 21 | SMS, email, messaging |
| payments | 20 | Comenzi, tranzacții |
| store | 18 | E-commerce |
| invoices | 18 | Facturare |
| social | 17 | Social media |
| opportunities | 10 | Pipeline, deals |
| associations | 10 | Relații entități |
| products | 10 | Catalog produse |
| objects | 9 | Custom objects |
| customfields | 8 | Custom fields v2 |
| blog | 7 | Blog posts |
| email | 5 | Campanii email |
| media | 3 | Fișiere media |
| surveys | 2 | Chestionare |
| workflows | 1 | Automatizări |
| verification | 1 | Verificare email |

### 15.2 Tools Cheie
- `search_contacts` - Căutare contacte cu filtre
- `execute_pipeline` - Queries secvențiale cu variabile
- `execute_batch` - Operații bulk paralele
- `get_pipelines` - Lista pipeline-uri

---

## 16. Conversații (68,256 total)

### 16.1 Tipuri de Mesaje
| Tip | Descriere | Utilizare |
|-----|-----------|-----------|
| `TYPE_EMAIL` | Emails | Majoritate - automatizări |
| `TYPE_FACEBOOK` | Mesaje Facebook Messenger | Ocazional |
| `TYPE_CUSTOM_SMS` | SMS via WhatsApp/Custom provider | Reactivare clienți |

### 16.2 Caracteristici
- **Ultima direcție**: Majoritar `outbound` (automatizări)
- **Ultima acțiune**: `automated` (din workflows)
- **Scoring**: Lead scoring activ cu ID `6594647f1ede82b2e654a1e6`
- **Followers**: Unele conversații au followeri asignați

---

## 17. Payments & Invoices

### 17.1 Status: Nefolosit în Producție
Sistemul de plăți GHL **nu este folosit** pentru operațiunile reale. Toate datele sunt teste.

### 17.2 Facturi (7 total)
| # | Nume | Status | Sumă | Data |
|---|------|--------|------|------|
| 000008 | Factura noua | sent | 50 RON | Aug 2024 |
| 000006 | Text2Pay - Adrian | sent | 495 RON | Feb 2024 |
| 000005 | Text2Pay - Ana Sipciu | sent | 495 RON | Feb 2024 |
| 000004 | Text2Pay - Ancuta | sent | 495 RON | Feb 2024 |
| 000003 | Text2Pay - Andrei Calagiu | **paid** | 10 RON | Feb 2024 |
| 000002 | New Invoice | sent | 5 RON | Feb 2023 |
| 000001 | Cristian Panaite | **paid** | 4.5 RON | Feb 2023 |

### 17.3 Orders (2 total)
| Order | Contact | Sumă | Status | Sursă |
|-------|---------|------|--------|-------|
| Ozempic Gratis Test | Cristian Panaite | 21 RON | completed | membership |
| Programul Ozempic 3 luni | Cristian Panaite | 0 RON | pending | communities |

### 17.4 Transactions (8 total)
- **Succeeded**: 3 (25.5 RON total)
- **Refunded**: 2 (112 RON)
- **Failed**: 2
- **Partially Refunded**: 1
- **Provider**: Stripe (`acct_1MHqYMLx4wprPFJV`)

**Concluzie**: Plățile se procesează în afara GHL (probabil prin Kilosoft sau alt sistem).

---

## 18. Blog

**Status**: Nefolosit
- 0 site-uri blog configurate
- 0 articole publicate

---

## 19. Tasks (7 total)

### 19.1 Status
| Task | Contact | Assigned To | Due Date | Status |
|------|---------|-------------|----------|--------|
| revenire | Horea Sibisteanu | Alexandra Andreescu | 06.01.2026 | Open |
| test | Andreea Nechifor | - | 26.01.2025 | Open |
| Sun Maine | Cristian Panaite | Cristian Panaite | 23.01.2025 | Open |
| Suna maine | Alexandra Andreescu | Programări Kilostop | 23.01.2025 | **Completed** |
| revino marti | Constantin Anca | Andreea Nechifor | 24.12.2024 | Open |
| Suna si vezi reintoarcere | Constantin Anca | - | 29.01.2024 | **Completed** |
| Suna vezi ce mai face | Grosu Toma | - | 28.01.2024 | **Completed** |

### 19.2 Observații
- Tasks sunt folosite **minimal** (doar 7 în total)
- Utilizare principală: "de revenit" / "sună mâine"
- Nu e un sistem sistematic de task management

---

## 20. Zone Neexplorate / De Investigat

### 20.1 Parțial Explorate
| Zonă | Status | Ce știm | Ce lipsește |
|------|--------|---------|-------------|
| **Appointments** | ⚠️ | 46 calendare configurate | Număr total programări, statistici per calendar |
| **Email Templates Content** | ⚠️ | 370+ templates în 16 foldere | Conținutul efectiv al template-urilor |
| **Workflow Configuration** | ⚠️ | 100+ workflows, categorii | Configurația detaliată, triggere, acțiuni |
| **Custom Field Values** | ⚠️ | 118 câmpuri definite | Distribuția valorilor per câmp |
| **Attribution Analysis** | ⚠️ | UTM params, gclid, fbclid tracking | Analiza surselor de conversie |

### 20.2 Neexplorate
| Zonă | Motiv | Recomandare |
|------|-------|-------------|
| **Notes pe contacte** | Contactele noi nu au notes | Verifică contacte vechi cu activitate |
| **Recordings** | Nu am căutat | Ar putea exista înregistrări apeluri |
| **Forms** | Nu am explorat | Formulare de pe site/landing pages |
| **Funnels** | Nu am explorat | Structura funnels GHL |

### 20.3 Query-uri Recomandate pentru Investigații Viitoare
```
# Appointments per calendar (necesită calendarId)
get_calendar_events(calendarId, startTime, endTime)

# Custom field value distribution
search_contacts cu filtre pe custom fields

# Attribution analysis
search_contacts + group by attributionSource.sessionSource

# Contacte cu note
execute_pipeline cu get_contact_notes în loop
```

---

## 21. Recomandări

### 21.1 Oportunități de Îmbunătățire
1. **Pipeline Sales S0 gol** - De verificat dacă e intenționat sau eroare de configurare
2. **Social Media neconectat** - Oportunitate de integrare FB/IG
3. **Produse inactive** - Majoritatea produselor sunt "Not Available"
4. **Blog nefolosit** - Oportunitate pentru content marketing
5. **Tasks nefolosite** - De evaluat dacă ar ajuta echipa
6. **Payments în GHL** - Nu e folosit, totul merge prin alte sisteme

### 21.2 Date de Monitorizat
- **Rata de conversie Main Funnel**: P→Q = 13.8%, Q→CI = 16.0%, CI→CA = 80.3%
- **Succes reactivare**: 35.4% succes (2,757 din 7,778)
- **Blocați reactivare**: 38.2% (2,972) - potențial de deblocare
- **Eficiență email**: ~95% delivery rate

### 21.3 Pipeline IDs (pentru referință API)
| Pipeline | ID |
|----------|-----|
| Main Funnel | `XCcnOPUWUSE5XxXLfXBB` |
| Clienti Vechi Reactivare | `6s1kBPXVHaVwZ0wVLtuz` |
| Webinars | `oewV8e2iZwNFS8SCzqbK` |
| Sales S0 | `LoizBtLY8c3rEVYdXkW2` |
| Tmp - Sortare | `UOQpYDgejDutIoXLlcOQ` |

---

*Raport generat și actualizat automat prin GHL MCP Server*
*Ultima actualizare: 7 Ianuarie 2026*
