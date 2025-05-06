// edits.js - Lógica dos Modais de Edição (Transação e Recorrência)

import {
    categories, transactions, recurringTransactions, tags,
    updateTransactionData, addTagData,
    updateRecurringData
} from './data.js';
import { populateCategorySelects as populateAllCategorySelects } from './interface.js'; // Usado indiretamente? Verificar se é necessário
import { renderRecurringManagement, renderTagManagementList } from './settings.js';
import { checkAndRenderPendingRecurring } from './recurring.js';
import {
    showFeedback, normalizeText, applyCurrencyMask,
    getUnmaskedValue, destroyCurrencyMask
} from './helpers.js';
import { renderAllMainUI } from './interface.js'; // Usado indiretamente? Verificar se é necessário
import { openModal as openModalGeneric, closeModal as closeModalGeneric } from './interface.js';
import { updateTagifyWhitelists } from './main.js';
// Importa Tagify (se não estiver globalmente disponível, ajuste o path ou use CDN)
// import Tagify from '@yaireo/tagify'; // Exemplo se estivesse usando um bundler
// Importa Swal (SweetAlert2)
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';


// --- Seletores DOM ---
let editModal, editForm, editTransactionIdInput, editTransactionTypeInput,
    editDateInput, editDescriptionSourceInput, editAmountInput,
    editCategorySelect, editTagsInput, editNotesInput, cancelEditBtn,
    editModalOverlay;
let editRecurringModal, editRecurringForm, editRecurringIdInput,
    editRecurringTypeSelect, editRecurringDayInput,
    editRecurringDescriptionInput, editRecurringAmountInput,
    editRecurringCategorySelect, cancelEditRecurringBtn,
    editRecurringModalOverlay;

// Instância Tagify do modal de edição de transação
let editTagifyInstance = null;

// Função para inicializar seletores E ADICIONAR LISTENERS ESPECÍFICOS DO MODAL
export function initializeEditSelectors() {
    editModal = document.getElementById('edit-modal');
    if (editModal) {
        editForm = document.getElementById('edit-transaction-form');
        editTransactionIdInput = document.getElementById('edit-transaction-id');
        editTransactionTypeInput = document.getElementById('edit-transaction-type');
        editDateInput = document.getElementById('edit-date');
        editDescriptionSourceInput = document.getElementById('edit-description-source');
        editAmountInput = document.getElementById('edit-amount');
        editCategorySelect = document.getElementById('edit-category');
        editTagsInput = document.getElementById('edit-tags'); // Input original Tagify
        editNotesInput = document.getElementById('edit-notes');
        cancelEditBtn = editModal.querySelector('.cancel-edit-btn');
        editModalOverlay = editModal.querySelector('.modal-overlay'); // Já coberto pela delegação em main.js

        // Adiciona listener para o botão Cancelar específico deste modal
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', closeEditModal);
            // console.log("[initializeEditSelectors] Listener adicionado ao cancelEditBtn.");
        } else {
            console.error("[initializeEditSelectors] Botão .cancel-edit-btn não encontrado no modal de edição.");
        }
        // Listeners de Overlay e Botão 'X' genérico são tratados em main.js
    } else {
        console.warn("Modal #edit-modal não encontrado no DOM.");
    }

    editRecurringModal = document.getElementById('edit-recurring-modal');
    if (editRecurringModal) {
        editRecurringForm = document.getElementById('edit-recurring-form');
        editRecurringIdInput = document.getElementById('edit-recurring-id');
        editRecurringTypeSelect = document.getElementById('edit-recurring-type');
        editRecurringDayInput = document.getElementById('edit-recurring-day');
        editRecurringDescriptionInput = document.getElementById('edit-recurring-description');
        editRecurringAmountInput = document.getElementById('edit-recurring-amount');
        editRecurringCategorySelect = document.getElementById('edit-recurring-category');
        cancelEditRecurringBtn = editRecurringModal.querySelector('.cancel-edit-recurring-btn');
        editRecurringModalOverlay = editRecurringModal.querySelector('.modal-overlay'); // Já coberto

        // Adiciona listener para o botão Cancelar específico deste modal
        if(cancelEditRecurringBtn) {
            cancelEditRecurringBtn.addEventListener('click', closeEditRecurringModal);
            // console.log("[initializeEditSelectors] Listener adicionado ao cancelEditRecurringBtn.");
        }
        // Listeners de Overlay e Botão 'X' genérico são tratados em main.js
    } else {
        console.warn("Modal #edit-recurring-modal não encontrado no DOM.");
    }
}

// Inicializa máscaras dos modais de edição (aplicadas ao abrir os modais)
export function initializeEditMasks() {
    // Nenhuma máscara fixa aqui, são aplicadas em openEditModal e openEditRecurringModal
}

// --- Funções do Modal de Edição de Transação ---

export function openEditModal(id) {
    // Verifica se elementos essenciais do modal existem
    if (!editModal || !editTagsInput || !editAmountInput || !editNotesInput) {
        console.error("Modal de edição ou campos essenciais não encontrados.");
        return;
    }
    // Encontra a transação a ser editada
    const t = transactions.find(trans => trans.id === id);
    if (!t) {
        console.error(`[openEditModal] Transação não encontrada para ID ${id}`);
        return;
    }
    // console.log("[openEditModal] Abrindo edição para:", t);

    // Preenche campos do formulário com dados da transação
    editTransactionIdInput.value = t.id;
    editTransactionTypeInput.value = t.type;
    editDateInput.value = t.date;
    editDescriptionSourceInput.value = t.type === 'income' ? t.source : t.description;
    editNotesInput.value = t.notes || ''; // Preenche notas

    // Popula e seleciona a categoria correta
    populateEditCategorySelect(t.type, t.category);

    // Inicializa Tagify para as tags
    // Destroi instância anterior se existir
    if (editTagifyInstance) {
        try { editTagifyInstance.destroy(); } catch (error) {/* ignore */}
        editTagifyInstance = null;
    }
    editTagsInput.value = ''; // Limpa valor original antes de Tagify iniciar

    const tagifySettingsEdit = {
        whitelist: [...tags], // Usa lista de tags globais
        dropdown: {
            maxItems: 10,
            enabled: 0, // Dropdown aparece ao digitar
            closeOnSelect: false
        },
        originalInputValueFormat: valuesArr => valuesArr.map(item => item.value).join(',') // Não essencial aqui
    };
    editTagifyInstance = new Tagify(editTagsInput, tagifySettingsEdit);
    editTagifyInstance.on('add', onTagAddedEdit); // Listener para adicionar novas tags

    // Carrega tags existentes da transação no Tagify
    if (t.tags && Array.isArray(t.tags)) {
        editTagifyInstance.loadOriginalValues(t.tags);
    }

    // Preenche e aplica máscara de moeda ao valor
    editAmountInput.value = t.amount;
    applyCurrencyMask(editAmountInput, true); // Aplica máscara e formata valor inicial

    // Abre o modal e foca no campo de descrição/fonte
    openModalGeneric(editModal);
    editDescriptionSourceInput.focus();
}

export function closeEditModal() {
    // console.log("[closeEditModal] Fechando e resetando modal de edição...");
    // Destrói Tagify
    if (editTagifyInstance) {
        try { editTagifyInstance.destroy(); } catch (error) {/* ignore */}
        editTagifyInstance = null;
    }
    // Destrói máscara de moeda
    if (editAmountInput) {
        destroyCurrencyMask(editAmountInput);
    }
    // Reseta formulário
    if(editForm) editForm.reset();
    // Limpa campos que reset() pode não limpar corretamente (textarea, tagify)
    if(editNotesInput) editNotesInput.value = '';
    if(editTagsInput) editTagsInput.value = '';
    if(editCategorySelect) editCategorySelect.value = ''; // Garante que categoria seja resetada

    // Fecha o modal
    closeModalGeneric(editModal);
}

// Popula o select de categoria no modal de edição
export function populateEditCategorySelect(type, selectedCategory) {
    if (!editCategorySelect) {
        console.error("Select de categoria de edição não encontrado!");
        return;
    }
    editCategorySelect.innerHTML = ''; // Limpa opções
    editCategorySelect.disabled = false;
    const list = categories[type] || [];

    // Define texto e valor do placeholder
    const defaultOptionText = type === 'expense' ? 'Selecione...' : 'Sem categoria';
    const defaultOptionValue = '';
    // Desabilita placeholder apenas se for despesa (obrigatório selecionar)
    const defaultOptionDisabled = type === 'expense';

    // Adiciona placeholder
    editCategorySelect.innerHTML = `
        <option value="${defaultOptionValue}"
                ${defaultOptionDisabled ? 'disabled' : ''}
                ${!selectedCategory ? 'selected' : ''}> <!-- Seleciona se não houver categoria salva -->
            ${defaultOptionText}
        </option>
    `;

    // Adiciona categorias da lista
    if (type === 'expense' && list.length === 0) {
        editCategorySelect.innerHTML = '<option value="" disabled selected>Nenhuma categoria de despesa</option>';
        editCategorySelect.disabled = true;
    } else {
        list.sort((a, b) => a.localeCompare(b)).forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            // Seleciona a categoria atual da transação
            if (cat === selectedCategory) {
                opt.selected = true;
            }
            editCategorySelect.appendChild(opt);
        });
        // Garante que o valor selecionado seja válido após popular
        if (type === 'expense' && !list.includes(selectedCategory)) {
            editCategorySelect.value = ''; // Volta para o placeholder desabilitado se a categoria antiga não existe mais
        } else if (type === 'income' && !list.includes(selectedCategory) && selectedCategory !== '') {
             editCategorySelect.value = ''; // Volta para 'Sem categoria' se a antiga não existe mais (e não era 'Sem categoria')
        } else {
            editCategorySelect.value = selectedCategory || ''; // Garante que o valor correto esteja selecionado
        }
    }
}

// Salva a Transação Editada (Usa data.js e inclui notas)
export async function saveEditedTransaction(event) {
    try {
        event.preventDefault(); // Impede submit padrão do formulário
        // Verifica se todos os elementos necessários estão presentes
        if (!editTagifyInstance || !editAmountInput || !editTransactionIdInput ||
            !editTransactionTypeInput || !editDateInput || !editDescriptionSourceInput ||
            !editCategorySelect || !editNotesInput)
        {
            console.error("Erro interno: Campos do formulário de edição não encontrados!");
            alert('Erro interno ao salvar. Tente novamente.');
            return;
        }

        // Obtém valores do formulário
        const id = editTransactionIdInput.value;
        const type = editTransactionTypeInput.value;
        const date = editDateInput.value;
        const amount = getUnmaskedValue(editAmountInput);
        const descSource = editDescriptionSourceInput.value.trim();
        const category = editCategorySelect.value;
        const selectedTags = editTagifyInstance.value.map(tagData => tagData.value);
        const notesValue = editNotesInput.value.trim();

        // Encontra a transação original para comparar ou usar dados não editáveis
        const originalTransaction = transactions.find(t => t.id === id);

        // Validação básica
        if (!date || !descSource || isNaN(amount) || amount <= 0 || (type === 'expense' && !category)) {
            const message = isNaN(amount) || amount <= 0 ? 'Insira um valor válido.' :
                           (type === 'expense' && !category) ? 'Selecione uma categoria para a despesa.' :
                           'Preencha os campos obrigatórios (Data, Descrição/Fonte).';
            alert(message);
            return;
        }
        if (!originalTransaction) {
            alert('Erro: Transação original não encontrada. Não foi possível salvar.');
            closeEditModal();
            return;
        }

        // Monta objeto com dados atualizados
        const updatedTransactionData = {
            ...originalTransaction, // Mantém campos não editáveis como ID, user_id, created_at
            id: id, // Garante ID correto
            type: type,
            date: date,
            amount: amount,
            category: category || null, // Salva null se for receita sem categoria
            description: type === 'expense' ? descSource : '',
            source: type === 'income' ? descSource : '',
            tags: selectedTags,
            notes: notesValue || null // Salva null se notas estiverem vazias
            // recurringOriginId é mantido do originalTransaction via spread (...)
        };

        // console.log("[saveEditedTransaction] Enviando para update:", updatedTransactionData);

        // Chama função de atualização em data.js
        const success = await updateTransactionData(updatedTransactionData);

        if (success) {
            closeEditModal(); // Fecha modal
            showFeedback('Transação atualizada com sucesso!', 'success'); // Mostra Toast
        } else {
            alert('Erro ao salvar as alterações da transação. Verifique o console.');
            console.error(`[saveEditedTransaction] Falha ao chamar updateTransactionData para ID ${id}.`);
        }
    } catch (e) {
        console.error("Erro GERAL em saveEditedTransaction:", e);
        showFeedback('Erro inesperado ao salvar edição.', 'error');
        closeEditModal(); // Fecha modal em caso de erro inesperado
    }
}

// --- Funções do Modal de Edição de Recorrência ---

export function openEditRecurringModal(id) {
    if (!editRecurringModal || isNaN(id) || !editRecurringAmountInput) {
        console.error("Modal de edição de recorrência ou campos essenciais não encontrados ou ID inválido.");
        return;
    }
    // Encontra a recorrência
    const r = recurringTransactions.find(rec => rec.id === id);
    if (!r) {
        console.error(`[openEditRecurringModal] Recorrência não encontrada para ID ${id}`);
        return;
    }

    // Preenche o formulário
    editRecurringIdInput.value = r.id;
    editRecurringTypeSelect.value = r.type;
    editRecurringDayInput.value = r.dayOfMonth;
    editRecurringDescriptionInput.value = r.description;
    // Popula e seleciona categoria
    populateEditRecurringCategorySelect(editRecurringCategorySelect, r.type); // Passa o select e o tipo
    editRecurringCategorySelect.value = r.category || ""; // Seleciona categoria (ou vazio se não houver)
    // Preenche e aplica máscara de valor
    editRecurringAmountInput.value = r.amount;
    applyCurrencyMask(editRecurringAmountInput, true);

    openModalGeneric(editRecurringModal); // Abre modal
}

export function closeEditRecurringModal() {
    // Destroi máscara
    if (editRecurringAmountInput) {
        destroyCurrencyMask(editRecurringAmountInput);
    }
    // Reseta formulário
    if(editRecurringForm) editRecurringForm.reset();
    // Fecha modal
    closeModalGeneric(editRecurringModal);
}

// Popula o select de categoria no modal de edição de recorrência
export function populateEditRecurringCategorySelect(
    targetSelect = editRecurringCategorySelect, // Select alvo
    type = editRecurringTypeSelect?.value       // Tipo (income/expense)
) {
    try {
        if (!targetSelect || !type) {
            console.warn("[populateEditRecurringCategorySelect] Select alvo ou tipo inválido.");
            return;
        }
        const list = categories[type] || []; // Pega categorias do tipo certo

        // Define placeholder
        let placeholderOption = `<option value="" disabled selected>Selecione...</option>`;
        if (type === 'income') {
            placeholderOption = `<option value="" selected>Sem categoria</option>`;
        }
        targetSelect.innerHTML = placeholderOption; // Adiciona placeholder

        // Adiciona categorias da lista
        list.sort((a, b) => a.localeCompare(b)).forEach(cat => {
            targetSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        // Define se é obrigatório e estado desabilitado
        targetSelect.required = (type === 'expense');
        targetSelect.disabled = (type === 'expense' && list.length === 0);

        // Garante que o valor inicial esteja limpo (o valor será setado em openEditRecurringModal)
        targetSelect.value = '';

    } catch (e) {
        console.error("Erro em populateEditRecurringCategorySelect:", e);
    }
}

// Salva a Recorrência Editada
export async function saveEditedRecurringTransaction(event) {
    event.preventDefault();
    // Verifica se elementos existem
    if (!editRecurringForm || !editRecurringAmountInput || !editRecurringIdInput ||
        !editRecurringTypeSelect || !editRecurringDayInput || !editRecurringDescriptionInput ||
        !editRecurringCategorySelect) {
        console.error("Formulário de edição de recorrência ou campos essenciais não encontrados.");
        alert("Erro interno ao salvar. Tente novamente.");
        return;
    }

    try {
        // Obtém valores
        const id = Number(editRecurringIdInput.value);
        const type = editRecurringTypeSelect.value;
        const dayOfMonth = parseInt(editRecurringDayInput.value);
        const description = editRecurringDescriptionInput.value.trim();
        const amount = getUnmaskedValue(editRecurringAmountInput);
        const category = editRecurringCategorySelect.value;

        // Validação
        if(isNaN(id) || !type || !description ||
           isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31 ||
           isNaN(amount) || amount <= 0 ||
           (type === 'expense' && !category))
        {
            const message = isNaN(amount) || amount <= 0 ? 'Insira um valor válido.' :
                           (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) ? 'Insira um dia do mês válido (1-31).' :
                           (type === 'expense' && !category) ? 'Selecione uma categoria para a despesa recorrente.' :
                           'Preencha todos os campos corretamente.';
            alert(message);
            return;
        }

        // Monta objeto com dados atualizados
        const updatedRecurringData = {
            id: id,
            type: type,
            dayOfMonth: dayOfMonth,
            description: description,
            amount: amount,
            category: category || null // Salva null se não houver categoria
            // lastAddedMonthYear não é editado aqui, será atualizado quando a recorrência for adicionada
        };

        // Chama função de atualização em data.js
        const success = await updateRecurringData(updatedRecurringData);

        if (success) {
            renderRecurringManagement();      // Atualiza lista no modal de settings
            checkAndRenderPendingRecurring(); // Atualiza pendentes na UI principal
            closeEditRecurringModal();        // Fecha modal de edição
            showFeedback('Recorrência atualizada com sucesso!', 'success'); // Toast
        } else {
            alert('Erro ao atualizar recorrência no banco de dados. Verifique o console.');
        }
    } catch(e) {
        console.error("Erro GERAL em saveEditedRecurringTransaction:", e);
        showFeedback('Erro inesperado ao salvar alterações da recorrência.', 'error');
        closeEditRecurringModal(); // Fecha modal em caso de erro inesperado
    }
}


// Função onTagAdded específica para o modal de edição de transação (ASYNC)
async function onTagAddedEdit(e) {
    const tagName = e.detail.data.value;
    // Verifica se a tag é nova (ignorando case/acentos)
    const isNew = !tags.some(t => normalizeText(t) === normalizeText(tagName));

    if (isNew && tagName.trim() !== '') {
        // console.log(`[Tagify Edit Event] Nova tag detectada: "${tagName}"`);
        const added = await addTagData(tagName); // Tenta adicionar via data.js
        if (added) {
            // console.log(`[Tagify Edit Event] Tag "${tagName}" adicionada.`);
            updateTagifyWhitelists(); // Atualiza todas as instâncias Tagify
            // Atualiza lista no modal de settings se estiver aberto
            if (document.getElementById('settings-modal')?.classList.contains('active') &&
                document.getElementById('tab-tags')?.classList.contains('active')) {
                renderTagManagementList();
            }
            // Atualiza whitelist da instância atual (edição)
            if(editTagifyInstance) {
                editTagifyInstance.settings.whitelist = [...tags];
            }
        } else {
            console.warn(`[Tagify Edit Event] Falha ao adicionar tag "${tagName}". Removendo do input.`);
            // Remove tag do input se adição falhou
            if(e.detail.tagify) {
                e.detail.tagify.removeTags(e.detail.tag);
            }
        }
    } else if (tagName.trim() === '' && e.detail.tag) {
        // Remove tag vazia
        const tagifyInstance = e.detail.tagify;
        setTimeout(() => tagifyInstance.removeTags(e.detail.tag), 0);
    }
}