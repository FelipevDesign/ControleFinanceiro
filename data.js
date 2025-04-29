// data.js - Gerenciamento do Estado e Persistência

import { normalizeText } from './helpers.js'; // <<< ADICIONADO IMPORT

// --- Estado da Aplicação ---
// Usamos 'let' para poder reatribuir no loadData
export let transactions = [];
export let categories = {
    income: ['Salário', 'Renda Extra', 'Investimentos'],
    expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Pets', 'Outros']
};
export let tags = []; // Inicializa array de tags vazio
export let budgets = {};
export let goals = [];
export let recurringTransactions = [];


// --- Funções de Persistência ---

// Salva todos os dados relevantes no LocalStorage
export function saveData() {
    try {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('categories', JSON.stringify(categories));
        localStorage.setItem('tags', JSON.stringify(tags)); // Salva tags
        localStorage.setItem('budgets', JSON.stringify(budgets));
        localStorage.setItem('goals', JSON.stringify(goals));
        localStorage.setItem('recurringTransactions', JSON.stringify(recurringTransactions));
        console.log("[saveData] Dados salvos no LocalStorage.");

        // *** DISPARA O EVENTO APÓS SALVAR ***
        document.dispatchEvent(new CustomEvent('transactionsUpdated', {
            detail: { transactions: [...transactions] } // Passa uma cópia para evitar mutações inesperadas
        }));
        console.log("[saveData] Evento 'transactionsUpdated' disparado.");

    } catch (e) {
        console.error("Erro ao salvar dados no LocalStorage:", e);
        // Não lança alert aqui, pois o erro de acesso pode ser comum em certos contextos (iframe, etc)
        // O erro será logado no console.
    }
}

// Carrega dados do LocalStorage ou define padrões
export function loadData() {
    try {
        const storedT = localStorage.getItem('transactions');
        const storedC = localStorage.getItem('categories');
        const storedTg = localStorage.getItem('tags'); // Carrega tags
        const storedB = localStorage.getItem('budgets');
        const storedG = localStorage.getItem('goals');
        const storedR = localStorage.getItem('recurringTransactions');

        // Carrega transações ou inicializa
        transactions = storedT ? JSON.parse(storedT) : [];
        // Garante que transações tenham a propriedade 'tags' se vierem de uma versão antiga
        transactions = transactions.map(t => ({ ...t, tags: t.tags || [] }));


        // Carrega categorias, mesclando com as padrões para garantir que existam
        const defaultCategories = {
             income: ['Salário', 'Renda Extra', 'Investimentos'],
             expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Pets', 'Outros']
        };
        const loadedC = storedC ? JSON.parse(storedC) : { income: [], expense: [] };
        categories.income = [...new Set([...defaultCategories.income, ...(loadedC.income || [])])];
        categories.expense = [...new Set([...defaultCategories.expense, ...(loadedC.expense || [])])];

        // Carrega tags ou inicializa
        tags = storedTg ? JSON.parse(storedTg) : [];

        // Carrega orçamentos, metas e recorrências
        budgets = storedB ? JSON.parse(storedB) : {};
        goals = storedG ? JSON.parse(storedG) : [];
        recurringTransactions = storedR ? JSON.parse(storedR) : [];

        console.log("[loadData] Dados carregados do LocalStorage.");

    } catch (e) {
        console.error("Erro ao carregar dados do LocalStorage:", e);
        // Não lança alert aqui, pois o erro de acesso pode ser comum
        // Define padrões seguros em caso de erro de parse
        transactions = [];
        categories = {
            income: ['Salário', 'Renda Extra', 'Investimentos'],
            expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Pets', 'Outros']
        };
        tags = [];
        budgets = {};
        goals = [];
        recurringTransactions = [];
        // Tenta salvar os padrões limpos se o storage estiver acessível
        try {
            saveData(); // Salvar vai disparar o evento, mas não tem problema na inicialização
        } catch (saveError) {
             console.error("Erro ao salvar dados padrões após falha de carregamento:", saveError);
        }
    }
}

// Funções para modificar o estado

export function addTransactionData(newTransaction) {
    transactions.push({ ...newTransaction, tags: newTransaction.tags || [] });
    // Chama saveData que dispara o evento
}

export function deleteTransactionData(id) {
     const initialLength = transactions.length;
     transactions = transactions.filter(t => t.id !== id);
     // Chama saveData que dispara o evento se algo foi deletado
     return transactions.length < initialLength;
}

export function updateTransactionData(updatedTransaction) {
     const index = transactions.findIndex(t => t.id === updatedTransaction.id);
     if (index > -1) {
         transactions[index] = { ...updatedTransaction, tags: updatedTransaction.tags || [] };
         // Chama saveData que dispara o evento
         return true;
     }
     return false;
}

// Funções de Categoria e Tag NÃO disparam 'transactionsUpdated' diretamente,
// mas podem precisar chamar saveData se a estrutura geral depender disso.
// Atualmente, elas só modificam 'categories' e 'tags' e chamam saveData.
// A exclusão de Tag chama saveData e afeta transactions, então o evento será disparado por tabela.

export function addCategoryData(name, type) {
    if (!categories[type]) return false;
     const normalizedName = normalizeText(name); // Usa normalizeText importado
     if (!categories[type].some(cat => normalizeText(cat) === normalizedName)) {
         categories[type].push(name);
         categories[type].sort((a, b) => a.localeCompare(b));
         // saveData(); // Descomentar se necessário, mas não dispara 'transactionsUpdated'
         return true;
     }
     return false;
}

export function deleteCategoryData(name, type) {
    if (!categories[type]) return false;
     const initialLength = categories[type].length;
     categories[type] = categories[type].filter(cat => cat !== name);
     // saveData(); // Descomentar se necessário
     return categories[type].length < initialLength;
}

export function addTagData(tagName) {
    const normalizedTagName = normalizeText(tagName); // Usa normalizeText importado
    if (!tags.some(existingTag => normalizeText(existingTag) === normalizedTagName)) {
        tags.push(tagName);
        tags.sort((a, b) => normalizeText(a).localeCompare(normalizeText(b)));
        // saveData(); // Descomentar se necessário
        return true;
    }
    return false;
}

export function deleteTagData(tagName) {
    const initialLength = tags.length;
    tags = tags.filter(tag => tag !== tagName);
    const tagRemovedFromList = tags.length < initialLength;

    let tagRemovedFromTransactions = false;
    transactions = transactions.map(transaction => {
        if (transaction.tags && Array.isArray(transaction.tags) && transaction.tags.includes(tagName)) {
            const updatedTags = transaction.tags.filter(t => t !== tagName);
            tagRemovedFromTransactions = true;
            // CORREÇÃO: Remover a propriedade 'tags' se o array ficar vazio
            return { ...transaction, ...(updatedTags.length > 0 ? { tags: updatedTags } : { tags: [] }) }; // Garante que 'tags' seja sempre um array ou não exista
        }
        return transaction;
    });

    // Chama saveData se algo foi removido (da lista ou das transações)
    // Isso disparará 'transactionsUpdated' se tagRemovedFromTransactions for true
    if (tagRemovedFromList || tagRemovedFromTransactions) {
        saveData();
    }

    return tagRemovedFromList || tagRemovedFromTransactions;
}