// settings.js - Lógica do Modal de Configurações e suas Sub-seções

import { categories, tags, budgets, goals, saveData, addCategoryData, deleteCategoryData, addTagData, deleteTagData, transactions, recurringTransactions } from './data.js';
// *** Adiciona import das funções de máscara ***
import { normalizeText, formatCurrency, showFeedback, clearFeedback, isMobileView, applyCurrencyMask, getUnmaskedValue, destroyCurrencyMask } from './helpers.js';
import { populateCategorySelects as populateAllCategorySelects, renderBudgetsSection as renderMainBudgets, renderGoalsSection as renderMainGoals, renderAllMainUI, closeModal as closeModalGeneric, openModal as openModalGeneric } from './interface.js';
import { checkAndRenderPendingRecurring } from './recurring.js';
import { updateTagifyWhitelists } from './main.js';

// --- Seletores DOM (dentro do Modal de Configurações) ---
let settingsModalContent;
let settingsModalHeader;
let settingsModalTitle;
let settingsSectionListContainer;
let settingsBackButton;
let modalTabsContainer;
let tabButtons;
let tabContentContainer;
let tabContents;
// Orçamentos
let budgetForm, budgetCategoriesListEl, budgetFeedbackEl;
// Categorias
let newCategoryNameInput, newCategoryTypeSelect, addCategoryBtn, expenseCategoryListEl, incomeCategoryListEl;
// Tags
let addTagForm, newTagNameInput, addTagBtn, tagManagementListEl, tagFeedbackEl;
// Metas
let addGoalForm, goalNameInput, goalTargetAmountInput, goalManagementListEl, goalFeedbackEl;
// Recorrências
let addRecurringForm, recurringTypeSelect, recurringDayInput, recurringDescriptionInput, recurringAmountInput, recurringCategorySelect, recurringManagementListEl, recurringSettingsFeedbackEl;
// Exportar
let exportCsvBtnModal;

// Estado local do modal
export let isMobileSettingsView = false;
export let currentSettingsView = 'list'; // 'list' ou 'detail'

// *** NOVO: Armazena referências aos inputs que terão máscara ***
const maskedInputs = new Map(); // Guarda inputElement -> instância IMask


// Inicializa seletores específicos do modal de configurações (mantida)
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
    // Seletores das abas (mantidos)
    budgetForm = document.getElementById('budget-form'); budgetCategoriesListEl = document.getElementById('budget-categories-list'); budgetFeedbackEl = document.getElementById('budget-feedback');
    newCategoryNameInput = settingsModal.querySelector('#tab-categories #new-category-name'); newCategoryTypeSelect = document.getElementById('new-category-type'); addCategoryBtn = document.getElementById('add-category-btn'); expenseCategoryListEl = document.getElementById('expense-category-list'); incomeCategoryListEl = document.getElementById('income-category-list');
    addTagForm = document.getElementById('add-tag-form'); newTagNameInput = settingsModal.querySelector('#tab-tags #new-tag-name'); addTagBtn = document.getElementById('add-tag-btn'); tagManagementListEl = document.getElementById('tag-management-list'); tagFeedbackEl = document.getElementById('tag-feedback');
    // *** Seletores dos inputs de valor ***
    addGoalForm = document.getElementById('add-goal-form'); goalNameInput = document.getElementById('goal-name'); goalTargetAmountInput = document.getElementById('goal-target-amount'); goalManagementListEl = document.getElementById('goal-management-list'); goalFeedbackEl = document.getElementById('goal-feedback');
    addRecurringForm = document.getElementById('add-recurring-form'); recurringTypeSelect = document.getElementById('recurring-type'); recurringDayInput = document.getElementById('recurring-day'); recurringDescriptionInput = document.getElementById('recurring-description'); recurringAmountInput = document.getElementById('recurring-amount'); recurringCategorySelect = document.getElementById('recurring-category'); recurringManagementListEl = document.getElementById('recurring-management-list'); recurringSettingsFeedbackEl = document.getElementById('recurring-settings-feedback');
    exportCsvBtnModal = document.getElementById('export-csv-btn');
}

// *** NOVO: Inicializa máscaras dos inputs no modal de settings ***
export function initializeSettingsMasks() {
    // Orçamentos: Aplicado dinamicamente em renderBudgetInputs
    // Metas: Valor Alvo
    if (goalTargetAmountInput) { applyCurrencyMask(goalTargetAmountInput); }
    // Metas: Adicionar valor (aplicado dinamicamente em renderGoalsManagement)
    // Recorrências: Valor Padrão
    if (recurringAmountInput) { applyCurrencyMask(recurringAmountInput); }
    console.log("[initializeSettingsMasks] Máscaras aplicadas nos forms de Metas e Recorrências.");
}

// *** NOVO: Limpa todas as máscaras deste modal ***
function destroyAllSettingsMasks() {
    // Inputs de Orçamento (iterar e destruir)
    if (budgetCategoriesListEl) {
        budgetCategoriesListEl.querySelectorAll('.budget-input').forEach(input => {
            destroyCurrencyMask(input);
        });
    }
    // Input Valor Alvo Meta
    if (goalTargetAmountInput) { destroyCurrencyMask(goalTargetAmountInput); }
    // Inputs Adicionar Valor Meta (iterar e destruir)
    if (goalManagementListEl) {
        goalManagementListEl.querySelectorAll('.add-goal-amount-input').forEach(input => {
             destroyCurrencyMask(input);
        });
    }
    // Input Valor Recorrência
    if (recurringAmountInput) { destroyCurrencyMask(recurringAmountInput); }
    console.log("[destroyAllSettingsMasks] Máscaras do modal de configurações destruídas.");
}

// --- Funções de Navegação do Modal ---
// openSettingsModal (mantida)
export function openSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal) return;
    openModalGeneric(settingsModal);
    if (isMobileView()) {
        setupMobileSettingsView();
    } else {
        setupDesktopSettingsView();
    }
    // Garante que as máscaras sejam reaplicadas se necessário (especialmente orçamento)
    const activeTabButton = modalTabsContainer?.querySelector('.tab-button.active');
    const targetTabId = activeTabButton ? activeTabButton.dataset.tab : 'tab-budgets';
    setActiveTab(targetTabId); // Chama setActiveTab que renderiza a aba ativa (e aplica máscaras nela)
}
// setupDesktopSettingsView (mantida)
export function setupDesktopSettingsView() { isMobileSettingsView = false; currentSettingsView = 'detail'; settingsModalContent?.classList.remove('mobile-view', 'show-list', 'show-detail'); settingsModalHeader?.classList.remove('mobile-view', 'show-back-button'); modalTabsContainer?.classList.remove('hidden'); tabContentContainer?.classList.remove('hidden'); settingsSectionListContainer?.classList.add('hidden'); settingsBackButton?.classList.add('hidden'); if (settingsModalTitle) settingsModalTitle.textContent = "Configurações"; const activeTabButton = modalTabsContainer?.querySelector('.tab-button.active') || modalTabsContainer?.querySelector('.tab-button'); const targetTabId = activeTabButton ? activeTabButton.dataset.tab : 'tab-budgets'; setActiveTab(targetTabId); }
// setupMobileSettingsView (mantida)
export function setupMobileSettingsView() { isMobileSettingsView = true; currentSettingsView = 'list'; settingsModalContent?.classList.add('mobile-view', 'show-list'); settingsModalContent?.classList.remove('show-detail'); settingsModalHeader?.classList.add('mobile-view'); settingsModalHeader?.classList.remove('show-back-button'); modalTabsContainer?.classList.add('hidden'); tabContentContainer?.classList.add('hidden'); settingsSectionListContainer?.classList.remove('hidden'); settingsBackButton?.classList.add('hidden'); if (settingsModalTitle) settingsModalTitle.textContent = "Configurações"; renderSettingsListView(); }
// renderSettingsListView (mantida)
export function renderSettingsListView() { if (!settingsSectionListContainer || !tabButtons) return; settingsSectionListContainer.innerHTML = ''; const ul = document.createElement('ul'); tabButtons.forEach(button => { const sectionId = button.dataset.tab; const iconClass = button.querySelector('i')?.className || 'fas fa-question-circle'; const sectionTitle = button.textContent.trim(); const li = document.createElement('li'); const itemButton = document.createElement('button'); itemButton.className = 'settings-section-item'; itemButton.dataset.sectionId = sectionId; itemButton.dataset.sectionTitle = sectionTitle; itemButton.innerHTML = `<i class="${iconClass}"></i> <span>${sectionTitle}</span>`; li.appendChild(itemButton); ul.appendChild(li); }); settingsSectionListContainer.appendChild(ul); }
// showSettingsSection (mantida)
export function showSettingsSection(sectionId, sectionTitle) { currentSettingsView = 'detail'; settingsModalContent?.classList.remove('show-list'); settingsModalContent?.classList.add('show-detail'); settingsModalHeader?.classList.add('show-back-button'); settingsBackButton?.classList.remove('hidden'); if (settingsModalTitle) settingsModalTitle.textContent = sectionTitle; setActiveTab(sectionId); tabContentContainer?.classList.remove('hidden'); settingsSectionListContainer?.classList.add('hidden'); }

// *** Modificado: setActiveTab aplica máscaras ao renderizar ***
export function setActiveTab(tabId) {
    if (!tabButtons || !tabContents) return;

    tabButtons.forEach(b => { b.classList.toggle('active', b.dataset.tab === tabId); });
    tabContents.forEach(c => {
        const isActive = c.id === tabId;
        c.classList.toggle('active', isActive);
        // Se a aba está sendo ativada, renderiza seu conteúdo e aplica máscaras
        if (isActive) {
            switch (tabId) {
                case 'tab-budgets':
                    renderBudgetInputs(); // Aplica máscara dentro desta função
                    break;
                case 'tab-categories':
                    renderCategoryLists();
                    break;
                case 'tab-tags':
                    renderTagManagementList();
                    break;
                case 'tab-goals':
                    renderGoalsManagement(); // Aplica máscara dentro desta função
                    // Aplica máscara ao campo de adicionar nova meta (já inicializado antes)
                    if (goalTargetAmountInput && !goalTargetAmountInput.imaskInstance) {
                        applyCurrencyMask(goalTargetAmountInput);
                    }
                    break;
                case 'tab-recurring':
                    populateSettingsRecurringCategories();
                    renderRecurringManagement();
                    // Aplica máscara ao campo de adicionar nova recorrência (já inicializado antes)
                     if (recurringAmountInput && !recurringAmountInput.imaskInstance) {
                        applyCurrencyMask(recurringAmountInput);
                    }
                    break;
            }
        }
    });
}

// handleResize (mantida)
export function handleResize() { const settingsModal = document.getElementById('settings-modal'); if (!settingsModal || !settingsModal.classList.contains('active')) { return; } const currentlyMobile = settingsModalContent?.classList.contains('mobile-view'); const shouldBeMobile = isMobileView(); if (currentlyMobile && !shouldBeMobile) { setupDesktopSettingsView(); } else if (!currentlyMobile && shouldBeMobile) { if (currentSettingsView === 'detail') { /* Mantém a view de detalhe ao ficar mobile */ } else { setupMobileSettingsView(); } } }


// *** Modificado: closeSettingsModal chama destroyAllSettingsMasks ***
export function closeSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    destroyAllSettingsMasks(); // Limpa as máscaras ao fechar
    closeModalGeneric(settingsModal);
    settingsModalContent?.classList.remove('mobile-view', 'show-list', 'show-detail');
    settingsModalHeader?.classList.remove('mobile-view', 'show-back-button');
}


// --- Funções das Sub-Seções ---

// Orçamentos
// *** Modificado: renderBudgetInputs aplica a máscara e saveBudgets usa getUnmaskedValue ***
export function renderBudgetInputs() {
    if (!budgetCategoriesListEl) return;
    budgetCategoriesListEl.innerHTML = '';
    if (categories.expense.length === 0) {
        budgetCategoriesListEl.innerHTML = '<p class="placeholder">Sem categorias de despesa cadastradas.</p>';
        return;
    }
    categories.expense.forEach(cat => {
        const budgetValue = budgets[cat] || '';
        const inputId = `budget-${normalizeText(cat)}`;
        budgetCategoriesListEl.innerHTML += `
            <div class="budget-input-item">
                <label for="${inputId}">${cat}</label>
                <input type="text" inputmode="decimal" id="${inputId}" class="budget-input" placeholder="R$ 0,00" value="${budgetValue}" data-category="${cat}">
            </div>`;
    });
    // Aplica máscara a todos os inputs recém-criados
    budgetCategoriesListEl.querySelectorAll('.budget-input').forEach(input => {
        applyCurrencyMask(input, true); // Formata valor inicial
    });
}
export function saveBudgets(event) {
    event.preventDefault();
    if (!budgetCategoriesListEl || !budgetFeedbackEl) return;
    const inputs = budgetCategoriesListEl.querySelectorAll('.budget-input');
    let newBudgets = {};
    let hasInvalidInput = false;

    inputs.forEach(input => {
        const category = input.dataset.category;
        // *** USA getUnmaskedValue ***
        const value = getUnmaskedValue(input);

        // Permite salvar 0 ou vazio para REMOVER o orçamento
        if (!isNaN(value) && value > 0) {
            newBudgets[category] = value;
        } else if (input.value.trim() !== '' && (isNaN(value) || value < 0)) {
            // Se o campo não está vazio mas o valor é inválido (NaN ou negativo)
             console.warn(`Valor inválido para ${category}: ${input.value}`);
             hasInvalidInput = true;
             // Poderia adicionar uma classe de erro ao input aqui
             // input.classList.add('input-error');
        }
         // Se value for NaN e o input estiver vazio, apenas ignora (remove o orçamento)
         // Se value for 0, ignora (remove o orçamento)
    });

     if (hasInvalidInput) {
        showFeedback('Alguns valores são inválidos e não foram salvos.', 'error', budgetFeedbackEl);
        // Não prossegue com o salvamento se houver erros
        // return; // Ou podemos salvar apenas os válidos como está agora
    }

    // Atualiza o objeto budgets global
    Object.keys(budgets).forEach(key => {
        if (!newBudgets.hasOwnProperty(key)) {
            delete budgets[key]; // Remove orçamentos não presentes nos inputs válidos
        }
    });
    Object.assign(budgets, newBudgets); // Adiciona/atualiza os válidos

    saveData(); // Salva tudo
    renderMainBudgets(budgets, transactions); // Atualiza UI principal
    showFeedback('Orçamentos salvos com sucesso!', 'success', budgetFeedbackEl);
}


// Categorias (mantida)
export function renderCategoryLists() { if (!incomeCategoryListEl || !expenseCategoryListEl) return; incomeCategoryListEl.innerHTML = ''; expenseCategoryListEl.innerHTML = ''; const defaultIncome = ['Salário', 'Renda Extra', 'Investimentos']; const defaultExpense = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Pets', 'Outros']; const createLI = (cat, type, defaults) => `<li><span>${cat}</span><button class="delete-category-btn" data-name="${cat}" data-type="${type}" ${defaults.includes(cat) ? 'disabled title="Padrão"' : ''}><i class="fas fa-trash-alt"></i></button></li>`; categories.income.forEach(cat => incomeCategoryListEl.innerHTML += createLI(cat, 'income', defaultIncome)); categories.expense.forEach(cat => expenseCategoryListEl.innerHTML += createLI(cat, 'expense', defaultExpense)); }
export function addCategory() { if (!newCategoryNameInput || !newCategoryTypeSelect || !budgetFeedbackEl) return; const name = newCategoryNameInput.value.trim(); const type = newCategoryTypeSelect.value; if (!name) { showFeedback('Insira um nome.', 'error', budgetFeedbackEl); return; } if (addCategoryData(name, type)) { saveData(); populateAllCategorySelects(categories); renderCategoryLists(); renderBudgetInputs(); /* Re-renderiza orçamentos pois categorias mudaram */ newCategoryNameInput.value = ''; showFeedback(`Categoria "${name}" adicionada.`, 'success', budgetFeedbackEl); } else { showFeedback(`"${name}" já existe ou tipo inválido.`, 'error', budgetFeedbackEl); } }
export function deleteCategory(name, type) { const defaultCategories = { income: ['Salário', 'Renda Extra', 'Investimentos'], expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Pets', 'Outros'] }; if (defaultCategories[type]?.includes(name)) { showFeedback('Não pode remover categoria padrão.', 'error', budgetFeedbackEl); return; } if (!confirm(`Remover "${name}"? Lançamentos associados terão a categoria removida${type === 'expense' ? ' e orçamentos/recorrências serão afetados' : ''}.`)) return; const categoryDeleted = deleteCategoryData(name, type); if (categoryDeleted) { if (type === 'expense') { delete budgets[name]; recurringTransactions = recurringTransactions.filter(r => !(r.type === 'expense' && r.category === name)); } transactions = transactions.map(t => (t.type === type && t.category === name) ? { ...t, category: '' } : t); saveData(); populateAllCategorySelects(categories); renderCategoryLists(); renderBudgetInputs(); /* Re-renderiza orçamentos */ renderRecurringManagement(); checkAndRenderPendingRecurring(); renderAllMainUI(); showFeedback(`Categoria "${name}" removida.`, 'success', budgetFeedbackEl); } }

// Tags (mantida)
export function renderTagManagementList() { if (!tagManagementListEl) { console.error("Elemento tagManagementListEl não encontrado!"); return; } tagManagementListEl.innerHTML = ''; if (tags.length === 0) { tagManagementListEl.innerHTML = '<li class="placeholder">Nenhuma tag cadastrada.</li>'; return; } tags.sort((a, b) => normalizeText(a).localeCompare(normalizeText(b))); tags.forEach(tag => { const li = document.createElement('li'); li.className = 'tag-list-item'; li.innerHTML = ` <span>${tag}</span> <button class="delete-tag-btn" data-tag-name="${tag}" aria-label="Excluir tag ${tag}"> <i class="fas fa-trash-alt"></i> </button> `; tagManagementListEl.appendChild(li); }); }
export function addTag() {
    if (!newTagNameInput || !tagFeedbackEl) { return; }
    const tagName = newTagNameInput.value.trim();
    if (!tagName) {
        showFeedback('Por favor, insira um nome para a tag.', 'error', tagFeedbackEl);
        return;
    }
    if (addTagData(tagName)) {
        saveData();
        renderTagManagementList();
        updateTagifyWhitelists();
        newTagNameInput.value = '';
        showFeedback(`Tag "${tagName}" adicionada!`, 'success', tagFeedbackEl);
    } else {
        showFeedback(`A tag "${tagName}" já existe.`, 'error', tagFeedbackEl);
    }
}
export function deleteTag(tagName) {
    if (!tagFeedbackEl) return;
    if (!confirm(`Tem certeza que deseja excluir a tag "${tagName}"? Ela será removida de todas as transações associadas.`)) return false;
    const deleted = deleteTagData(tagName); // Já chama saveData se necessário
    if (deleted) {
        // saveData já foi chamado em deleteTagData se necessário
        renderTagManagementList();
        renderAllMainUI(); // Atualiza extrato
        showFeedback(`Tag "${tagName}" excluída!`, 'success', tagFeedbackEl);
        return true;
    } else {
        showFeedback(`Tag "${tagName}" não encontrada para exclusão.`, 'error', tagFeedbackEl);
        return false;
    }
}

// Metas
// *** Modificado: renderGoalsManagement aplica máscara, addGoal e addSavedAmountToGoal usam getUnmaskedValue ***
export function renderGoalsManagement() {
    if (!goalManagementListEl) return;
    goalManagementListEl.innerHTML = '';
    if (goals.length === 0) {
        goalManagementListEl.innerHTML = '<li class="placeholder">Nenhuma meta cadastrada.</li>';
        return;
    }
    goals.forEach(goal => {
        const li = document.createElement('li');
        li.dataset.id = goal.id;
        li.innerHTML = `
            <div class="goal-info">
                <span class="goal-name">${goal.name}</span>
                <span class="goal-target">Alvo: ${formatCurrency(goal.targetAmount)}</span>
                <span class="goal-saved">Salvo: <span>${formatCurrency(goal.savedAmount || 0)}</span></span>
            </div>
            <div class="goal-add-progress">
                <input type="text" inputmode="decimal" class="add-goal-amount-input" placeholder="Add Valor" aria-label="Valor a adicionar para ${goal.name}">
                <button type="button" class="btn btn-income btn-sm add-goal-amount-btn" aria-label="Adicionar valor para ${goal.name}"><i class="fas fa-plus"></i></button>
            </div>
            <button class="delete-goal-btn" aria-label="Excluir meta ${goal.name}">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        goalManagementListEl.appendChild(li);
        // Aplica máscara ao input recém-criado
        const inputEl = li.querySelector('.add-goal-amount-input');
        if (inputEl) { applyCurrencyMask(inputEl); }
    });
}
export function addGoal(event) {
    if (!goalNameInput || !goalTargetAmountInput || !addGoalForm || !goalFeedbackEl) return;
    event.preventDefault();
    const name = goalNameInput.value.trim();
    // *** USA getUnmaskedValue ***
    const targetAmount = getUnmaskedValue(goalTargetAmountInput);

    // *** Validação usa valor numérico ***
    if (!name || isNaN(targetAmount) || targetAmount <= 0) {
        showFeedback(isNaN(targetAmount) || targetAmount <= 0 ? 'Insira um valor alvo válido.' : 'Preencha o nome da meta.', 'error', goalFeedbackEl);
        return;
    }
    const newGoal = { id: Date.now(), name: name, targetAmount: targetAmount, savedAmount: 0, createdAt: new Date().toISOString() };
    goals.push(newGoal);
    goals.sort((a, b) => a.name.localeCompare(b.name));
    saveData();
    renderGoalsManagement();
    renderMainGoals(goals);
    addGoalForm.reset();
    // Limpa valor mascarado
    if (goalTargetAmountInput.imaskInstance) { goalTargetAmountInput.imaskInstance.value = ''; }
    showFeedback(`Meta "${name}" adicionada!`, 'success', goalFeedbackEl);
}
// *** Modificado: addSavedAmountToGoal recebe inputElement e usa getUnmaskedValue ***
export function addSavedAmountToGoal(goalId, inputElement) {
    if (!goalFeedbackEl || !inputElement) return;
    // *** USA getUnmaskedValue ***
    const amountToAdd = getUnmaskedValue(inputElement);

    // *** Validação usa valor numérico ***
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
        showFeedback('Insira um valor positivo válido.', 'error', goalFeedbackEl);
        if (inputElement.imaskInstance) inputElement.imaskInstance.value = ''; // Limpa input inválido
        return;
    }
    const goalIndex = goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) { showFeedback('Meta não encontrada.', 'error', goalFeedbackEl); return; }
    goals[goalIndex].savedAmount = (goals[goalIndex].savedAmount || 0) + amountToAdd;
    saveData();
    renderGoalsManagement(); // Re-renderiza a lista (reaplicando máscaras)
    renderMainGoals(goals); // Atualiza display principal
    // Input já é limpo indiretamente pelo re-render de renderGoalsManagement
    // if (inputElement.imaskInstance) inputElement.imaskInstance.value = '';
    showFeedback(`Valor adicionado à meta "${goals[goalIndex].name}"!`, 'success', goalFeedbackEl);
}
export function deleteGoal(id) { if (!goalFeedbackEl) return; const goalIndex = goals.findIndex(g => g.id === id); if (goalIndex === -1) return; const goalName = goals[goalIndex].name; if (!confirm(`Excluir meta "${goalName}"?`)) return; goals.splice(goalIndex, 1); saveData(); renderGoalsManagement(); renderMainGoals(goals); showFeedback(`Meta "${goalName}" excluída.`, 'success', goalFeedbackEl); }


// Recorrências
// populateSettingsRecurringCategories (mantida)
export function populateSettingsRecurringCategories(targetSelect = recurringCategorySelect, type = recurringTypeSelect?.value) {
    try { if (!targetSelect || !type) { return; } const list = categories[type] || []; const currentValue = targetSelect.value; targetSelect.innerHTML = `<option value="" disabled ${!currentValue ? 'selected' : ''}>Selecione...</option>`; if (type === 'income') { targetSelect.innerHTML += `<option value="">Sem categoria</option>`; } list.sort((a, b) => a.localeCompare(b)).forEach(cat => { const selected = cat === currentValue ? 'selected' : ''; targetSelect.innerHTML += `<option value="${cat}" ${selected}>${cat}</option>`; }); } catch (e) { console.error("Erro em populateSettingsRecurringCategories:", e); }
}
// renderRecurringManagement (mantida)
export function renderRecurringManagement() { if (!recurringManagementListEl) return; recurringManagementListEl.innerHTML = ''; if (recurringTransactions.length === 0) { recurringManagementListEl.innerHTML = '<li class="placeholder">Nenhuma recorrência.</li>'; return; } recurringTransactions.sort((a, b) => a.dayOfMonth - b.dayOfMonth || a.description.localeCompare(b.description)); recurringTransactions.forEach(rec => { const li = document.createElement('li'); li.dataset.id = rec.id; const typeTxt = rec.type === 'income' ? 'Entrada' : 'Saída'; const catTxt = rec.category || 'N/A'; li.innerHTML = ` <div class="info"> <span class="name ${rec.type}">${rec.description}</span> <span class="details"> Tipo: ${typeTxt} | Dia: ${rec.dayOfMonth} | Valor: <span class="value">${formatCurrency(rec.amount)}</span> | Cat: ${catTxt} </span> </div> <div class="actions"> <button class="edit-recurring-btn" aria-label="Editar recorrência ${rec.description}"><i class="fas fa-pencil-alt"></i></button> <button class="delete-recurring-btn" aria-label="Excluir recorrência ${rec.description}"><i class="fas fa-trash-alt"></i></button> </div> `; recurringManagementListEl.appendChild(li); }); }
// *** Modificado: addRecurringTransaction usa getUnmaskedValue ***
export function addRecurringTransaction(event) {
    if (!recurringTypeSelect || !recurringSettingsFeedbackEl || !addRecurringForm || !recurringAmountInput) return;
    event.preventDefault();
    const type = recurringTypeSelect.value;
    const dayOfMonth = parseInt(recurringDayInput.value);
    const description = recurringDescriptionInput.value.trim();
    // *** USA getUnmaskedValue ***
    const amount = getUnmaskedValue(recurringAmountInput);
    const category = recurringCategorySelect.value;

    // *** Validação usa valor numérico ***
    if (!type || !description || isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31 || isNaN(amount) || amount <= 0 || (type === 'expense' && !category)) {
         alert(isNaN(amount) || amount <= 0 ? 'Insira um valor padrão válido.' : 'Preencha todos os campos corretamente.');
        return;
    }
    const newRecurring = { id: Date.now(), type, dayOfMonth, description, amount, category, lastAddedMonthYear: null };
    recurringTransactions.push(newRecurring);
    saveData();
    renderRecurringManagement();
    addRecurringForm.reset();
    populateSettingsRecurringCategories(); // Reseta select de categoria
    // Limpa valor mascarado
     if (recurringAmountInput.imaskInstance) { recurringAmountInput.imaskInstance.value = ''; }
    checkAndRenderPendingRecurring();
    showFeedback('Recorrência adicionada!', 'success', recurringSettingsFeedbackEl);
}
// deleteRecurringTransaction (mantida)
export function deleteRecurringTransaction(id) { if (!recurringSettingsFeedbackEl) return; const recIndex = recurringTransactions.findIndex(r => r.id === id); if (recIndex === -1) return; const recDesc = recurringTransactions[recIndex].description; if (!confirm(`Excluir recorrência "${recDesc}"?`)) return; recurringTransactions.splice(recIndex, 1); saveData(); renderRecurringManagement(); checkAndRenderPendingRecurring(); showFeedback(`Recorrência "${recDesc}" excluída.`, 'success', recurringSettingsFeedbackEl); }

// Exportar (mantida)
export function exportToCSV() { try{ if(transactions.length===0){showFeedback('Sem transações.', 'error', 'tag-feedback'); return} const h=['ID','Tipo','Data','Valor','Categoria','Tags','Desc/Fonte']; const sT=[...transactions].sort((a,b)=>a.date.localeCompare(b.date)); const r=[h.join(','), ...sT.map(t=>[t.id,t.type==='income'?'Entrada':'Saída',formatDate(t.date),t.amount.toFixed(2).replace('.',','),t.category||'', `"${(t.tags || []).join('; ')}"`, `"${(t.type==='income'?t.source:t.description).replace(/"/g,'""')}"`].join(','))]; const b=new Blob(['\uFEFF'+r.join('\n')],{type:'text/csv;charset=utf-8;'}); const u=URL.createObjectURL(b); const l=document.createElement('a'); l.href=u; l.download=`financas_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(l); l.click(); document.body.removeChild(l); URL.revokeObjectURL(u); } catch(e) { console.error("Erro em exportToCSV:", e); showFeedback('Erro ao exportar CSV.', 'error', 'tag-feedback');} }