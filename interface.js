// interface.js - Manipulação da UI Principal

import {
    formatCurrency, formatDate, normalizeText, showFeedback,
    formatDateForInput, formatMonthYear as formatMonthYearHelper
} from './helpers.js';
// Importa dados necessários
import {
    transactions, categories, tags, budgets, goals, recurringTransactions
} from './data.js';
// *** IMPORTAR openEditModal de edits.js ***
import { openEditModal } from './edits.js';

// --- Seletores DOM (UI Principal) ---
const body = document.body;
const sidebar = document.getElementById('sidebar');
const sidebarToggleDesktopBtn = document.getElementById('sidebar-toggle-desktop-btn');
const mobileMenuToggleBtn = document.getElementById('mobile-menu-toggle-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const mobileOverlay = document.getElementById('mobile-overlay');
const openSettingsModalBtn = document.getElementById('open-settings-modal-btn');
const headerSaldoAtualEl = document.getElementById('header-saldo-atual');
const headerEntradasMesEl = document.getElementById('header-entradas-mes');
const headerSaidasMesEl = document.getElementById('header-saidas-mes');
const headerFuturosMesEl = document.getElementById('header-futuros-mes');
const transactionListEl = document.getElementById('transaction-list');
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');
const filterShortcutsContainer = document.querySelector('.filter-shortcuts');
const filterCategoryEl = document.getElementById('filter-category');
const searchInput = document.getElementById('search-input');
const budgetSectionList = document.getElementById('budget-list');
const goalListDisplayEl = document.getElementById('goal-list-display');

// --- Estado Local ---
let tippyInstances = []; // Armazena instâncias do Tippy

// --- Funções da UI Principal ---

// Controle da Sidebar, Modais Genéricos
export function updateDesktopSidebarState(collapse) {
    const iconElement = sidebarToggleDesktopBtn?.querySelector('i');
    if (!iconElement) return;
    body.classList.toggle('desktop-sidebar-collapsed', collapse);
    body.classList.toggle('sidebar-expanded', !collapse);
    if (sidebarToggleDesktopBtn) {
        sidebarToggleDesktopBtn.setAttribute('aria-label', collapse ? 'Expandir menu' : 'Recolher menu');
    }
    window.dispatchEvent(new CustomEvent('sidebarToggled'));
}
export function toggleDesktopSidebar() {
    updateDesktopSidebarState(!body.classList.contains('desktop-sidebar-collapsed'));
}
export function openMobileSidebar() {
    body.classList.add('mobile-sidebar-open', 'overflow-hidden');
}
export function closeMobileSidebar() {
    body.classList.remove('mobile-sidebar-open', 'overflow-hidden');
}
export function openModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.add('active');
    // Só adiciona a classe no body se *nenhum outro* modal estiver ativo
    if (!document.querySelector('.modal.active:not(#' + modalElement.id + ')')) {
        body.classList.add('modal-open');
    }
}
export function closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('active');
    // Só remove a classe do body se *nenhum* modal estiver ativo
    if (!document.querySelector('.modal.active')) {
        body.classList.remove('modal-open');
    }
}

// Renderização do Resumo Financeiro
export function renderSummary() {
    try {
        const now = new Date();
        const currentYear = now.getUTCFullYear();
        const currentMonth = now.getUTCMonth();
        const currentDay = now.getUTCDate();
        const todayStr = formatDateForInput(now);

        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
        const endOfMonthStr = formatDateForInput(lastDayOfMonth);

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = totalIncome - totalExpenses;

        const monthlyIncome = transactions
            .filter(t => t.type === 'income'
                         && t.date.slice(0, 7) === currentMonthStr
                         && t.date <= todayStr)
            .reduce((sum, t) => sum + t.amount, 0);
        const monthlyExpenses = transactions
            .filter(t => t.type === 'expense'
                         && t.date.slice(0, 7) === currentMonthStr
                         && t.date <= todayStr)
            .reduce((sum, t) => sum + t.amount, 0);

        let futureExpenses = 0;
        // Despesas futuras já lançadas neste mês
        transactions.forEach(t => {
            if (t.type === 'expense' && t.date > todayStr && t.date <= endOfMonthStr) {
                futureExpenses += t.amount;
            }
        });
        // Recorrências futuras (que ainda não foram adicionadas este mês)
        recurringTransactions.forEach(rec => {
            if (rec.type === 'expense' && rec.lastAddedMonthYear !== currentMonthStr) {
                const daysInCurrentMonth = lastDayOfMonth.getUTCDate();
                const targetDayThisMonth = Math.min(rec.dayOfMonth, daysInCurrentMonth);
                if (targetDayThisMonth > currentDay) {
                    futureExpenses += rec.amount;
                }
            }
        });

        if (headerSaldoAtualEl) {
            headerSaldoAtualEl.textContent = formatCurrency(currentBalance);
            headerSaldoAtualEl.classList.toggle('income', currentBalance >= 0);
            headerSaldoAtualEl.classList.toggle('expense', currentBalance < 0);
        }
        if (headerEntradasMesEl) {
            headerEntradasMesEl.textContent = formatCurrency(monthlyIncome);
        }
        if (headerSaidasMesEl) {
            headerSaidasMesEl.textContent = formatCurrency(monthlyExpenses);
        }
        if (headerFuturosMesEl) {
            headerFuturosMesEl.textContent = formatCurrency(futureExpenses);
        }

    } catch (e) {
        console.error("Erro em renderSummary:", e);
        // Opcional: Mostrar erro na UI se necessário
    }
}

// Renderização da Lista de Transações
export function renderTransactions() {
    console.log("[renderTransactions] Rendering transaction list...");
    destroyTooltips(); // Destrói tooltips antigos antes de recriar a lista
    try {
        if (!transactionListEl) {
            console.error("Elemento #transaction-list não encontrado.");
            return;
        }
        transactionListEl.innerHTML = ''; // Limpa a lista

        const startDate = filterStartDateInput?.value;
        const endDate = filterEndDateInput?.value;
        const selectedCategory = filterCategoryEl?.value || 'all';
        const normalizedSearch = normalizeText(searchInput?.value?.trim() || '');

        const filteredTransactions = transactions.filter(t => {
            const transactionDate = t.date;

            // Filtro de Período
            const periodMatch = (!startDate || transactionDate >= startDate) &&
                                (!endDate || transactionDate <= endDate);

            // Filtro de Categoria
            const categoryMatch = selectedCategory === 'all' || t.category === selectedCategory;

            // Filtro de Texto (Descrição/Fonte, Notas, Tags)
            const text = t.type === 'income' ? t.source : t.description;
            const normalizedText = normalizeText(text);
            const tagText = (t.tags || []).join(' ');
            const normalizedTagText = normalizeText(tagText);
            const notesText = t.notes || '';
            const normalizedNotesText = normalizeText(notesText);

            const searchMatch = normalizedSearch === '' ||
                                normalizedText.includes(normalizedSearch) ||
                                normalizedTagText.includes(normalizedSearch) ||
                                normalizedNotesText.includes(normalizedSearch);

            return periodMatch && categoryMatch && searchMatch;
        });

        // Ordena por data (mais recente primeiro), depois por ID (para consistência se mesma data)
        filteredTransactions.sort((a, b) =>
            b.date.localeCompare(a.date) ||
            (b.created_at && a.created_at ? b.created_at.localeCompare(a.created_at) : 0) || // Fallback se houver created_at
            b.id - a.id // Fallback final por ID
        );

        if (filteredTransactions.length === 0) {
            const message = (startDate || endDate || selectedCategory !== 'all' || normalizedSearch !== '')
                ? 'Nenhuma transação encontrada para os filtros aplicados.'
                : 'Nenhuma transação cadastrada ainda.';
            transactionListEl.innerHTML = `<li class="transaction-item placeholder">${message}</li>`;
        } else {
            filteredTransactions.forEach(t => addTransactionItemToDOM(t));
        }

        initializeTooltips(); // Reinicializa tooltips para os novos itens

    } catch (e) {
        console.error("Erro em renderTransactions:", e);
        if (transactionListEl) {
            transactionListEl.innerHTML = `<li class="transaction-item placeholder error">Erro ao carregar transações.</li>`;
        }
    }
}

// Função auxiliar para criar item de transação no DOM
function addTransactionItemToDOM(transaction) {
    if (!transactionListEl) return;

    const li = document.createElement('li');
    li.className = `transaction-item ${transaction.type}`;
    li.dataset.id = transaction.id;

    const formattedDate = formatDate(transaction.date);
    const descriptionOrSource = transaction.type === 'income' ? transaction.source : transaction.description;
    const categoryText = transaction.category || (transaction.type === 'income' ? '' : 'Sem categoria');

    // Gera HTML das tags se existirem
    let tagsHTML = '';
    if (transaction.tags && transaction.tags.length > 0) {
        tagsHTML = `
            <div class="tags-container">
                ${transaction.tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
            </div>
        `;
    }

    // Gera indicador de nota se existir (escapa aspas para o atributo HTML)
    let notesIndicatorHTML = '';
    if (transaction.notes) {
        const escapedNotes = (transaction.notes || '')
            .replace(/"/g, '"') // Escapa aspas duplas
            .replace(/'/g, '&#39'); // Escapa aspas simples
        notesIndicatorHTML = `
            <span class="t-notes-indicator" data-tippy-content="${escapedNotes}">
                <i class="far fa-comment-dots"></i>
            </span>
        `;
    }

    // Template Literal quebrado para legibilidade
    li.innerHTML = `
        <span class="t-description" data-date="${formattedDate}">
            ${descriptionOrSource}
            ${notesIndicatorHTML}
        </span>
        <span class="t-date">${formattedDate}</span>
        <span class="t-amount">${formatCurrency(transaction.amount)}</span>
        <span class="t-category">${categoryText}</span>
        ${tagsHTML}
        <div class="transaction-actions">
            <button class="edit-btn" aria-label="Editar transação ${descriptionOrSource}">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button class="delete-btn" aria-label="Excluir transação ${descriptionOrSource}">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    // *** ADICIONA LISTENER DE CLIQUE NA DESCRIÇÃO ***
    const descriptionSpan = li.querySelector('.t-description');
    if (descriptionSpan) {
        descriptionSpan.style.cursor = 'pointer'; // Indica que é clicável
        descriptionSpan.addEventListener('click', () => {
            openEditModal(transaction.id); // Chama a função de abrir o modal
        });
    }

    transactionListEl.appendChild(li);
}

// Inicializa Tippy.js nos indicadores de nota
export function initializeTooltips() {
    console.log("[initializeTooltips] Inicializando tooltips...");
    destroyTooltips(); // Garante que instâncias antigas sejam removidas

    const indicators = document.querySelectorAll('.t-notes-indicator[data-tippy-content]');

    if (indicators.length > 0 && typeof tippy === 'function') {
        tippyInstances = tippy(indicators, {
            allowHTML: true,        // Permite HTML simples no conteúdo (como <br>)
            placement: 'top',       // Posição preferida
            animation: 'shift-away',// Animação definida no CSS
            interactive: false,     // Tooltip não interativo
            arrow: true,            // Mostra a seta indicadora
            maxWidth: 350,          // Largura máxima
            delay: [100, 0],        // Pequeno delay para aparecer [show, hide]
            // theme: 'light',      // Descomente para usar tema claro (se definido no CSS)
        });
        console.log(`[initializeTooltips] ${tippyInstances.length} tooltips inicializados.`);
    } else if (indicators.length === 0) {
        console.log("[initializeTooltips] Nenhum indicador de nota com conteúdo encontrado.");
    } else {
        console.error("[initializeTooltips] Função tippy não encontrada. Tippy.js não carregado ou erro no CDN?");
    }
}

// Destrói instâncias Tippy existentes
export function destroyTooltips() {
    if (tippyInstances && tippyInstances.length > 0) {
        console.log(`[destroyTooltips] Destruindo ${tippyInstances.length} instâncias Tippy...`);
        tippyInstances.forEach(instance => {
            try {
                instance.destroy();
            } catch (e) {
                console.warn("Erro ao destruir instância tippy:", e);
            }
        });
        tippyInstances = []; // Limpa o array
    }
}

// Popula Selects de Categoria (Principal e Filtro)
export function populateCategorySelects(categoriesData) {
    try {
        if (filterCategoryEl) {
            const currentFilterValue = filterCategoryEl.value;
            filterCategoryEl.innerHTML = '<option value="all">Todas as Categorias</option>';

            const incomeCats = [...(categoriesData?.income || [])].sort((a, b) => a.localeCompare(b));
            const expenseCats = [...(categoriesData?.expense || [])].sort((a, b) => a.localeCompare(b));

            if (incomeCats.length > 0) {
                const incomeOptgroup = document.createElement('optgroup');
                incomeOptgroup.label = "Receitas";
                incomeCats.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    incomeOptgroup.appendChild(opt);
                });
                filterCategoryEl.appendChild(incomeOptgroup);
            }

            if (expenseCats.length > 0) {
                const expenseOptgroup = document.createElement('optgroup');
                expenseOptgroup.label = "Despesas";
                expenseCats.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    expenseOptgroup.appendChild(opt);
                });
                filterCategoryEl.appendChild(expenseOptgroup);
            }

            // Restaura seleção anterior se ainda válida, senão volta para 'Todas'
            if (incomeCats.includes(currentFilterValue) || expenseCats.includes(currentFilterValue)) {
                filterCategoryEl.value = currentFilterValue;
            } else {
                filterCategoryEl.value = 'all';
            }
        }
        // Adicionar lógica para outros selects de categoria se necessário
    } catch (e) {
        console.error("Erro em populateCategorySelects:", e);
    }
}

// Renderização da Seção de Orçamentos
export function renderBudgetsSection(budgetsData, transactionsData) {
    console.log("[renderBudgetsSection] Rendering...", { budgetsData });
    try {
        if (!budgetSectionList) {
            console.error("Elemento #budget-list não encontrado.");
            return;
        }
        budgetSectionList.innerHTML = ''; // Limpa

        const now = new Date();
        const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const categoriesWithBudgets = Object.keys(budgetsData).sort((a, b) => a.localeCompare(b));

        if (categoriesWithBudgets.length === 0) {
            budgetSectionList.innerHTML = '<p class="placeholder">Nenhum orçamento definido.</p>';
            return;
        }

        // Calcula gastos do mês atual para categorias com orçamento
        const monthlySpending = transactionsData.reduce((acc, t) => {
            if (t.type === 'expense' &&
                t.date.slice(0, 7) === currentMonthYear &&
                budgetsData[t.category]) // Apenas categorias com orçamento definido
            {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
            }
            return acc;
        }, {});

        categoriesWithBudgets.forEach(cat => {
            const limit = budgetsData[cat];
            const spent = monthlySpending[cat] || 0;
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;
            const progressBarWidth = Math.min(percentage, 100); // Limita a 100% visualmente

            let progressClass = 'good';
            if (percentage > 100) progressClass = 'over';
            else if (percentage >= 80) progressClass = 'warning';

            const div = document.createElement('div');
            div.className = 'budget-item';
            div.innerHTML = `
                <div class="budget-item-header">
                    <h4>${cat}</h4>
                    <span class="budget-item-values">
                        <span class="spent">${formatCurrency(spent)}</span> / ${formatCurrency(limit)}
                    </span>
                </div>
                <div class="progress-bar">
                    <div class="progress ${progressClass}" style="width:${progressBarWidth}%;"></div>
                </div>
                ${percentage > 100 ? '<small class="expense" style="display:block;text-align:right;margin-top:3px;">Limite Excedido!</small>' : ''}
            `;
            budgetSectionList.appendChild(div);
        });

    } catch (e) {
        console.error("Erro em renderBudgetsSection:", e);
        if (budgetSectionList) {
            budgetSectionList.innerHTML = '<p class="placeholder error">Erro ao carregar orçamentos.</p>';
        }
    }
}

// Renderização da Seção de Metas
export function renderGoalsSection(goalsData) {
    console.log("[renderGoalsSection] Rendering...", { goalsData });
    try {
        if (!goalListDisplayEl) {
            console.error("Elemento #goal-list-display não encontrado.");
            return;
        }
        goalListDisplayEl.innerHTML = ''; // Limpa

        if (!goalsData || goalsData.length === 0) {
            goalListDisplayEl.innerHTML = '<p class="placeholder">Nenhuma meta cadastrada.</p>';
            return;
        }

        let hasValidGoals = false;
        goalsData.forEach(goal => {
            const saved = goal.savedAmount || 0;
            const target = goal.targetAmount;

            // Ignora metas sem valor alvo definido ou com valor inválido
            if (target <= 0) return;
            hasValidGoals = true;

            const percentage = (saved / target) * 100;
            const progressBarWidth = Math.min(percentage, 100); // Limita a 100%

            const div = document.createElement('div');
            div.className = 'goal-item-display';
            div.innerHTML = `
                <div class="goal-header">
                    <h4>${goal.name}</h4>
                    <span class="goal-percentage">${percentage.toFixed(1)}%</span>
                </div>
                <div class="goal-values">
                    <span class="saved">${formatCurrency(saved)}</span> / ${formatCurrency(target)}
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progressBarWidth}%;"></div>
                </div>
            `;
            goalListDisplayEl.appendChild(div);
        });

        // Se havia goals no array, mas nenhum era válido para exibir
        if (!hasValidGoals && goalListDisplayEl) {
            goalListDisplayEl.innerHTML = '<p class="placeholder">Nenhuma meta válida para exibir.</p>';
        }

    } catch (e) {
        console.error("Erro em renderGoalsSection:", e);
        if (goalListDisplayEl) {
            goalListDisplayEl.innerHTML = '<p class="placeholder error">Erro ao carregar metas.</p>';
        }
    }
}

// --- Função de Renderização Principal da UI ---
export function renderAllMainUI() {
    console.log("[renderAllMainUI - interface.js] Renderizando UI principal...");
    try {
        renderSummary();
        populateCategorySelects(categories); // Popula filtros
        renderTransactions();
        renderBudgetsSection(budgets, transactions);
        renderGoalsSection(goals);
        // Outras renderizações se necessário
        console.log("[renderAllMainUI - interface.js] Renderização da UI principal concluída.");
    } catch (e) {
        console.error("Erro durante renderAllMainUI:", e);
    }
}

// Função para lidar com cliques nos atalhos de data
export function handleShortcutClick(period) {
    const today = new Date();
    let startDate, endDate;
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();

    switch (period) {
        case 'current-month':
            startDate = new Date(Date.UTC(year, month, 1));
            endDate = new Date(Date.UTC(year, month + 1, 0)); // Último dia do mês atual
            break;
        case 'last-month':
            startDate = new Date(Date.UTC(year, month - 1, 1)); // Primeiro dia do mês anterior
            endDate = new Date(Date.UTC(year, month, 0)); // Último dia do mês anterior
            break;
        case 'all':
        default:
            startDate = null;
            endDate = null;
            break;
    }

    const startStr = startDate ? formatDateForInput(startDate) : '';
    const endStr = endDate ? formatDateForInput(endDate) : '';

    if(filterStartDateInput) filterStartDateInput.value = startStr;
    if(filterEndDateInput) filterEndDateInput.value = endStr;

    // Dispara a re-renderização da lista
    renderTransactions();
}