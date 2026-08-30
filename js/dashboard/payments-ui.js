// --- PAYMENTS UI (Registro Pagamenti & Contabilità Stripe) ---
const PaymentsUI = {
    rawTransactions: [],
    filteredTransactions: [],
    unsubscribeListener: null,

    filters: {
        dateFrom: '',
        dateTo: '',
        plan: 'all',
        status: 'all',
        type: 'all',
        refundReason: 'all',
        search: ''
    },

    init: function() {
        console.log("PaymentsUI inizializzato.");
        this.setupDefaultDates();
        if (window.PaymentsService && !this.unsubscribeListener) {
            this.unsubscribeListener = window.PaymentsService.listenToTransactions((list) => {
                this.rawTransactions = list || [];
                this.applyFilters();
            });
        }
    },

    setupDefaultDates: function() {
        const currentYear = new Date().getFullYear();
        const elFrom = document.getElementById('payments-date-from');
        const elTo = document.getElementById('payments-date-to');
        if (elFrom && !elFrom.value) {
            elFrom.value = `${currentYear}-01-01`;
            this.filters.dateFrom = elFrom.value;
        }
        if (elTo && !elTo.value) {
            elTo.value = `${currentYear}-12-31`;
            this.filters.dateTo = elTo.value;
        }
    },

    setPresetDate: function(preset) {
        const now = new Date();
        const elFrom = document.getElementById('payments-date-from');
        const elTo = document.getElementById('payments-date-to');
        if (!elFrom || !elTo) return;

        if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            elFrom.value = firstDay;
            elTo.value = lastDay;
        } else if (preset === 'quarter') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const firstDay = new Date(now.getFullYear(), currentQuarter * 3, 1).toISOString().split('T')[0];
            const lastDay = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0).toISOString().split('T')[0];
            elFrom.value = firstDay;
            elTo.value = lastDay;
        } else if (preset === 'year') {
            elFrom.value = `${now.getFullYear()}-01-01`;
            elTo.value = `${now.getFullYear()}-12-31`;
        } else if (preset === 'all') {
            elFrom.value = '';
            elTo.value = '';
        }

        this.onFilterChange();
    },

    onFilterChange: function() {
        const elFrom = document.getElementById('payments-date-from');
        const elTo = document.getElementById('payments-date-to');
        const elPlan = document.getElementById('payments-filter-plan');
        const elStatus = document.getElementById('payments-filter-status');
        const elType = document.getElementById('payments-filter-type');
        const elReason = document.getElementById('payments-filter-reason');
        const elSearch = document.getElementById('payments-search-input');

        this.filters.dateFrom = elFrom ? elFrom.value : '';
        this.filters.dateTo = elTo ? elTo.value : '';
        this.filters.plan = elPlan ? elPlan.value : 'all';
        this.filters.status = elStatus ? elStatus.value : 'all';
        this.filters.type = elType ? elType.value : 'all';
        this.filters.refundReason = elReason ? elReason.value : 'all';
        this.filters.search = elSearch ? elSearch.value.trim().toLowerCase() : '';

        this.applyFilters();
    },

    resetFilters: function() {
        const elPlan = document.getElementById('payments-filter-plan');
        const elStatus = document.getElementById('payments-filter-status');
        const elType = document.getElementById('payments-filter-type');
        const elReason = document.getElementById('payments-filter-reason');
        const elSearch = document.getElementById('payments-search-input');

        if (elPlan) elPlan.value = 'all';
        if (elStatus) elStatus.value = 'all';
        if (elType) elType.value = 'all';
        if (elReason) elReason.value = 'all';
        if (elSearch) elSearch.value = '';

        this.setupDefaultDates();
        this.onFilterChange();
    },

    applyFilters: function() {
        let list = [...this.rawTransactions];

        // 1. Filtro Date
        const fromTs = this.filters.dateFrom ? new Date(this.filters.dateFrom + 'T00:00:00').getTime() : 0;
        const toTs = this.filters.dateTo ? new Date(this.filters.dateTo + 'T23:59:59').getTime() : Infinity;

        list = list.filter(item => {
            const dateStr = item.createdAt || item.purchasedAt || item.timestamp;
            if (!dateStr) return true;
            const itemTs = new Date(dateStr).getTime();
            return itemTs >= fromTs && itemTs <= toTs;
        });

        // 2. Filtro Piano
        if (this.filters.plan !== 'all') {
            list = list.filter(item => {
                const p = (item.planId || item.plan || item.abbonamento || '').toLowerCase();
                return p.includes(this.filters.plan.toLowerCase());
            });
        }

        // 3. Filtro Stato
        if (this.filters.status !== 'all') {
            list = list.filter(item => {
                const s = (item.status || (item.type === 'pagamento_fallito' ? 'fallito' : 'completato')).toLowerCase();
                return s === this.filters.status.toLowerCase();
            });
        }

        // 4. Filtro Tipo
        if (this.filters.type !== 'all') {
            list = list.filter(item => {
                const t = (item.type || 'initial_purchase').toLowerCase();
                if (this.filters.type === 'primo_acquisto') {
                    return t === 'primo_acquisto' || t === 'initial_purchase';
                }
                if (this.filters.type === 'rinnovo_annuale') {
                    return t === 'rinnovo_annuale' || t === 'annual_renewal';
                }
                if (this.filters.type === 'rimborso') {
                    return t === 'rimborso' || t === 'refund';
                }
                if (this.filters.type === 'pagamento_fallito') {
                    return t === 'pagamento_fallito' || t === 'payment_failed';
                }
                return t === this.filters.type;
            });
        }

        // 4b. Filtro Motivo Rimborso
        if (this.filters.refundReason !== 'all') {
            list = list.filter(item => {
                const r = (item.refundReason || 'non_specificato').toLowerCase();
                return r.includes(this.filters.refundReason.toLowerCase());
            });
        }

        // 5. Ricerca Testuale (Email, Nome, UID, Stripe IDs, Motivi)
        if (this.filters.search) {
            const q = this.filters.search;
            list = list.filter(item => {
                const email = (item.customerEmail || item.email || '').toLowerCase();
                const name = (item.customerName || item.nome || '').toLowerCase();
                const uid = (item.userId || '').toLowerCase();
                const session = (item.stripeSessionId || '').toLowerCase();
                const invoice = (item.stripeInvoiceId || '').toLowerCase();
                const customer = (item.stripeCustomerId || '').toLowerCase();
                const pi = (item.stripePaymentIntentId || '').toLowerCase();
                const docId = (item.id || '').toLowerCase();
                const reason = (item.refundReason || '').toLowerCase();

                return email.includes(q) || name.includes(q) || uid.includes(q) ||
                       session.includes(q) || invoice.includes(q) || customer.includes(q) ||
                       pi.includes(q) || docId.includes(q) || reason.includes(q);
            });
        }

        this.filteredTransactions = list;
        this.updateKPIs(list);
        this.renderTable(list);
    },

    updateKPIs: function(list) {
        let totalGross = 0;
        let totalRefunds = 0;
        let successCount = 0;
        let failedCount = 0;

        list.forEach(tx => {
            const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || 0);
            const status = (tx.status || '').toLowerCase();
            const type = (tx.type || '').toLowerCase();

            if (type === 'pagamento_fallito' || status === 'fallito') {
                failedCount++;
            } else if (type === 'rimborso') {
                const ref = tx.refundAmount || Math.abs(amount);
                totalRefunds += ref;
            } else {
                if (status === 'rimborsato') {
                    totalRefunds += (tx.refundAmount || amount);
                    totalGross += amount;
                    successCount++;
                } else if (status === 'rimborsato_parziale') {
                    totalRefunds += (tx.refundAmount || 0);
                    totalGross += amount;
                    successCount++;
                } else {
                    totalGross += amount;
                    successCount++;
                }
            }
        });

        // Incasso Netto = Incassi lordi - rimborsi
        const netEarnings = totalGross - totalRefunds;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('kpi-pay-netto', netEarnings.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
        setVal('kpi-pay-lordo', totalGross.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
        setVal('kpi-pay-rimborsi', totalRefunds.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
        setVal('kpi-pay-successi', successCount);
        setVal('kpi-pay-falliti', failedCount);
        setVal('kpi-pay-totali', list.length);

        // Aggiorna anche il pannello Incassato e Residuo del Massimale Fiscale
        const elIncassato = document.getElementById('analytics-incassato-display');
        const elMassimale = document.getElementById('analytics-massimale-display');
        const elResiduo = document.getElementById('analytics-residuo-display');
        if (elIncassato) {
            elIncassato.textContent = Math.max(0, netEarnings).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        }
        if (elMassimale && elResiduo) {
            const massimale = parseFloat(elMassimale.textContent.replace(/[^0-9.,]/g, '').replace(',', '.')) || 4000;
            const residuo = Math.max(0, massimale - Math.max(0, netEarnings));
            elResiduo.textContent = residuo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
        }

        // Notifica AnalyticsUI per aggiornare Spese & Guadagno con il valore effettivo
        if (window.AnalyticsUI && typeof window.AnalyticsUI.updateExpensesKPIs === 'function') {
            window.AnalyticsUI.updateExpensesKPIs();
        }
    },

    getNetEarnings: function(dateFrom, dateTo) {
        let startTs = dateFrom ? new Date(dateFrom).getTime() : 0;
        let endTs = dateTo ? (new Date(dateTo).getTime() + 86400000) : Infinity;

        let totalGross = 0;
        let totalRefunds = 0;

        const list = (this.rawTransactions && this.rawTransactions.length > 0) ? this.rawTransactions : (this.filteredTransactions || []);
        list.forEach(tx => {
            const dateRaw = tx.createdAt || tx.purchasedAt || tx.timestamp;
            let txTs = 0;
            if (dateRaw && typeof dateRaw.toDate === 'function') txTs = dateRaw.toDate().getTime();
            else if (dateRaw && dateRaw.seconds) txTs = dateRaw.seconds * 1000;
            else if (dateRaw) txTs = new Date(dateRaw).getTime();

            if (startTs && txTs < startTs) return;
            if (endTs && txTs > endTs) return;

            const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || 0);
            const status = (tx.status || '').toLowerCase();
            const type = (tx.type || '').toLowerCase();

            if (type === 'pagamento_fallito' || status === 'fallito') {
                return;
            } else if (type === 'rimborso') {
                const ref = tx.refundAmount || Math.abs(amount);
                totalRefunds += ref;
            } else {
                if (status === 'rimborsato') {
                    totalRefunds += (tx.refundAmount || amount);
                    totalGross += amount;
                } else if (status === 'rimborsato_parziale') {
                    totalRefunds += (tx.refundAmount || 0);
                    totalGross += amount;
                } else {
                    totalGross += amount;
                }
            }
        });

        return totalGross - totalRefunds;
    },

    renderTable: function(list) {
        const tbody = document.getElementById('payments-table-body');
        const emptyState = document.getElementById('payments-empty-state');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!list || list.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        list.forEach(tx => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';
            tr.style.transition = 'background 0.2s';
            tr.onmouseover = () => { tr.style.background = '#f8fafc'; };
            tr.onmouseout = () => { tr.style.background = 'transparent'; };

            // 1. Data e Ora
            const dateRaw = tx.createdAt || tx.purchasedAt || tx.timestamp;
            let dateFormatted = '-';
            let timeFormatted = '';
            if (dateRaw) {
                const d = new Date(dateRaw);
                dateFormatted = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
                timeFormatted = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            }

            // 2. Cliente & Email & UID
            const email = tx.customerEmail || tx.email || (tx.userId ? `UID: ${tx.userId.substring(0, 10)}...` : 'Cliente Stripe');
            const name = tx.customerName || tx.nome || '';
            const uid = tx.userId || '-';

            // 3. Piano
            const planKey = (tx.planId || tx.plan || tx.abbonamento || 'completo').toLowerCase();
            let planBadge = `<span style="background:#eff6ff; color:#2563eb; padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem; text-transform:uppercase;">${planKey}</span>`;
            if (planKey.includes('ecosistema')) {
                planBadge = `<span style="background:#ecfdf5; color:#059669; padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem; text-transform:uppercase;">🌿 Ecosistema</span>`;
            } else if (planKey.includes('didattico')) {
                planBadge = `<span style="background:#f5f3ff; color:#7c3aed; padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem; text-transform:uppercase;">🎓 Didattico</span>`;
            } else if (planKey.includes('viandante')) {
                planBadge = `<span style="background:#fffbeb; color:#d97706; padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem; text-transform:uppercase;">🧭 Viandante</span>`;
            }

            // 4. Tipo Operazione & Motivo Rimborso
            const typeKey = (tx.type || 'initial_purchase').toLowerCase();
            let typeLabel = 'Primo Acquisto';
            let typeIcon = '<i class="fa-solid fa-cart-shopping" style="color:#10b981; margin-right:4px;"></i>';
            let reasonSubtext = '';

            if (typeKey === 'annual_renewal' || typeKey === 'rinnovo_annuale') {
                typeLabel = 'Rinnovo Annuale';
                typeIcon = '<i class="fa-solid fa-rotate" style="color:#3b82f6; margin-right:4px;"></i>';
            } else if (typeKey === 'rimborso' || typeKey === 'refund') {
                const isFull = tx.refundType === 'totale' || tx.status === 'rimborsato';
                typeLabel = isFull ? 'Rimborso Totale' : 'Rimborso Parziale';
                typeIcon = '<i class="fa-solid fa-arrow-rotate-left" style="color:#f59e0b; margin-right:4px;"></i>';

                let rName = 'Motivo non specificato';
                const rCode = (tx.refundReason || 'non_specificato').toLowerCase();
                if (rCode === 'recesso') rName = 'Diritto di recesso';
                else if (rCode === 'commerciale') rName = 'Accordo commerciale';
                else if (rCode === 'errore_anomalia') rName = 'Errore / Anomalia';
                else if (tx.refundReason && tx.refundReason !== 'non_specificato') rName = tx.refundReason;

                reasonSubtext = `<div style="font-size:0.72rem; color:#b45309; margin-top:2px;"><strong>Motivo:</strong> ${rName}</div>`;
            } else if (typeKey === 'pagamento_fallito' || typeKey === 'payment_failed') {
                typeLabel = 'Pagamento Fallito';
                typeIcon = '<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444; margin-right:4px;"></i>';
                if (tx.failureReason) {
                    reasonSubtext = `<div style="font-size:0.72rem; color:#dc2626; margin-top:2px;">${tx.failureReason}</div>`;
                }
            }

            // 5. Importo
            const amountVal = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || 0);
            let amountDisplay = `${amountVal >= 0 ? '+' : ''}${amountVal.toFixed(2)} €`;
            let amountColor = '#10b981';
            if (typeKey === 'rimborso' || amountVal < 0) {
                amountColor = '#f59e0b';
                amountDisplay = `-${Math.abs(amountVal).toFixed(2)} €`;
            } else if (typeKey === 'pagamento_fallito') {
                amountColor = '#ef4444';
                amountDisplay = `${amountVal.toFixed(2)} €`;
            }

            // 6. Stato
            const statusKey = (tx.status || (typeKey === 'pagamento_fallito' ? 'fallito' : 'completato')).toLowerCase();
            let statusBadge = `<span style="background:#ecfdf5; color:#059669; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;">✅ Pagato</span>`;
            if (statusKey === 'rimborsato') {
                statusBadge = `<span style="background:#fffbeb; color:#d97706; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;">↩️ Rimborsato</span>`;
            } else if (statusKey === 'rimborsato_parziale') {
                statusBadge = `<span style="background:#fffbeb; color:#d97706; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;">↩️ Parz. Rimborsato</span>`;
            } else if (statusKey === 'fallito' || statusKey === 'failed') {
                statusBadge = `<span style="background:#fef2f2; color:#dc2626; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.75rem;">❌ Fallito</span>`;
            }

            // 7. Documenti (Fattura PDF / Ricevuta)
            let docsHtml = '<span style="color:#94a3b8; font-size:0.8rem;">-</span>';
            const invoiceUrl = tx.invoicePdfUrl || tx.hostedInvoiceUrl;
            const receiptUrl = tx.receiptUrl;

            if (invoiceUrl || receiptUrl) {
                docsHtml = '<div style="display:flex; gap:6px;">';
                if (invoiceUrl) {
                    docsHtml += `<a href="${invoiceUrl}" target="_blank" rel="noopener" class="btn" style="padding:4px 8px; font-size:0.75rem; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px;" title="Apri Fattura Stripe"><i class="fa-solid fa-file-invoice"></i> Fattura</a>`;
                }
                if (receiptUrl) {
                    docsHtml += `<a href="${receiptUrl}" target="_blank" rel="noopener" class="btn" style="padding:4px 8px; font-size:0.75rem; background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; border-radius:6px;" title="Apri Ricevuta Stripe"><i class="fa-solid fa-receipt"></i> Ricevuta</a>`;
                }
                docsHtml += '</div>';
            }

            // 8. ID Stripe
            const stripeId = tx.stripeInvoiceId || tx.stripeSessionId || tx.stripePaymentIntentId || tx.id || '-';

            tr.innerHTML = `
                <td style="padding:12px 14px; font-size:0.85rem; color:#1e293b;">
                    <strong>${dateFormatted}</strong>
                    <div style="font-size:0.75rem; color:#64748b;">${timeFormatted}</div>
                </td>
                <td style="padding:12px 14px; font-size:0.85rem;">
                    ${name ? `<div style="font-weight:700; color:#1e293b;">${name}</div>` : ''}
                    <div style="color:#475569; font-family:monospace; font-size:0.82rem;">${email}</div>
                    ${uid !== '-' ? `<div style="font-size:0.72rem; color:#94a3b8;">UID: ${uid}</div>` : ''}
                </td>
                <td style="padding:12px 14px;">${planBadge}</td>
                <td style="padding:12px 14px; font-size:0.82rem; color:#334155;">
                    <div>${typeIcon} <strong>${typeLabel}</strong></div>
                    ${reasonSubtext}
                </td>
                <td style="padding:12px 14px; font-weight:800; font-size:0.95rem; color:${amountColor}; text-align:right;">
                    ${amountDisplay}
                </td>
                <td style="padding:12px 14px; text-align:center;">${statusBadge}</td>
                <td style="padding:12px 14px; font-size:0.75rem; color:#64748b; font-family:monospace;">
                    ${stripeId}
                </td>
                <td style="padding:12px 14px; text-align:center;">${docsHtml}</td>
            `;

            tbody.appendChild(tr);
        });
    },

    exportCSV: function() {
        if (!this.filteredTransactions || this.filteredTransactions.length === 0) {
            alert("Nessuna transazione disponibile per l'esportazione con i filtri correnti.");
            return;
        }

        const headers = [
            "Data Registrazione",
            "Ora",
            "Tipo Operazione",
            "Stato Pagamento",
            "Motivo Rimborso (Amministrativo)",
            "Tipo Rimborso (Totale/Parziale)",
            "Cliente Intestatario",
            "Cliente Email",
            "UID Utente Hub",
            "Piano Abbonamento",
            "Importo Lordo (€)",
            "Importo Rimborsato (€)",
            "Incasso Netto (€)",
            "Valuta",
            "Codice Sconto",
            "Valore Sconto (€)",
            "Inizio Periodo",
            "Fine Periodo",
            "Stripe Session ID",
            "Stripe Invoice ID",
            "Stripe Payment Intent ID",
            "Stripe Customer ID",
            "Stripe Subscription ID",
            "Link Fattura Stripe",
            "Link Ricevuta Stripe",
            "Motivo Fallimento / Note"
        ];

        let csv = headers.map(h => `"${h}"`).join(",") + "\r\n";

        this.filteredTransactions.forEach(tx => {
            const dateRaw = tx.createdAt || tx.purchasedAt || tx.timestamp;
            let dateStr = "";
            let timeStr = "";
            if (dateRaw) {
                const d = new Date(dateRaw);
                dateStr = d.toLocaleDateString('it-IT');
                timeStr = d.toLocaleTimeString('it-IT');
            }

            const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || 0);
            const refund = typeof tx.refundAmount === 'number' ? tx.refundAmount : parseFloat(tx.refundAmount || 0);
            const net = amount >= 0 ? (amount - refund) : amount;

            let rName = '';
            if (tx.refundReason) {
                const rCode = tx.refundReason.toLowerCase();
                if (rCode === 'recesso') rName = 'Diritto di recesso';
                else if (rCode === 'commerciale') rName = 'Accordo commerciale';
                else if (rCode === 'errore_anomalia') rName = 'Errore / Anomalia';
                else if (rCode !== 'non_specificato') rName = tx.refundReason;
                else rName = 'Motivo non specificato';
            }

            const row = [
                dateStr,
                timeStr,
                tx.type || 'primo_acquisto',
                tx.status || (tx.type === 'pagamento_fallito' ? 'fallito' : 'completato'),
                rName,
                tx.refundType || (tx.type === 'rimborso' ? 'totale' : ''),
                tx.customerName || tx.nome || '',
                tx.customerEmail || tx.email || '',
                tx.userId || '',
                tx.planId || tx.plan || tx.abbonamento || 'completo',
                amount >= 0 ? amount.toFixed(2) : '0.00',
                refund > 0 ? refund.toFixed(2) : (amount < 0 ? Math.abs(amount).toFixed(2) : '0.00'),
                net.toFixed(2),
                tx.currency || 'EUR',
                tx.discountCode || (tx.promoApplied ? 'Promo Applicata' : ''),
                (tx.discountAmount || 0).toFixed(2),
                tx.periodStart || '',
                tx.periodEnd || tx.expiresAt || '',
                tx.stripeSessionId || '',
                tx.stripeInvoiceId || '',
                tx.stripePaymentIntentId || '',
                tx.stripeCustomerId || '',
                tx.stripeSubscriptionId || '',
                tx.invoicePdfUrl || tx.hostedInvoiceUrl || '',
                tx.receiptUrl || '',
                tx.failureReason || ''
            ];

            csv += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\r\n";
        });

        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const fromDate = this.filters.dateFrom || 'inizio';
        const toDate = this.filters.dateTo || 'oggi';
        link.setAttribute("href", url);
        link.setAttribute("download", `registro_pagamenti_stripe_${fromDate}_${toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

window.PaymentsUI = PaymentsUI;
