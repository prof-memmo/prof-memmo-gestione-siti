// --- Ecosistema UI Service ---
// Gestisce gli interruttori globali per l'ecosistema Hub

const EcosistemaUI = {
    settingsData: {},
    
    init: function() {
        if (!window.EcosystemService) {
            console.error("EcosystemService non caricato.");
            return;
        }
        
        window.EcosystemService.listenToEcosystemSettings(data => {
            if (data) {
                this.settingsData = data;
                this.renderUI();
            }
        });
    },

    renderUI: function() {
        const data = this.settingsData;
        
        // Aggiornamento Light Switches
        this.updateSwitchVisuals('sostieni', !!data.sostieni_il_progetto);
        this.updateSwitchVisuals('monetizzazione', !!data.monetizzazione);
        this.updateSwitchVisuals('esperienze', !!data.esperienze);
        this.updateSwitchVisuals('come-funziona', data.come_funziona_visibile !== false);

        // Aggiornamento Campi Sostieni il Progetto
        const sostieni = data.sostieni_config || {};
        const elPaypal = document.getElementById('sostieni-paypal-link');
        const elTestoGratuito = document.getElementById('sostieni-testo-gratuito');
        const elTestoFuturo = document.getElementById('sostieni-testo-futuro');
        const elRingraziamento = document.getElementById('sostieni-ringraziamento');
        
        if (elPaypal) elPaypal.value = sostieni.paypal_link || '';
        if (elTestoGratuito) elTestoGratuito.value = sostieni.testo_gratuito || "❤️ Sostieni Prof. Memmo.\nQuest'anno scolastico le piattaforme sono gratuite. Le donazioni aiutano a creare nuovi giochi didattici per la scuola secondaria.";
        if (elTestoFuturo) elTestoFuturo.value = sostieni.testo_futuro || "❤️ Sostieni Prof. Memmo.\nGli abbonamenti permettono di mantenere attive le piattaforme e sviluppare nuove funzionalità.\nSe vuoi contribuire ulteriormente alla crescita del progetto educativo, puoi sostenere liberamente Prof. Memmo con una donazione.";
        if (elRingraziamento) elRingraziamento.value = sostieni.ringraziamento || '';

        // Prezzi piani (Definitivi: Viandante €14.99, Docente €24.99, Completo €34.99)
        const monet = data.monetizzazione_config || {};
        const stripePiani = data.stripe_piani_config || {};
        const elPriceViandante = document.getElementById('price-viandante');
        const elPriceDocente = document.getElementById('price-docente');
        const elPriceEcosistema = document.getElementById('price-ecosistema');
        const elStripePriceViandante = document.getElementById('stripe-price-viandante');
        const elStripePriceDocente = document.getElementById('stripe-price-docente');
        const elStripePriceEcosistema = document.getElementById('stripe-price-ecosistema');
        const elMassimale = document.getElementById('hub-massimale-incassi');
        
        if (elPriceViandante) elPriceViandante.value = monet.price_viandante || '14.99';
        if (elPriceDocente) elPriceDocente.value = monet.price_docente || '24.99';
        if (elPriceEcosistema) elPriceEcosistema.value = monet.price_ecosistema || '34.99';

        if (elStripePriceViandante) elStripePriceViandante.value = stripePiani.viandante || '';
        if (elStripePriceDocente) elStripePriceDocente.value = stripePiani.docente || '';
        if (elStripePriceEcosistema) elStripePriceEcosistema.value = stripePiani.completo || '';
        
        // Diciture piani
        const piani = data.piani_config || {};
        const setVal = (id, def) => { const el = document.getElementById(id); if (el) el.value = piani[id] !== undefined ? piani[id] : def; };
        setVal('desc-base', 'Gratuita e accessibile per esplorare le dinamiche fondamentali dei giochi.');
        setVal('btn-base', 'Inizia Gratis');
        setVal('features-base', '+ FantaLetteratura (Max 4 squadre, una sola classe)\n+ Palestra di Riflessione (Attività fondamentali)\n- FantaLetteratura: Tornei interni e missioni personalizzate\n- Palestra: Analisi logica, periodo, testi B1/B2, test cultura gen.');
        setVal('desc-viandante', 'Perfetto per appassionati e giocatori che vogliono esplorare i giochi e le storie.');
        setVal('btn-viandante', 'Scegli Viandante');
        setVal('features-viandante', '+ FantaLetteratura (Versione Base)\n+ Palestra di Riflessione (Versione Base)\n+ La Rotta degli Eroi\n+ La Corte dei Dannati\n+ Accesso ai futuri giochi narrativi\n- Strumenti docente (creazione classi, tornei, dashboard)');
        setVal('desc-docente', 'Gli strumenti definitivi per gestire le tue classi e la didattica.');
        setVal('btn-docente', 'Scegli Docente');
        setVal('features-docente', '+ FantaLetteratura (Completo): Tornei, missioni\n+ Palestra (Completa): Analisi logica, testi B2\n+ Gestione Classi e Studenti\n+ Codici Classe privati\n+ Strumenti Docente e Dashboard avanzata\n- Non include La Rotta degli Eroi o Travel Agency');
        setVal('desc-ecosistema', "L'esperienza totale. Accesso illimitato a tutti i contenuti e strumenti.");
        setVal('btn-ecosistema', 'Ottieni Tutto');
        setVal('features-ecosistema', '+ Tutto il piano Docente Completo Didattico\n+ La Rotta degli Eroi\n+ Travel Agency C.\n+ Tutti i futuri giochi completi in anteprima\n+ Assistenza dedicata');

        // Campi Come Funziona
        const cf = data.come_funziona_config || {};
        const setInputVal = (id, def) => { const el = document.getElementById(id); if (el) el.value = cf[id] !== undefined ? cf[id] : def; };
        setInputVal('scheda1-titolo', 'Funzionalità Attualmente Attive');
        setInputVal('scheda1-docenti', 'Creazione ed organizzazione delle classi didattiche\nGenerazione di Codici Classe per gli studenti\nGestione fino a 4 squadre su FantaLetteratura\nAttività di riflessione e grammatica su Palestra di Riflessione');
        setInputVal('scheda1-studenti', 'Accesso alle classi create dal proprio docente tramite codice\nPartecipazione attiva ai giochi didattici e alle sfide\nMonitoraggio dei progressi e delle attività svolte\nProfilo Studente attivo e collegato alla scuola');
        setInputVal('scheda1-viandanti', "Esplorazione libera delle app e dei giochi disponibili\nAccesso alle versioni dimostrative ed alle attività aperte\nPartecipazione alla filosofia ludica dell'Ecosistema");
        setInputVal('scheda2-titolo', 'In Lavorazione / Prossimamente');
        setInputVal('scheda2-intro', "L'Ecosistema Prof. Memmo è in continua evoluzione. Stiamo sviluppando nuove espansioni e funzionalità avanzate per arricchire l'esperienza in classe:");
        setInputVal('scheda2-voci', 'Tornei interscolastici estesi\nModuli avanzati di analisi sintattica e del periodo\nNuovi giochi di ruolo e storie interattive\nStrumenti di reportistica e statistiche per docenti');
        this.updateSwitchVisuals('scheda1', cf.scheda1_visibile !== false);
        this.updateSwitchVisuals('scheda2', cf.scheda2_visibile !== false);

        // Promozioni & Coupon Stripe
        const promoConfig = data.promozioni_config || {};
        this.renderPromozioniUI(promoConfig);

        // Massimale
        const massimale = data.massimale_incassi || 4500;
        const incassato = data.totale_incassato_anno || 0;
        const residuo = Math.max(0, massimale - incassato);

        if (elMassimale) elMassimale.value = massimale;
        
        const elDispMassimale = document.getElementById('analytics-massimale-display');
        const elDispIncassato = document.getElementById('analytics-incassato-display');
        const elDispResiduo = document.getElementById('analytics-residuo-display');
        const elHubIncassato = document.getElementById('hub-totale-incassato-display');

        const fmt = val => val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
        if (elDispMassimale) elDispMassimale.textContent = fmt(massimale);
        if (elDispIncassato) elDispIncassato.textContent = fmt(incassato);
        if (elDispResiduo) elDispResiduo.textContent = fmt(residuo);
        if (elHubIncassato) elHubIncassato.textContent = fmt(incassato);
    },

    renderPromozioniUI: function(promoConfig) {
        const defaultPromos = {
            lancio: { titolo: '🚀 Promo Lancio', stripe_coupon_id: '', percentuale: 30, data_inizio: '2026-09-01', data_fine: '2026-10-31', attivo: true },
            back_to_school: { titolo: '📚 Back to School', stripe_coupon_id: '', percentuale: 20, data_inizio: '2026-09-01', data_fine: '2026-09-30', attivo: true },
            summer: { titolo: '⛱️ Summer', stripe_coupon_id: '', percentuale: 20, data_inizio: '2026-06-01', data_fine: '2026-07-31', attivo: true },
            natale: { titolo: '🎄 Natale', stripe_coupon_id: '', percentuale: 20, data_inizio: '2026-12-01', data_fine: '2027-01-06', attivo: true },
            black_week: { titolo: '🖤 Black Week', stripe_coupon_id: '', percentuale: 25, data_inizio: '2026-11-20', data_fine: '2026-11-30', attivo: true }
        };

        const keys = ['lancio', 'back_to_school', 'summer', 'natale', 'black_week'];
        keys.forEach(key => {
            const p = promoConfig[key] || defaultPromos[key];
            const elActive = document.getElementById('promo-active-' + key);
            const elId = document.getElementById('promo-id-' + key);
            const elPct = document.getElementById('promo-pct-' + key);
            const elStart = document.getElementById('promo-start-' + key);
            const elEnd = document.getElementById('promo-end-' + key);

            if (elActive) elActive.checked = p.attivo !== false;
            if (elId) elId.value = p.stripe_coupon_id || '';
            if (elPct) elPct.value = p.percentuale !== undefined ? p.percentuale : defaultPromos[key].percentuale;
            if (elStart) elStart.value = p.data_inizio || defaultPromos[key].data_inizio;
            if (elEnd) elEnd.value = p.data_fine || defaultPromos[key].data_fine;
        });

        this.updatePromoStatusBadges();
    },

    updatePromoStatusBadges: function() {
        const keys = ['lancio', 'back_to_school', 'summer', 'natale', 'black_week'];
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        keys.forEach(key => {
            const elActive = document.getElementById('promo-active-' + key);
            const elStart = document.getElementById('promo-start-' + key);
            const elEnd = document.getElementById('promo-end-' + key);
            const elBadge = document.getElementById('badge-status-' + key);
            const elLabel = document.getElementById('promo-active-label-' + key);
            const elCard = document.getElementById('promo-card-' + key);

            if (!elBadge) return;

            const isActive = elActive ? elActive.checked : false;
            const start = elStart ? elStart.value : '';
            const end = elEnd ? elEnd.value : '';

            if (elLabel) {
                elLabel.textContent = isActive ? 'Attiva' : 'Spenta';
                elLabel.style.color = isActive ? '#0f172a' : '#94a3b8';
            }

            if (!isActive) {
                elBadge.textContent = '⚪ DISATTIVATA (OFF)';
                elBadge.style.background = '#f1f5f9';
                elBadge.style.color = '#64748b';
                if (elCard) elCard.style.borderColor = '#e2e8f0';
                return;
            }

            if (start && todayStr < start) {
                elBadge.textContent = `🟡 PROGRAMMATA (dal ${this.formatDateIT(start)})`;
                elBadge.style.background = '#fef3c7';
                elBadge.style.color = '#b45309';
                if (elCard) elCard.style.borderColor = '#fde68a';
            } else if (end && todayStr > end) {
                elBadge.textContent = `🔴 SCADUTA (il ${this.formatDateIT(end)})`;
                elBadge.style.background = '#fee2e2';
                elBadge.style.color = '#b91c1c';
                if (elCard) elCard.style.borderColor = '#fca5a5';
            } else {
                elBadge.textContent = `🟢 ATTIVA ADESSO (fino al ${this.formatDateIT(end)})`;
                elBadge.style.background = '#dcfce7';
                elBadge.style.color = '#15803d';
                if (elCard) elCard.style.borderColor = '#86efac';
            }
        });
    },

    formatDateIT: function(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    },

    toggleGuidaStripe: function() {
        const box = document.getElementById('guida-stripe-box');
        const txt = document.getElementById('btn-guida-text');
        if (!box) return;
        const isHidden = box.style.display === 'none' || !box.style.display;
        box.style.display = isHidden ? 'block' : 'none';
        if (txt) txt.textContent = isHidden ? 'Chiudi Guida Passo-Passo' : 'Apri Guida Passo-Passo';
    },

    copyPromoTitle: function(title) {
        navigator.clipboard.writeText(title).then(() => {
            alert(`📋 Titolo "${title}" copiato negli appunti!\nPuoi incollarlo direttamente come nome del coupon su Stripe.`);
        }).catch(err => {
            console.error("Errore copia appunti:", err);
            prompt("Copia manualmente il titolo per Stripe:", title);
        });
    },

    savePromozioni: async function() {
        if (!window.EcosystemService) return;

        const keys = [
            { key: 'lancio', titolo: '🚀 Promo Lancio' },
            { key: 'back_to_school', titolo: '📚 Back to School' },
            { key: 'summer', titolo: '⛱️ Summer' },
            { key: 'natale', titolo: '🎄 Natale' },
            { key: 'black_week', titolo: '🖤 Black Week' }
        ];

        const promoConfig = {};
        keys.forEach(({ key, titolo }) => {
            const elActive = document.getElementById('promo-active-' + key);
            const elId = document.getElementById('promo-id-' + key);
            const elPct = document.getElementById('promo-pct-' + key);
            const elStart = document.getElementById('promo-start-' + key);
            const elEnd = document.getElementById('promo-end-' + key);

            promoConfig[key] = {
                titolo: titolo,
                stripe_coupon_id: elId ? elId.value.trim() : '',
                percentuale: elPct ? parseFloat(elPct.value) || 0 : 0,
                data_inizio: elStart ? elStart.value : '',
                data_fine: elEnd ? elEnd.value : '',
                attivo: elActive ? elActive.checked : false
            };
        });

        try {
            await window.EcosystemService.saveEcosystemSettings({ promozioni_config: promoConfig });
            this.settingsData.promozioni_config = promoConfig;
            this.updatePromoStatusBadges();

            const statusLabel = document.getElementById('promo-save-status');
            if (statusLabel) {
                statusLabel.style.display = 'inline';
                setTimeout(() => { statusLabel.style.display = 'none'; }, 3000);
            }
            alert("✅ Promozioni e Coupon Stripe salvati con successo!");
        } catch (e) {
            console.error("Errore salvataggio promozioni:", e);
            alert("Errore durante il salvataggio delle promozioni: " + e.message);
        }
    },

    saveMassimaleConfig: async function() {
        const val = parseFloat(document.getElementById('hub-massimale-incassi').value) || 4500;
        try {
            await window.EcosystemService.saveEcosystemSettings({ massimale_incassi: val });
            alert("✅ Massimale fiscale annuale salvato con successo: " + val.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }));
        } catch (e) {
            console.error("Errore salvataggio massimale:", e);
            alert("Errore durante il salvataggio del massimale.");
        }
    },

    updateSwitchVisuals: function(settingId, isChecked) {
        const btn = document.getElementById('btn-toggle-' + settingId);
        const text = document.getElementById('status-text-' + settingId);
        if (!btn || !text) return;
        
        if (isChecked) {
            btn.classList.add('on');
            text.textContent = 'ON';
        } else {
            btn.classList.remove('on');
            text.textContent = 'OFF';
        }
    },

    toggleSwitchBtn: async function(settingId) {
        if (!window.EcosystemService) return;
        
        // Mappa settingId -> chiave Firestore
        const keyMap = {
            'sostieni': 'sostieni_il_progetto',
            'esperienze': 'esperienze',
            'monetizzazione': 'monetizzazione',
            'come-funziona': 'come_funziona_visibile',
        };
        
        // scheda1 e scheda2 sono dentro come_funziona_config
        if (settingId === 'scheda1' || settingId === 'scheda2') {
            const cf = this.settingsData.come_funziona_config || {};
            const key = settingId + '_visibile';
            const newVal = !(cf[key] !== false);
            cf[key] = newVal;
            this.settingsData.come_funziona_config = cf;
            this.updateSwitchVisuals(settingId, newVal);
            try {
                await window.EcosystemService.saveEcosystemSettings({ come_funziona_config: cf });
            } catch (e) {
                console.error('Errore toggle scheda:', e);
            }
            return;
        }
        
        const dbKey = keyMap[settingId] || settingId;
        const currentVal = this.settingsData[dbKey] || false;
        const newVal = !currentVal;
        
        this.settingsData[dbKey] = newVal;
        this.updateSwitchVisuals(settingId, newVal);
        
        try {
            await window.EcosystemService.saveEcosystemSettings({ [dbKey]: newVal });
        } catch (error) {
            console.error('Errore toggle:', error);
            this.settingsData[dbKey] = currentVal;
            this.updateSwitchVisuals(settingId, currentVal);
            alert('Errore durante il salvataggio. Riprova.');
        }
    },

    saveSostieniSettings: async function() {
        if (!window.EcosystemService) return;
        
        const configToSave = {
            paypal_link: document.getElementById('sostieni-paypal-link').value,
            testo_gratuito: document.getElementById('sostieni-testo-gratuito').value,
            testo_futuro: document.getElementById('sostieni-testo-futuro').value,
            ringraziamento: document.getElementById('sostieni-ringraziamento').value,
        };

        try {
            await window.EcosystemService.saveEcosystemSettings({ sostieni_config: configToSave });
            alert("Configurazioni Sostieni salvate con successo!");
            this.settingsData.sostieni_config = configToSave;
        } catch (error) {
            console.error("Errore salvataggio sostieni:", error);
            alert("Errore durante il salvataggio: " + error.message);
        }
    },

    saveComeFunziona: async function() {
        if (!window.EcosystemService) return;
        const cf = this.settingsData.come_funziona_config || {};
        const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
        const config = {
            ...cf,
            'scheda1-titolo': g('scheda1-titolo'),
            'scheda1-docenti': g('scheda1-docenti'),
            'scheda1-studenti': g('scheda1-studenti'),
            'scheda1-viandanti': g('scheda1-viandanti'),
            'scheda2-titolo': g('scheda2-titolo'),
            'scheda2-intro': g('scheda2-intro'),
            'scheda2-voci': g('scheda2-voci'),
        };
        try {
            await window.EcosystemService.saveEcosystemSettings({ come_funziona_config: config });
            this.settingsData.come_funziona_config = config;
            alert('✅ Contenuto pagina "Come Funziona" salvato!');
        } catch (e) {
            console.error('Errore salvataggio Come Funziona:', e);
            alert('Errore durante il salvataggio.');
        }
    },

    savePrices: async function() {
        if (!window.EcosystemService) return;
        const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
        const monetConfig = {
            price_viandante: g('price-viandante'),
            price_docente: g('price-docente'),
            price_ecosistema: g('price-ecosistema'),
        };
        const stripePianiConfig = {
            viandante: g('stripe-price-viandante').trim(),
            docente: g('stripe-price-docente').trim(),
            completo: g('stripe-price-ecosistema').trim(),
        };
        const pianiConfig = {
            'desc-base': g('desc-base'),
            'btn-base': g('btn-base'),
            'features-base': g('features-base'),
            'desc-viandante': g('desc-viandante'),
            'btn-viandante': g('btn-viandante'),
            'features-viandante': g('features-viandante'),
            'desc-docente': g('desc-docente'),
            'btn-docente': g('btn-docente'),
            'features-docente': g('features-docente'),
            'desc-ecosistema': g('desc-ecosistema'),
            'btn-ecosistema': g('btn-ecosistema'),
            'features-ecosistema': g('features-ecosistema'),
        };
        try {
            await window.EcosystemService.saveEcosystemSettings({
                monetizzazione_config: monetConfig,
                stripe_piani_config: stripePianiConfig,
                piani_config: pianiConfig
            });
            this.settingsData.monetizzazione_config = monetConfig;
            this.settingsData.stripe_piani_config = stripePianiConfig;
            this.settingsData.piani_config = pianiConfig;
            
            const statusLabel = document.getElementById('piani-save-status');
            if (statusLabel) {
                statusLabel.style.display = 'inline';
                setTimeout(() => { statusLabel.style.display = 'none'; }, 3000);
            }
            alert('✅ Prezzi, diciture e Stripe Price ID salvati con successo!');
        } catch (e) {
            console.error('Errore salvataggio prezzi:', e);
            alert('Errore durante il salvataggio: ' + e.message);
        }
    },

    saveMonetizationSettings: async function() {
        // Alias per compatibilità
        return this.savePrices();
    }
};

window.EcosistemaUI = EcosistemaUI;

