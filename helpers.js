// helpers.js - Funções Utilitárias

// Elementos de feedback (mantidos)
let recurringFeedbackEl;
let feedbackMessageEl;
let tagFeedbackEl;
let budgetFeedbackEl;
let goalFeedbackEl;
let recurringSettingsFeedbackEl;

const MOBILE_BREAKPOINT = 768;

// initializeFeedbackElements, getFeedbackElementById, isMobileView, normalizeText, formatCurrency, formatDate, formatMonthYear, formatDateForInput (mantidos)
export function initializeFeedbackElements() {
    recurringFeedbackEl = document.getElementById('recurring-feedback');
    feedbackMessageEl = document.getElementById('feedback-message');
    tagFeedbackEl = document.getElementById('tag-feedback');
    budgetFeedbackEl = document.getElementById('budget-feedback');
    goalFeedbackEl = document.getElementById('goal-feedback');
    recurringSettingsFeedbackEl = document.getElementById('recurring-settings-feedback');
    console.log("[initializeFeedbackElements] Elementos de feedback selecionados."); // Log
}
function getFeedbackElementById(elementId) {
    switch (elementId) {
        case 'recurring-feedback': return recurringFeedbackEl;
        case 'tag-feedback': return tagFeedbackEl;
        case 'budget-feedback': return budgetFeedbackEl;
        case 'goal-feedback': return goalFeedbackEl;
        case 'recurring-settings-feedback': return recurringSettingsFeedbackEl;
        case 'feedback-message':
        default:
            if (!feedbackMessageEl) { console.warn(`[getFeedbackElementById] Elemento padrão 'feedback-message' não encontrado.`); }
            return feedbackMessageEl;
    }
}
export function isMobileView() { return window.innerWidth <= MOBILE_BREAKPOINT; }
export function normalizeText(text) { if (!text) return ''; return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
export function formatCurrency(value) { if (typeof value !== 'number' || isNaN(value)) { value = 0; } return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
export function formatDate(dateString) {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return '';
    try {
        const parts = dateString.split('-'); if (parts.length !== 3) return '';
        const y = parseInt(parts[0]); const m = parseInt(parts[1]); const d = parseInt(parts[2]);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return '';
        const date = new Date(Date.UTC(y, m - 1, d));
        if (isNaN(date.getTime()) || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) { console.warn(`[formatDate] Data inválida detectada: ${dateString}`); return ''; }
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { console.error(`[formatDate] Erro ao formatar data "${dateString}":`, e); return ''; }
}
export function formatMonthYear(monthYearString) {
    if (!monthYearString || typeof monthYearString !== 'string' || !monthYearString.includes('-')) return monthYearString;
    try {
        const [year, month] = monthYearString.split('-');
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
        if (isNaN(date.getTime())) return monthYearString;
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    } catch (e) { console.error(`[formatMonthYear] Erro ao formatar "${monthYearString}":`, e); return monthYearString; }
}
export function formatDateForInput(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    try {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { console.error("[formatDateForInput] Erro ao formatar objeto Date:", date, e); return ''; }
}

// showFeedback, clearFeedback (mantidas)
export function showFeedback(message, type = 'success', elementOrId = 'feedback-message', duration = 3000, includeUndo = false, undoCallback = null) {
    const element = (typeof elementOrId === 'string') ? getFeedbackElementById(elementOrId) : elementOrId;
    if (!element) { console.error(`[showFeedback] ERRO: Elemento de feedback não encontrado (ID ou elemento: ${elementOrId})`); return; }
    let recurringModuleRef = null;
    import('./recurring.js').then(module => { recurringModuleRef = module; }).catch(e => console.error("Erro ao pré-carregar recurring.js em showFeedback:", e));
    if (element.timeoutId) { clearTimeout(element.timeoutId); element.timeoutId = null; }
    if (recurringModuleRef && element === recurringModuleRef.getRecurringFeedbackElement() && recurringModuleRef.getUndoTimeoutId()) { clearTimeout(recurringModuleRef.getUndoTimeoutId()); recurringModuleRef.clearUndoState(); }
    element.innerHTML = `<span>${message}</span>`; element.className = `feedback ${type}`;
    if (includeUndo && typeof undoCallback === 'function') { const undoButton = document.createElement('button'); undoButton.id = 'undo-action-btn'; undoButton.className = 'btn btn-secondary btn-sm undo-button'; undoButton.textContent = 'Desfazer'; undoButton.addEventListener('click', undoCallback); element.appendChild(undoButton); element.classList.add('with-undo'); }
    element.style.display = 'flex'; element.style.opacity = '1';
    if (duration > 0) {
        const currentTimeoutId = setTimeout(() => {
            if (element && element.timeoutId === currentTimeoutId) { element.style.opacity = '0'; setTimeout(() => { if (element) { element.style.display = 'none'; element.innerHTML = ''; element.className = 'feedback'; element.timeoutId = null; if (recurringModuleRef && element === recurringModuleRef.getRecurringFeedbackElement() && includeUndo) { recurringModuleRef.clearUndoState(); } } }, 300); }
        }, duration);
        element.timeoutId = currentTimeoutId;
         if (recurringModuleRef && includeUndo && element === recurringModuleRef.getRecurringFeedbackElement()) { recurringModuleRef.setUndoTimeoutId(currentTimeoutId); }
    } else { element.timeoutId = null; }
}
export function clearFeedback(elementOrId = 'feedback-message') {
    const element = (typeof elementOrId === 'string') ? getFeedbackElementById(elementOrId) : elementOrId; if (!element) return;
    let recurringModuleRef = null; import('./recurring.js').then(module => { recurringModuleRef = module; }).catch(e => console.error("Erro ao pré-carregar recurring.js em clearFeedback:", e));
    if (element.timeoutId) { clearTimeout(element.timeoutId); element.timeoutId = null; }
    if(recurringModuleRef && element === recurringModuleRef.getRecurringFeedbackElement() && recurringModuleRef.getUndoTimeoutId()) { clearTimeout(recurringModuleRef.getUndoTimeoutId()); recurringModuleRef.clearUndoState(); }
    element.style.opacity = '0'; element.style.display = 'none'; element.innerHTML = ''; element.className = 'feedback';
}

// --- Funções para Máscara de Moeda (IMask.js) ---

/**
 * Aplica máscara de moeda BRL a um elemento de input.
 * Destrói qualquer máscara anterior no elemento.
 * Armazena a instância da máscara no elemento para acesso posterior.
 * @param {HTMLInputElement} inputElement O elemento de input.
 * @param {boolean} setInitialValue Define se o valor atual do input deve ser usado para formatar inicialmente.
 */
export function applyCurrencyMask(inputElement, setInitialValue = false) {
    if (!inputElement || typeof IMask === 'undefined') {
        if (!inputElement) console.warn('applyCurrencyMask: Elemento de input inválido.');
        if (typeof IMask === 'undefined') console.warn('applyCurrencyMask: Biblioteca IMask não carregada.');
        return;
    }

    // Guarda o valor atual para redefinir após criar a máscara, se necessário
    const initialValue = inputElement.value;

    // Destrói máscara anterior, se existir
    if (inputElement.imaskInstance) {
        try { inputElement.imaskInstance.destroy(); }
        catch (e) { console.warn('Erro ao destruir máscara anterior:', e); }
        inputElement.imaskInstance = null;
    }

    const maskOptions = {
        mask: 'R$ num', // Prefixo R$
        blocks: {
            num: {
                mask: Number,
                scale: 2,
                signed: false,
                thousandsSeparator: '.',
                padFractionalZeros: true,
                normalizeZeros: true,
                radix: ',',
                mapToRadix: ['.'],
                min: 0, // Permite 0, mas validação pode exigir > 0
                // max: 1000000 // Exemplo de máximo, se necessário
            }
        }
    };

    const mask = IMask(inputElement, maskOptions);

    // Armazena a instância no elemento
    inputElement.imaskInstance = mask;

    // *** CORREÇÃO: Define o valor na máscara DEPOIS de criá-la ***
    // Isso garante que o valor inicial seja formatado corretamente.
    if (setInitialValue && initialValue) {
         // Usa 'typedValue' para definir o valor numérico (string ou number)
         // O IMask formatará corretamente.
         mask.typedValue = initialValue;
        // console.log('Máscara aplicada e valor inicial formatado para:', inputElement.id || inputElement.className, 'Valor:', mask.value);
    }
     // else { console.log('Máscara aplicada para:', inputElement.id || inputElement.className); }
}

// getUnmaskedValue (mantida como antes, já estava correta)
export function getUnmaskedValue(inputElement) {
    if (inputElement && inputElement.imaskInstance) {
        const unmasked = inputElement.imaskInstance.unmaskedValue;
        if (unmasked === '' || unmasked === null || unmasked === undefined) { return NaN; }
        const numericValue = parseFloat(unmasked);
        return isNaN(numericValue) ? NaN : numericValue;
    } else {
        console.warn('getUnmaskedValue: Instância IMask não encontrada para o elemento:', inputElement?.id || inputElement?.className);
        const fallbackValue = parseFloat(inputElement?.value?.replace("R$", "").trim().replace(/\./g, '').replace(',', '.') || '');
        return isNaN(fallbackValue) ? NaN : fallbackValue;
    }
}

// destroyCurrencyMask (mantida como antes)
export function destroyCurrencyMask(inputElement) {
     if (inputElement && inputElement.imaskInstance) {
        try { inputElement.imaskInstance.destroy(); inputElement.imaskInstance = null; }
        catch (e) { console.warn('Erro ao destruir máscara IMask:', e); }
    }
}