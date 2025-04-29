// recurring.js - Lógica de Recorrências Pendentes

import { transactions, recurringTransactions, saveData, addTransactionData, deleteTransactionData } from './data.js';
import { formatCurrency, showFeedback, clearFeedback } from './helpers.js';
import { renderAllMainUI } from './interface.js'; // CORRIGIDO: Importa de interface.js

// --- Seletores DOM (inicializados em main.js) ---
let pendingRecurringSection;
let pendingRecurringListEl;
let recurringFeedbackEl; // Feedback específico desta seção

// --- Estado do Undo (gerenciado aqui) ---
export let lastAddedRecurringInfo = null;
export let undoTimeoutId = null;

// Função para inicializar seletores (chamada por main.js)
export function initializeRecurringSelectors() {
    pendingRecurringSection = document.getElementById('pending-recurring-section');
    pendingRecurringListEl = document.getElementById('pending-recurring-list');
    recurringFeedbackEl = document.getElementById('recurring-feedback');
}

// Funções para acessar/modificar estado de undo (usadas por helpers.js)
export function getRecurringFeedbackElement() { return recurringFeedbackEl; }
export function getUndoTimeoutId() { return undoTimeoutId; }
export function setUndoTimeoutId(id) { undoTimeoutId = id; }
export function clearUndoState() {
    lastAddedRecurringInfo = null;
    undoTimeoutId = null;
}

// --- Funções Principais ---

// Verifica e renderiza recorrências pendentes
export function checkAndRenderPendingRecurring() {
    // console.log("[checkAndRenderPendingRecurring] Verificando recorrências...");
    try {
        if (!pendingRecurringListEl || !pendingRecurringSection) { console.error("[checkAndRenderPendingRecurring] Elementos não encontrados."); return; }
        let hasPending = false;
        const now = new Date(); const currentDay = now.getDate(); const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
        const currentMonthYear = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`; const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        pendingRecurringListEl.innerHTML = '';
        recurringTransactions.forEach(rec => {
            const targetDayThisMonth = Math.min(rec.dayOfMonth, daysInCurrentMonth);
            if (currentDay >= targetDayThisMonth && rec.lastAddedMonthYear !== currentMonthYear) {
                hasPending = true; const li = document.createElement('li'); li.classList.add('pending-recurring-item'); li.dataset.id = rec.id;
                const typeText = rec.type === 'income' ? 'Entrada' : 'Saída'; const categoryText = rec.category || 'N/A';
                li.innerHTML = ` <div class="info"> <span class="name ${rec.type}">${rec.description}</span> <span class="details">Dia ${rec.dayOfMonth} | Valor: ${formatCurrency(rec.amount)} | ${categoryText}</span> </div> <div class="actions"> <button class="btn btn-sm btn-primary add-pending-recurring-btn">Adicionar Agora</button> </div> `;
                pendingRecurringListEl.appendChild(li);
            }
        });
        const isUndoFeedbackPending = lastAddedRecurringInfo !== null;
        if (!hasPending && !isUndoFeedbackPending) { pendingRecurringSection.classList.add('hidden'); if (recurringFeedbackEl && recurringFeedbackEl.style.display !== 'none') { clearFeedback(recurringFeedbackEl); } }
        else { pendingRecurringSection.classList.remove('hidden'); }
        if (!hasPending) { if (!isUndoFeedbackPending) { pendingRecurringListEl.innerHTML = '<li class="placeholder">Nenhuma recorrência pendente este mês.</li>'; } }
    } catch (e) { console.error("Erro em checkAndRenderPendingRecurring:", e); }
}


// Adiciona uma recorrência pendente como transação REAL
export function addPendingRecurring(recurringId) {
    try {
        if (!recurringFeedbackEl) { console.error("[addPendingRecurring] ERRO CRÍTICO: recurringFeedbackEl não encontrado!"); return; }
        clearFeedback(recurringFeedbackEl);
        const recIndex = recurringTransactions.findIndex(r => r.id === recurringId);
        if (recIndex === -1) { showFeedback("Erro: Recorrência não encontrada.", 'error', 'recurring-feedback'); return; }
        const rec = recurringTransactions[recIndex];
        const now = new Date(); const currentYear = now.getFullYear(); const currentMonth = now.getMonth(); const currentMonthYear = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`; const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); const transactionDay = Math.min(rec.dayOfMonth, daysInMonth); const transactionDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(transactionDay).padStart(2, '0')}`;
        const newTransactionId = Date.now();
        const newTransaction = { id: newTransactionId, type: rec.type, date: transactionDate, amount: rec.amount, category: rec.category, description: rec.type === 'expense' ? rec.description : '', source: rec.type === 'income' ? rec.description : '', recurringOriginId: rec.id, tags: [] };
        lastAddedRecurringInfo = { transactionId: newTransactionId, recurringId: rec.id };
        addTransactionData(newTransaction); // Usa data.js
        recurringTransactions[recIndex].lastAddedMonthYear = currentMonthYear;
        saveData(); // Salva estado atualizado
        checkAndRenderPendingRecurring(); // Atualiza lista de pendentes
        renderAllMainUI(); // Atualiza toda a UI principal
        const UNDO_TIMEOUT = 7000;
        showFeedback( `Recorrência "${rec.description}" adicionada!`, 'success', 'recurring-feedback', UNDO_TIMEOUT, true, undoAddPendingRecurring );
    } catch (e) { console.error("Erro GERAL em addPendingRecurring:", e); showFeedback("Erro ao adicionar recorrência.", 'error', 'recurring-feedback'); clearUndoState(); }
}

// Função para Desfazer a adição da última recorrência pendente
export function undoAddPendingRecurring() {
    try {
        if (!lastAddedRecurringInfo || !recurringFeedbackEl) { clearFeedback('recurring-feedback'); return; }
        if (undoTimeoutId) { clearTimeout(undoTimeoutId); undoTimeoutId = null; }
        if (recurringFeedbackEl.timeoutId) { clearTimeout(recurringFeedbackEl.timeoutId); recurringFeedbackEl.timeoutId = null; }
        clearFeedback('recurring-feedback');
        const { transactionId, recurringId } = lastAddedRecurringInfo;
        const deleted = deleteTransactionData(transactionId); // Usa data.js
        if (!deleted) { console.warn(`[undoAddPendingRecurring] Transação com ID ${transactionId} não encontrada.`); lastAddedRecurringInfo = null; return; }
        const recIndex = recurringTransactions.findIndex(r => r.id === recurringId);
        if (recIndex > -1) { recurringTransactions[recIndex].lastAddedMonthYear = null; }
        else { console.warn(`[undoAddPendingRecurring] Recorrência ${recurringId} não encontrada.`); }
        clearUndoState(); // Limpa antes de salvar
        saveData();
        checkAndRenderPendingRecurring();
        renderAllMainUI();
        showFeedback("Ação desfeita.", 'success', 'recurring-feedback', 2500);
    } catch (e) { console.error("Erro GERAL em undoAddPendingRecurring:", e); showFeedback("Erro ao desfazer.", 'error', 'recurring-feedback'); clearUndoState(); }
}