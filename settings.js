// settings.js - Lógica do Modal de Configurações e suas Sub-seções

import {
    categories, tags, budgets, goals, recurringTransactions, transactions,
    addCategoryData, deleteCategoryData,
    addTagData, deleteTagData,
    updateTransactionData,
    addRecurringData, deleteRecurringData, updateRecurringData,
    saveBudgetsData, addGoalData, updateGoalData, deleteGoalData,
    defaultCategories,
    loadInitialData // Importado para recarregar após deleteCategory
} from './data.js';
import { supabase } from './supabaseClient.js';
import {
    normalizeText, formatCurrency, showFeedback, clearFeedback,
    isMobileView, applyCurrencyMask, getUnmaskedValue, destroyCurrencyMask,
    formatDateForInput, formatMonthYear as formatMonthYearHelper
} from './helpers.js';
import {
    populateCategorySelects as populateAllCategorySelects,
    renderBudgetsSection as renderMainBudgets,
    renderGoalsSection as renderMainGoals,
    renderAllMainUI, closeModal as closeModalGeneric, openModal as openModalGeneric
} from './interface.js';
import { checkAndRenderPendingRecurring } from './recurring.js';
import { updateTagifyWhitelists } from './main.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js'; // Importa direto do CDN se não usar bundler

// --- Seletores DOM ---
let settingsModalContent;
let settingsModalHeader;
let settingsModalTitle;
let settingsSectionListContainer;
let settingsBackButton;
let modalTabsContainer;
let tabButtons;
let tabContentContainer;
let tabContents;
// Aba Orçamentos
let budgetForm, budgetCategoriesListEl, budgetFeedbackEl;
// Aba Categorias
let newCategoryNameInput, newCategoryTypeSelect, addCategoryBtn,
    expenseCategoryListEl, incomeCategoryListEl, categoryFeedbackEl;
// Aba Tags
let addTagForm, newTagNameInput, addTagBtn, tagManagementListEl, tagFeedbackEl;
// Aba Metas
let addGoalForm, goalNameInput, goalTargetAmountInput, goalManagementListEl, goalFeedbackEl;
// Aba Recorrências
let addRecurringForm, recurringTypeSelect, recurringDayInput,
    recurringDescriptionInput, recurringAmountInput, recurringCategorySelect,
    recurringManagementListEl, recurringSettingsFeedbackEl;
// Aba Exportar
let exportCsvBtnModal;

// --- Estado Local ---
export let isMobileSettingsView = false;
export let currentSettingsView = 'list'; // 'list' or 'detail'
// Removido: let budgetMonthPickerInstance = null;

// --- Função Interna ---
function destroyAllSettingsMasks() {
    // Aba Orçamentos
    budgetCategoriesListEl?.querySelectorAll('.budget-input').forEach(input => destroyCurrencyMask(input));
    // Aba Metas
    if (goalTargetAmountInput) destroyCurrencyMask(goalTargetAmountInput);
    goalManagementListEl?.querySelectorAll('.add-goal-amount-input').forEach(input => destroyCurrencyMask(input));
    // Aba Recorrências
    if (recurringAmountInput) destroyCurrencyMask(recurringAmountInput);
    // Aba Editar Recorrência (é destruída ao fechar o modal específico)
    console.log("[destroyAllSettingsMasks] Máscaras do modal de configurações destruídas.");
}

// --- Funções Exportadas ---
export function initializeSettingsSelectors() {
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal) return;
    settingsModalContent = settingsModal.querySelector('.settings-modal-content');
    settingsModalHeader = settingsModal.querySelector('.settings-modal-header');
    settingsModalTitle = document.getElementById('settings-modal-title');
    settingsSectionListContainer = document.getElementById('settings-section-list');
    settingsBackButton = document.getElementById('settings-back-btn');
    modalTabsContainer = settingsModal.querySelector('.modal-tabs');
    tabButtons = settingsModal.querySelectorAll('.tab-button');
    tabContentContainer = settingsModal.querySelector('.tab-content-container');
    tabContents = settingsModal.querySelectorAll('.tab-content');

    // Seletores específicos das abas
    budgetForm = document.getElementById('budget-form');
    budgetCategoriesListEl = document.getElementById('budget-categories-list');
    budgetFeedbackEl = document.getElementById('budget-feedback');

    newCategoryNameInput = settingsModal.querySelector('#tab-categories #new-category-name');
    newCategoryTypeSelect = document.getElementById('new-category-type');
    addCategoryBtn = document.getElementById('add-category-btn');
    expenseCategoryListEl = document.getElementById('expense-category-list');
    incomeCategoryListEl = document.getElementById('income-category-list');
    categoryFeedbackEl = document.getElementById('category-feedback');

    addTagForm = document.getElementById('add-tag-form');
    newTagNameInput = settingsModal.querySelector('#tab-tags #new-tag-name');
    addTagBtn = document.getElementById('add-tag-btn');
    tagManagementListEl = document.getElementById('tag-management-list');
    tagFeedbackEl = document.getElementById('tag-feedback');

    addGoalForm = document.getElementById('add-goal-form');
    goalNameInput = document.getElementById('goal-name');
    goalTargetAmountInput = document.getElementById('goal-target-amount');
    goalManagementListEl = document.getElementById('goal-management-list');
    goalFeedbackEl = document.getElementById('goal-feedback');

    addRecurringForm = document.getElementById('add-recurring-form');
    recurringTypeSelect = document.getElementById('recurring-type');
    recurringDayInput = document.getElementById('recurring-day');
    recurringDescriptionInput = document.getElementById('recurring-description');
    recurringAmountInput = document.getElementById('recurring-amount');
    recurringCategorySelect = document.getElementById('recurring-category');
    recurringManagementListEl = document.getElementById('recurring-management-list');
    recurringSettingsFeedbackEl = document.getElementById('recurring-settings-feedback');

    exportCsvBtnModal = document.getElementById('export-csv-btn');
}

export function initializeSettingsMasks() {
    // Aplicar máscaras aos inputs que estão sempre visíveis no HTML inicial
    if (goalTargetAmountInput) applyCurrencyMask(goalTargetAmountInput);
    if (recurringAmountInput) applyCurrencyMask(recurringAmountInput);
    // As máscaras de orçamento e de adicionar valor à meta são aplicadas dinamicamente
    // quando a aba/lista correspondente é renderizada.
    console.log("[initializeSettingsMasks] Máscaras aplicadas nos forms fixos.");
}

export function openSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal) return;
    openModalGeneric(settingsModal);

    if (isMobileView()) {
        setupMobileSettingsView();
    } else {
        setupDesktopSettingsView();
    }

    // Garante que uma aba ativa seja definida (mesmo no desktop)
    const activeTabButton = modalTabsContainer?.querySelector('.tab-button.active');
    const targetTabId = activeTabButton ? activeTabButton.dataset.tab : 'tab-budgets'; // Default para orçamentos
    setActiveTab(targetTabId); // Renderiza o conteúdo da aba ativa
}

// Funções de controle de view (mantidas)
export function setupDesktopSettingsView() {
    isMobileSettingsView = false;
    currentSettingsView = 'detail'; // Desktop sempre mostra detalhes
    settingsModalContent?.classList.remove('mobile-view', 'show-list', 'show-detail');
    settingsModalHeader?.classList.remove('mobile-view', 'show-back-button');
    modalTabsContainer?.classList.remove('hidden');
    tabContentContainer?.classList.remove('hidden');
    settingsSectionListContainer?.classList.add('hidden');
    settingsBackButton?.classList.add('hidden');
    if (settingsModalTitle) settingsModalTitle.textContent = "Configurações";
    // Define a aba ativa (pode ser a última ou a padrão)
    const activeTabButton = modalTabsContainer?.querySelector('.tab-button.active') || modalTabsContainer?.querySelector('.tab-button');
    const targetTabId = activeTabButton ? activeTabButton.dataset.tab : 'tab-budgets';
    setActiveTab(targetTabId);
}
export function setupMobileSettingsView() {
    isMobileSettingsView = true;
    currentSettingsView = 'list'; // Mobile começa na lista
    settingsModalContent?.classList.add('mobile-view', 'show-list');
    settingsModalContent?.classList.remove('show-detail');
    settingsModalHeader?.classList.add('mobile-view');
    settingsModalHeader?.classList.remove('show-back-button'); // Esconde botão voltar na lista
    modalTabsContainer?.classList.add('hidden');
    tabContentContainer?.classList.add('hidden');
    settingsSectionListContainer?.classList.remove('hidden');
    settingsBackButton?.classList.add('hidden');
    if (settingsModalTitle) settingsModalTitle.textContent = "Configurações";
    renderSettingsListView(); // Popula a lista de seções
}
export function renderSettingsListView() {
    if (!settingsSectionListContainer || !tabButtons) return;
    settingsSectionListContainer.innerHTML = ''; // Limpa lista antiga
    const ul = document.createElement('ul');
    tabButtons.forEach(button => {
        const sectionId = button.dataset.tab;
        const iconClass = button.querySelector('i')?.className || 'fas fa-question-circle';
        const sectionTitle = button.textContent.trim();

        const li = document.createElement('li');
        const itemButton = document.createElement('button');
        itemButton.className = 'settings-section-item';
        itemButton.dataset.sectionId = sectionId;
        itemButton.dataset.sectionTitle = sectionTitle;
        itemButton.innerHTML = `
            <i class="${iconClass}"></i>
            <span>${sectionTitle}</span>
        `;
        li.appendChild(itemButton);
        ul.appendChild(li);
    });
    settingsSectionListContainer.appendChild(ul);
}
export function showSettingsSection(sectionId, sectionTitle) {
    currentSettingsView = 'detail'; // Mudou para a view de detalhes
    settingsModalContent?.classList.remove('show-list');
    settingsModalContent?.classList.add('show-detail');
    settingsModalHeader?.classList.add('show-back-button'); // Mostra botão voltar
    settingsBackButton?.classList.remove('hidden');
    if (settingsModalTitle) settingsModalTitle.textContent = sectionTitle;

    setActiveTab(sectionId); // Ativa a aba correspondente (mesmo que oculta)

    // Garante que o conteúdo da aba seja visível no mobile
    tabContentContainer?.classList.remove('hidden');
    settingsSectionListContainer?.classList.add('hidden');
}
export function handleResize() {
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal || !settingsModal.classList.contains('active')) {
        return; // Só executa se o modal estiver ativo
    }
    const currentlyMobile = settingsModalContent?.classList.contains('mobile-view');
    const shouldBeMobile = isMobileView();

    if (currentlyMobile && !shouldBeMobile) {
        // Estava em modo mobile, mas a tela ficou grande -> vai para desktop view
        setupDesktopSettingsView();
    } else if (!currentlyMobile && shouldBeMobile) {
        // Estava em modo desktop, mas a tela ficou pequena -> vai para mobile view
        if (currentSettingsView === 'detail') {
            // Se estava vendo um detalhe, mantém o detalhe visível mas adapta a UI
            settingsModalContent?.classList.add('mobile-view', 'show-detail');
            settingsModalContent?.classList.remove('show-list');
            settingsModalHeader?.classList.add('mobile-view', 'show-back-button');
            modalTabsContainer?.classList.add('hidden');
            tabContentContainer?.classList.remove('hidden');
            settingsSectionListContainer?.classList.add('hidden');
            settingsBackButton?.classList.remove('hidden');
        } else {
            // Se estava na lista (improvável no desktop), vai para a lista mobile
            setupMobileSettingsView();
        }
        isMobileSettingsView = true; // Atualiza estado
    }
}
export function closeSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    destroyAllSettingsMasks(); // Destroi máscaras ao fechar
    closeModalGeneric(settingsModal);
    // Reseta classes de view para o estado padrão (desktop) ao fechar
    settingsModalContent?.classList.remove('mobile-view', 'show-list', 'show-detail');
    settingsModalHeader?.classList.remove('mobile-view', 'show-back-button');
}

export function setActiveTab(tabId) {
    if (!tabButtons || !tabContents) return;

    tabButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabId);
    });

    tabContents.forEach(c => {
        const isActive = c.id === tabId;
        c.classList.toggle('active', isActive);

        // Aplica máscaras ou renderiza conteúdo APENAS para a aba que se tornou ativa
        if (isActive) {
            destroyAllSettingsMasks(); // Destroi máscaras de abas anteriores
            switch (tabId) {
                case 'tab-budgets':
                    renderBudgetInputs(); // Renderiza e aplica máscaras
                    break;
                case 'tab-categories':
                    renderCategoryLists();
                    break;
                case 'tab-tags':
                    renderTagManagementList();
                    break;
                case 'tab-goals':
                    renderGoalsManagement(); // Renderiza lista e aplica máscaras nos inputs de adicionar valor
                    if (goalTargetAmountInput) applyCurrencyMask(goalTargetAmountInput); // Aplica máscara no input principal
                    break;
                case 'tab-recurring':
                    populateSettingsRecurringCategories();
                    renderRecurringManagement();
                    if (recurringAmountInput) applyCurrencyMask(recurringAmountInput); // Aplica máscara no input principal
                    break;
                // case 'tab-export': não precisa de ação especial aqui
            }
        }
    });
}

// --- Funções das Abas ---

// Orçamentos (SIMPLIFICADO e MIGRADO)
export function renderBudgetInputs() {
    if (!budgetCategoriesListEl) return;
    budgetCategoriesListEl.innerHTML = ''; // Limpa

    const expenseCats = categories.expense || [];
    if (expenseCats.length === 0) {
        budgetCategoriesListEl.innerHTML = '<p class="placeholder">Cadastre categorias de despesa primeiro.</p>';
        return;
    }

    console.log(`[renderBudgetInputs] Renderizando orçamentos gerais:`, budgets);

    expenseCats.forEach(cat => {
        const budgetValue = budgets[cat] || ''; // Pega valor do estado local
        const inputId = `budget-${normalizeText(cat)}`;
        // Template Literal Quebrado
        budgetCategoriesListEl.innerHTML += `
            <div class="budget-input-item">
                <label for="${inputId}">${cat}</label>
                <input
                    type="text"
                    inputmode="decimal"
                    id="${inputId}"
                    class="budget-input"
                    placeholder="R$ 0,00"
                    value="${budgetValue}"
                    data-category="${cat}">
            </div>
        `;
    });

    // Aplica máscara a todos os inputs recém-criados
    budgetCategoriesListEl.querySelectorAll('.budget-input').forEach(input => {
        applyCurrencyMask(input, true); // true para formatar o valor existente
    });
}
export async function saveBudgets(event) {
    event.preventDefault();
    if (!budgetCategoriesListEl || !budgetFeedbackEl) return;

    const inputs = budgetCategoriesListEl.querySelectorAll('.budget-input');
    let budgetsToSave = {};
    let hasInvalidInput = false;

    inputs.forEach(input => {
        const category = input.dataset.category;
        const value = getUnmaskedValue(input);

        if (!isNaN(value) && value >= 0) {
            // Considera 0 como um valor válido para remover/zerar o orçamento
            budgetsToSave[category] = value;
        } else if (input.value.trim() !== '' && input.value.trim() !== 'R$ 0,00') {
            // Se o campo não está vazio e não é um valor válido, marca como inválido
            console.warn(`Input inválido para ${category}: ${input.value}`);
            hasInvalidInput = true;
        }
        // Destroi máscara antiga ANTES de re-renderizar
        destroyCurrencyMask(input);
    });

    if (hasInvalidInput) {
        showFeedback('Alguns valores inválidos foram ignorados.', 'warning', 4000, false, null, null); // Usa Toast
    }

    const success = await saveBudgetsData(budgetsToSave); // Salva no Supabase e atualiza estado local

    if (success) {
        renderMainBudgets(budgets, transactions); // Atualiza seção principal
        showFeedback(`Orçamentos salvos!`, 'success', 3000, false, null, null); // Usa Toast
    } else {
        showFeedback(`Erro ao salvar orçamentos.`, 'error', 5000, false, null, null); // Usa Toast
    }

    // Re-renderiza os inputs com os valores atualizados (ou vazios se erro)
    renderBudgetInputs();
}

// Categorias (MIGRADO)
export function renderCategoryLists() {
    if (!incomeCategoryListEl || !expenseCategoryListEl) return;
    incomeCategoryListEl.innerHTML = '';
    expenseCategoryListEl.innerHTML = '';

    const createLI = (cat, type, defaults) => `
        <li>
            <span>${cat}</span>
            <button
                class="delete-category-btn"
                data-name="${cat}"
                data-type="${type}"
                ${defaults.includes(cat) ? 'disabled title="Padrão (não pode ser removido)"' : ''}
                aria-label="Excluir categoria ${cat}">
                <i class="fas fa-trash-alt"></i>
            </button>
        </li>
    `;

    (categories.income || []).forEach(cat => {
        incomeCategoryListEl.innerHTML += createLI(cat, 'income', defaultCategories.income);
    });
    (categories.expense || []).forEach(cat => {
        expenseCategoryListEl.innerHTML += createLI(cat, 'expense', defaultCategories.expense);
    });
}
export async function addCategory() {
    if (!newCategoryNameInput || !newCategoryTypeSelect || !addCategoryBtn) return;
    const name = newCategoryNameInput.value.trim();
    const type = newCategoryTypeSelect.value;

    if (!name) {
        showFeedback('Insira um nome para a categoria.', 'error', 3000, false, null, null); // Toast
        return;
    }

    // Desabilita botão e input para evitar cliques múltiplos
    addCategoryBtn.disabled = true;
    newCategoryNameInput.disabled = true;

    const added = await addCategoryData(name, type); // Tenta adicionar no data.js (e Supabase)

    if (added) {
        populateAllCategorySelects(categories); // Atualiza selects na UI principal
        renderCategoryLists();                  // Atualiza lista no modal
        if (type === 'expense') {
            renderBudgetInputs(); // Atualiza inputs de orçamento se for despesa
        }
        newCategoryNameInput.value = ''; // Limpa input
        showFeedback(`Categoria "${name}" adicionada!`, 'success', 3000, false, null, null); // Toast
    } else {
        // Mensagem genérica pois data.js já loga se é duplicado ou erro
        showFeedback(`Categoria "${name}" já existe ou ocorreu um erro.`, 'error', 4000, false, null, null); // Toast
    }

    // Reabilita controles
    addCategoryBtn.disabled = false;
    newCategoryNameInput.disabled = false;
    newCategoryNameInput.focus();
}
export async function deleteCategory(name, type) {
    // A confirmação (SweetAlert) agora é feita aqui DENTRO
    if (defaultCategories[type]?.includes(name)) {
        showFeedback('Não é possível remover uma categoria padrão.', 'warning', 4000, false, null, null); // Toast
        return;
    }

    const result = await Swal.fire({
        title: 'Confirmar Exclusão',
        html: `Tem certeza que deseja excluir a categoria <strong>"${name}"</strong>?<br><small>Lançamentos, recorrências e orçamentos associados perderão esta categoria (ficarão sem categoria ou serão removidos, respectivamente).</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar',
        customClass: {
            htmlContainer: 'swal2-html-container-left' // Para melhor leitura do html
        }
    });

    if (!result.isConfirmed) {
        console.log(`[deleteCategory] Exclusão de "${name}" cancelada pelo usuário.`);
        return; // Sai se o usuário cancelar
    }

    console.log(`[deleteCategory] Iniciando exclusão de "${name}" (${type})...`);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado.");

        let dependenciesUpdated = true;
        const updates = []; // Array para guardar as Promises das atualizações

        console.log(`[deleteCategory] Atualizando dependências no DB para categoria "${name}"...`);

        // 1. Transações: Seta categoria para NULL
        updates.push(
            supabase.from('transactions')
                .update({ category: null })
                .match({ user_id: user.id, type: type, category: name })
                .then(({ error }) => {
                    if (error) {
                        console.error("Erro ao remover categoria das transações:", error.message);
                        dependenciesUpdated = false;
                    } else {
                        console.log(`Categoria removida das transações DB para "${name}".`);
                    }
                })
        );

        // 2. Recorrências e Orçamentos (apenas se for despesa)
        if (type === 'expense') {
            // Recorrências: Seta categoria para NULL
            updates.push(
                supabase.from('recurring_transactions')
                    .update({ category: null })
                    .match({ user_id: user.id, type: type, category: name })
                    .then(({ error }) => {
                        if (error) {
                            console.error("Erro ao remover categoria das recorrências DB:", error.message);
                            dependenciesUpdated = false;
                        } else {
                            console.log(`Categoria removida das recorrências DB para "${name}".`);
                        }
                    })
            );
            // Orçamentos: Deleta a linha do orçamento
            updates.push(
                supabase.from('budgets')
                    .delete()
                    .match({ user_id: user.id, category: name })
                    .then(({ error }) => {
                        // Ignora erro se o orçamento não existia (PGRST116: Row Not Found)
                        if (error && error.code !== 'PGRST116') {
                            console.error("Erro ao deletar orçamentos DB:", error.message);
                            dependenciesUpdated = false;
                        } else {
                            console.log(`Orçamentos DB deletados (ou não existiam) para categoria "${name}".`);
                        }
                    })
            );
        }

        // Espera todas as atualizações de dependências terminarem
        await Promise.all(updates);

        if (!dependenciesUpdated) {
            console.error(`[deleteCategory] Falha ao atualizar dependências no DB. Exclusão da categoria "${name}" cancelada.`);
            showFeedback('Erro ao atualizar dados associados. Categoria não removida.', 'error', 5000, false, null, null); // Toast
            return; // Cancela a exclusão da categoria em si
        }

        // 3. Deleta a Categoria do DB e do Estado Local (data.js)
        const deleted = await deleteCategoryData(name, type);

        if (deleted) {
            console.log(`[deleteCategory] Categoria "${name}" removida com sucesso do DB e estado local.`);

            // --- Atualiza UI e Estado Local das Dependências ---
            // Atualiza estado local dos orçamentos (se era despesa)
            if (type === 'expense' && budgets.hasOwnProperty(name)) {
                delete budgets[name];
                console.log(`[deleteCategory] Orçamento local removido para "${name}".`);
            }
            // Força recarregamento total para garantir consistência geral após operação complexa
            console.log("[deleteCategory] Recarregando todos os dados para garantir consistência...");
            showFeedback(`Categoria "${name}" removida. Atualizando...`, 'info', 2000, false, null, null);
            await loadInitialData(); // Dispara o evento 'initialDataLoaded' que re-renderiza tudo

            // Atualizações específicas de UI (podem ser redundantes devido ao loadInitialData, mas garantem)
            populateAllCategorySelects(categories); // Atualiza selects
            renderCategoryLists(); // Atualiza lista no modal
            if (type === 'expense') {
                renderBudgetInputs(); // Atualiza inputs de orçamento
                renderMainBudgets(budgets, transactions); // Atualiza seção principal de orçamentos
            }
            renderRecurringManagement(); // Atualiza lista de recorrências no modal
            checkAndRenderPendingRecurring(); // Atualiza pendentes na UI principal

            showFeedback(`Categoria "${name}" removida com sucesso!`, 'success', 3000, false, null, null); // Toast final
        } else {
            // Provavelmente não deveria chegar aqui se as dependências foram atualizadas,
            // mas é um fallback caso deleteCategoryData falhe por outro motivo.
            console.error(`[deleteCategory] Falha ao remover categoria "${name}" do banco de dados após atualizar dependências.`);
            showFeedback(`Falha ao remover categoria "${name}" do banco de dados.`, 'error', 5000, false, null, null); // Toast
        }
    } catch (e) {
        console.error("Erro GERAL em deleteCategory:", e.message);
        showFeedback('Erro inesperado ao excluir categoria.', 'error', 5000, false, null, null); // Toast
    }
}

// Tags (Mantido como antes, usa Toast, confirmação em main.js)
export function renderTagManagementList() {
    if (!tagManagementListEl) {
        console.error("Elemento tagManagementListEl não encontrado!");
        return;
    }
    tagManagementListEl.innerHTML = ''; // Limpa

    if (tags.length === 0) {
        tagManagementListEl.innerHTML = '<li class="placeholder">Nenhuma tag cadastrada.</li>';
        return;
    }

    // Ordena tags alfabeticamente (ignorando maiúsculas/minúsculas)
    tags.sort((a, b) => normalizeText(a).localeCompare(normalizeText(b)));

    tags.forEach(tag => {
        const li = document.createElement('li');
        li.className = 'tag-list-item';
        // Template Literal Quebrado
        li.innerHTML = `
            <span>${tag}</span>
            <button class="delete-tag-btn" data-tag-name="${tag}" aria-label="Excluir tag ${tag}">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        tagManagementListEl.appendChild(li);
    });
}
export async function addTag() {
    if (!newTagNameInput || !tagFeedbackEl || !addTagBtn) return;
    const tagName = newTagNameInput.value.trim();
    if (!tagName) {
        showFeedback('Insira um nome para a tag.', 'error', 3000, false, null, null); // Toast
        return;
    }

    addTagBtn.disabled = true;
    newTagNameInput.disabled = true;

    const added = await addTagData(tagName); // Tenta adicionar (data.js trata duplicatas)

    if (added) {
        renderTagManagementList(); // Atualiza lista no modal
        updateTagifyWhitelists(); // Atualiza instâncias Tagify
        newTagNameInput.value = ''; // Limpa input
        showFeedback(`Tag "${tagName}" adicionada!`, 'success', 3000, false, null, null); // Toast
    } else {
        showFeedback(`A tag "${tagName}" já existe ou ocorreu um erro.`, 'error', 4000, false, null, null); // Toast
    }

    addTagBtn.disabled = false;
    newTagNameInput.disabled = false;
    newTagNameInput.focus();
}
export async function deleteTag(tagName) {
    // A confirmação (SweetAlert) é feita no wrapper handleDeleteTag em main.js
    if (!tagFeedbackEl || !tagName) return;

    const deleted = await deleteTagData(tagName); // Tenta deletar (data.js)

    if (deleted) {
        renderTagManagementList(); // Atualiza lista no modal
        updateTagifyWhitelists(); // Atualiza Tagify
        // Atualiza UI principal implicitamente via evento 'transactionsUpdated' disparado por deleteTagData
        showFeedback(`Tag "${tagName}" excluída!`, 'success', 3000, false, null, null); // Toast
    } else {
        showFeedback(`Tag "${tagName}" não encontrada ou erro ao excluir.`, 'error', 4000, false, null, null); // Toast
    }
}

// Metas (MIGRADO, usa Toast e SweetAlert2)
export function renderGoalsManagement() {
    if (!goalManagementListEl) return;
    goalManagementListEl.innerHTML = ''; // Limpa

    if (goals.length === 0) {
        goalManagementListEl.innerHTML = '<li class="placeholder">Nenhuma meta cadastrada.</li>';
        return;
    }

    goals.sort((a, b) => a.name.localeCompare(b.name)); // Ordena por nome

    goals.forEach(goal => {
        const li = document.createElement('li');
        li.dataset.id = goal.id;
        // Template Literal Quebrado
        li.innerHTML = `
            <div class="goal-info">
                <span class="goal-name">${goal.name}</span>
                <span class="goal-target">Alvo: ${formatCurrency(goal.targetAmount)}</span>
                <span class="goal-saved">Salvo: <span>${formatCurrency(goal.savedAmount || 0)}</span></span>
            </div>
            <div class="goal-add-progress">
                <input
                    type="text"
                    inputmode="decimal"
                    class="add-goal-amount-input"
                    placeholder="Add Valor"
                    aria-label="Valor a adicionar para ${goal.name}">
                <button
                    type="button"
                    class="btn btn-income btn-sm add-goal-amount-btn"
                    aria-label="Adicionar valor para ${goal.name}">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <button class="delete-goal-btn" aria-label="Excluir meta ${goal.name}">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        goalManagementListEl.appendChild(li);

        // Aplica máscara e listener ao input de adicionar valor
        const inputEl = li.querySelector('.add-goal-amount-input');
        if (inputEl) {
            applyCurrencyMask(inputEl);
            // Listener para adicionar com Enter
            inputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const goalId = Number(li.dataset.id);
                    if (!isNaN(goalId)) {
                        addSavedAmountToGoal(goalId, inputEl);
                    }
                }
            });
        }
    });
}
export async function addGoal(event) {
    if (!goalNameInput || !goalTargetAmountInput || !addGoalForm || !goalFeedbackEl) return;
    event.preventDefault();

    const name = goalNameInput.value.trim();
    const targetAmount = getUnmaskedValue(goalTargetAmountInput);

    if (!name || isNaN(targetAmount) || targetAmount <= 0) {
        const message = isNaN(targetAmount) || targetAmount <= 0
            ? 'Insira um valor alvo válido para a meta.'
            : 'Preencha o nome da meta.';
        showFeedback(message, 'error', 4000, false, null, null); // Toast
        return;
    }

    const newGoalData = { name, targetAmount };
    const addedGoal = await addGoalData(newGoalData); // Adiciona no data.js (e Supabase)

    if (addedGoal) {
        renderGoalsManagement(); // Atualiza lista no modal
        renderMainGoals(goals); // Atualiza display na UI principal
        addGoalForm.reset(); // Limpa formulário
        if (goalTargetAmountInput.imaskInstance) {
            goalTargetAmountInput.imaskInstance.value = ''; // Limpa valor mascarado
        }
        showFeedback(`Meta "${name}" adicionada!`, 'success', 3000, false, null, null); // Toast
    } else {
        showFeedback('Erro ao adicionar meta. Verifique o console.', 'error', 5000, false, null, null); // Toast
    }
}
export async function addSavedAmountToGoal(goalId, inputElement) {
    if (!goalFeedbackEl || !inputElement || isNaN(goalId)) return;

    const amountToAdd = getUnmaskedValue(inputElement);

    if (isNaN(amountToAdd) || amountToAdd <= 0) {
        showFeedback('Insira um valor positivo válido para adicionar.', 'error', 3000, false, null, null); // Toast
        if (inputElement.imaskInstance) {
            inputElement.imaskInstance.value = ''; // Limpa input inválido
        }
        inputElement.focus();
        return;
    }

    const goalIndex = goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) {
        showFeedback('Erro: Meta não encontrada localmente.', 'error', 4000, false, null, null); // Toast
        return;
    }

    const currentGoal = goals[goalIndex];
    const newSavedAmount = (currentGoal.savedAmount || 0) + amountToAdd;
    const updateData = { id: goalId, savedAmount: newSavedAmount };

    const success = await updateGoalData(updateData); // Atualiza no data.js (e Supabase)

    if (success) {
        renderGoalsManagement(); // Atualiza lista no modal (com novo valor e input limpo)
        renderMainGoals(goals); // Atualiza display na UI principal
        showFeedback(`Valor adicionado à meta "${currentGoal.name}"!`, 'success', 3000, false, null, null); // Toast
        // Input já é limpo pela re-renderização de renderGoalsManagement que aplica a máscara novamente
    } else {
        showFeedback('Erro ao atualizar valor salvo da meta.', 'error', 5000, false, null, null); // Toast
    }
     // Destroi máscara antiga explicitamente caso a re-renderização falhe
     destroyCurrencyMask(inputElement);
}
export async function deleteGoal(id) {
    // A confirmação (SweetAlert) é feita aqui DENTRO
    if (isNaN(id)) return;
    const goalIndex = goals.findIndex(g => g.id === id);
    if (goalIndex === -1) return; // Meta não encontrada localmente

    const goalName = goals[goalIndex].name;

    const result = await Swal.fire({
        title: 'Confirmar Exclusão',
        text: `Tem certeza que deseja excluir a meta "${goalName}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        console.log(`[deleteGoal] Usuário confirmou exclusão para ID: ${id}`);
        const deleted = await deleteGoalData(id); // Chama função do data.js

        if (deleted) {
            renderGoalsManagement(); // Atualiza lista no modal
            renderMainGoals(goals); // Atualiza display na UI principal
            showFeedback(`Meta "${goalName}" excluída.`, 'success', 3000, false, null, null); // Usa Toast
        } else {
            showFeedback(`Erro ao excluir meta "${goalName}".`, 'error', 5000, false, null, null); // Usa Toast
        }
    } else {
        console.log(`[deleteGoal] Exclusão cancelada pelo usuário para ID: ${id}`);
    }
}

// Recorrências (Já Migradas, usa Toast e SweetAlert2)
export function populateSettingsRecurringCategories(
    targetSelect = recurringCategorySelect,
    type = recurringTypeSelect?.value
) {
    try {
        if (!targetSelect || !type) {
            console.warn("[populateSettingsRecurringCategories] Select ou tipo inválido.");
            return;
        }

        const list = categories[type] || [];
        const currentValue = targetSelect.value; // Salva valor atual para tentar restaurar

        // Define opção placeholder/padrão
        let placeholderOption = `<option value="" disabled>Selecione...</option>`;
        if (type === 'income') {
            placeholderOption = `<option value="">Sem categoria</option>`; // Receita pode não ter categoria
        }
        targetSelect.innerHTML = placeholderOption;

        // Adiciona categorias da lista
        list.sort((a, b) => a.localeCompare(b)).forEach(cat => {
            targetSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        // Tenta restaurar valor ou seleciona o padrão
        if ((list.includes(currentValue) || (type === 'income' && currentValue === ''))) {
            targetSelect.value = currentValue;
        } else {
             // Se o valor antigo não é mais válido, seleciona o placeholder
             targetSelect.value = '';
             if(targetSelect.querySelector('option[disabled]')) {
                targetSelect.querySelector('option[disabled]').selected = true;
             }
        }


        // Define obrigatoriedade e estado do select
        targetSelect.required = (type === 'expense');
        targetSelect.disabled = (type === 'expense' && list.length === 0); // Desabilita se despesa e sem categorias

    } catch (e) {
        console.error("Erro em populateSettingsRecurringCategories:", e);
    }
}
export function renderRecurringManagement() {
    if (!recurringManagementListEl) return;
    recurringManagementListEl.innerHTML = ''; // Limpa

    if (recurringTransactions.length === 0) {
        recurringManagementListEl.innerHTML = '<li class="placeholder">Nenhuma recorrência cadastrada.</li>';
        return;
    }

    // Ordena por dia do mês, depois por descrição
    recurringTransactions.sort((a, b) =>
        a.dayOfMonth - b.dayOfMonth || a.description.localeCompare(b.description)
    );

    recurringTransactions.forEach(rec => {
        const li = document.createElement('li');
        li.dataset.id = rec.id;
        const typeTxt = rec.type === 'income' ? 'Entrada' : 'Saída';
        const catTxt = rec.category || 'N/A';
        // Template Literal Quebrado
        li.innerHTML = `
            <div class="info">
                <span class="name ${rec.type}">${rec.description}</span>
                <span class="details">
                    Tipo: ${typeTxt} | Dia: ${rec.dayOfMonth} | Valor: <span class="value">${formatCurrency(rec.amount)}</span> | Cat: ${catTxt}
                </span>
            </div>
            <div class="actions">
                <button class="edit-recurring-btn" aria-label="Editar recorrência ${rec.description}">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="delete-recurring-btn" aria-label="Excluir recorrência ${rec.description}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        recurringManagementListEl.appendChild(li);
    });
}
export async function addRecurringTransaction(event) {
    // Verifica se todos os elementos necessários existem
    if (!recurringTypeSelect || !recurringSettingsFeedbackEl || !addRecurringForm ||
        !recurringAmountInput || !recurringDayInput || !recurringDescriptionInput ||
        !recurringCategorySelect) {
        console.error("Erro: Elementos do formulário de recorrência não encontrados.");
        alert("Erro interno. Recarregue a página.");
        return;
    }
    event.preventDefault();

    const type = recurringTypeSelect.value;
    const dayOfMonth = parseInt(recurringDayInput.value);
    const description = recurringDescriptionInput.value.trim();
    const amount = getUnmaskedValue(recurringAmountInput);
    const category = recurringCategorySelect.value;

    // Validação
    if (!type || !description || isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31 ||
        isNaN(amount) || amount <= 0 || (type === 'expense' && !category))
    {
        const message = isNaN(amount) || amount <= 0 ? 'Insira um valor padrão válido.' :
                       (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) ? 'Insira um dia do mês válido (1-31).' :
                       (type === 'expense' && !category) ? 'Selecione uma categoria para a despesa recorrente.' :
                       'Preencha todos os campos obrigatórios corretamente.';
        alert(message); // Usa alert para bloqueio imediato
        return;
    }

    const newRecurringData = { type, dayOfMonth, description, amount, category: category || null };

    const added = await addRecurringData(newRecurringData); // Adiciona no data.js (e Supabase)

    if (added) {
        renderRecurringManagement(); // Atualiza lista no modal
        addRecurringForm.reset(); // Limpa formulário
        populateSettingsRecurringCategories(); // Reseta select de categoria
        if (recurringAmountInput.imaskInstance) {
            recurringAmountInput.imaskInstance.value = ''; // Limpa valor mascarado
        }
        checkAndRenderPendingRecurring(); // Atualiza pendentes na UI principal
        showFeedback('Recorrência adicionada!', 'success', 3000, false, null, null); // Toast
    } else {
        showFeedback('Erro ao adicionar recorrência. Verifique o console.', 'error', 5000, false, null, null); // Toast
    }
}
export async function deleteRecurringTransaction(id) {
    // A confirmação (SweetAlert) é feita aqui DENTRO
    if (isNaN(id)) return;
    const recToDelete = recurringTransactions.find(r => r.id === id);
    const recDesc = recToDelete ? recToDelete.description : `ID ${id}`;

    const result = await Swal.fire({
        title: 'Confirmar Exclusão',
        text: `Tem certeza que deseja excluir a recorrência "${recDesc}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        console.log(`[deleteRecurringTransaction] Usuário confirmou exclusão para ID: ${id}`);
        const deleted = await deleteRecurringData(id); // Chama função do data.js

        if (deleted) {
            renderRecurringManagement(); // Atualiza lista no modal
            checkAndRenderPendingRecurring(); // Atualiza pendentes na UI principal
            showFeedback(`Recorrência "${recDesc}" excluída.`, 'success', 3000, false, null, null); // Usa Toast
        } else {
            showFeedback(`Erro ao excluir recorrência "${recDesc}".`, 'error', 5000, false, null, null); // Usa Toast
        }
    } else {
        console.log(`[deleteRecurringTransaction] Exclusão cancelada pelo usuário para ID: ${id}`);
    }
}

// Exportar (Mantido)
export function exportToCSV() {
    try {
        if (transactions.length === 0) {
            showFeedback('Sem transações para exportar.', 'info', 3000, false, null, null); // Toast
            return;
        }

        // Cabeçalho CSV
        const header = [
            'ID', 'Tipo', 'Data', 'Valor', 'Categoria', 'Tags',
            'Descricao/Fonte', 'Notas', 'ID Recorrencia Origem'
        ];

        // Ordena transações por data para o CSV
        const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

        // Mapeia transações para linhas CSV
        const rows = sortedTransactions.map(t => [
            t.id,
            t.type === 'income' ? 'Receita' : 'Despesa', // Mais claro que Entrada/Saída
            formatDate(t.date), // Formato DD/MM/YYYY
            t.amount.toFixed(2).replace('.', ','), // Formato moeda BR (sem R$)
            t.category || '',
            `"${(t.tags || []).join('; ')}"`, // Tags entre aspas, separadas por ;
            `"${(t.type === 'income' ? t.source : t.description).replace(/"/g, '""')}"`, // Desc/Fonte entre aspas, escapa aspas internas
            `"${(t.notes || '').replace(/"/g, '""')}"`, // Notas entre aspas, escapa aspas internas
            t.recurringOriginId || '' // ID da recorrência se houver
        ].join(',')); // Junta colunas com vírgula

        // Junta cabeçalho e linhas
        const csvContent = [header.join(','), ...rows].join('\n');

        // Cria Blob com BOM para UTF-8 (melhora compatibilidade Excel)
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // Cria link para download
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        link.download = `controle_financeiro_${timestamp}.csv`;

        // Simula clique para iniciar download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpa URL do objeto
        URL.revokeObjectURL(url);

        showFeedback('Exportação CSV iniciada!', 'info', 3000, false, null, null); // Toast

    } catch (e) {
        console.error("Erro em exportToCSV:", e);
        showFeedback('Erro ao gerar arquivo CSV.', 'error', 5000, false, null, null); // Toast
    }
}