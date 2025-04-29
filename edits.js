// edits.js - Lógica dos Modais de Edição (Transação e Recorrência)

// Importa dados e funções relacionadas
import { categories, transactions, recurringTransactions, tags, updateTransactionData, saveData, addTagData } from './data.js';
import { populateCategorySelects as populateAllCategorySelects } from './interface.js';
import { renderRecurringManagement, renderTagManagementList } from './settings.js';
import { checkAndRenderPendingRecurring } from './recurring.js';
// *** Adiciona import das funções de máscara e destroy ***
import { showFeedback, normalizeText, applyCurrencyMask, getUnmaskedValue, destroyCurrencyMask } from './helpers.js';
import { renderAllMainUI } from './interface.js';
import { openModal as openModalGeneric, closeModal as closeModalGeneric } from './interface.js';
import { updateTagifyWhitelists } from './main.js';

// --- Seletores DOM (inicializados em main.js) ---
let editModal, editForm, editTransactionIdInput, editTransactionTypeInput, editDateInput, editDescriptionSourceInput, editAmountInput, editCategorySelect, editTagsInput, cancelEditBtn, editModalOverlay;
let editRecurringModal, editRecurringForm, editRecurringIdInput, editRecurringTypeSelect, editRecurringDayInput, editRecurringDescriptionInput, editRecurringAmountInput, editRecurringCategorySelect, cancelEditRecurringBtn, editRecurringModalOverlay;

// Instância Tagify do modal
let editTagifyInstance = null;

// Função para inicializar seletores (mantida)
export function initializeEditSelectors() {
    editModal = document.getElementById('edit-modal');
    if (editModal) {
        editForm = document.getElementById('edit-transaction-form');
        editTransactionIdInput = document.getElementById('edit-transaction-id');
        editTransactionTypeInput = document.getElementById('edit-transaction-type');
        editDateInput = document.getElementById('edit-date');
        editDescriptionSourceInput = document.getElementById('edit-description-source');
        editAmountInput = document.getElementById('edit-amount'); // Input de valor da transação
        editCategorySelect = document.getElementById('edit-category');
        editTagsInput = document.getElementById('edit-tags');
        cancelEditBtn = editModal.querySelector('.cancel-edit-btn');
        editModalOverlay = editModal.querySelector('.modal-overlay');
    }

    editRecurringModal = document.getElementById('edit-recurring-modal');
    if (editRecurringModal) {
        editRecurringForm = document.getElementById('edit-recurring-form');
        editRecurringIdInput = document.getElementById('edit-recurring-id');
        editRecurringTypeSelect = document.getElementById('edit-recurring-type');
        editRecurringDayInput = document.getElementById('edit-recurring-day');
        editRecurringDescriptionInput = document.getElementById('edit-recurring-description');
        editRecurringAmountInput = document.getElementById('edit-recurring-amount'); // Input de valor da recorrência
        editRecurringCategorySelect = document.getElementById('edit-recurring-category');
        cancelEditRecurringBtn = editRecurringModal.querySelector('.cancel-edit-recurring-btn');
        editRecurringModalOverlay = editRecurringModal.querySelector('.modal-overlay');
    }
}

// *** NOVO: Função para inicializar máscaras dos modais de edição ***
export function initializeEditMasks() {
    // A máscara será aplicada dinamicamente ao abrir o modal
    // console.log("[initializeEditMasks] Função pronta para aplicar máscaras ao abrir modais.");
}

// --- Funções do Modal de Edição de Transação ---

export function openEditModal(id) {
    if (!editModal || isNaN(id) || !editTagsInput || !editAmountInput) {
        console.error("Modal de edição ou campos essenciais não encontrados.");
        return;
    }
    const t = transactions.find(trans => trans.id === id);
    if (!t) { console.error(`[openEditModal] Transação não encontrada para ID ${id}`); return; }

    // Preenche campos normais
    editTransactionIdInput.value = t.id;
    editTransactionTypeInput.value = t.type;
    editDateInput.value = t.date;
    // editAmountInput.value = t.amount; // *** Removido - será definido pela máscara ***
    editDescriptionSourceInput.value = t.type === 'income' ? t.source : t.description;

    // Popula e define a categoria
    populateEditCategorySelect(t.type, t.category);

    // Inicializa e carrega Tagify (mantido)
    if (editTagifyInstance) { try { editTagifyInstance.destroy(); } catch (error) { console.warn("Erro ao destruir instância Tagify anterior:", error); } editTagifyInstance = null; }
    editTagsInput.value = '';
    const tagifySettingsEdit = { whitelist: [...tags], dropdown: { maxItems: 10, enabled: 0, closeOnSelect: false }, originalInputValueFormat: valuesArr => valuesArr.map(item => item.value).join(','), /*createInvalidTags: false*/ };
    editTagifyInstance = new Tagify(editTagsInput, tagifySettingsEdit);
    editTagifyInstance.on('add', onTagAdded);
    if (t.tags && Array.isArray(t.tags)) { editTagifyInstance.loadOriginalValues(t.tags); }

    // *** NOVO: Aplica máscara de moeda ao campo de valor ***
    editAmountInput.value = t.amount; // Define o valor ANTES de aplicar a máscara
    applyCurrencyMask(editAmountInput, true); // true para formatar ao focar/abrir
    console.log(`[openEditModal] Máscara aplicada a edit-amount com valor inicial ${t.amount}`);

    openModalGeneric(editModal);
    editDescriptionSourceInput.focus();
}

export function closeEditModal() {
    // Destrói Tagify (mantido)
    if (editTagifyInstance) { try { editTagifyInstance.destroy(); } catch (error) { console.warn("Erro ao destruir instância Tagify ao fechar modal:", error); } editTagifyInstance = null; }
    // *** NOVO: Destrói máscara de moeda ***
    if (editAmountInput) { destroyCurrencyMask(editAmountInput); }
    closeModalGeneric(editModal);
}

// populateEditCategorySelect (mantida)
export function populateEditCategorySelect(type, selectedCategory) {
    if (!editCategorySelect) { console.error("Select de categoria no modal de edição não encontrado!"); return; }
    editCategorySelect.innerHTML = '';
    editCategorySelect.disabled = false;
    const list = categories[type] || [];
    const defaultOptionText = type === 'expense' ? 'Selecione...' : 'Sem categoria';
    const defaultOptionValue = '';
    const defaultOptionDisabled = type === 'expense';

    editCategorySelect.innerHTML = `<option value="${defaultOptionValue}" ${defaultOptionDisabled ? 'disabled' : ''} ${!selectedCategory ? 'selected' : ''}>${defaultOptionText}</option>`;

    // Se for despesa e não houver categorias, adiciona placeholder e desabilita
    if (type === 'expense' && list.length === 0) {
        editCategorySelect.innerHTML = '<option value="" disabled selected>Nenhuma categoria de despesa</option>';
        editCategorySelect.disabled = true;
    } else {
        // Adiciona categorias da lista
        list.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            if (cat === selectedCategory) {
                opt.selected = true;
            }
            editCategorySelect.appendChild(opt);
        });

        // Garante que a opção correta esteja selecionada (se o valor existir na lista ou for a opção padrão)
        if (!editCategorySelect.value && list.length > 0 && type === 'expense') {
             editCategorySelect.value = ''; // Garante que o placeholder 'Selecione...' seja mostrado se nenhum válido for encontrado
        }
    }
}


// Salva a Transação Editada (chamada pelo listener em main.js)
// *** Modificado: Usa getUnmaskedValue ***
export function saveEditedTransaction(event) {
    try {
        event.preventDefault();
        if (!editTagifyInstance) { console.error("Instância Tagify do modal de edição não encontrada!"); alert('Erro interno: Campo de tags não inicializado corretamente.'); return; }
        if (!editAmountInput) { console.error("Campo de valor do modal de edição não encontrado!"); alert('Erro interno: Campo de valor não encontrado.'); return; }

        const id = Number(editTransactionIdInput.value);
        const type = editTransactionTypeInput.value;
        const date = editDateInput.value;
        // *** USA getUnmaskedValue ***
        const amount = getUnmaskedValue(editAmountInput);
        const descSource = editDescriptionSourceInput.value.trim();
        const category = editCategorySelect.value;
        const selectedTags = editTagifyInstance.value.map(tagData => tagData.value);

        // *** Validação usa valor numérico ***
        if (!date || !descSource || isNaN(amount) || amount <= 0 || (type === 'expense' && !category)) {
            alert(isNaN(amount) || amount <= 0 ? 'Insira um valor válido.' : (type === 'expense' && !category ? 'Selecione uma categoria.' : 'Preencha corretamente os campos obrigatórios.'));
            return;
        }

        const originalTransaction = transactions.find(t => t.id === id);
        if (!originalTransaction) { alert('Erro: Transação original não encontrada.'); closeEditModal(); return; }

        const updatedTransaction = {
            ...originalTransaction,
            id: id,
            type: type,
            date: date,
            amount: amount, // Salva valor numérico
            category: category,
            description: type === 'expense' ? descSource : '',
            source: type === 'income' ? descSource : '',
            tags: selectedTags
        };

        if (updateTransactionData(updatedTransaction)) {
            saveData(); // Dispara evento 'transactionsUpdated'
            // renderAllMainUI(); // UI principal é atualizada via renderAllMainUI chamado por saveEditedTransactionWrapper
            // checkAndRenderPendingRecurring(); // Atualizado via saveEditedTransactionWrapper que chama renderAllMainUI
            closeEditModal();
            showFeedback('Transação atualizada!', 'success', 'feedback-message');
        } else {
            alert('Erro ao encontrar transação para atualizar no estado.');
            console.error(`[saveEditedTransaction] Transação com ID ${id} não encontrada no array 'transactions' durante update.`);
            closeEditModal();
        }
    } catch (e) {
        console.error("Erro em saveEditedTransaction:", e);
        showFeedback('Erro ao salvar edição.', 'error', 'feedback-message');
        closeEditModal();
    }
}

// --- Funções do Modal de Edição de Recorrência ---

export function openEditRecurringModal(id) {
    if (!editRecurringModal || isNaN(id) || !editRecurringAmountInput) {
         console.error("Modal de edição de recorrência ou campo de valor não encontrado.");
        return;
    }
    const r = recurringTransactions.find(rec => rec.id === id);
    if (!r) { console.error(`[openEditRecurringModal] Recorrência não encontrada para ID ${id}`); return; }

    editRecurringIdInput.value = r.id;
    editRecurringTypeSelect.value = r.type;
    editRecurringDayInput.value = r.dayOfMonth;
    editRecurringDescriptionInput.value = r.description;
    // editRecurringAmountInput.value = r.amount; // *** Removido - será definido pela máscara ***

    populateEditRecurringCategorySelect(editRecurringCategorySelect, r.type);
    editRecurringCategorySelect.value = r.category || "";

    // *** NOVO: Aplica máscara de moeda ao campo de valor ***
    editRecurringAmountInput.value = r.amount; // Define o valor ANTES de aplicar a máscara
    applyCurrencyMask(editRecurringAmountInput, true); // true para formatar ao focar/abrir
    console.log(`[openEditRecurringModal] Máscara aplicada a edit-recurring-amount com valor inicial ${r.amount}`);

    openModalGeneric(editRecurringModal);
}

export function closeEditRecurringModal() {
    // *** NOVO: Destrói máscara de moeda ***
    if (editRecurringAmountInput) { destroyCurrencyMask(editRecurringAmountInput); }
    closeModalGeneric(editRecurringModal);
}

// populateEditRecurringCategorySelect (mantida)
export function populateEditRecurringCategorySelect(targetSelect = editRecurringCategorySelect, type = editRecurringTypeSelect?.value) {
     try {
        if (!targetSelect || !type) { console.warn("[populateEditRecurringCategorySelect] Target ou tipo inválido."); return; }
        const list = categories[type] || [];
        const currentValue = targetSelect.value; // Guarda o valor atual ANTES de limpar

        // Define o placeholder ou 'Sem categoria'
        let placeholderOption = `<option value="" disabled>Selecione...</option>`;
        if (type === 'income') {
            placeholderOption = `<option value="">Sem categoria</option>`;
        }

        targetSelect.innerHTML = placeholderOption; // Define a primeira opção

        // Adiciona categorias da lista
        list.sort((a, b) => a.localeCompare(b)).forEach(cat => {
            targetSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        // Tenta restaurar o valor anterior se ainda existir na lista ou for a opção de renda sem categoria
        if (list.includes(currentValue) || (type === 'income' && currentValue === '')) {
            targetSelect.value = currentValue;
        } else {
            // Se o valor anterior não for válido, seleciona o placeholder ou 'Sem categoria'
            targetSelect.value = (type === 'income' ? "" : ""); // Em ambos os casos, valor vazio seleciona a primeira opção
        }

        // Desabilita se for despesa e não houver categorias
        if (type === 'expense' && list.length === 0) {
             targetSelect.innerHTML = '<option value="" disabled selected>Nenhuma categoria de despesa</option>';
             targetSelect.disabled = true;
        } else {
             targetSelect.disabled = false;
        }

    } catch (e) { console.error("Erro em populateEditRecurringCategorySelect:", e); }
}

// Salva a Recorrência Editada
// *** Modificado: Usa getUnmaskedValue ***
export function saveEditedRecurringTransaction(event) {
    event.preventDefault();
    const settingsFeedbackEl = document.getElementById('recurring-settings-feedback');
    if (!editRecurringForm || !settingsFeedbackEl || !editRecurringAmountInput) {
        console.error("Formulário de edição de recorrência, feedback ou campo de valor não encontrado.");
        return;
    }

    try {
        const id=Number(editRecurringIdInput.value);
        const type=editRecurringTypeSelect.value;
        const dayOfMonth=parseInt(editRecurringDayInput.value);
        const description=editRecurringDescriptionInput.value.trim();
        // *** USA getUnmaskedValue ***
        const amount=getUnmaskedValue(editRecurringAmountInput);
        const category=editRecurringCategorySelect.value;

        // *** Validação usa valor numérico ***
        if(!type||!description||isNaN(dayOfMonth)||dayOfMonth<1||dayOfMonth>31||isNaN(amount)||amount<=0||(type==='expense'&&!category)){
            alert(isNaN(amount) || amount <= 0 ? 'Insira um valor válido.' : 'Preencha todos os campos corretamente.');
            return;
        }

        const recIndex=recurringTransactions.findIndex(r=>r.id===id);
        if(recIndex > -1){
            recurringTransactions[recIndex]={...recurringTransactions[recIndex],type,dayOfMonth,description,amount,category};
            saveData(); // Salva dados (não dispara evento de transação)
            renderRecurringManagement(); // Atualiza lista no modal de config
            checkAndRenderPendingRecurring(); // Atualiza pendentes na UI principal
            closeEditRecurringModal();
            showFeedback('Recorrência atualizada com sucesso!', 'success', settingsFeedbackEl);
        } else {
            alert('Erro: Recorrência não encontrada para atualizar.');
            closeEditRecurringModal();
        }
    } catch(e) {
        console.error("Erro em saveEditedRecurringTransaction:", e);
        showFeedback('Erro ao salvar alterações da recorrência.', 'error', settingsFeedbackEl);
        closeEditRecurringModal();
    }
}


// Função onTagAdded (mantida)
function onTagAdded(e) {
    const tagName = e.detail.data.value;
    const isNew = !tags.some(t => normalizeText(t) === normalizeText(tagName));

    if (isNew && tagName.trim() !== '') {
        console.log(`[Tagify Edit Event] Nova tag detectada: "${tagName}"`);
        if (addTagData(tagName)) {
            console.log(`[Tagify Edit Event] Tag "${tagName}" adicionada aos dados globais.`);
            saveData();
            updateTagifyWhitelists();
            if (document.getElementById('settings-modal')?.classList.contains('active') && document.getElementById('tab-tags')?.classList.contains('active')) {
                 renderTagManagementList();
            }
        }
    } else if (tagName.trim() === '' && e.detail.tag) {
        const tagifyInstance = e.detail.tagify;
        setTimeout(() => tagifyInstance.removeTags(e.detail.tag), 0);
    }
}