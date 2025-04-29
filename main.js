// main.js - Ponto de Entrada Principal e Orquestração

// Importa Funções/Variáveis de Estado e Persistência
import {
    loadData, saveData, transactions, categories, tags, budgets, goals, recurringTransactions,
    addTransactionData, deleteTransactionData, updateTransactionData,
    addCategoryData, deleteCategoryData, addTagData, deleteTagData
} from './data.js';
// Importa Funções Utilitárias e de Feedback
import { initializeFeedbackElements, showFeedback, clearFeedback, formatDateForInput, normalizeText, applyCurrencyMask, getUnmaskedValue, destroyCurrencyMask } from './helpers.js';
// Importa Funções da UI Principal
import {
    updateDesktopSidebarState, toggleDesktopSidebar, openMobileSidebar, closeMobileSidebar,
    openModal, closeModal,
    renderSummary, // renderSummary atualiza o novo header
    renderTransactions, populateCategorySelects,
    renderBudgetsSection, renderGoalsSection, handleShortcutClick,
    renderAllMainUI
} from './interface.js';
// Importa Funções de Gráficos/Relatórios
import {
    renderCategoryChart, renderBalanceEvolutionChart, renderComparisonReport,
    initializeChartVariables,
    setReportsDateRange, getReportsStartDate, getReportsEndDate
} from './charts.js';
// Importa Funções do Modal de Configurações
import {
    initializeSettingsSelectors, initializeSettingsMasks,
    openSettingsModal, closeSettingsModal, handleResize as handleSettingsResize,
    setupMobileSettingsView, setupDesktopSettingsView, setActiveTab, showSettingsSection,
    renderBudgetInputs, saveBudgets, renderCategoryLists, addCategory, deleteCategory,
    renderTagManagementList, addTag, deleteTag, renderGoalsManagement, addGoal, addSavedAmountToGoal, deleteGoal,
    renderRecurringManagement, addRecurringTransaction, deleteRecurringTransaction,
    exportToCSV, isMobileSettingsView, populateSettingsRecurringCategories
} from './settings.js';
// Importa Funções dos Modais de Edição
import {
    initializeEditSelectors, initializeEditMasks,
    openEditModal, closeEditModal, saveEditedTransaction as handleSaveEditedTransactionWrapper,
    openEditRecurringModal, closeEditRecurringModal, saveEditedRecurringTransaction,
    populateEditCategorySelect, populateEditRecurringCategorySelect
} from './edits.js';
// Importa Funções de Recorrência Pendente
import {
    initializeRecurringSelectors,
    checkAndRenderPendingRecurring, addPendingRecurring, undoAddPendingRecurring
} from './recurring.js';


// --- Seletores DOM Globais ---
let body, mainHeader;
let sidebarToggleDesktopBtn, mobileMenuToggleBtn, sidebarCloseBtn, mobileOverlay, openSettingsBtn;
// Seletores do novo header
let headerMonthlyIncomeEl, headerMonthlyExpensesEl;
let headerActionDespesaBtn, headerActionReceitaBtn; // Novos botões de ação rápida
// Outros seletores
let filterStartDateInput, filterEndDateInput, filterShortcutsContainer, filterCategoryEl, searchInput, transactionListEl;
let reportPeriodPickerInput;
let editForm, editModal, cancelEditBtn, editOverlay;
let settingsModal, closeSettingsBtn, settingsOverlay, modalTabsContainer, settingsSectionListContainer, settingsBackButton;
let budgetForm, addCategoryBtn, newCategoryNameInput, expenseCategoryListEl, incomeCategoryListEl;
let addTagForm, newTagNameInput, tagManagementListEl;
let addGoalForm, goalManagementListEl;
let addRecurringForm, recurringTypeSelect, recurringManagementListEl, exportCsvBtnModal;
let editRecurringModal, editRecurringForm, cancelEditRecurringBtn, editRecurringOverlay, editRecurringTypeSelect;
let comparisonTypeSelect, comparisonPeriodSelect, comparisonToggleBtn, comparisonContent;
let pendingRecurringListEl;
// Seletores do Modal de Registro Rápido
let quickAddModal, quickAddForm, quickAddModalTitle, quickAddTypeInput, quickAddDateInput, quickAddDescSourceLabel, quickAddDescSourceInput, quickAddAmountInput, quickAddCategoryGroup, quickAddCategorySelect, quickAddTagsInput, quickAddSubmitBtn, cancelQuickAddBtn, quickAddModalOverlay, closeQuickAddModalBtn;

// Instâncias
let quickAddTagifyInstance = null;
let reportFlatpickrInstance = null;

// Função Centralizada para Selecionar Todos os Elementos DOM necessários
function setupAllSelectors() {
    console.log("[setupAllSelectors] Iniciando seleção...");
    if (!document.body) { console.error("[setupAllSelectors] ERRO CRÍTICO: document.body não está definido!"); return false; }
    body = document.body;
    mainHeader = document.querySelector('.main-header');
    sidebarToggleDesktopBtn = document.getElementById('sidebar-toggle-desktop-btn');
    mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn');
    sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    mobileOverlay = document.getElementById('mobile-overlay');
    openSettingsBtn = document.getElementById('open-settings-modal-btn');
    // Seletores do Header Dashboard
    headerMonthlyIncomeEl = document.getElementById('header-monthly-income');
    headerMonthlyExpensesEl = document.getElementById('header-monthly-expenses');
    headerActionDespesaBtn = document.getElementById('header-action-despesa');
    headerActionReceitaBtn = document.getElementById('header-action-receita');
    // Outros seletores
    filterStartDateInput = document.getElementById('filter-start-date');
    filterEndDateInput = document.getElementById('filter-end-date');
    filterShortcutsContainer = document.querySelector('.filter-shortcuts');
    filterCategoryEl = document.getElementById('filter-category');
    searchInput = document.getElementById('search-input');
    transactionListEl = document.getElementById('transaction-list');
    reportPeriodPickerInput = document.getElementById('report-period-picker');
    editModal = document.getElementById('edit-modal');
    editForm = document.getElementById('edit-transaction-form');
    cancelEditBtn = editModal?.querySelector('.cancel-edit-btn');
    editOverlay = editModal?.querySelector('.modal-overlay');
    settingsModal = document.getElementById('settings-modal');
    closeSettingsBtn = document.getElementById('close-settings-modal-btn');
    settingsOverlay = settingsModal?.querySelector('.modal-overlay');
    modalTabsContainer = settingsModal?.querySelector('.modal-tabs');
    settingsSectionListContainer = document.getElementById('settings-section-list');
    settingsBackButton = document.getElementById('settings-back-btn');
    budgetForm = document.getElementById('budget-form');
    addCategoryBtn = document.getElementById('add-category-btn');
    newCategoryNameInput = settingsModal?.querySelector('#tab-categories #new-category-name');
    expenseCategoryListEl = document.getElementById('expense-category-list');
    incomeCategoryListEl = document.getElementById('income-category-list');
    addTagForm = document.getElementById('add-tag-form');
    newTagNameInput = settingsModal?.querySelector('#tab-tags #new-tag-name');
    tagManagementListEl = document.getElementById('tag-management-list');
    addGoalForm = document.getElementById('add-goal-form');
    goalManagementListEl = document.getElementById('goal-management-list');
    addRecurringForm = document.getElementById('add-recurring-form');
    recurringTypeSelect = document.getElementById('recurring-type');
    recurringManagementListEl = document.getElementById('recurring-management-list');
    exportCsvBtnModal = document.getElementById('export-csv-btn');
    editRecurringModal = document.getElementById('edit-recurring-modal');
    editRecurringForm = document.getElementById('edit-recurring-form');
    editRecurringTypeSelect = document.getElementById('edit-recurring-type');
    cancelEditRecurringBtn = editRecurringModal?.querySelector('.cancel-edit-recurring-btn');
    editRecurringOverlay = editRecurringModal?.querySelector('.modal-overlay');
    comparisonTypeSelect = document.getElementById('comparison-type');
    comparisonPeriodSelect = document.getElementById('comparison-period-select');
    comparisonToggleBtn = document.getElementById('comparison-toggle-btn');
    comparisonContent = document.getElementById('comparison-content');
    pendingRecurringListEl = document.getElementById('pending-recurring-list');
    // Seletores Modal Registro Rápido
    quickAddModal = document.getElementById('quick-add-modal');
    if (quickAddModal) {
        quickAddForm = document.getElementById('quick-add-form');
        quickAddModalTitle = document.getElementById('quick-add-modal-title');
        quickAddTypeInput = document.getElementById('quick-add-type');
        quickAddDateInput = document.getElementById('quick-add-date');
        quickAddDescSourceLabel = document.getElementById('quick-add-desc-src-label');
        quickAddDescSourceInput = document.getElementById('quick-add-description-source');
        quickAddAmountInput = document.getElementById('quick-add-amount');
        quickAddCategoryGroup = document.getElementById('quick-add-category-group');
        quickAddCategorySelect = document.getElementById('quick-add-category');
        quickAddTagsInput = document.getElementById('quick-add-tags');
        quickAddSubmitBtn = document.getElementById('quick-add-submit-btn');
        cancelQuickAddBtn = quickAddModal.querySelector('.cancel-quick-add-btn');
        quickAddModalOverlay = quickAddModal.querySelector('.modal-overlay');
        closeQuickAddModalBtn = document.getElementById('close-quick-add-modal-btn');
    } else { console.error("Modal #quick-add-modal não encontrado!"); }

    // Inicializa módulos
    initializeFeedbackElements();
    initializeSettingsSelectors();
    initializeEditSelectors();
    initializeRecurringSelectors();

    console.log("[setupAllSelectors] Seleção concluída.");
    return true;
}

// Função Callback para adicionar novas tags
function onTagAdded(e) {
    const tagName = e.detail.data.value;
    const isNew = !tags.some(t => normalizeText(t) === normalizeText(tagName));
    if (isNew && tagName.trim() !== '') {
        if (addTagData(tagName)) {
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

// Atualiza whitelist das instâncias Tagify
export function updateTagifyWhitelists() {
    const newWhitelist = [...tags];
    if (quickAddTagifyInstance) { quickAddTagifyInstance.settings.whitelist = newWhitelist; }
    // A instância do modal de edição é atualizada quando o modal abre
}

// Inicializa Flatpickr
function initializeReportPeriodPicker() {
    if (!reportPeriodPickerInput) return;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setReportsDateRange(formatDateForInput(startOfMonth), formatDateForInput(endOfMonth));
    reportFlatpickrInstance = flatpickr(reportPeriodPickerInput, {
        mode: "range", dateFormat: "d/m/Y", locale: "pt", defaultDate: [startOfMonth, endOfMonth],
        onChange: function(selectedDates, dateStr, instance) {
            let startDate = null; let endDate = null;
            if (selectedDates.length === 2) {
                startDate = formatDateForInput(selectedDates[0]); endDate = formatDateForInput(selectedDates[1]);
                setReportsDateRange(startDate, endDate); renderCategoryChart(transactions); renderBalanceEvolutionChart(transactions);
            }
        },
        onClose: function(selectedDates, dateStr, instance) {
            if (selectedDates.length !== 2) {
                const currentStart = getReportsStartDate(); const currentEnd = getReportsEndDate();
                if (currentStart && currentEnd) {
                    const startParts = currentStart.split('-'); const endParts = currentEnd.split('-');
                    const defaultStart = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
                    const defaultEnd = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));
                    instance.setDate([defaultStart, defaultEnd], false);
                }
            }
        }
    });
    console.log("[initializeReportPeriodPicker] Flatpickr inicializado.");
}


// --- Lógica do Novo Modal de Registro Rápido ---
function populateQuickAddCategorySelect(type) {
    if (!quickAddCategorySelect) return;
    const list = categories[type] || [];
    quickAddCategorySelect.innerHTML = ''; // Limpa opções

    if (type === 'income') {
        quickAddCategorySelect.innerHTML = '<option value="">Sem categoria</option>';
        list.sort((a, b) => a.localeCompare(b)).forEach(cat => quickAddCategorySelect.innerHTML += `<option value="${cat}">${cat}</option>`);
    } else { // expense
        quickAddCategorySelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
        if (list.length > 0) {
            list.sort((a, b) => a.localeCompare(b)).forEach(cat => quickAddCategorySelect.innerHTML += `<option value="${cat}">${cat}</option>`);
            quickAddCategorySelect.required = true; // Torna obrigatório para despesa
        } else {
            quickAddCategorySelect.innerHTML = '<option value="" disabled selected>Nenhuma categoria</option>';
            quickAddCategorySelect.required = false; // Não pode ser obrigatório se vazio
        }
    }
}

function openQuickAddModal(type) {
    if (!quickAddModal || !quickAddForm) return;

    // 1. Configurar o Modal para o tipo (income/expense)
    quickAddTypeInput.value = type;
    if (type === 'income') {
        quickAddModalTitle.textContent = 'Registrar Nova Entrada';
        quickAddDescSourceLabel.textContent = 'Fonte:';
        quickAddDescSourceInput.placeholder = 'Ex: Salário, Venda...';
        quickAddCategoryGroup.classList.add('hidden'); // Oculta categoria
        quickAddCategorySelect.required = false; // Não obrigatório
        quickAddSubmitBtn.textContent = 'Adicionar Entrada';
        quickAddSubmitBtn.className = 'btn btn-income'; // Garante classe correta
        populateQuickAddCategorySelect('income');
        quickAddCategorySelect.value = ""; // Garante "Sem categoria" selecionado

    } else { // expense
        quickAddModalTitle.textContent = 'Registrar Nova Saída';
        quickAddDescSourceLabel.textContent = 'Descrição:';
        quickAddDescSourceInput.placeholder = 'Ex: Supermercado, Aluguel...';
        quickAddCategoryGroup.classList.remove('hidden'); // Mostra categoria
        quickAddCategorySelect.required = true; // Obrigatório
        quickAddSubmitBtn.textContent = 'Adicionar Saída';
        quickAddSubmitBtn.className = 'btn btn-expense'; // Garante classe correta
        populateQuickAddCategorySelect('expense');
    }

    // 2. Resetar o formulário (exceto tipo)
    quickAddForm.reset(); // Limpa a maioria dos campos
    quickAddTypeInput.value = type; // Restaura o tipo após reset
    quickAddDateInput.value = formatDateForInput(new Date()); // Define data atual

    // 3. Inicializar Tagify
    if (quickAddTagifyInstance) { try { quickAddTagifyInstance.destroy(); } catch(e){} }
    quickAddTagsInput.value = ''; // Limpa valor antes de inicializar
    const tagifySettingsQuickAdd = { whitelist: [...tags], dropdown: { maxItems: 10, enabled: 0, closeOnSelect: false }, originalInputValueFormat: valuesArr => valuesArr.map(item => item.value).join(',') };
    quickAddTagifyInstance = new Tagify(quickAddTagsInput, tagifySettingsQuickAdd);
    quickAddTagifyInstance.on('add', onTagAdded); // Reusa o mesmo callback

    // 4. Inicializar Máscara de Moeda
    if (quickAddAmountInput) {
        // Limpa valor antigo antes de aplicar máscara para evitar formatação incorreta
        quickAddAmountInput.value = '';
        applyCurrencyMask(quickAddAmountInput);
    }

    // 5. Abrir o Modal
    openModal(quickAddModal); // Usa a função genérica de interface.js
    quickAddDescSourceInput.focus(); // Foco no campo de descrição/fonte
}

function closeQuickAddModal() {
    if (!quickAddModal) return;
    if (quickAddTagifyInstance) { try { quickAddTagifyInstance.destroy(); } catch(e){} quickAddTagifyInstance = null; }
    if (quickAddAmountInput) { destroyCurrencyMask(quickAddAmountInput); }
    closeModal(quickAddModal);
}

function handleQuickAddSubmit(event) {
    event.preventDefault();
    if (!quickAddForm || !quickAddAmountInput) return;
    const type = quickAddTypeInput.value;
    const date = quickAddDateInput.value;
    const amount = getUnmaskedValue(quickAddAmountInput);
    const descSource = quickAddDescSourceInput.value.trim();
    const category = quickAddCategorySelect.value;
    const selectedTags = quickAddTagifyInstance ? quickAddTagifyInstance.value.map(tagData => tagData.value) : [];
    let source = '', description = '';
    if (type === 'income') { source = descSource; } else { description = descSource; }

    if (!date || !descSource || isNaN(amount) || amount <= 0 || (type === 'expense' && !category)) {
        const msg = isNaN(amount) || amount <= 0 ? 'Insira um valor válido.' : (type === 'expense' && !category ? 'Selecione uma categoria.' : 'Preencha os campos obrigatórios.');
        alert(msg); // Feedback simples para o modal
        return;
    }
    const newTrans = { id: Date.now(), type, date, amount, category: category || '', description, source, tags: selectedTags };
    addTransactionData(newTrans);
    saveData();
    renderAllMainUI();
    checkAndRenderPendingRecurring();
    closeQuickAddModal();
    showFeedback(`Transação adicionada!`, 'success', 'feedback-message');
}
// --- Fim Lógica Modal ---


document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOMContentLoaded] Evento disparado.");

    if (!setupAllSelectors()) { console.error("[DOMContentLoaded] Falha na configuração dos seletores."); return; }

    loadData();
    initializeChartVariables();
    initializeReportPeriodPicker();
    initializeSettingsMasks();
    initializeEditMasks();

    // Lógica Header Auto-Hide (mantida)
    let headerHideTimeout = null; const HEADER_HIDE_DELAY = 2500; const scrollThreshold = 10;
    function showHeaderAndStartHideTimer() { if (!mainHeader) return; if (headerHideTimeout) { clearTimeout(headerHideTimeout); headerHideTimeout = null; } mainHeader.classList.remove('header-hidden'); headerHideTimeout = setTimeout(() => { if (window.pageYOffset > scrollThreshold) { mainHeader.classList.add('header-hidden'); } headerHideTimeout = null; }, HEADER_HIDE_DELAY); }
    window.addEventListener('scroll', showHeaderAndStartHideTimer, { passive: true });
    if (window.pageYOffset > scrollThreshold) { showHeaderAndStartHideTimer(); } else { if(mainHeader) mainHeader.classList.remove('header-hidden'); }

    // Listeners Painel Comparativo (mantidos)
    comparisonToggleBtn?.addEventListener('click', () => { const isExpanded = comparisonToggleBtn.getAttribute('aria-expanded') === 'true'; comparisonToggleBtn.setAttribute('aria-expanded', !isExpanded); comparisonContent.hidden = isExpanded; if (!isExpanded) { handleComparisonControlChange(); } });
    function handleComparisonControlChange() { if (comparisonToggleBtn?.getAttribute('aria-expanded') === 'true') { const typeVal = comparisonTypeSelect?.value || 'expense'; const periodVal = comparisonPeriodSelect?.value || 'month-vs-last'; renderComparisonReport(periodVal, typeVal, transactions); } }
    comparisonTypeSelect?.addEventListener('change', handleComparisonControlChange);
    comparisonPeriodSelect?.addEventListener('change', handleComparisonControlChange);

    // Funções de Ação (Wrappers - mantidos)
    function handleDeleteTransaction(id) { if (!confirm('Tem certeza?')) return; if (deleteTransactionData(id)) { saveData(); renderAllMainUI(); checkAndRenderPendingRecurring(); showFeedback('Transação excluída.', 'success', 'feedback-message'); } else { showFeedback('Erro.', 'error', 'feedback-message'); } }
    function handleSaveEditedTransaction(event) { handleSaveEditedTransactionWrapper(event); }
    function handleAddTag(event) { event.preventDefault(); if (addTag()) { /* OK */ } }
    function handleDeleteTag(tagName) { if (deleteTag(tagName)) { updateTagifyWhitelists(); } }

    // Listener Global para Atualizar Gráficos (mantido)
    document.addEventListener('transactionsUpdated', (event) => { console.log('[Event Listener] transactionsUpdated'); const updatedTransactions = event.detail.transactions; renderCategoryChart(updatedTransactions); renderBalanceEvolutionChart(updatedTransactions); const compType = comparisonTypeSelect?.value || 'expense'; const compPeriod = comparisonPeriodSelect?.value || 'month-vs-last'; renderComparisonReport(compPeriod, compType, updatedTransactions); console.log('[Event Listener] Gráficos atualizados.'); });

    // --- Adiciona Event Listeners ---
    console.log("[main.js] Adicionando event listeners...");
    try {
        // Sidebar e Modais Genéricos (mantido)
        sidebarToggleDesktopBtn?.addEventListener('click', toggleDesktopSidebar);
        mobileMenuToggleBtn?.addEventListener('click', openMobileSidebar);
        sidebarCloseBtn?.addEventListener('click', closeMobileSidebar);
        mobileOverlay?.addEventListener('click', closeMobileSidebar);
        openSettingsBtn?.addEventListener('click', openSettingsModal);
        closeSettingsBtn?.addEventListener('click', closeSettingsModal);
        settingsOverlay?.addEventListener('click', closeSettingsModal);
        cancelEditBtn?.addEventListener('click', closeEditModal);
        editOverlay?.addEventListener('click', closeEditModal);
        cancelEditRecurringBtn?.addEventListener('click', closeEditRecurringModal);
        editRecurringOverlay?.addEventListener('click', closeEditRecurringModal);

        // Listeners para Modal de Registro Rápido (Atualizados)
        headerActionReceitaBtn?.addEventListener('click', () => openQuickAddModal('income'));
        headerActionDespesaBtn?.addEventListener('click', () => openQuickAddModal('expense'));
        cancelQuickAddBtn?.addEventListener('click', closeQuickAddModal);
        quickAddModalOverlay?.addEventListener('click', closeQuickAddModal);
        closeQuickAddModalBtn?.addEventListener('click', closeQuickAddModal); // Listener para o 'X'
        quickAddForm?.addEventListener('submit', handleQuickAddSubmit);

        // Navegação Modal Config (mantido)
        modalTabsContainer?.addEventListener('click', (e) => { if (!isMobileSettingsView) { const btn = e.target.closest('.tab-button'); if (btn && btn.dataset.tab) setActiveTab(btn.dataset.tab); } });
        settingsSectionListContainer?.addEventListener('click', (e) => { const item = e.target.closest('.settings-section-item'); if (item && item.dataset.sectionId) showSettingsSection(item.dataset.sectionId, item.dataset.sectionTitle); });
        settingsBackButton?.addEventListener('click', () => { if (isMobileSettingsView) setupMobileSettingsView(); });
        window.addEventListener('resize', handleSettingsResize);

        // Filtros Extrato (mantido)
        filterStartDateInput?.addEventListener('change', renderTransactions);
        filterEndDateInput?.addEventListener('change', renderTransactions);
        filterCategoryEl?.addEventListener('change', renderTransactions);
        searchInput?.addEventListener('input', renderTransactions);
        filterShortcutsContainer?.addEventListener('click', (e) => { const btn = e.target.closest('.shortcut-btn'); if (btn && btn.dataset.period) handleShortcutClick(btn.dataset.period); });

        // Ações Extrato (mantido)
        transactionListEl?.addEventListener('click', (e) => { const editBtn = e.target.closest('.edit-btn'); const deleteBtn = e.target.closest('.delete-btn'); const item = e.target.closest('.transaction-item'); if (!item || !item.dataset.id) return; const id = Number(item.dataset.id); if (isNaN(id)) return; if (editBtn) openEditModal(id); else if (deleteBtn) handleDeleteTransaction(id); });

        // Modal Editar Transação (mantido)
        editForm?.addEventListener('submit', handleSaveEditedTransaction);

        // Listeners do Modal de Configurações (mantido)
        budgetForm?.addEventListener('submit', saveBudgets);
        addCategoryBtn?.addEventListener('click', addCategory);
        newCategoryNameInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addCategory(); });
        expenseCategoryListEl?.addEventListener('click', (e) => { const btn = e.target.closest('.delete-category-btn'); if (btn && !btn.disabled) deleteCategory(btn.dataset.name, btn.dataset.type); });
        incomeCategoryListEl?.addEventListener('click', (e) => { const btn = e.target.closest('.delete-category-btn'); if (btn && !btn.disabled) deleteCategory(btn.dataset.name, btn.dataset.type); });
        addTagForm?.addEventListener('submit', handleAddTag);
        newTagNameInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAddTag(e); });
        tagManagementListEl?.addEventListener('click', (e) => { const btn = e.target.closest('.delete-tag-btn'); if (btn && btn.dataset.tagName) handleDeleteTag(btn.dataset.tagName); });
        addGoalForm?.addEventListener('submit', addGoal);
        goalManagementListEl?.addEventListener('click', (e) => { const addBtn=e.target.closest('.add-goal-amount-btn'); const delBtn=e.target.closest('.delete-goal-btn'); const li=e.target.closest('li'); const goalId = Number(li?.dataset.id); if(isNaN(goalId)) return; if(addBtn){const input=li?.querySelector('.add-goal-amount-input'); if(input)addSavedAmountToGoal(goalId,input)}else if(delBtn){deleteGoal(goalId)}});
        recurringTypeSelect?.addEventListener('change', () => { populateSettingsRecurringCategories(); });
        addRecurringForm?.addEventListener('submit', addRecurringTransaction);
        recurringManagementListEl?.addEventListener('click', (e) => { const deleteBtn=e.target.closest('.delete-recurring-btn'); const editBtn=e.target.closest('.edit-recurring-btn'); const recId = Number(e.target.closest('li')?.dataset.id); if(isNaN(recId)) return; if(editBtn){openEditRecurringModal(recId)} else if(deleteBtn){deleteRecurringTransaction(recId)}});
        exportCsvBtnModal?.addEventListener('click', exportToCSV);

        // Modal Editar Recorrência (mantido)
        editRecurringTypeSelect?.addEventListener('change', () => { populateEditRecurringCategorySelect(editRecurringCategorySelect, editRecurringTypeSelect.value); });
        editRecurringForm?.addEventListener('submit', saveEditedRecurringTransaction);

        // Recorrências Pendentes (mantido)
        pendingRecurringListEl?.addEventListener('click', (e) => { const addBtn = e.target.closest('.add-pending-recurring-btn'); if (addBtn) { const listItem = addBtn.closest('.pending-recurring-item'); if (listItem && listItem.dataset.id) { const recurringId = Number(listItem.dataset.id); if (!isNaN(recurringId)) { addPendingRecurring(recurringId); } } } });

        // Tecla ESC (mantido)
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const activeModal = document.querySelector('.modal.active'); if (activeModal) { if (activeModal.id === 'settings-modal') closeSettingsModal(); else if (activeModal.id === 'edit-modal') closeEditModal(); else if (activeModal.id === 'edit-recurring-modal') closeEditRecurringModal(); else if (activeModal.id === 'quick-add-modal') closeQuickAddModal(); } else if (body && body.classList.contains('mobile-sidebar-open')) { closeMobileSidebar(); } } });

        // --- Inicialização Final ---
        setTimeout(() => {
            renderAllMainUI();
            checkAndRenderPendingRecurring();
            if (body) { updateDesktopSidebarState(false); }
            renderCategoryChart(transactions);
            renderBalanceEvolutionChart(transactions);
            if (comparisonToggleBtn?.getAttribute('aria-expanded') === 'true') { handleComparisonControlChange(); }
            console.log("Aplicação inicializada com sucesso.");
        }, 0);

    } catch (error) {
        console.error("Erro fatal na configuração inicial ou nos listeners:", error);
        alert("Ocorreu um erro inesperado ao carregar o aplicativo.");
    }
});