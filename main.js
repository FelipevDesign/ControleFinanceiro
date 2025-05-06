// main.js - Ponto de Entrada Principal e Orquestração

// --- Imports ---
import {
    transactions, categories, tags, budgets, goals, recurringTransactions,
    addTransactionData, deleteTransactionData, updateTransactionData,
    addCategoryData, deleteCategoryData, addTagData, deleteTagData,
    loadInitialData,
    clearLocalData
} from './data.js';
import {
    initializeFeedbackElements, showFeedback, clearFeedback,
    formatDateForInput, normalizeText, applyCurrencyMask,
    getUnmaskedValue, destroyCurrencyMask, formatCurrency
} from './helpers.js';
import {
    updateDesktopSidebarState, toggleDesktopSidebar, openMobileSidebar, closeMobileSidebar,
    openModal, closeModal,
    renderSummary,
    renderTransactions, populateCategorySelects,
    renderBudgetsSection, renderGoalsSection, handleShortcutClick,
    renderAllMainUI,
    initializeTooltips, destroyTooltips
} from './interface.js';
import {
    renderCategoryChart, renderBalanceEvolutionChart, renderComparisonReport,
    initializeChartVariables,
    setReportsDateRange, getReportsStartDate, getReportsEndDate
} from './charts.js';
import {
    initializeSettingsSelectors, initializeSettingsMasks,
    openSettingsModal, closeSettingsModal, handleResize as handleSettingsResize,
    setupMobileSettingsView, setupDesktopSettingsView, setActiveTab, showSettingsSection,
    renderBudgetInputs, saveBudgets, renderCategoryLists, addCategory, deleteCategory,
    renderTagManagementList, addTag, deleteTag, renderGoalsManagement, addGoal, addSavedAmountToGoal, deleteGoal,
    renderRecurringManagement, addRecurringTransaction, deleteRecurringTransaction,
    exportToCSV, isMobileSettingsView, populateSettingsRecurringCategories
} from './settings.js';
import {
    initializeEditSelectors, initializeEditMasks,
    openEditModal, closeEditModal, saveEditedTransaction as handleSaveEditedTransactionWrapper,
    openEditRecurringModal, closeEditRecurringModal, saveEditedRecurringTransaction,
    populateEditCategorySelect, populateEditRecurringCategorySelect
} from './edits.js';
import {
    initializeRecurringSelectors,
    checkAndRenderPendingRecurring, addPendingRecurring, undoAddPendingRecurring
} from './recurring.js';
import { supabase } from './supabaseClient.js';
// Importa SweetAlert (se não estiver globalmente disponível, ajuste o path)
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';


// --- Seletores DOM Globais ---
// (Variáveis declaradas aqui, mas inicializadas em setupInitialSelectors/setupAppSelectors)
let body, mainHeader, appLayout, authContainer;
let sidebarToggleDesktopBtn, mobileMenuToggleBtn, sidebarCloseBtn, mobileOverlay, openSettingsBtn;
let headerSaldoAtualEl, headerEntradasMesEl, headerSaidasMesEl, headerFuturosMesEl;
let headerActionEntradaBtn, headerActionSaidaBtn, headerActionTransfBtn;
let filterStartDateInput, filterEndDateInput, filterShortcutsContainer, filterCategoryEl, searchInput, transactionListEl;
let reportPeriodPickerInput;
let editForm, editModal, editOverlay;
let settingsModal, closeSettingsBtn, settingsOverlay, modalTabsContainer, settingsSectionListContainer, settingsBackButton;
let budgetForm, addCategoryBtn, newCategoryNameInput, expenseCategoryListEl, incomeCategoryListEl;
let addTagForm, newTagNameInput, tagManagementListEl;
let addGoalForm, goalManagementListEl;
let addRecurringForm, recurringTypeSelect, recurringManagementListEl, exportCsvBtnModal;
let editRecurringModal, editRecurringForm, editRecurringOverlay, editRecurringTypeSelect;
let comparisonTypeSelect, comparisonPeriodSelect, comparisonToggleBtn, comparisonContent;
let pendingRecurringListEl;
let quickAddModal, quickAddForm, quickAddModalTitle, quickAddTypeInput, quickAddDateInput, quickAddDescSourceLabel, quickAddDescSourceInput, quickAddAmountInput, quickAddCategoryGroup, quickAddCategorySelect, quickAddModalOverlay, closeQuickAddModalBtn;
let quickAddToggles, toggleNotesBtn, toggleTagsBtn, notesContainer, tagsContainer, notesInput, quickAddTagsInput;
let modalActionsContainer, cancelActionText, saveActionBtn, saveNewActionText;
let loginForm, signupForm, loginEmailInput, loginPasswordInput, signupEmailInput, signupPasswordInput;
let showSignupBtn, showLoginBtn, authFeedbackEl;
let logoutBtn, userEmailDisplay, loginControls, logoutControls;
let budgetListEl, goalListDisplayEl;

// --- Instâncias Globais ---
let quickAddTagifyInstance = null;
let reportFlatpickrInstance = null;
let currentUserId = null;
let hasLoadedInitialData = false;

// --- DEFINIÇÕES DE FUNÇÕES ---

function setupInitialSelectors() {
    console.log("[setupInitialSelectors] Iniciando seleção inicial...");
    body = document.body;
    if (!body) {
        console.error("ERRO CRÍTICO: document.body não está definido!");
        return false;
    }
    // Seletores da área de autenticação e controles de login/logout
    appLayout = document.querySelector('.app-layout');
    authContainer = document.getElementById('auth-container');
    loginForm = document.getElementById('login-form');
    signupForm = document.getElementById('signup-form');
    loginEmailInput = document.getElementById('login-email');
    loginPasswordInput = document.getElementById('login-password');
    signupEmailInput = document.getElementById('signup-email');
    signupPasswordInput = document.getElementById('signup-password');
    showSignupBtn = document.getElementById('show-signup-btn');
    showLoginBtn = document.getElementById('show-login-btn');
    authFeedbackEl = document.getElementById('auth-feedback');
    logoutBtn = document.getElementById('logout-btn');
    userEmailDisplay = document.getElementById('user-email-display');
    loginControls = document.getElementById('login-controls');
    logoutControls = document.getElementById('logout-controls');
    openSettingsBtn = document.getElementById('open-settings-modal-btn');
    headerActionEntradaBtn = document.getElementById('header-action-entrada');
    headerActionSaidaBtn = document.getElementById('header-action-saida');

    if (!appLayout) console.error("Elemento '.app-layout' não encontrado!");
    if (!authContainer) console.error("Elemento '#auth-container' não encontrado!");
    if (!logoutBtn) console.error("Elemento '#logout-btn' não encontrado!");

    initializeFeedbackElements(); // Inicializa elementos de feedback (helpers.js)
    console.log("[setupInitialSelectors] Seleção inicial concluída.");
    return true;
}

function setupAppSelectors() {
    console.log("[setupAppSelectors] Iniciando seleção dos elementos da aplicação...");
    let allFound = true;

    // Seletores da UI principal
    mainHeader = document.querySelector('.main-header');
    sidebarToggleDesktopBtn = document.getElementById('sidebar-toggle-desktop-btn');
    mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn');
    sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    mobileOverlay = document.getElementById('mobile-overlay');
    headerSaldoAtualEl = document.getElementById('header-saldo-atual');
    headerEntradasMesEl = document.getElementById('header-entradas-mes');
    headerSaidasMesEl = document.getElementById('header-saidas-mes');
    headerFuturosMesEl = document.getElementById('header-futuros-mes');
    headerActionTransfBtn = document.getElementById('header-action-transf'); // Botão de transferência (se houver)
    filterStartDateInput = document.getElementById('filter-start-date');
    filterEndDateInput = document.getElementById('filter-end-date');
    filterShortcutsContainer = document.querySelector('.filter-shortcuts');
    filterCategoryEl = document.getElementById('filter-category');
    searchInput = document.getElementById('search-input');
    transactionListEl = document.getElementById('transaction-list');
    budgetListEl = document.getElementById('budget-list');
    goalListDisplayEl = document.getElementById('goal-list-display');
    pendingRecurringListEl = document.getElementById('pending-recurring-list');

    // Seletores de Relatórios/Gráficos
    reportPeriodPickerInput = document.getElementById('report-period-picker');
    comparisonTypeSelect = document.getElementById('comparison-type');
    comparisonPeriodSelect = document.getElementById('comparison-period-select');
    comparisonToggleBtn = document.getElementById('comparison-toggle-btn');
    comparisonContent = document.getElementById('comparison-content');

    // Seletores do Modal Quick Add
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
        quickAddModalOverlay = quickAddModal.querySelector('.modal-overlay');
        closeQuickAddModalBtn = document.getElementById('close-quick-add-modal-btn');
        quickAddToggles = quickAddModal.querySelector('.quick-add-toggles');
        toggleNotesBtn = document.getElementById('quick-add-toggle-notes');
        toggleTagsBtn = document.getElementById('quick-add-toggle-tags');
        notesContainer = document.getElementById('quick-add-notes-container');
        tagsContainer = document.getElementById('quick-add-tags-container');
        notesInput = document.getElementById('quick-add-notes');
        quickAddTagsInput = document.getElementById('quick-add-tags');
        modalActionsContainer = document.getElementById('quick-add-modal-actions');
        cancelActionText = document.getElementById('quick-add-cancel-action');
        saveActionBtn = document.getElementById('quick-add-save-btn');
        saveNewActionText = document.getElementById('quick-add-save-new-action');
    } else {
        console.error("Modal #quick-add-modal não encontrado!");
        allFound = false;
    }

    // Seletores do Modal de Edição (Transação)
    editModal = document.getElementById('edit-modal');
    editForm = document.getElementById('edit-transaction-form');
    editOverlay = editModal?.querySelector('.modal-overlay');

    // Seletores do Modal de Configurações
    settingsModal = document.getElementById('settings-modal');
    closeSettingsBtn = document.getElementById('close-settings-modal-btn');
    settingsOverlay = settingsModal?.querySelector('.modal-overlay');
    modalTabsContainer = settingsModal?.querySelector('.modal-tabs');
    settingsSectionListContainer = document.getElementById('settings-section-list');
    settingsBackButton = document.getElementById('settings-back-btn');
    budgetForm = document.getElementById('budget-form'); // Dentro de settings
    addCategoryBtn = document.getElementById('add-category-btn'); // Dentro de settings
    newCategoryNameInput = settingsModal?.querySelector('#tab-categories #new-category-name');
    expenseCategoryListEl = document.getElementById('expense-category-list'); // Dentro de settings
    incomeCategoryListEl = document.getElementById('income-category-list'); // Dentro de settings
    addTagForm = document.getElementById('add-tag-form'); // Dentro de settings
    newTagNameInput = settingsModal?.querySelector('#tab-tags #new-tag-name');
    tagManagementListEl = document.getElementById('tag-management-list'); // Dentro de settings
    addGoalForm = document.getElementById('add-goal-form'); // Dentro de settings
    goalManagementListEl = document.getElementById('goal-management-list'); // Dentro de settings
    addRecurringForm = document.getElementById('add-recurring-form'); // Dentro de settings
    recurringTypeSelect = document.getElementById('recurring-type'); // Dentro de settings
    recurringManagementListEl = document.getElementById('recurring-management-list'); // Dentro de settings
    exportCsvBtnModal = document.getElementById('export-csv-btn'); // Dentro de settings

    // Seletores do Modal de Edição (Recorrência)
    editRecurringModal = document.getElementById('edit-recurring-modal');
    editRecurringForm = document.getElementById('edit-recurring-form');
    editRecurringTypeSelect = document.getElementById('edit-recurring-type');
    editRecurringOverlay = editRecurringModal?.querySelector('.modal-overlay');

    // Verifica se elementos essenciais foram encontrados
    if (!transactionListEl) { console.error("Elemento '#transaction-list' não encontrado!"); allFound = false; }
    if (!openSettingsBtn) { console.error("Elemento '#open-settings-modal-btn' não encontrado!"); allFound = false; }
    if (!headerActionEntradaBtn) { console.error("Elemento '#header-action-entrada' não encontrado!"); allFound = false; }
    if (!headerActionSaidaBtn) { console.error("Elemento '#header-action-saida' não encontrado!"); allFound = false; }

    if (!allFound) {
        console.error("ERRO: Nem todos os elementos da aplicação foram encontrados.");
        // Considerar mostrar um erro mais visível para o usuário aqui
    }

    // Inicializa módulos que dependem desses seletores
    initializeSettingsSelectors(); // settings.js
    initializeEditSelectors();     // edits.js
    initializeRecurringSelectors();// recurring.js
    initializeChartVariables();    // charts.js
    initializeReportPeriodPicker();// Inicializa Flatpickr dos relatórios
    initializeSettingsMasks();     // settings.js (máscaras fixas)
    initializeEditMasks();         // edits.js (máscaras fixas)

    console.log("[setupAppSelectors] Seleção dos elementos da aplicação concluída.");
    return allFound;
}

// Callback para Tagify adicionar nova tag (usado no Quick Add)
async function onTagAdded(e) {
    const tagName = e.detail.data.value; // Nome da tag adicionada
    // Verifica se a tag é realmente nova (ignorando case e acentos)
    const isNew = !tags.some(t => normalizeText(t) === normalizeText(tagName));

    if (isNew && tagName.trim() !== '') {
        // console.log(`[Tagify Quick Add Event] Nova tag detectada: "${tagName}"`);
        const added = await addTagData(tagName); // Tenta adicionar via data.js
        if (added) {
            // console.log(`[Tagify Quick Add Event] Tag "${tagName}" adicionada.`);
            updateTagifyWhitelists(); // Atualiza whitelist de todas instâncias Tagify
            // Se o modal de settings estiver aberto na aba de tags, atualiza a lista lá também
            if (document.getElementById('settings-modal')?.classList.contains('active') &&
                document.getElementById('tab-tags')?.classList.contains('active')) {
                renderTagManagementList();
            }
            // Atualiza a whitelist da instância atual (Quick Add)
            if(quickAddTagifyInstance) {
                quickAddTagifyInstance.settings.whitelist = [...tags];
            }
        } else {
            console.warn(`[Tagify Quick Add Event] Falha ao adicionar tag "${tagName}". Removendo do input.`);
            // Remove a tag do input Tagify se a adição no backend falhar
            if(e.detail.tagify) e.detail.tagify.removeTags(e.detail.tag);
        }
    } else if (tagName.trim() === '' && e.detail.tag) {
        // Impede adição de tags vazias (caso a validação do Tagify falhe)
        const tagifyInstance = e.detail.tagify;
        setTimeout(() => tagifyInstance.removeTags(e.detail.tag), 0); // Remove após o evento
    }
}

// Atualiza a lista de sugestões (whitelist) das instâncias Tagify
export function updateTagifyWhitelists() {
    const newWhitelist = [...tags]; // Pega a lista atualizada de tags
    if (quickAddTagifyInstance) {
        quickAddTagifyInstance.settings.whitelist = newWhitelist;
    }
    // TODO: Atualizar editTagifyInstance (precisa verificar se existe primeiro)
    const editTagsInput = document.getElementById('edit-tags');
    if (editTagsInput && editTagsInput.tagify) { // Verifica se a instância existe
        editTagsInput.tagify.settings.whitelist = newWhitelist;
    }
    // console.log("[updateTagifyWhitelists] Whitelists atualizadas.");
}

// Inicializa o seletor de período dos relatórios (Flatpickr)
function initializeReportPeriodPicker() {
    if (!reportPeriodPickerInput) return;
    try {
        reportFlatpickrInstance = flatpickr(reportPeriodPickerInput, {
            mode: "range",       // Seleção de intervalo
            dateFormat: "d/m/Y", // Formato de exibição brasileiro
            locale: "pt",        // Tradução para português
            onChange: function(selectedDates) {
                let start = null, end = null;
                // Só atualiza se o usuário selecionou um intervalo completo
                if (selectedDates.length === 2) {
                    start = formatDateForInput(selectedDates[0]); // Converte para YYYY-MM-DD
                    end = formatDateForInput(selectedDates[1]);
                }
                setReportsDateRange(start, end); // Atualiza estado global do período
                // Re-renderiza gráficos com base no novo período (passando os dados atuais)
                renderCategoryChart(transactions);
                renderBalanceEvolutionChart(transactions);
                // Re-renderiza gráfico de comparação SE ele estiver visível
                if (comparisonToggleBtn?.getAttribute('aria-expanded') === 'true') {
                    handleComparisonControlChange();
                }
            }
        });
        // console.log("[initializeReportPeriodPicker] Flatpickr inicializado.");
    } catch(e) {
        console.error("Erro ao inicializar Flatpickr para relatórios:", e);
    }
}

// Handler para mudanças nos controles do gráfico de comparação
function handleComparisonControlChange() {
    if (!comparisonPeriodSelect || !comparisonTypeSelect) return;
    const comparisonType = comparisonPeriodSelect.value;
    const transactionType = comparisonTypeSelect.value;
    // console.log(`[Comparison Controls] Change detected. Type: ${comparisonType}, Trans Type: ${transactionType}`);
    renderComparisonReport(comparisonType, transactionType, transactions); // Re-renderiza gráfico
}

// Popula o select de categoria no modal Quick Add baseado no tipo (Receita/Despesa)
function populateQuickAddCategorySelect(type) {
    if (!quickAddCategorySelect || !quickAddCategoryGroup) return;

    quickAddCategorySelect.innerHTML = ''; // Limpa opções antigas
    const list = categories[type] || []; // Pega lista de categorias do tipo certo

    // Define texto e valor do placeholder
    const placeholderText = type === 'expense' ? 'Selecione...' : 'Sem categoria';
    const placeholderValue = '';
    const isRequired = type === 'expense'; // Despesa requer categoria

    // Adiciona placeholder
    quickAddCategorySelect.innerHTML = `<option value="${placeholderValue}" ${isRequired ? 'disabled' : ''} selected>${placeholderText}</option>`;

    // Adiciona categorias da lista
    if (list.length === 0 && type === 'expense') {
        quickAddCategorySelect.innerHTML = '<option value="" disabled selected>Nenhuma categoria de despesa</option>';
        quickAddCategorySelect.disabled = true;
    } else {
        list.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            quickAddCategorySelect.appendChild(opt);
        });
        quickAddCategorySelect.disabled = false;
    }

    // Mostra/esconde o grupo do select (esconde para Receita)
    quickAddCategoryGroup.classList.toggle('hidden', type === 'income');
    // Define se o select é obrigatório
    quickAddCategorySelect.required = isRequired;
}

// Inicializa o input Tagify no modal Quick Add
function initializeQuickAddTagify() {
    if (!quickAddTagsInput || quickAddTagifyInstance) return; // Não inicializa se não existe ou já foi inicializado
    try {
        // console.log("[initializeQuickAddTagify] Initializing...");
        const tagifySettings = {
            whitelist: [...tags], // Usa lista atual de tags como sugestão
            dropdown: {
                maxItems: 10,        // Máximo de itens no dropdown
                enabled: 0,          // Aparece dropdown ao digitar (0 = ao digitar)
                closeOnSelect: false // Não fecha dropdown ao selecionar
            },
            originalInputValueFormat: valuesArr => valuesArr.map(item => item.value).join(','), // Formato do valor original (não usado diretamente aqui)
            validate: (tagData) => tagData.value.trim().length > 0, // Valida se a tag não é vazia
        };
        quickAddTagifyInstance = new Tagify(quickAddTagsInput, tagifySettings);
        quickAddTagifyInstance.on('add', onTagAdded); // Adiciona listener para criar novas tags
        // console.log("[initializeQuickAddTagify] Tagify initialized.");
    } catch(e) {
        console.error("Error initializing Quick Add Tagify:", e);
        if (quickAddTagifyInstance) {
            try { quickAddTagifyInstance.destroy(); } catch (err) {/* ignore */}
            quickAddTagifyInstance = null;
        }
    }
}

// Destrói a instância Tagify do Quick Add (ao fechar o modal)
function destroyQuickAddTagify() {
    if (quickAddTagifyInstance) {
        try {
            quickAddTagifyInstance.destroy();
            // console.log("[destroyQuickAddTagify] Tagify instance destroyed.");
        } catch (e) {
            console.error("Error destroying Quick Add Tagify:", e);
        } finally {
            quickAddTagifyInstance = null; // Garante que a referência seja limpa
        }
    }
}

// Abre o modal Quick Add, configurando para Receita ou Despesa
function openQuickAddModal(type = 'expense') {
    if (!quickAddModal) return;
    // console.log(`[openQuickAddModal] Opening for type: ${type}`);

    resetQuickAddForm(true); // Reseta o form, passando true para setar data atual

    // Configura tipo e textos do modal
    quickAddTypeInput.value = type;
    quickAddModalTitle.textContent = type === 'income' ? 'Registrar Nova Receita' : 'Registrar Nova Despesa';
    quickAddDescSourceLabel.textContent = type === 'income' ? 'Fonte:' : 'Descrição:';
    quickAddDescSourceInput.placeholder = type === 'income' ? 'Ex: Salário, Venda...' : 'Ex: Supermercado, Aluguel...';

    // Popula e configura o select de categoria
    populateQuickAddCategorySelect(type);

    // Aplica máscara de moeda
    if (quickAddAmountInput) {
        applyCurrencyMask(quickAddAmountInput);
    }

    // Esconde campos opcionais e reseta toggles
    notesContainer?.classList.add('hidden');
    tagsContainer?.classList.add('hidden');
    toggleNotesBtn?.setAttribute('aria-expanded', 'false');
    toggleTagsBtn?.setAttribute('aria-expanded', 'false');
    toggleNotesBtn?.classList.remove('active');
    toggleTagsBtn?.classList.remove('active');

    // Garante que Tagify seja destruído (caso tenha ficado aberto)
    destroyQuickAddTagify();

    // Abre o modal e foca no primeiro campo útil (Data)
    openModal(quickAddModal);
    quickAddDateInput?.focus();
}

// Fecha o modal Quick Add
function closeQuickAddModal() {
    if (!quickAddModal) return;
    destroyQuickAddTagify(); // Destrói Tagify
    if (quickAddAmountInput) {
        destroyCurrencyMask(quickAddAmountInput); // Destrói máscara
    }
    resetQuickAddForm(); // Reseta campos
    closeModal(quickAddModal); // Fecha o modal (interface.js)
    // console.log("[closeQuickAddModal] Modal closed.");
}

// Reseta o formulário Quick Add
function resetQuickAddForm(isOpening = false) {
    quickAddForm?.reset(); // Reseta valores padrão do form HTML

    // Limpa Tagify se existir
    if (quickAddTagifyInstance) {
        quickAddTagifyInstance.removeAllTags();
    }
    if(quickAddTagsInput) quickAddTagsInput.value = ''; // Garante limpeza do input original

    // Limpa campo de notas
    if(notesInput) notesInput.value = '';

    // Limpa valor da máscara de moeda
    if (quickAddAmountInput && quickAddAmountInput.imaskInstance) {
        quickAddAmountInput.imaskInstance.value = '';
    } else if(quickAddAmountInput) {
        quickAddAmountInput.value = ''; // Fallback se máscara não iniciou
    }

    // Se estiver abrindo, preenche a data com hoje
    if (isOpening && quickAddDateInput) {
        quickAddDateInput.value = formatDateForInput(new Date());
    }
    // console.log("[resetQuickAddForm] Form reset.", { isOpening });
}

// Processa os dados do formulário Quick Add e retorna um objeto de transação ou null
function processQuickAddForm() {
    if (!quickAddForm || !quickAddAmountInput) {
        alert('Erro interno: Formulário ou campo de valor não encontrado.');
        return null;
    }

    const type = quickAddTypeInput.value;
    const date = quickAddDateInput.value;
    const amount = getUnmaskedValue(quickAddAmountInput);
    const descSource = quickAddDescSourceInput.value.trim();
    const category = quickAddCategorySelect.value;
    const notes = notesInput.value.trim();
    const selectedTags = quickAddTagifyInstance ? quickAddTagifyInstance.value.map(tagData => tagData.value) : [];

    // Validação
    if (!date || !descSource || isNaN(amount) || amount <= 0 || (type === 'expense' && !category)) {
        const message = isNaN(amount) || amount <= 0 ? 'Insira um valor válido.' :
                       (type === 'expense' && !category) ? 'Selecione uma categoria para a despesa.' :
                       'Preencha os campos obrigatórios (Data, Descrição/Fonte).';
        alert(message);
        return null;
    }

    // Monta objeto da transação
    const newTransaction = {
        type: type,
        date: date,
        amount: amount,
        category: category || null, // Usa null se categoria for vazia (receita sem categoria)
        description: type === 'expense' ? descSource : '', // Descrição só para despesa
        source: type === 'income' ? descSource : '',     // Fonte só para receita
        notes: notes || null, // Usa null se notas vazias
        tags: selectedTags || [],
    };

    // console.log("[processQuickAddForm] Transaction data prepared:", newTransaction);
    return newTransaction;
}

// --- Funções de Autenticação (Handlers) ---

async function handleSignIn(email, password) {
    clearFeedback('auth-feedback'); // Limpa feedback antigo
    if (!email || !password) {
        showFeedback('Preencha email e senha.', 'error', 0, false, null, 'auth-feedback');
        return;
    }
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Erro no login:", error.message);
            showFeedback(`Erro no login: ${error.message}`, 'error', 0, false, null, 'auth-feedback');
        } else {
            console.log("Login bem-sucedido para:", email); // Manter log de sucesso aqui
            clearFeedback('auth-feedback');
            // onAuthStateChange cuidará da atualização da UI e carregamento de dados
        }
    } catch (e) {
        console.error("Exceção no handleSignIn:", e);
        showFeedback('Erro inesperado durante o login.', 'error', 0, false, null, 'auth-feedback');
    }
}

async function handleSignUp(email, password) {
    clearFeedback('auth-feedback');
    if (!email || !password) {
        showFeedback('Preencha email e senha.', 'error', 0, false, null, 'auth-feedback');
        return;
    }
    if (password.length < 6) {
        showFeedback('A senha deve ter no mínimo 6 caracteres.', 'error', 0, false, null, 'auth-feedback');
        return;
    }
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            console.error("Erro no cadastro:", error.message);
            showFeedback(`Erro no cadastro: ${error.message}`, 'error', 0, false, null, 'auth-feedback');
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            // Caso específico onde o usuário já existe, mas Supabase retorna sucesso sem erro
            console.warn("Cadastro realizado, mas usuário já existe (identities vazio).");
            showFeedback('Usuário já cadastrado. Tente fazer login.', 'warning', 0, false, null, 'auth-feedback');
            showLoginForm(); // Mostra form de login
        } else if (data.user) {
            // Cadastro OK (verificação de email pode ser necessária dependendo da config do Supabase)
            console.log("Cadastro bem-sucedido para:", email); // Manter log de sucesso
            showFeedback('Cadastro realizado! Verifique seu e-mail para confirmação (se necessário) e faça o login.', 'success', 0, false, null, 'auth-feedback');
            signupForm?.reset();
            showLoginForm();
        } else {
            // Resposta inesperada
            console.warn("Cadastro retornou sem erro mas sem usuário claro:", data);
            showFeedback('Cadastro concluído. Tente fazer login.', 'info', 0, false, null, 'auth-feedback');
            showLoginForm();
        }
    } catch (e) {
        console.error("Exceção no handleSignUp:", e);
        showFeedback('Erro inesperado durante o cadastro.', 'error', 0, false, null, 'auth-feedback');
    }
}

async function handleSignOut() {
    try {
        console.log("Tentando fazer logout..."); // Log útil
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Erro ao sair:", error.message);
            showFeedback('Erro ao tentar sair.', 'error'); // Usa Toast normal
        } else {
            console.log("Logout bem-sucedido."); // Log útil
            // onAuthStateChange cuidará da limpeza da UI e do estado
        }
    } catch (e) {
        console.error("Exceção no handleSignOut:", e);
        showFeedback('Erro inesperado ao sair.', 'error'); // Usa Toast normal
    }
}

// Limpa a interface do usuário da aplicação (usado no logout)
function clearAppUI() {
    console.log("[clearAppUI] Limpando UI da aplicação...");

    // Reseta resumo
    if (headerSaldoAtualEl) headerSaldoAtualEl.textContent = formatCurrency(0);
    if (headerEntradasMesEl) headerEntradasMesEl.textContent = formatCurrency(0);
    if (headerSaidasMesEl) headerSaidasMesEl.textContent = formatCurrency(0);
    if (headerFuturosMesEl) headerFuturosMesEl.textContent = formatCurrency(0);

    // Limpa lista de transações e filtros
    if (transactionListEl) transactionListEl.innerHTML = `<li class="transaction-item placeholder">Faça login para ver suas transações.</li>`;
    if (filterStartDateInput) filterStartDateInput.value = '';
    if (filterEndDateInput) filterEndDateInput.value = '';
    if (filterCategoryEl) filterCategoryEl.innerHTML = '<option value="all">Todas</option>';
    if (searchInput) searchInput.value = '';

    // Limpa seções de orçamento e metas
    if (budgetListEl) budgetListEl.innerHTML = `<p class="placeholder">Faça login para ver.</p>`;
    if (goalListDisplayEl) goalListDisplayEl.innerHTML = `<p class="placeholder">Faça login para ver.</p>`;

    // Limpa recorrências pendentes
    if (pendingRecurringListEl) pendingRecurringListEl.innerHTML = `<li class="placeholder">Nenhuma recorrência pendente.</li>`;
    document.getElementById('pending-recurring-section')?.classList.add('hidden');

    // Reseta gráficos e período
    initializeChartVariables(); // Destrói instâncias e reseta variáveis
    if (reportFlatpickrInstance) {
        reportFlatpickrInstance.clear(); // Limpa seleção do Flatpickr
    }
    setReportsDateRange(null, null); // Reseta período dos relatórios

    // Garante que placeholders dos gráficos sejam exibidos
    const categoryChartPlaceholder = document.getElementById('no-category-chart-data');
    const categoryChartEl = document.getElementById('category-apex-chart');
    const balanceChartPlaceholder = document.getElementById('no-balance-chart-data');
    const balanceChartEl = document.getElementById('balance-evolution-apex-chart');
    const comparisonChartPlaceholder = document.getElementById('no-comparison-data');
    const comparisonChartEl = document.getElementById('comparison-apex-chart');

    if (categoryChartPlaceholder) categoryChartPlaceholder.classList.remove('hidden');
    if (categoryChartEl) categoryChartEl.style.display = 'none';
    if (balanceChartPlaceholder) balanceChartPlaceholder.classList.remove('hidden');
    if (balanceChartEl) balanceChartEl.style.display = 'none';
    if (comparisonChartPlaceholder) comparisonChartPlaceholder.classList.remove('hidden');
    if (comparisonChartEl) comparisonChartEl.style.display = 'none';
     if (comparisonContent && !comparisonContent.hidden) { comparisonContent.hidden = true; if (comparisonToggleBtn) comparisonToggleBtn.setAttribute('aria-expanded', 'false'); const compIcon = comparisonToggleBtn?.querySelector('.toggle-icon'); if (compIcon) { compIcon.classList.remove('fa-chevron-up'); compIcon.classList.add('fa-chevron-down'); } }


    // Fecha todos os modais abertos
    if (quickAddModal?.classList.contains('active')) closeModal(quickAddModal);
    if (editModal?.classList.contains('active')) closeModal(editModal);
    if (settingsModal?.classList.contains('active')) closeModal(settingsModal);
    if (editRecurringModal?.classList.contains('active')) closeModal(editRecurringModal);

    console.log("[clearAppUI] Limpeza da UI concluída.");
}

// Atualiza a UI com base no estado de autenticação (usuário logado ou não)
function updateAuthUI(user) {
    console.log(`[updateAuthUI] Atualizando UI para usuário: ${user?.email || 'Nenhum'}`); // Log essencial
    currentUserId = user?.id || null;

    if (user) {
        // --- Usuário Logado ---
        if (body) {
            body.classList.remove('logged-out');
            body.classList.add('logged-in');
        } else { console.error("[updateAuthUI] ERRO: Body não encontrado!"); }

        // Atualiza controles da sidebar
        if(loginControls) loginControls.classList.add('hidden');
        if(logoutControls) logoutControls.classList.remove('hidden');
        if(userEmailDisplay) userEmailDisplay.textContent = user.email;

        // Habilita botões de ação principal
        openSettingsBtn?.removeAttribute('disabled');
        headerActionEntradaBtn?.removeAttribute('disabled');
        headerActionSaidaBtn?.removeAttribute('disabled');
        // Habilitar outros botões se necessário

    } else {
        // --- Usuário Deslogado ---
        if (body) {
            body.classList.remove('logged-in');
            body.classList.add('logged-out');
        } else { console.error("[updateAuthUI] ERRO: Body não encontrado!"); }

        // Atualiza controles da sidebar
        if(loginControls) loginControls.classList.remove('hidden');
        if(logoutControls) logoutControls.classList.add('hidden');
        if(userEmailDisplay) userEmailDisplay.textContent = 'Desconectado';

        // Desabilita botões de ação principal
        openSettingsBtn?.setAttribute('disabled', true);
        headerActionEntradaBtn?.setAttribute('disabled', true);
        headerActionSaidaBtn?.setAttribute('disabled', true);
        // Desabilitar outros botões se necessário

        // Limpa a UI da aplicação
        clearAppUI();
    }
    // Limpa feedback específico da área de autenticação
    clearFeedback('auth-feedback');
}

// Mostra o formulário de login e esconde o de cadastro
function showLoginForm() {
    loginForm?.classList.remove('hidden');
    signupForm?.classList.add('hidden');
    clearFeedback('auth-feedback'); // Limpa feedback ao trocar de form
}

// Mostra o formulário de cadastro e esconde o de login
function showSignupForm() {
    loginForm?.classList.add('hidden');
    signupForm?.classList.remove('hidden');
    clearFeedback('auth-feedback'); // Limpa feedback ao trocar de form
}

// --- Wrappers de Ação (Handlers principais com SweetAlert) ---

async function handleDeleteTransaction(id) {
    if (!id) return;
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) {
        console.warn(`Tentativa de excluir transação inexistente (ID: ${id})`);
        return;
    }
    const desc = transactionToDelete.type === 'income' ? transactionToDelete.source : transactionToDelete.description;

    // Usa SweetAlert2 para confirmação
    const result = await Swal.fire({
        title: 'Confirmar Exclusão',
        text: `Tem certeza que deseja excluir a transação "${desc}"? Esta ação não pode ser desfeita.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545', // Vermelho para exclusão
        cancelButtonColor: '#6c757d',  // Cinza para cancelar
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar',
        customClass: { // Adiciona classe para possível estilização extra
            popup: 'swal-delete-confirm'
        }
    });

    // Se o usuário confirmar...
    if (result.isConfirmed) {
        // console.log(`[handleDeleteTransaction] Usuário confirmou exclusão para ID: ${id}`);
        const success = await deleteTransactionData(id); // Chama a exclusão em data.js
        if (success) {
            showFeedback('Transação excluída!', 'success'); // Usa Toast
        } else {
            showFeedback('Erro ao excluir transação.', 'error'); // Usa Toast
        }
    } else {
        // console.log(`[handleDeleteTransaction] Exclusão cancelada pelo usuário para ID: ${id}`);
    }
}

// Wrapper para salvar transação editada (apenas chama a função de edits.js)
async function handleSaveEditedTransaction(event) {
    await handleSaveEditedTransactionWrapper(event);
    // O feedback já é tratado dentro de saveEditedTransaction em edits.js
}

// Wrapper para adicionar tag (chamado pelo submit do form em settings)
async function handleAddTag(event) {
    event.preventDefault(); // Impede recarregamento da página
    await addTag(); // Chama a função em settings.js
    // O feedback já é tratado dentro de addTag em settings.js
}

// Wrapper para deletar tag (chamado pelo clique no botão na lista em settings)
async function handleDeleteTag(tagName) {
    if (!tagName) return;

    // Usa SweetAlert2 para confirmação
    const result = await Swal.fire({
        title: 'Confirmar Exclusão',
        html: `Tem certeza que deseja excluir a tag <strong>"${tagName}"</strong>?<br><small>Ela será removida de todas as transações associadas.</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'swal-delete-confirm',
            htmlContainer: 'swal2-html-container-left'
        }
    });

    if (result.isConfirmed) {
        // console.log(`[handleDeleteTag] Usuário confirmou exclusão para tag: ${tagName}`);
        await deleteTag(tagName); // Chama a função em settings.js que chama data.js
        // O feedback (sucesso/erro) já é tratado dentro de deleteTag em settings.js
    } else {
        // console.log(`[handleDeleteTag] Exclusão cancelada pelo usuário para tag: ${tagName}`);
    }
}

// --- Função para Adicionar Event Listeners da Aplicação ---
function setupAppEventListeners() {
    console.log("[setupAppEventListeners] Adicionando listeners da aplicação..."); // Log essencial
    try {
        // --- Listeners Globais e de Navegação ---
        if (sidebarToggleDesktopBtn) {
            sidebarToggleDesktopBtn.removeEventListener('click', toggleDesktopSidebar); // Evita duplicados
            sidebarToggleDesktopBtn.addEventListener('click', toggleDesktopSidebar);
        }
        if (mobileMenuToggleBtn) {
            mobileMenuToggleBtn.removeEventListener('click', openMobileSidebar);
            mobileMenuToggleBtn.addEventListener('click', openMobileSidebar);
        }
        if (openSettingsBtn) {
            openSettingsBtn.removeEventListener('click', openSettingsModal);
            openSettingsBtn.addEventListener('click', openSettingsModal);
        }
        if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileSidebar);

        // Listener de redimensionamento para ajustar a view do modal de settings
        window.addEventListener('resize', handleSettingsResize);

        // Listener para fechar modais/sidebar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    // Fecha o modal ativo correto
                    if (activeModal.id === 'settings-modal') closeSettingsModal();
                    else if (activeModal.id === 'edit-modal') closeEditModal();
                    else if (activeModal.id === 'edit-recurring-modal') closeEditRecurringModal();
                    else if (activeModal.id === 'quick-add-modal') closeQuickAddModal();
                } else if (body?.classList.contains('mobile-sidebar-open')) {
                    // Fecha sidebar mobile se não houver modal aberto
                    closeMobileSidebar();
                }
            }
        });

        // --- Listeners de Ações Principais (Header) ---
        if (headerActionEntradaBtn) { headerActionEntradaBtn.onclick = () => openQuickAddModal('income'); }
        if (headerActionSaidaBtn) { headerActionSaidaBtn.onclick = () => openQuickAddModal('expense'); }

        // --- Listeners de Modais (Delegação para Overlay e Botão X genérico) ---
        document.addEventListener('click', (e) => {
            // Fecha sidebar mobile ao clicar no overlay dela
            if (e.target.id === 'mobile-overlay') {
                closeMobileSidebar();
            }
            // Fecha modal ao clicar no overlay ou botão X genérico
            if (e.target.classList.contains('modal-overlay') || e.target.closest('.modal-close-btn')) {
                const modal = e.target.closest('.modal');
                if(modal) {
                    // Chama a função de fechar específica para cada modal
                    switch(modal.id) {
                        case 'quick-add-modal': closeQuickAddModal(); break;
                        case 'edit-modal': closeEditModal(); break;
                        case 'settings-modal': closeSettingsModal(); break;
                        case 'edit-recurring-modal': closeEditRecurringModal(); break;
                    }
                }
            }
            // OBS: Botões 'Cancelar' específicos dentro dos modais (como em Edição)
            // são tratados nos seus respectivos módulos (edits.js) ou aqui se forem simples.
        });

        // --- Listeners do Modal Quick Add ---
        // Botão 'X' já coberto pela delegação acima
        if(modalActionsContainer) { // Animação dos botões Salvar/Cancelar/Salvar Nova
            modalActionsContainer.addEventListener('mouseenter', () => { modalActionsContainer.classList.add('context-actions-visible'); });
            modalActionsContainer.addEventListener('mouseleave', () => { modalActionsContainer.classList.remove('context-actions-visible'); });
        }
        if(cancelActionText) cancelActionText.addEventListener('click', closeQuickAddModal); // Botão texto Cancelar
        if(saveActionBtn) saveActionBtn.addEventListener('click', async () => { // Botão principal Salvar (check)
            const newTrans = processQuickAddForm();
            if (newTrans) {
                const added = await addTransactionData(newTrans);
                if(added) {
                    closeQuickAddModal();
                    showFeedback(`Transação adicionada!`, 'success');
                } else {
                    showFeedback('Erro ao salvar transação.', 'error');
                }
            }
        });
        if(saveNewActionText) saveNewActionText.addEventListener('click', async () => { // Botão texto Salvar e Nova
            const newTrans = processQuickAddForm();
            if (newTrans) {
                const added = await addTransactionData(newTrans);
                if(added) {
                    showFeedback(`Transação adicionada! Adicione a próxima.`, 'success', 2000);
                    resetQuickAddForm(false); // Reseta form, mas não seta data
                    if (quickAddAmountInput) { applyCurrencyMask(quickAddAmountInput); } // Reaplica máscara
                    // Mantém o foco no campo de descrição/fonte para facilitar adição sequencial
                    quickAddDescSourceInput?.focus();
                } else {
                    showFeedback('Erro ao salvar transação.', 'error');
                }
            }
        });
        if(toggleNotesBtn) toggleNotesBtn.addEventListener('click', () => { // Botão toggle Notas
            const expanded = toggleNotesBtn.getAttribute('aria-expanded') === 'true';
            notesContainer?.classList.toggle('hidden', expanded);
            toggleNotesBtn.setAttribute('aria-expanded', !expanded);
            toggleNotesBtn.classList.toggle('active', !expanded);
            if (!expanded) { notesInput?.focus(); } // Foca no campo ao abrir
        });
        if(toggleTagsBtn) toggleTagsBtn.addEventListener('click', () => { // Botão toggle Tags
            const expanded = toggleTagsBtn.getAttribute('aria-expanded') === 'true';
            tagsContainer?.classList.toggle('hidden', expanded);
            toggleTagsBtn.setAttribute('aria-expanded', !expanded);
            toggleTagsBtn.classList.toggle('active', !expanded);
            if (!expanded) {
                // Inicializa Tagify se ainda não foi
                if (!quickAddTagifyInstance) { initializeQuickAddTagify(); }
                // Foca no input Tagify (com delay para garantir inicialização)
                setTimeout(() => quickAddTagifyInstance?.focus(), 0);
            } else {
                // Destrói Tagify ao fechar (opcional, mas limpa recursos)
                // destroyQuickAddTagify();
            }
        });

        // --- Listeners do Modal de Edição (Transação) ---
        if(editForm) editForm.addEventListener('submit', handleSaveEditedTransaction);
        // Botão Cancelar e 'X' são tratados em edits.js e na delegação global

        // --- Listeners do Modal de Configurações ---
        // Botão 'X' já coberto pela delegação
        if(modalTabsContainer) modalTabsContainer.addEventListener('click', (e) => { // Cliques nas abas (desktop)
            if (!isMobileSettingsView) {
                const btn = e.target.closest('.tab-button');
                if (btn?.dataset.tab) setActiveTab(btn.dataset.tab);
            }
        });
        if(settingsSectionListContainer) settingsSectionListContainer.addEventListener('click', (e) => { // Cliques na lista de seções (mobile)
            const item = e.target.closest('.settings-section-item');
            if (item?.dataset.sectionId) {
                showSettingsSection(item.dataset.sectionId, item.dataset.sectionTitle);
            }
        });
        if(settingsBackButton) settingsBackButton.addEventListener('click', () => { // Botão Voltar (mobile)
            if (isMobileSettingsView) setupMobileSettingsView(); // Volta para a lista
        });
        // Listeners das Abas
        if(budgetForm) budgetForm.addEventListener('submit', saveBudgets); // Salvar Orçamentos
        if(addCategoryBtn) addCategoryBtn.addEventListener('click', addCategory); // Adicionar Categoria (Botão)
        if(newCategoryNameInput) newCategoryNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addCategory(); }); // Adicionar Categoria (Enter)
        // Delegação para excluir Categoria (botões de lixeira)
        const categoryLists = [expenseCategoryListEl, incomeCategoryListEl];
        categoryLists.forEach(listEl => {
            if (listEl) {
                listEl.addEventListener('click', (e) => {
                    const btn = e.target.closest('.delete-category-btn');
                    // Chama deleteCategory (que usa SweetAlert) apenas se o botão não estiver desabilitado
                    if (btn && !btn.disabled && btn.dataset.name && btn.dataset.type) {
                        deleteCategory(btn.dataset.name, btn.dataset.type);
                    }
                });
            }
        });
        if(addTagForm) addTagForm.addEventListener('submit', handleAddTag); // Adicionar Tag (Form)
        if(newTagNameInput) newTagNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAddTag(e); }); // Adicionar Tag (Enter)
        if(tagManagementListEl) tagManagementListEl.addEventListener('click', (e) => { // Excluir Tag (Botão)
            const btn = e.target.closest('.delete-tag-btn');
            if (btn?.dataset.tagName) handleDeleteTag(btn.dataset.tagName); // Chama wrapper com SweetAlert
        });
        if(addGoalForm) addGoalForm.addEventListener('submit', addGoal); // Adicionar Meta
        if(goalManagementListEl) goalManagementListEl.addEventListener('click', (e) => { // Adicionar Valor / Excluir Meta
            const addBtn = e.target.closest('.add-goal-amount-btn');
            const delBtn = e.target.closest('.delete-goal-btn');
            const li = e.target.closest('li'); // Encontra o item da lista pai
            const goalId = Number(li?.dataset.id);

            if (isNaN(goalId)) return; // Sai se não conseguiu ID válido

            if (addBtn) { // Botão de adicionar valor
                const input = li?.querySelector('.add-goal-amount-input');
                if (input) addSavedAmountToGoal(goalId, input);
            } else if (delBtn) { // Botão de excluir meta
                deleteGoal(goalId); // Chama função com SweetAlert
            }
        });
        if(recurringTypeSelect) recurringTypeSelect.addEventListener('change', () => { // Muda tipo de recorrência
            populateSettingsRecurringCategories(); // Atualiza select de categoria
        });
        if(addRecurringForm) addRecurringForm.addEventListener('submit', addRecurringTransaction); // Adicionar Recorrência
        if(recurringManagementListEl) recurringManagementListEl.addEventListener('click', (e) => { // Editar / Excluir Recorrência
            const deleteBtn = e.target.closest('.delete-recurring-btn');
            const editBtn = e.target.closest('.edit-recurring-btn');
            const recId = Number(e.target.closest('li')?.dataset.id); // Pega ID do item da lista

            if (isNaN(recId)) return; // Sai se ID inválido

            if (editBtn) { // Botão Editar
                openEditRecurringModal(recId);
            } else if (deleteBtn) { // Botão Excluir
                deleteRecurringTransaction(recId); // Chama função com SweetAlert
            }
        });
        if(exportCsvBtnModal) exportCsvBtnModal.addEventListener('click', exportToCSV); // Exportar CSV

        // --- Listeners do Modal Editar Recorrência ---
        if(editRecurringTypeSelect) editRecurringTypeSelect.addEventListener('change', () => {
            // Popula select de categoria DENTRO do modal de edição de recorrência
            populateEditRecurringCategorySelect(editRecurringTypeSelect, editRecurringTypeSelect.value);
        });
        if(editRecurringForm) editRecurringForm.addEventListener('submit', saveEditedRecurringTransaction);
        // Botão Cancelar e 'X' são tratados em edits.js e na delegação global

        // --- Listeners de Filtros e Listas ---
        if(filterStartDateInput) filterStartDateInput.addEventListener('change', renderTransactions);
        if(filterEndDateInput) filterEndDateInput.addEventListener('change', renderTransactions);
        if(filterCategoryEl) filterCategoryEl.addEventListener('change', renderTransactions);
        if(searchInput) searchInput.addEventListener('input', renderTransactions); // Dispara busca a cada caractere
        if(filterShortcutsContainer) filterShortcutsContainer.addEventListener('click', (e) => { // Atalhos de período
            const btn = e.target.closest('.shortcut-btn');
            if (btn?.dataset.period) handleShortcutClick(btn.dataset.period);
        });
        // Listener de clique na lista de transações (EDIT e DELETE botões)
        if(transactionListEl) {
            transactionListEl.addEventListener('click', (e) => {
                const item = e.target.closest('.transaction-item');
                if (!item || !item.dataset.id) return; // Ignora cliques fora de itens com ID
                const id = item.dataset.id; // Pega ID da transação

                const editBtn = e.target.closest('.edit-btn');
                const deleteBtn = e.target.closest('.delete-btn');

                if (editBtn) { // Clicou no lápis
                    // console.log("Edit button clicked for", id);
                    openEditModal(id);
                } else if (deleteBtn) { // Clicou na lixeira
                    // console.log("Delete button clicked for", id);
                    handleDeleteTransaction(id); // Chama wrapper com SweetAlert
                }
                // Clique na descrição é tratado em interface.js -> addTransactionItemToDOM
            });
        }
        // Listener para adicionar recorrência pendente
        if(pendingRecurringListEl) {
            pendingRecurringListEl.addEventListener('click', (e) => {
                const addBtn = e.target.closest('.add-pending-recurring-btn');
                if (addBtn) {
                    const listItem = addBtn.closest('.pending-recurring-item');
                    if (listItem?.dataset.id) {
                        const recurringId = Number(listItem.dataset.id);
                        if (!isNaN(recurringId)) {
                            addPendingRecurring(recurringId); // Chama função de recurring.js
                        }
                    }
                }
            });
        }

        // --- Listeners dos Gráficos/Relatórios ---
        if(comparisonPeriodSelect) comparisonPeriodSelect.addEventListener('change', handleComparisonControlChange);
        if(comparisonTypeSelect) comparisonTypeSelect.addEventListener('change', handleComparisonControlChange);
        if(comparisonToggleBtn) comparisonToggleBtn.addEventListener('click', () => { // Botão de expandir/recolher comparação
            const isExpanded = comparisonToggleBtn.getAttribute('aria-expanded') === 'true';
            comparisonToggleBtn.setAttribute('aria-expanded', !isExpanded);
            if(comparisonContent) comparisonContent.hidden = isExpanded;
            const icon = comparisonToggleBtn.querySelector('.toggle-icon');
            if (icon) {
                icon.classList.toggle('fa-chevron-down', isExpanded);
                icon.classList.toggle('fa-chevron-up', !isExpanded);
            }
            // Renderiza o gráfico ao expandir
            if (!isExpanded) {
                handleComparisonControlChange();
            }
        });

        console.log("[setupAppEventListeners] Listeners da aplicação adicionados."); // Log essencial
    } catch(error) {
        console.error("Erro GERAL ao adicionar listeners da aplicação:", error);
    }
} // *** FIM DA FUNÇÃO setupAppEventListeners ***


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOMContentLoaded] Evento disparado."); // Log essencial

    // Configura seletores e listeners de autenticação PRIMEIRO
    if (!setupInitialSelectors()) {
        console.error("[DOMContentLoaded] Falha ao configurar seletores iniciais. Aplicação não pode continuar.");
        alert("Erro crítico ao carregar a aplicação. Verifique o console.");
        return;
    }

    // Adiciona listeners aos forms de auth
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSignIn(loginEmailInput.value, loginPasswordInput.value);
    });
    signupForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSignUp(signupEmailInput.value, signupPasswordInput.value);
    });
    // Adiciona listeners aos botões de troca de form de auth
    showSignupBtn?.addEventListener('click', showLoginForm); // Botão "Cadastre-se" vai para Login (erro no nome?) -> CORRIGIDO: deveria ser showSignupForm
    showLoginBtn?.addEventListener('click', showLoginForm);   // Botão "Faça Login" vai para Login (correto)
    // CORREÇÃO: O botão "Cadastre-se" (show-signup-btn) deve mostrar o form de signup
    if (showSignupBtn) {
        showSignupBtn.removeEventListener('click', showLoginForm); // Remove listener errado se houver
        showSignupBtn.addEventListener('click', showSignupForm);
    }


    // Listener para botão de logout
    logoutBtn?.addEventListener('click', handleSignOut);

    console.log("[DOMContentLoaded] Configurando listener onAuthStateChange..."); // Log essencial
    if (!supabase) {
        console.error("[DOMContentLoaded] Supabase client não inicializado!");
        updateAuthUI(null); // Garante UI de deslogado
        alert("Erro crítico: Conexão com banco de dados falhou. Verifique supabaseClient.js");
        return;
    }

    // Listener principal para mudanças no estado de autenticação
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[onAuthStateChange] Evento: ${event}`, { session: !!session }); // Log essencial
        const user = session?.user ?? null;

        updateAuthUI(user); // Atualiza a UI (mostra/esconde forms, atualiza sidebar, etc.)

        if (user) {
            // --- Usuário LOGADO ---
            if (!hasLoadedInitialData) {
                console.log("[onAuthStateChange] Usuário logado. Iniciando carregamento inicial de dados...");
                // Usa requestAnimationFrame para garantir que a UI de 'logado' seja renderizada antes de carregar
                requestAnimationFrame(async () => {
                    const success = await loadInitialData(); // Carrega dados do Supabase (data.js)
                    if (!success) {
                        console.error("[onAuthStateChange] Falha crítica ao carregar dados iniciais após login.");
                        // Considerar mostrar um erro persistente ao usuário aqui
                        showFeedback("Erro ao carregar seus dados. Tente recarregar a página.", "error", 0); // Toast persistente
                    }
                    // O evento 'initialDataLoaded' será disparado por loadInitialData se sucesso
                });
            } else {
                console.log("[onAuthStateChange] Usuário já estava logado e dados carregados previamente.");
                // A UI já deve estar correta
            }
        } else {
            // --- Usuário DESLOGADO ---
            console.log("[onAuthStateChange] Usuário deslogado. Limpando dados e UI..."); // Log essencial
            destroyTooltips(); // Garante que tooltips sejam removidos
            clearLocalData();  // Limpa arrays de estado em data.js
            clearAppUI();      // Limpa a interface gráfica
            hasLoadedInitialData = false; // Reseta flag
            console.log("[onAuthStateChange] Estado local e UI resetados.");
        }
    });

    // Listener para quando os dados iniciais forem carregados com sucesso (disparado por data.js)
    document.addEventListener('initialDataLoaded', () => {
        console.log('[Event Listener] initialDataLoaded disparado.'); // Log essencial

        if (!hasLoadedInitialData) {
             // Primeira vez que os dados são carregados nesta sessão
            console.log("[initialDataLoaded] Primeira carga de dados detectada. Configurando seletores e listeners da aplicação...");
            setupAppSelectors();      // Seleciona elementos da aplicação
            setupAppEventListeners(); // Adiciona listeners da aplicação
            hasLoadedInitialData = true; // Marca que a inicialização foi feita
            console.log("[initialDataLoaded] Seletores e Listeners da aplicação configurados.");

            // --- Configuração Adicional da UI (pode ir para interface.js se ficar complexo) ---
            // Lógica para esconder header no scroll (opcional)
            let headerHideTimeout = null;
            const HEADER_HIDE_DELAY = 2500; // Tempo visível após parar de rolar
            const scrollThreshold = 10;     // Distância para começar a esconder

            function showHeaderAndStartHideTimer() {
                if (mainHeader) {
                    mainHeader.classList.remove('header-hidden'); // Mostra header
                    clearTimeout(headerHideTimeout); // Cancela timer anterior
                    // Inicia timer para esconder após delay
                    headerHideTimeout = setTimeout(() => {
                        // Só esconde se ainda estiver scrollado para baixo
                        if (window.pageYOffset > scrollThreshold) {
                             mainHeader.classList.add('header-hidden');
                        }
                    }, HEADER_HIDE_DELAY);
                }
            }
            // Adiciona listener de scroll (passivo para melhor performance)
            window.addEventListener('scroll', showHeaderAndStartHideTimer, { passive: true });
            // Verifica estado inicial do scroll ao carregar
            if (window.pageYOffset > scrollThreshold) {
                showHeaderAndStartHideTimer(); // Esconde imediatamente se já scrollado
            } else {
                if(mainHeader) mainHeader.classList.remove('header-hidden'); // Garante visível se no topo
            }
            // --- Fim da Lógica do Header ---

        } else {
            console.log("[initialDataLoaded] Dados recarregados (evento pode ter disparado novamente). Apenas renderizando UI.");
        }

        // Renderiza todos os componentes da UI principal com os dados carregados/atualizados
        renderAllMainUI();
        // Verifica e renderiza recorrências pendentes
        checkAndRenderPendingRecurring();
        // Renderiza gráficos iniciais (sem período definido, usará todos os dados)
        renderCategoryChart(transactions);
        renderBalanceEvolutionChart(transactions);
        // Inicializa tooltips para notas
        initializeTooltips();
        // Renderiza gráfico de comparação se estiver expandido
        if (comparisonToggleBtn?.getAttribute('aria-expanded') === 'true') {
            handleComparisonControlChange();
        }
        // Ajusta estado da sidebar desktop se necessário
        if (body?.classList.contains('logged-in')) {
            updateDesktopSidebarState(body.classList.contains('desktop-sidebar-collapsed'));
        }

        console.log("[initialDataLoaded] Aplicação configurada/atualizada e UI renderizada."); // Log essencial
    });

    // Listener para quando as transações são atualizadas (adicionadas, editadas, excluídas)
    document.addEventListener('transactionsUpdated', (event) => {
        console.log("[Event Listener] transactionsUpdated disparado."); // Log essencial
        if (hasLoadedInitialData) {
            // console.log("[transactionsUpdated] App inicializado. Atualizando UI...");
            // Re-renderiza componentes que dependem das transações
            renderSummary();
            renderTransactions(); // Re-renderiza a lista
            renderBudgetsSection(budgets, transactions); // Re-renderiza orçamentos (gastos mudaram)
            checkAndRenderPendingRecurring(); // Verifica se alguma pendência foi resolvida
            // Re-renderiza gráficos (considerando o período selecionado)
            renderCategoryChart(transactions);
            renderBalanceEvolutionChart(transactions);
            if (comparisonToggleBtn?.getAttribute('aria-expanded') === 'true') {
                handleComparisonControlChange();
            }
            // console.log("[transactionsUpdated] Atualização da UI concluída.");
        } else {
            console.warn("[transactionsUpdated] Evento recebido, mas App não está inicializado. Ignorando atualização da UI.");
        }
    });

    // Listener para logout (disparado por data.js ou onAuthStateChange)
    document.addEventListener('userLoggedOut', () => {
        console.log('[Event Listener] userLoggedOut disparado.'); // Log essencial
        destroyTooltips(); // Garante limpeza de tooltips
        // A limpeza da UI e do estado já é feita por onAuthStateChange ou clearAppUI
    });

    console.log("[DOMContentLoaded] Script principal inicializado. Aguardando onAuthStateChange..."); // Log essencial final

}); // Fim do DOMContentLoaded