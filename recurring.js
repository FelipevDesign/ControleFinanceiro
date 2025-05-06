// recurring.js - Lógica de Recorrências Pendentes

import {
    transactions, recurringTransactions, addTransactionData, deleteTransactionData,
    updateRecurringData
} from './data.js';
import { formatCurrency, showFeedback, clearFeedback, formatDateForInput } from './helpers.js';
// import { renderAllMainUI } from './interface.js'; // Provavelmente não necessário aqui

// --- Seletores DOM ---
let pendingRecurringSection;
let pendingRecurringListEl;

// --- Estado do Undo ---
export let lastAddedRecurringInfo = null;
export let undoTimeoutId = null;

// *** NOVA FUNÇÃO SETTER EXPORTADA PARA TESTES ***
export function _setLastAddedRecurringInfoForTest(info) {
    lastAddedRecurringInfo = info ? { ...info } : null; // Cria cópia ou seta null
}

export function initializeRecurringSelectors() {
    pendingRecurringSection = document.getElementById('pending-recurring-section');
    pendingRecurringListEl = document.getElementById('pending-recurring-list');
}

export function getUndoTimeoutId() { return undoTimeoutId; }
export function setUndoTimeoutId(id) { undoTimeoutId = id; }
export function clearUndoState() {
    lastAddedRecurringInfo = null;
    undoTimeoutId = null;
}

// *** NOVA FUNÇÃO INTERNA E TESTÁVEL ***
// Recebe a data atual e as recorrências, retorna IDs pendentes
export function _calculatePendingRecurringIds(currentDate, recurringData) {
    const pendingIds = [];
    const currentDay = currentDate.getUTCDate();
    const currentMonth = currentDate.getUTCMonth();
    const currentYear = currentDate.getUTCFullYear();
    const currentMonthYear = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const daysInCurrentMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();

    recurringData.forEach(rec => {
        const actualTransactionDay = Math.min(rec.dayOfMonth, daysInCurrentMonth);
        if (currentDay >= actualTransactionDay && rec.lastAddedMonthYear !== currentMonthYear) {
            pendingIds.push(rec.id);
        }
    });
    return pendingIds;
}

// Função original (agora usa a função de cálculo e manipula DOM)
export function checkAndRenderPendingRecurring() {
    console.log("[checkAndRenderPendingRecurring] Verificando e renderizando..."); // Log mantido
    try {
        if (!pendingRecurringListEl || !pendingRecurringSection) {
            console.error("[checkAndRenderPendingRecurring] Elementos DOM não encontrados.");
            return;
        }

        const now = new Date();
        // Chama a função de cálculo interna
        const pendingIds = _calculatePendingRecurringIds(now, recurringTransactions);

        pendingRecurringListEl.innerHTML = ''; // Limpa lista

        if (pendingIds.length > 0) {
            console.log(`[checkAndRenderPendingRecurring] IDs Pendentes: ${pendingIds.join(', ')}`);
            pendingIds.forEach(id => {
                const rec = recurringTransactions.find(r => r.id === id);
                if (rec) {
                    const li = document.createElement('li');
                    li.classList.add('pending-recurring-item');
                    li.dataset.id = rec.id;
                    const categoryText = rec.category || 'N/A';
                    li.innerHTML = `
                        <div class="info">
                            <span class="name ${rec.type}">${rec.description}</span>
                            <span class="details">
                                Dia ${rec.dayOfMonth} | Valor: ${formatCurrency(rec.amount)} | ${categoryText}
                            </span>
                        </div>
                        <div class="actions">
                            <button class="btn btn-sm btn-primary add-pending-recurring-btn">
                                Adicionar Agora
                            </button>
                        </div>
                    `;
                    pendingRecurringListEl.appendChild(li);
                }
            });
        }

        // Mostra/esconde seção
        const isUndoFeedbackActive = lastAddedRecurringInfo !== null;
        const hasPendingItems = pendingIds.length > 0;
        pendingRecurringSection.classList.toggle('hidden', !hasPendingItems && !isUndoFeedbackActive);

        if (!hasPendingItems && !isUndoFeedbackActive) {
            pendingRecurringListEl.innerHTML = '<li class="placeholder">Nenhuma recorrência pendente este mês.</li>';
        }

    } catch (e) {
        console.error("Erro em checkAndRenderPendingRecurring:", e);
        if (pendingRecurringListEl) pendingRecurringListEl.innerHTML = '<li class="placeholder error">Erro ao verificar recorrências.</li>';
        if (pendingRecurringSection) pendingRecurringSection.classList.remove('hidden');
    }
}


// --- Funções addPendingRecurring e undoAddPendingRecurring (mantidas como antes) ---
export async function addPendingRecurring(recurringId) {
   // ... (código original) ...
   console.log(`[addPendingRecurring] Iniciando adição para ID: ${recurringId}`);
    try {
        const recIndex = recurringTransactions.findIndex(r => r.id === recurringId);
        if (recIndex === -1) { showFeedback("Erro: Recorrência não encontrada localmente.", 'error'); return; }
        const rec = { ...recurringTransactions[recIndex] };
        const now = new Date();
        const currentYear = now.getUTCFullYear();
        const currentMonth = now.getUTCMonth();
        const currentMonthYear = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
        const transactionDay = Math.min(rec.dayOfMonth, daysInMonth);
        const transactionDate = formatDateForInput(new Date(Date.UTC(currentYear, currentMonth, transactionDay)));
        const newTransactionData = { type: rec.type, date: transactionDate, amount: rec.amount, category: rec.category, description: rec.type === 'expense' ? rec.description : '', source: rec.type === 'income' ? rec.description : '', recurringOriginId: rec.id, tags: [], notes: '' };
        const addedTransaction = await addTransactionData(newTransactionData);
        if (!addedTransaction) { showFeedback("Erro ao salvar a transação recorrente.", 'error'); return; }
        const fullRecurringUpdateData = { ...rec, lastAddedMonthYear: currentMonthYear };
        const updatedRecurring = await updateRecurringData(fullRecurringUpdateData);
        if (!updatedRecurring) {
            console.error(`[addPendingRecurring] ERRO CRÍTICO: Falha ao atualizar recorrência ${rec.id}. Desfazendo transação ${addedTransaction.id}.`);
            await deleteTransactionData(addedTransaction.id);
            showFeedback("Erro ao atualizar status da recorrência. Ação cancelada.", 'error', 0);
            return;
        }
        lastAddedRecurringInfo = { transactionId: addedTransaction.id, recurringId: rec.id, previousLastAddedMonthYear: rec.lastAddedMonthYear };
        checkAndRenderPendingRecurring();
        const UNDO_TIMEOUT = 7000;
        showFeedback( `Recorrência "${rec.description}" adicionada!`, 'success', UNDO_TIMEOUT, true, undoAddPendingRecurring );
    } catch (e) { console.error("Erro GERAL em addPendingRecurring:", e); showFeedback("Erro inesperado ao adicionar recorrência.", 'error'); clearUndoState(); }
}

export async function undoAddPendingRecurring() {
    // ... (código original) ...
     console.log("[undoAddPendingRecurring] Iniciando Undo...");
    try {
        if (!lastAddedRecurringInfo) { console.warn("[undoAddPendingRecurring] Sem info de undo."); return; }
        if (undoTimeoutId) { clearTimeout(undoTimeoutId); undoTimeoutId = null; }
        const { transactionId, recurringId, previousLastAddedMonthYear } = lastAddedRecurringInfo;
        const deleted = await deleteTransactionData(transactionId);
        if (!deleted) { console.error(`[undoAddPendingRecurring] Falha ao deletar transação ${transactionId}. Undo abortado.`); showFeedback("Erro ao desfazer: transação não removida.", 'error', 0); lastAddedRecurringInfo = null; return; }
        const recIndex = recurringTransactions.findIndex(r => r.id === recurringId);
        if (recIndex > -1) {
             const currentRecState = recurringTransactions[recIndex];
             const recurringRevertData = { ...currentRecState, lastAddedMonthYear: previousLastAddedMonthYear };
            const reverted = await updateRecurringData(recurringRevertData);
            if (!reverted) { console.error(`[undoAddPendingRecurring] ERRO CRÍTICO: Falha ao reverter recorrência ${recurringId}.`); showFeedback("Erro crítico ao reverter status da recorrência.", 'error', 0); clearUndoState(); return; }
        } else { console.warn(`[undoAddPendingRecurring] Recorrência ${recurringId} não encontrada localmente para reverter.`); }
        console.log("[undoAddPendingRecurring] Undo concluído com sucesso.");
        clearUndoState();
        checkAndRenderPendingRecurring();
        showFeedback("Ação desfeita.", 'info', 2500);
    } catch (e) { console.error("Erro GERAL em undoAddPendingRecurring:", e); showFeedback("Erro inesperado ao desfazer.", 'error'); clearUndoState(); }
}