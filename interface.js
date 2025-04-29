// interface.js - Manipulação da UI Principal (Sidebar, Modais, Resumo, Extrato, Forms Rápidos)

import { formatCurrency, formatDate, normalizeText, showFeedback, formatDateForInput } from './helpers.js';
// Importa APENAS os dados necessários
import { transactions, categories, tags, budgets, goals } from './data.js';
// Funções de gráfico não são chamadas aqui

// --- Seletores DOM (UI Principal) ---
const body = document.body;
const sidebar = document.getElementById('sidebar');
const sidebarToggleDesktopBtn = document.getElementById('sidebar-toggle-desktop-btn');
const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const mobileOverlay = document.getElementById('mobile-overlay');
const openSettingsModalBtn = document.getElementById('open-settings-modal-btn');
// Seletores do header dashboard (novos)
const headerMonthlyIncomeEl = document.getElementById('header-monthly-income');
const headerMonthlyExpensesEl = document.getElementById('header-monthly-expenses');
// Outros seletores da UI
const transactionListEl = document.getElementById('transaction-list');
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');
const filterShortcutsContainer = document.querySelector('.filter-shortcuts');
const filterCategoryEl = document.getElementById('filter-category');
const searchInput = document.getElementById('search-input');
// Seletores para selects de categoria nos modais (se ainda usados lá)
// Verificar se 'income-category' e 'expense-category' são realmente usados fora dos modais
// Se não, podem ser removidos daqui. Por ora, mantidos para compatibilidade.
const incomeCategorySelect = document.getElementById('income-category');
const expenseCategorySelect = document.getElementById('expense-category');
// Seções principais
const budgetSectionList = document.getElementById('budget-list');
const goalListDisplayEl = document.getElementById('goal-list-display');
// Feedback Global
const feedbackMessageEl = document.getElementById('feedback-message');


// --- Funções da UI Principal ---

// Controle da Sidebar Desktop
export function updateDesktopSidebarState(collapse) {
    const iconElement = sidebarToggleDesktopBtn?.querySelector('i');
    if (!iconElement) return;
    body.classList.toggle('desktop-sidebar-collapsed', collapse);
    body.classList.toggle('sidebar-expanded', !collapse);
    if (sidebarToggleDesktopBtn) {
        sidebarToggleDesktopBtn.setAttribute('aria-label', collapse ? 'Expandir menu' : 'Recolher menu');
    }
    // Dispara evento para gráficos ou outros componentes ajustarem o tamanho
    window.dispatchEvent(new CustomEvent('sidebarToggled'));
}
export function toggleDesktopSidebar() {
    updateDesktopSidebarState(!body.classList.contains('desktop-sidebar-collapsed'));
}

// Controle da Sidebar Mobile
export function openMobileSidebar() {
    body.classList.add('mobile-sidebar-open', 'overflow-hidden');
}
export function closeMobileSidebar() {
    body.classList.remove('mobile-sidebar-open', 'overflow-hidden');
}

// Controle genérico de Modais
export function openModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.add('active');
    // Adiciona classe ao body apenas se nenhum outro modal estiver aberto
    if (!document.querySelector('.modal.active:not(#' + modalElement.id + ')')) {
        body.classList.add('modal-open');
    }
}
export function closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('active');
    // Remove classe do body apenas se não houver mais nenhum modal ativo
    if (!document.querySelector('.modal.active')) {
        body.classList.remove('modal-open');
    }
}

// Renderização do Resumo Financeiro (Atualizada para header)
export function renderSummary() {
    // console.log("[renderSummary] Rendering header summary...");
    try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        const monthlyIncome = transactions.filter(t => t.type === 'income' && t.date.slice(0, 7) === currentMonthStr).reduce((sum, t) => sum + t.amount, 0);
        const monthlyExpenses = transactions.filter(t => t.type === 'expense' && t.date.slice(0, 7) === currentMonthStr).reduce((sum, t) => sum + t.amount, 0);

        // Atualiza elementos no NOVO header
        if (headerMonthlyIncomeEl) {
            headerMonthlyIncomeEl.textContent = formatCurrency(monthlyIncome);
        } else {
            // console.warn("Elemento #header-monthly-income não encontrado para renderSummary");
        }

        if (headerMonthlyExpensesEl) {
            headerMonthlyExpensesEl.textContent = formatCurrency(monthlyExpenses);
        } else {
            // console.warn("Elemento #header-monthly-expenses não encontrado para renderSummary");
        }

        // O saldo atual não está mais visível por padrão no header, mas a lógica pode ser mantida se necessário
        // const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        // const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        // const currentBalance = totalIncome - totalExpenses;

    } catch (e) { console.error("Erro em renderSummary:", e); }
}

// Renderização da Lista de Transações (Extrato)
export function renderTransactions() {
     // console.log("[renderTransactions] Rendering transaction list...");
    try {
        if (!transactionListEl) { console.error("Elemento #transaction-list não encontrado."); return; }
        transactionListEl.innerHTML = '';
        const startDate = filterStartDateInput?.value;
        const endDate = filterEndDateInput?.value;
        const selectedCategory = filterCategoryEl?.value || 'all';
        const normalizedSearch = normalizeText(searchInput?.value?.trim() || '');

        const filteredTransactions = transactions.filter(t => {
            const transactionDate = t.date;
            const periodMatch = (!startDate || transactionDate >= startDate) && (!endDate || transactionDate <= endDate);
            const categoryMatch = selectedCategory === 'all' || t.category === selectedCategory;
            const text = t.type === 'income' ? t.source : t.description;
            const normalizedText = normalizeText(text);
            const tagText = (t.tags || []).join(' ');
            const normalizedTagText = normalizeText(tagText);
            const searchMatch = normalizedSearch === '' || normalizedText.includes(normalizedSearch) || normalizedTagText.includes(normalizedSearch);
            return periodMatch && categoryMatch && searchMatch;
        });

        filteredTransactions.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

        if (filteredTransactions.length === 0) {
            const message = (startDate || endDate || selectedCategory !== 'all' || normalizedSearch !== '') ? 'Nenhuma transação encontrada para os filtros aplicados.' : 'Nenhuma transação encontrada.';
            transactionListEl.innerHTML = `<li class="transaction-item placeholder">${message}</li>`;
        } else {
            filteredTransactions.forEach(t => addTransactionItemToDOM(t));
        }
    } catch (e) { console.error("Erro em renderTransactions:", e); if (transactionListEl) transactionListEl.innerHTML = `<li class="transaction-item placeholder error">Erro ao carregar transações.</li>`; }
}

// Função auxiliar para criar item de transação no DOM
function addTransactionItemToDOM(transaction) {
    if (!transactionListEl) return;
    const li = document.createElement('li');
    li.className = `transaction-item ${transaction.type}`;
    li.dataset.id = transaction.id;
    const formattedDate = formatDate(transaction.date);
    const descriptionOrSource = transaction.type === 'income' ? transaction.source : transaction.description;
    const categoryText = transaction.category || (transaction.type === 'income' ? 'Sem categoria' : 'Sem categoria');
    li.innerHTML = ` <span class="t-description" data-date="${formattedDate}">${descriptionOrSource}</span> <span class="t-date">${formattedDate}</span> <span class="t-amount">${formatCurrency(transaction.amount)}</span> <span class="t-category">${categoryText}</span> <div class="transaction-actions"> <button class="edit-btn" aria-label="Editar transação ${descriptionOrSource}"> <i class="fas fa-pencil-alt"></i> </button> <button class="delete-btn" aria-label="Excluir transação ${descriptionOrSource}"> <i class="fas fa-trash-alt"></i> </button> </div> `;
    if (transaction.tags && transaction.tags.length > 0) {
        const tagsContainer = document.createElement('div'); tagsContainer.className = 'tags-container';
        transaction.tags.forEach(tag => { const tagPill = document.createElement('span'); tagPill.className = 'tag-pill'; tagPill.textContent = tag; tagsContainer.appendChild(tagPill); });
        const actionsDiv = li.querySelector('.transaction-actions'); li.insertBefore(tagsContainer, actionsDiv);
    }
    transactionListEl.appendChild(li);
}

// Popula Selects de Categoria (Filtro e Modais - verificar necessidade dos modais aqui)
export function populateCategorySelects(categoriesData) {
    // console.log("[populateCategorySelects] Populating selects...");
    try {
        // Filtro Principal
        if (filterCategoryEl) {
            const currentFilterValue = filterCategoryEl.value; filterCategoryEl.innerHTML = '<option value="all">Todas as Categorias</option>';
            const incomeCats = [...(categoriesData?.income || [])].sort((a, b) => a.localeCompare(b));
            const expenseCats = [...(categoriesData?.expense || [])].sort((a, b) => a.localeCompare(b));
            if (incomeCats.length > 0) { filterCategoryEl.innerHTML += `<optgroup label="Receitas">`; incomeCats.forEach(cat => filterCategoryEl.innerHTML += `<option value="${cat}">${cat}</option>`); filterCategoryEl.innerHTML += `</optgroup>`; }
            if (expenseCats.length > 0) { filterCategoryEl.innerHTML += `<optgroup label="Despesas">`; expenseCats.forEach(cat => filterCategoryEl.innerHTML += `<option value="${cat}">${cat}</option>`); filterCategoryEl.innerHTML += `</optgroup>`; }
            filterCategoryEl.value = (incomeCats.includes(currentFilterValue) || expenseCats.includes(currentFilterValue)) ? currentFilterValue : 'all';
        }

        // Popula selects dos MODAIS (Registro Rápido, Edição, Config Recorrência)
        // A lógica específica para cada modal (required, placeholder) é melhor tratada
        // nos módulos correspondentes (main.js, edits.js, settings.js) ao abrir/configurar o modal.
        // Esta função pode fornecer as opções base, mas os módulos específicos ajustam.

        // Exemplo genérico (a lógica real está nos outros módulos):
        const populateSelect = (selectElement, type, includeNoCategoryOption, placeholderText) => {
            if (!selectElement) return;
            const list = categoriesData[type] || [];
            selectElement.innerHTML = ''; // Limpa

            if (placeholderText) {
                selectElement.innerHTML += `<option value="" disabled selected>${placeholderText}</option>`;
            }
            if (includeNoCategoryOption) {
                 selectElement.innerHTML += `<option value="">Sem categoria</option>`;
            }

            list.sort((a, b) => a.localeCompare(b)).forEach(cat => {
                selectElement.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
        };

        // Chamadas hipotéticas (a lógica real está em outros lugares)
        // populateSelect(quickAddCategorySelectIncome, 'income', true, null);
        // populateSelect(quickAddCategorySelectExpense, 'expense', false, 'Selecione...');
        // populateSelect(editCategorySelectIncome, 'income', true, null);
        // etc...

    } catch (e) { console.error("Erro em populateCategorySelects:", e); }
}

// Renderização da Seção de Orçamentos
export function renderBudgetsSection(budgetsData, transactionsData) {
    // console.log("[renderBudgetsSection] Rendering...");
    try {
        if (!budgetSectionList) { console.error("Elemento #budget-list não encontrado."); return;}
        budgetSectionList.innerHTML = ''; const activeBudgets = budgetsData || {};
        const categoriesWithBudgets = Object.keys(activeBudgets).sort((a, b) => a.localeCompare(b));
        if (categoriesWithBudgets.length === 0) { budgetSectionList.innerHTML = '<p class="placeholder">Defina orçamentos em Configurações.</p>'; return; }
        const now = new Date(); const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthlySpending = transactionsData.reduce((acc, t) => { if (t.type === 'expense' && t.date.slice(0, 7) === currentMonthStr && activeBudgets[t.category]) { acc[t.category] = (acc[t.category] || 0) + t.amount; } return acc; }, {});
        categoriesWithBudgets.forEach(cat => {
            const limit = activeBudgets[cat]; const spent = monthlySpending[cat] || 0; const percentage = (spent / limit) * 100; const progressBarWidth = Math.min(percentage, 100); let progressClass = 'good'; if (percentage > 100) progressClass = 'over'; else if (percentage > 80) progressClass = 'warning'; const div = document.createElement('div'); div.className = 'budget-item';
            div.innerHTML = ` <div class="budget-item-header"> <h4>${cat}</h4> <span class="budget-item-values"> <span class="spent">${formatCurrency(spent)}</span> / ${formatCurrency(limit)} </span> </div> <div class="progress-bar"> <div class="progress ${progressClass}" style="width:${progressBarWidth}%;"></div> </div> ${percentage > 100 ? '<small class="expense" style="display:block;text-align:right;margin-top:3px;">Limite Excedido!</small>' : ''} `; budgetSectionList.appendChild(div);
        });
    } catch (e) { console.error("Erro em renderBudgetsSection:", e); if(budgetSectionList) budgetSectionList.innerHTML = '<p class="placeholder error">Erro ao carregar orçamentos.</p>';}
}

// Renderização da Seção de Metas
export function renderGoalsSection(goalsData) {
     // console.log("[renderGoalsSection] Rendering...");
    try {
        if (!goalListDisplayEl) { console.error("Elemento #goal-list-display não encontrado."); return; }
        goalListDisplayEl.innerHTML = ''; if (!goalsData || goalsData.length === 0) { goalListDisplayEl.innerHTML = '<p class="placeholder">Crie metas nas Configurações.</p>'; return; }
        let hasValidGoals = false;
        goalsData.forEach(goal => {
             const saved = goal.savedAmount || 0; const target = goal.targetAmount; if (target <= 0) return; hasValidGoals = true; const percentage = (saved / target) * 100; const progressBarWidth = Math.min(percentage, 100); const div = document.createElement('div'); div.className = 'goal-item-display';
             div.innerHTML = ` <div class="goal-header"> <h4>${goal.name}</h4> <span class="goal-percentage">${percentage.toFixed(1)}%</span> </div> <div class="goal-values"> <span class="saved">${formatCurrency(saved)}</span> / ${formatCurrency(target)} </div> <div class="progress-bar"> <div class="progress" style="width: ${progressBarWidth}%;"></div> </div> `; goalListDisplayEl.appendChild(div);
         });
         if (!hasValidGoals && goalListDisplayEl) { goalListDisplayEl.innerHTML = '<p class="placeholder">Nenhuma meta válida para exibir.</p>'; }
    } catch (e) { console.error("Erro em renderGoalsSection:", e); if(goalListDisplayEl) goalListDisplayEl.innerHTML = '<p class="placeholder error">Erro ao carregar metas.</p>';}
}

// --- Função de Renderização Principal da UI ---
export function renderAllMainUI() {
    console.log("[renderAllMainUI - interface.js] Renderizando UI principal...");
    try {
        renderSummary();
        // populateCategorySelects(categories); // Popula APENAS o filtro principal agora
         if (filterCategoryEl) {
            const currentFilterValue = filterCategoryEl.value; filterCategoryEl.innerHTML = '<option value="all">Todas as Categorias</option>';
            const incomeCats = [...(categories?.income || [])].sort((a, b) => a.localeCompare(b));
            const expenseCats = [...(categories?.expense || [])].sort((a, b) => a.localeCompare(b));
            if (incomeCats.length > 0) { filterCategoryEl.innerHTML += `<optgroup label="Receitas">`; incomeCats.forEach(cat => filterCategoryEl.innerHTML += `<option value="${cat}">${cat}</option>`); filterCategoryEl.innerHTML += `</optgroup>`; }
            if (expenseCats.length > 0) { filterCategoryEl.innerHTML += `<optgroup label="Despesas">`; expenseCats.forEach(cat => filterCategoryEl.innerHTML += `<option value="${cat}">${cat}</option>`); filterCategoryEl.innerHTML += `</optgroup>`; }
            filterCategoryEl.value = (incomeCats.includes(currentFilterValue) || expenseCats.includes(currentFilterValue)) ? currentFilterValue : 'all';
        }

        renderTransactions();
        renderBudgetsSection(budgets, transactions);
        renderGoalsSection(goals);
        // Gráficos são atualizados via evento 'transactionsUpdated' em main.js
        console.log("[renderAllMainUI - interface.js] Renderização da UI principal concluída.");
    } catch (e) { console.error("Erro durante renderAllMainUI:", e); }
}

// Função para lidar com cliques nos atalhos de data
export function handleShortcutClick(period) {
    const today = new Date(); let startDate, endDate;
    const year = today.getUTCFullYear(); const month = today.getUTCMonth();
    switch (period) {
        case 'current-month': startDate = new Date(Date.UTC(year, month, 1)); endDate = new Date(Date.UTC(year, month + 1, 0)); break;
        case 'last-month': startDate = new Date(Date.UTC(year, month - 1, 1)); endDate = new Date(Date.UTC(year, month, 0)); break;
        case 'all': default: startDate = null; endDate = null; break;
    }
    const startStr = startDate ? formatDateForInput(startDate) : ''; const endStr = endDate ? formatDateForInput(endDate) : '';
    if(filterStartDateInput) filterStartDateInput.value = startStr;
    if(filterEndDateInput) filterEndDateInput.value = endStr;
    renderTransactions(); // Re-renderiza a lista com o novo período
}