// data.js - Gerenciamento do Estado e Persistência com Supabase

import { normalizeText, formatMonthYear as formatMonthYearHelper } from './helpers.js';
import { supabase } from './supabaseClient.js';

// --- Estado da Aplicação ---
export let transactions = [];
export let categories = { income: [], expense: [] }; // Populado pelo Supabase + Padrões
export let tags = [];
export let budgets = {}; // { 'Categoria': valor }
export let goals = [];
export let recurringTransactions = [];

// Definições das categorias padrão (usadas para UI e lógica de não exclusão)
export const defaultCategories = {
    income: ['Salário', 'Renda Extra', 'Investimentos'],
    expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Pets', 'Outros']
};

// --- Funções de Persistência ---

export async function loadInitialData() {
    console.log("[loadInitialData] Iniciando carregamento de dados..."); // Log Mantido: Início da operação
    let userId = null;

    try {
        // console.log("[loadInitialData] Obtendo sessão..."); // Log Removido: Detalhe interno
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        // console.log("[loadInitialData] Resultado getSession:", { session: !!session, sessionError }); // Log Removido: Muito detalhado
        if (sessionError) throw sessionError;

        if (session?.user) {
            userId = session.user.id;
            console.log(`[loadInitialData] Usuário logado: ${userId}`); // Log Mantido: Confirmação de usuário

            const results = await Promise.allSettled([
                // --- Carregar Transações ---
                supabase.from('transactions').select(`*, tags ( id, name )`).eq('user_id', userId).order('date', { ascending: false }),
                // --- Carregar Tags ---
                supabase.from('tags').select('id, name').eq('user_id', userId).order('name'),
                // --- Carregar Recorrências ---
                supabase.from('recurring_transactions').select('*').eq('user_id', userId).order('day_of_month').order('description'),
                // --- Carregar Orçamentos ---
                supabase.from('budgets').select('category, limit_amount').eq('user_id', userId),
                // --- Carregar Metas ---
                supabase.from('goals').select('*').eq('user_id', userId).order('name'),
                // --- Carregar Categorias do Usuário ---
                supabase.from('categories').select('name, type').eq('user_id', userId)
            ]);

            // Processa resultados do Promise.allSettled
            const [
                transResult, tagResult, recurResult, budgetResult, goalResult, catResult
            ] = results;

            // Transações
            if (transResult.status === 'fulfilled') {
                const { data, error } = transResult.value;
                if (error) throw new Error(`Erro ao carregar transações: ${error.message}`);
                transactions = data?.map(t => ({
                    ...t,
                    tags: t.tags ? t.tags.map(tag => tag.name) : [],
                    notes: t.notes || '',
                    recurringOriginId: t.recurring_origin_id ?? null
                })) || [];
                // console.log(`[loadInitialData] ${transactions.length} transações processadas.`); // Log Removido: Detalhe
            } else {
                throw new Error(`Falha ao buscar transações: ${transResult.reason}`);
            }

            // Tags
            if (tagResult.status === 'fulfilled') {
                const { data, error } = tagResult.value;
                if (error) throw new Error(`Erro ao carregar tags: ${error.message}`);
                tags = data?.map(t => t.name) || [];
                // console.log(`[loadInitialData] ${tags.length} tags processadas.`); // Log Removido: Detalhe
            } else {
                throw new Error(`Falha ao buscar tags: ${tagResult.reason}`);
            }

             // Recorrências
             if (recurResult.status === 'fulfilled') {
                const { data, error } = recurResult.value;
                if (error) throw new Error(`Erro ao carregar recorrências: ${error.message}`);
                recurringTransactions = data?.map(r => ({
                    id: r.id, userId: r.user_id, type: r.type, dayOfMonth: r.day_of_month,
                    description: r.description, amount: parseFloat(r.amount), category: r.category,
                    lastAddedMonthYear: r.last_added_month_year, createdAt: r.created_at, updatedAt: r.updated_at
                })) || [];
                // console.log(`[loadInitialData] ${recurringTransactions.length} recorrências processadas.`); // Log Removido: Detalhe
            } else {
                 throw new Error(`Falha ao buscar recorrências: ${recurResult.reason}`);
            }

            // Orçamentos
            if (budgetResult.status === 'fulfilled') {
                const { data, error } = budgetResult.value;
                if (error) throw new Error(`Erro ao carregar orçamentos: ${error.message}`);
                budgets = data?.reduce((acc, budget) => {
                    acc[budget.category] = parseFloat(budget.limit_amount);
                    return acc;
                }, {}) || {};
                // console.log(`[loadInitialData] Orçamentos processados:`, budgets); // Log Removido: Detalhe
            } else {
                 throw new Error(`Falha ao buscar orçamentos: ${budgetResult.reason}`);
            }

            // Metas
            if (goalResult.status === 'fulfilled') {
                const { data, error } = goalResult.value;
                if (error) throw new Error(`Erro ao carregar metas: ${error.message}`);
                goals = data?.map(g => ({
                    id: g.id, userId: g.user_id, name: g.name, targetAmount: parseFloat(g.target_amount),
                    savedAmount: parseFloat(g.saved_amount), createdAt: g.created_at, updatedAt: g.updated_at
                })) || [];
                // console.log(`[loadInitialData] ${goals.length} metas processadas.`); // Log Removido: Detalhe
            } else {
                 throw new Error(`Falha ao buscar metas: ${goalResult.reason}`);
            }

            // Categorias
            if (catResult.status === 'fulfilled') {
                const { data: categoryData, error } = catResult.value;
                if (error) throw new Error(`Erro ao carregar categorias: ${error.message}`);
                const userIncomeCategories = categoryData?.filter(c => c.type === 'income').map(c => c.name) || [];
                const userExpenseCategories = categoryData?.filter(c => c.type === 'expense').map(c => c.name) || [];
                categories = {
                    income: [...new Set([...defaultCategories.income, ...userIncomeCategories])].sort((a, b) => a.localeCompare(b)),
                    expense: [...new Set([...defaultCategories.expense, ...userExpenseCategories])].sort((a, b) => a.localeCompare(b))
                };
                // console.log(`[loadInitialData] Categorias processadas e combinadas:`, categories); // Log Removido: Detalhe
            } else {
                 throw new Error(`Falha ao buscar categorias: ${catResult.reason}`);
            }

            console.log("[loadInitialData] Carregamento de dados do Supabase concluído com sucesso."); // Log Mantido: Fim da operação
            document.dispatchEvent(new CustomEvent('initialDataLoaded'));
            return true;

        } else {
            console.log("[loadInitialData] Nenhum usuário logado na sessão."); // Log Mantido: Info importante
            clearLocalData(null);
            document.dispatchEvent(new CustomEvent('userLoggedOut'));
            return false;
        }
    } catch (e) {
        console.error("[loadInitialData] Erro GERAL durante carregamento:", e.message || e); // Log Mantido: Erro crítico
        const { data: { user } } = await supabase.auth.getUser(); // Tenta pegar user mesmo em erro
        clearLocalData(user?.id || null);
        document.dispatchEvent(new CustomEvent('userLoggedOut'));
        return false;
    }
}

// Limpa os dados locais
export function clearLocalData(userId = null) {
    console.log("[clearLocalData] Limpando estado local...");
    // Limpa os arrays existentes sem criar novas referências
    transactions.length = 0;
    tags.length = 0;
    recurringTransactions.length = 0;
    goals.length = 0;
    // Limpa objetos
    for (const key in budgets) { delete budgets[key]; }
    // Reseta categorias para os padrões
    categories.income = [...defaultCategories.income];
    categories.expense = [...defaultCategories.expense];
    // Limpeza de LocalStorage legado (pode ser removido futuramente)
    try {
        let idToClear = userId;
        if (!idToClear) { /* ... lógica para pegar ID da sessão ... */ }
        if (idToClear) { /* ... remove chaves específicas ... */ }
        else { /* ... remove chaves genéricas ... */ }
    } catch(e) { console.error("Erro ao tentar limpar LocalStorage legado em clearLocalData", e); } // Log Mantido: Erro
    // console.log("[clearLocalData] Estado local limpo."); // Log Removido: Redundante
}

// --- Funções CRUD para Transações e Tags ---

export async function addTransactionData(newTransactionData) {
    // console.log("[addTransactionData] Adicionando transação:", newTransactionData); // Log Removido: Detalhe (dados já são logados se erro)
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Usuário não autenticado para adicionar transação.");

        const { tags: tagNames, ...insertData } = newTransactionData;
        insertData.user_id = user.id;
        insertData.category = insertData.category || null;
        insertData.description = insertData.description ?? '';
        insertData.source = insertData.source ?? '';
        insertData.notes = insertData.notes ?? '';
        insertData.recurring_origin_id = typeof insertData.recurringOriginId === 'number' ? insertData.recurringOriginId : null;
        delete insertData.recurringOriginId;

        const { data: insertedTransaction, error: insertTransError } = await supabase
            .from('transactions')
            .insert(insertData)
            .select()
            .single();

        if (insertTransError) throw insertTransError;

        if (tagNames && tagNames.length > 0) {
            await associateTagsToTransaction(insertedTransaction.id, tagNames, user.id);
        }

        const completeTransaction = {
            ...insertedTransaction,
            recurringOriginId: insertedTransaction.recurring_origin_id ?? null,
            tags: tagNames || [],
            notes: insertedTransaction.notes || ''
        };

        transactions.unshift(completeTransaction);
        document.dispatchEvent(new CustomEvent('transactionsUpdated', { detail: { transactions: [...transactions] } }));
        return completeTransaction;

    } catch (e) {
        console.error(`[addTransactionData] Erro ao adicionar transação: ${e.message}`, e); // Log Mantido: Erro
        return null;
    }
}

export async function deleteTransactionData(id) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para deletar transação.");

        const { error } = await supabase
            .from('transactions')
            .delete()
            .match({ id: id, user_id: user.id });

        if (error) throw error;

        // *** CORREÇÃO: Modifica o array existente em vez de reatribuir ***
        const index = transactions.findIndex(t => t.id === id);
        if (index > -1) {
            transactions.splice(index, 1); // Remove o item no índice encontrado
            document.dispatchEvent(new CustomEvent('transactionsUpdated', { detail: { transactions: [...transactions] } }));
        } else {
            console.warn("[deleteTransactionData] Transação ID", id, "não encontrada no estado local após exclusão do DB.");
        }
        return true;

    } catch (e) {
        console.error(`[deleteTransactionData] Erro ao deletar transação ID ${id}: ${e.message}`, e);
        return false;
    }
}

// *** MODIFICAÇÃO AQUI: Adiciona parâmetro com valor padrão ***
export async function updateTransactionData(
    updatedTransaction,
    _updateTagsFn = updateTransactionTags
) {
    console.log("[updateTransactionData] Atualizando transação ID:", updatedTransaction.id);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para atualizar transação.");

        const { id, tags: newTagNames, ...updateData } = updatedTransaction;
        // ... (preparação de updateData) ...
        updateData.user_id = user.id;
        delete updateData.tags;
        updateData.description = updateData.description ?? '';
        updateData.source = updateData.source ?? '';
        updateData.notes = updateData.notes ?? '';
        updateData.category = updateData.category ?? null;
        updateData.recurring_origin_id = typeof updatedTransaction.recurringOriginId === 'number' ? updatedTransaction.recurringOriginId : null;
        if ('recurringOriginId' in updatedTransaction) delete updateData.recurringOriginId;


        const { data: updatedDbData, error: updateError } = await supabase
            .from('transactions')
            .update(updateData)
            .match({ id: id, user_id: user.id })
            .select()
            .single();

        if (updateError) throw updateError;
        console.log("[updateTransactionData] Transação principal atualizada no DB.");

        await _updateTagsFn(id, newTagNames || [], user.id);

        const index = transactions.findIndex(t => t.id === id);
        if (index > -1) {
            // *** CORREÇÃO: Atualiza o objeto existente usando Object.assign ***
            // Isso garante que estamos modificando o objeto na referência original do array.
            Object.assign(transactions[index], {
                ...updatedDbData, // Pega os dados atualizados do DB
                recurringOriginId: updatedDbData.recurring_origin_id ?? null,
                tags: newTagNames || [], // Atualiza as tags locais
                notes: updatedDbData.notes || '' // Atualiza as notas locais
            });
            // Remove propriedades que podem ter vindo do DB mas não queremos no estado local (ex: user_id)
            // delete transactions[index].user_id; // Opcional: Limpeza extra

            document.dispatchEvent(new CustomEvent('transactionsUpdated', { detail: { transactions: [...transactions] } }));
            console.log("[updateTransactionData] Transação atualizada com sucesso (local e DB).");
        } else {
            console.warn("[updateTransactionData] Transação ID", id, "não encontrada no estado local após atualização do DB.");
        }
        return true;

    } catch (e) {
        console.error(`[updateTransactionData] Erro ao atualizar transação ID ${updatedTransaction?.id}: ${e.message}`, e);
        return false;
    }
}

// Função auxiliar para associar tags a uma transação recém-criada
async function associateTagsToTransaction(transactionId, tagNames, userId) {
    // console.log(`[associateTagsToTransaction] Associando tags [${tagNames.join(', ')}] à transação ${transactionId}`); // Log Removido: Detalhe
    if (!tagNames || tagNames.length === 0) return;

    const tagIds = await getTagIds(tagNames, userId);
    if (!tagIds || tagIds.length === 0) {
        console.warn("[associateTagsToTransaction] Não foi possível obter IDs válidos para as tags."); // Log Mantido: Aviso
        return;
    }

    const associations = tagIds.map(tagId => ({
        transaction_id: transactionId,
        tag_id: tagId
    }));

    const { error: assocError } = await supabase
        .from('transaction_tags')
        .insert(associations, { returning: 'minimal' });

    if (assocError) {
        // Log Mantido: Erro importante
        console.error(`[associateTagsToTransaction] Erro ao inserir associações para transação ${transactionId} (código: ${assocError.code}):`, assocError.message);
    } else {
        // console.log(`[associateTagsToTransaction] Associações para transação ${transactionId} inseridas com sucesso.`); // Log Removido: Info
    }
}

// Função auxiliar para ATUALIZAR as tags de uma transação existente
async function updateTransactionTags(transactionId, newTagNames, userId) {
    // ... (lógica original de updateTransactionTags) ...
    console.log(`[updateTransactionTags] Atualizando tags para transação ${transactionId} para: [${newTagNames.join(', ')}]`);
    const newTagIds = await getTagIds(newTagNames || [], userId); // getTagIds ainda é interna
    console.log(`[updateTransactionTags] IDs das novas tags: [${newTagIds.join(', ')}]`);
    console.log(`[updateTransactionTags] Buscando tags atuais para ${transactionId}...`);
    const { data: currentAssociations, error: currentError } = await supabase
        .from('transaction_tags')
        .select('tag_id')
        .eq('transaction_id', transactionId);
    if (currentError) {
        console.error(`[updateTransactionTags] Erro ao buscar tags atuais da transação ${transactionId}:`, currentError.message);
        throw new Error("Erro ao buscar tags atuais, atualização de tags abortada.");
    }
    const currentTagIds = currentAssociations ? currentAssociations.map(a => a.tag_id) : [];
    console.log(`[updateTransactionTags] IDs das tags atuais: [${currentTagIds.join(', ')}]`);
    const tagsToRemove = currentTagIds.filter(id => !newTagIds.includes(id));
    const tagsToAdd = newTagIds.filter(id => !currentTagIds.includes(id));
    console.log(`[updateTransactionTags] Tags a remover IDs: [${tagsToRemove.join(', ')}]`);
    console.log(`[updateTransactionTags] Tags a adicionar IDs: [${tagsToAdd.join(', ')}]`);
    if (tagsToRemove.length > 0) {
        console.log(`[updateTransactionTags] Removendo ${tagsToRemove.length} associações antigas...`);
        const { error: deleteError } = await supabase
            .from('transaction_tags')
            .delete()
            .eq('transaction_id', transactionId)
            .in('tag_id', tagsToRemove);
        if (deleteError) {
            console.error(`[updateTransactionTags] Erro ao remover associações antigas da transação ${transactionId}:`, deleteError.message);
            // Considerar lançar erro aqui para parar o processo?
        } else {
            console.log(`[updateTransactionTags] Associações antigas removidas.`);
        }
    } else {
        console.log(`[updateTransactionTags] Nenhuma tag antiga para remover.`);
    }
    if (tagsToAdd.length > 0) {
        const associationsToAdd = tagsToAdd.map(tagId => ({ transaction_id: transactionId, tag_id: tagId }));
        console.log(`[updateTransactionTags] Adicionando ${associationsToAdd.length} novas associações...`);
        const { error: addError } = await supabase
            .from('transaction_tags')
            .insert(associationsToAdd, { returning: 'minimal' });
        if (addError) {
            console.error(`[updateTransactionTags] Erro ao adicionar novas associações para transação ${transactionId}:`, addError.message);
            // Considerar lançar erro aqui?
        } else {
            console.log(`[updateTransactionTags] Novas associações adicionadas.`);
        }
    } else {
        console.log(`[updateTransactionTags] Nenhuma tag nova para adicionar.`);
    }
    console.log(`[updateTransactionTags] Atualização de tags para transação ${transactionId} concluída.`);
}

// *** NOVA FUNÇÃO AUXILIAR (NÃO EXPORTADA) ***
async function findOrCreateTag(tagName, userId) {
    const trimmedName = tagName.trim();
    if (!trimmedName) return null; // Retorna null para tags vazias

    try {
        // 1. Tenta encontrar a tag existente
        let { data: existingTags, error: findError } = await supabase
            .from('tags')
            .select('id, name')
            .eq('user_id', userId)
            .ilike('name', trimmedName)
            .limit(1);

        if (findError) throw findError; // Lança erro da busca

        if (existingTags && existingTags.length > 0) {
            const existingTag = existingTags[0];
            // Atualiza cache local se necessário (apenas para case)
            if (!tags.includes(existingTag.name)) {
                const normalizedExisting = normalizeText(existingTag.name);
                tags = tags.filter(t => normalizeText(t) !== normalizedExisting);
                tags.push(existingTag.name);
                tags.sort((a, b) => normalizeText(a).localeCompare(normalizeText(b)));
            }
            return existingTag.id; // Retorna ID da tag existente
        } else {
            // 2. Tag não encontrada, tenta criar
            let { data: newTag, error: insertError } = await supabase
                .from('tags')
                .insert({ user_id: userId, name: trimmedName })
                .select('id, name')
                .single();

            if (insertError) {
                if (insertError.code === '23505') { // Race condition
                    // Tenta buscar novamente
                    let { data: createdTag, error: findAgainError } = await supabase
                        .from('tags').select('id, name').eq('user_id', userId).ilike('name', trimmedName).single();

                    if (findAgainError) throw findAgainError;

                    if (createdTag) {
                         // Atualiza cache se necessário
                         if (!tags.includes(createdTag.name)) { tags.push(createdTag.name); tags.sort(/*...*/); }
                         return createdTag.id; // Retorna ID encontrado após race condition
                    } else {
                         // Não encontrou mesmo após erro 23505, loga mas retorna null
                         console.error(`[findOrCreateTag] Tag "${trimmedName}" não encontrada mesmo após falha 23505.`);
                         return null;
                    }
                } else {
                    throw insertError; // Lança outros erros de insert
                }
            } else if (newTag) {
                 // Tag criada com sucesso, atualiza cache
                 if (!tags.includes(newTag.name)) { tags.push(newTag.name); tags.sort(/*...*/); }
                 return newTag.id; // Retorna ID da nova tag
            }
             // Caso algo inesperado ocorra após insert sem erro mas sem newTag
             return null;
        }
    } catch (error) {
        console.error(`[findOrCreateTag] Erro ao processar tag "${trimmedName}": ${error.message}`, error);
        return null; // Retorna null em caso de erro para esta tag
    }
}

// Função auxiliar robusta para obter IDs de tags, criando as que não existem
// *** getTagIds REATORADA para usar a função auxiliar e Promise.allSettled ***
export async function getTagIds(tagNames, userId) {
    if (!tagNames || tagNames.length === 0) return [];

    // Cria um array de Promises, uma para cada tag name
    const promises = tagNames.map(name => findOrCreateTag(name, userId));

    // Executa todas as promises, mesmo que algumas falhem
    const results = await Promise.allSettled(promises);

    // Filtra os resultados bem-sucedidos e extrai os IDs (removendo nulls)
    const tagIds = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);

    // Loga erros de promises rejeitadas (opcional)
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`[getTagIds] Falha ao processar tag "${tagNames[index]}": ${result.reason}`);
        }
    });

    return [...new Set(tagIds)]; // Retorna IDs únicos obtidos com sucesso
}

// Adiciona uma nova tag (usado pelo Tagify e Settings)
export async function addTagData(tagName) {
    const trimmedTagName = tagName.trim();
    const normalizedTagName = normalizeText(trimmedTagName);
    if (!normalizedTagName) return false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para adicionar tag.");

        const alreadyExistsLocally = tags.some(t => normalizeText(t) === normalizedTagName);
        if (alreadyExistsLocally) {
            // console.warn(`[addTagData] Tag "${trimmedTagName}" já existe localmente (normalizada).`); // Log Removido: Info
            return false;
        }

        const createdTagIds = await getTagIds([trimmedTagName], user.id);
        return createdTagIds && createdTagIds.length > 0;

    } catch (e) {
        console.error(`[addTagData] Erro ao adicionar tag "${tagName}": ${e.message}`, e); // Log Mantido: Erro
        return false;
    }
}

// Deleta uma tag
export async function deleteTagData(tagName) {
    const trimmedTagName = tagName.trim();
    const normalizedTagName = normalizeText(trimmedTagName);
    if (!normalizedTagName) return false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para deletar tag.");

        const { data: tagsToDelete, error: findError } = await supabase
            .from('tags').select('id, name').eq('user_id', user.id).ilike('name', normalizedTagName);
        if (findError) throw findError;

        if (!tagsToDelete || tagsToDelete.length === 0) {
            console.warn(`[deleteTagData] Tag "${trimmedTagName}" não encontrada no DB.`);
             // *** CORRIGE AQUI TAMBÉM: Remove do array original se não encontrou no DB mas existia localmente ***
             const index = tags.findIndex(t => normalizeText(t) === normalizedTagName);
             if (index > -1) {
                 tags.splice(index, 1);
                 console.log(`[deleteTagData] Tag "${trimmedTagName}" (não encontrada no DB) removida do cache local.`);
             }
            return false;
        }

        const tagToDelete = tagsToDelete[0];
        const tagIdToDelete = tagToDelete.id;
        const originalTagName = tagToDelete.name; // Nome com case correto

        const { error: deleteError } = await supabase
            .from('tags').delete().match({ id: tagIdToDelete, user_id: user.id });
        if (deleteError) throw deleteError;

        // *** CORREÇÃO: Modifica o array 'tags' existente ***
        const index = tags.findIndex(t => t === originalTagName); // Busca pelo nome exato (case-sensitive)
        if (index > -1) {
            tags.splice(index, 1); // Remove o item
            console.log(`[deleteTagData] Tag "${originalTagName}" removida do cache local.`);
        } else {
            console.warn(`[deleteTagData] Tag "${originalTagName}" não encontrada no cache local para remover.`);
        }

        // Remove a tag das transações no estado local
        transactions.forEach(t => { // Usar forEach para modificar é ok aqui
            if (t.tags && t.tags.includes(originalTagName)) {
                 t.tags = t.tags.filter(tag => tag !== originalTagName);
            }
        });
        console.log("[deleteTagData] Tag removida das transações no array local.");

        document.dispatchEvent(new CustomEvent('transactionsUpdated', { detail: { transactions: [...transactions] } }));
        return true;

    } catch (e) {
        console.error(`[deleteTagData] Erro ao deletar tag "${tagName}": ${e.message}`, e);
        return false;
    }
}


// --- Funções CRUD para Categorias ---

export async function addCategoryData(name, type) {
    const trimmedName = name.trim();
    const normalizedName = normalizeText(trimmedName);
    if (!trimmedName || !type || !['income', 'expense'].includes(type)) return false;
    if (categories[type]?.some(cat => normalizeText(cat) === normalizedName)) {
        // console.warn(`[addCategoryData] Categoria "${trimmedName}" (${type}) já existe localmente.`); // Log Removido: Info
        return false;
    }

    // console.log(`[addCategoryData] Tentando adicionar categoria "${trimmedName}" (${type})...`); // Log Removido: Info
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para adicionar categoria.");

        const { data, error } = await supabase
            .from('categories').insert({ user_id: user.id, name: trimmedName, type: type }).select().single();

        if (error) {
            if (error.code === '23505') {
                console.warn(`[addCategoryData] Categoria "${trimmedName}" (${type}) já existe no DB.`); // Log Mantido: Aviso
                if (!categories[type]?.includes(trimmedName)) { categories[type]?.push(trimmedName); categories[type]?.sort((a, b) => a.localeCompare(b)); }
                return false;
            } else { throw error; }
        }

        categories[type]?.push(data.name);
        categories[type]?.sort((a, b) => a.localeCompare(b));
        // console.log(`[addCategoryData] Categoria "${data.name}" adicionada.`); // Log Removido: Info
        return true;

    } catch (e) {
        console.error(`[addCategoryData] Erro ao adicionar categoria "${name}": ${e.message}`, e); // Log Mantido: Erro
        return false;
    }
}

export async function deleteCategoryData(name, type) {
    if (defaultCategories[type]?.includes(name)) {
        console.warn(`[deleteCategoryData] Tentativa de deletar categoria padrão "${name}".`); // Log Mantido: Aviso
        return false;
    }

    // console.log(`[deleteCategoryData] Tentando deletar categoria "${name}" (${type})...`); // Log Removido: Info
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para deletar categoria.");

        const { error } = await supabase
            .from('categories').delete().match({ user_id: user.id, name: name, type: type });

        if (error && error.code !== 'PGRST116') { throw error; }
        if (error?.code === 'PGRST116'){ console.warn(`[deleteCategoryData] Categoria "${name}" (${type}) não encontrada no DB.`); } // Log Mantido: Aviso
        // else { console.log(`[deleteCategoryData] Categoria "${name}" deletada do DB (ou não existia).`); } // Log Removido: Info

        const initialLength = categories[type]?.length || 0;
        if(categories[type]) { categories[type] = categories[type].filter(cat => cat !== name); }
        // if ((categories[type]?.length || 0) < initialLength) console.log(`[deleteCategoryData] Categoria "${name}" removida do estado local.`); // Log Removido: Info
        // else console.warn(`[deleteCategoryData] Categoria "${name}" não encontrada no estado local.`); // Log Removido: Info

        return true;

    } catch (e) {
        console.error(`[deleteCategoryData] Erro ao deletar categoria "${name}": ${e.message}`, e); // Log Mantido: Erro
        return false;
    }
}

// --- Funções CRUD para Recorrências ---
export async function addRecurringData(newRecurringData) {
    // console.log("[addRecurringData] Adicionando recorrência:", newRecurringData); // Log Removido: Info
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para adicionar recorrência.");

        const insertData = { user_id: user.id, type: newRecurringData.type, day_of_month: newRecurringData.dayOfMonth, description: newRecurringData.description, amount: newRecurringData.amount, category: newRecurringData.category || null };
        const { data, error } = await supabase.from('recurring_transactions').insert(insertData).select().single();
        if (error) throw error;

        const addedRecurring = { id: data.id, userId: data.user_id, type: data.type, dayOfMonth: data.day_of_month, description: data.description, amount: parseFloat(data.amount), category: data.category, lastAddedMonthYear: data.last_added_month_year, createdAt: data.created_at, updatedAt: data.updated_at };
        recurringTransactions.push(addedRecurring);
        recurringTransactions.sort((a, b) => a.dayOfMonth - b.dayOfMonth || a.description.localeCompare(b.description));
        // console.log("[addRecurringData] Recorrência adicionada com sucesso."); // Log Removido: Info
        return addedRecurring;

    } catch (e) {
        console.error(`[addRecurringData] Erro: ${e.message}`, e); // Log Mantido: Erro
        return null;
    }
}
export async function updateRecurringData(updatedRecurringData) {
    // console.log("[updateRecurringData] Atualizando recorrência ID:", updatedRecurringData.id);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para atualizar recorrência.");

        const { id, userId, createdAt, updatedAt, ...updateFields } = updatedRecurringData;

        // *** CORREÇÃO: Constrói updateData apenas com campos presentes em updateFields ***
        const updateData = {};
        if (updateFields.hasOwnProperty('type')) updateData.type = updateFields.type;
        if (updateFields.hasOwnProperty('dayOfMonth')) updateData.day_of_month = updateFields.dayOfMonth;
        if (updateFields.hasOwnProperty('description')) updateData.description = updateFields.description;
        if (updateFields.hasOwnProperty('amount')) updateData.amount = updateFields.amount;
        // Trata category explicitamente para permitir setar como null
        if (updateFields.hasOwnProperty('category')) updateData.category = updateFields.category || null;
        // Trata lastAddedMonthYear explicitamente
        if (updateFields.hasOwnProperty('lastAddedMonthYear')) updateData.last_added_month_year = updateFields.lastAddedMonthYear || null;

        // Se nenhum campo foi efetivamente fornecido para update, retorna true
        if (Object.keys(updateData).length === 0) {
             console.warn("[updateRecurringData] Nenhum campo válido fornecido para atualização.");
             return true;
        }

        const { data, error } = await supabase
            .from('recurring_transactions')
            .update(updateData) // Usa o objeto construído dinamicamente
            .match({ id: id, user_id: user.id })
            .select()
            .single();

        if (error) throw error;

        const index = recurringTransactions.findIndex(r => r.id === id);
        if (index > -1) {
            // Atualiza o objeto existente no array
            Object.assign(recurringTransactions[index], {
                 id: data.id,
                 userId: data.user_id,
                 type: data.type,
                 dayOfMonth: data.day_of_month,
                 description: data.description,
                 amount: parseFloat(data.amount),
                 category: data.category,
                 lastAddedMonthYear: data.last_added_month_year,
                 createdAt: recurringTransactions[index].createdAt, // Mantém original
                 updatedAt: data.updated_at
            });
            recurringTransactions.sort((a, b) => a.dayOfMonth - b.dayOfMonth || a.description.localeCompare(b.description));
        } else {
            console.warn("[updateRecurringData] Recorrência ID", id, "não encontrada no estado local.");
        }
        return true;

    } catch (e) {
        console.error(`[updateRecurringData] Erro ID ${updatedRecurringData?.id}: ${e.message}`, e);
        return false;
    }
}
export async function deleteRecurringData(recurringId) {
    // console.log("[deleteRecurringData] Deletando recorrência ID:", recurringId);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para deletar recorrência.");

        const { error } = await supabase
            .from('recurring_transactions')
            .delete()
            .match({ id: recurringId, user_id: user.id });

        if (error) throw error;

        // *** CORREÇÃO: Modifica o array 'recurringTransactions' existente ***
        const index = recurringTransactions.findIndex(r => r.id === recurringId);
        if (index > -1) {
            recurringTransactions.splice(index, 1); // Remove o item
            // console.log("[deleteRecurringData] Recorrência removida do estado local.");
        } else {
             console.warn("[deleteRecurringData] Recorrência ID", recurringId, "não encontrada no estado local para remover.");
        }
        // console.log("[deleteRecurringData] Recorrência deletada com sucesso do DB.");
        return true;

    } catch (e) {
        console.error(`[deleteRecurringData] Erro ID ${recurringId}: ${e.message}`, e);
        return false;
    }
}

// --- Funções CRUD para Orçamentos ---
export async function saveBudgetsData(budgetsToSave) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para salvar orçamentos.");

        const { data: existingBudgets, error: fetchError } = await supabase.from('budgets').select('id, category').eq('user_id', user.id);
        if (fetchError) throw fetchError;

        const budgetsToUpsert = [];
        const categoriesToDelete = [];
        // Determina o que fazer com base nos dados recebidos e existentes
        for (const category in budgetsToSave) {
            if (budgetsToSave[category] > 0) {
                budgetsToUpsert.push({ user_id: user.id, category: category, limit_amount: budgetsToSave[category] });
            }
        }
        existingBudgets.forEach(existing => {
            if (!budgetsToSave.hasOwnProperty(existing.category) || budgetsToSave[existing.category] <= 0) {
                categoriesToDelete.push(existing.category);
            }
        });

        // Executa operações no DB
        if (budgetsToUpsert.length > 0) {
            const { error: upsertError } = await supabase.from('budgets').upsert(budgetsToUpsert, { onConflict: 'user_id, category' });
            if (upsertError) throw upsertError;
        }
        if (categoriesToDelete.length > 0) {
            const { error: deleteError } = await supabase.from('budgets').delete().eq('user_id', user.id).in('category', categoriesToDelete);
            if (deleteError) throw deleteError;
        }

        // --- CORREÇÃO DA ATUALIZAÇÃO LOCAL ---
        // 1. Limpa o objeto 'budgets' existente mantendo sua referência
        for (const key in budgets) {
            delete budgets[key];
        }
        // 2. Preenche o objeto 'budgets' existente com os dados que foram salvos/atualizados
        budgetsToUpsert.forEach(b => {
            budgets[b.category] = b.limit_amount;
        });
        // --- FIM DA CORREÇÃO ---

        console.log("[saveBudgetsData] Orçamentos salvos com sucesso e estado local atualizado:", budgets); // Log para confirmar
        return true;

    } catch (e) {
        console.error(`[saveBudgetsData] Erro: ${e.message}`, e);
        return false;
    }
}

// --- Funções CRUD para Metas ---
export async function addGoalData(newGoalData) {
    // console.log("[addGoalData] Adicionando meta:", newGoalData); // Log Removido: Info
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para adicionar meta.");

        const insertData = { user_id: user.id, name: newGoalData.name, target_amount: newGoalData.targetAmount, saved_amount: 0 };
        const { data, error } = await supabase.from('goals').insert(insertData).select().single();
        if (error) throw error;

        const addedGoal = { id: data.id, userId: data.user_id, name: data.name, targetAmount: parseFloat(data.target_amount), savedAmount: parseFloat(data.saved_amount), createdAt: data.created_at, updatedAt: data.updated_at };
        goals.push(addedGoal);
        goals.sort((a, b) => a.name.localeCompare(b.name));
        // console.log("[addGoalData] Meta adicionada com sucesso."); // Log Removido: Info
        return addedGoal;

    } catch (e) {
        console.error(`[addGoalData] Erro: ${e.message}`, e); // Log Mantido: Erro
        return null;
    }
}
export async function updateGoalData(updatedGoalData) {
    // console.log("[updateGoalData] Atualizando meta ID:", updatedGoalData.id); // Log Removido: Info
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para atualizar meta.");

        const { id, userId, createdAt, updatedAt, ...updateFields } = updatedGoalData;
        const updateData = {};
        if (updateFields.hasOwnProperty('name')) updateData.name = updateFields.name;
        if (updateFields.hasOwnProperty('targetAmount')) updateData.target_amount = updateFields.targetAmount;
        if (updateFields.hasOwnProperty('savedAmount')) updateData.saved_amount = updateFields.savedAmount;
        if (Object.keys(updateData).length === 0) return true; // Nada a fazer

        const { data, error } = await supabase.from('goals').update(updateData).match({ id: id, user_id: user.id }).select().single();
        if (error) throw error;

        const index = goals.findIndex(g => g.id === id);
        if (index > -1) {
            goals[index] = { id: data.id, userId: data.user_id, name: data.name, targetAmount: parseFloat(data.target_amount), savedAmount: parseFloat(data.saved_amount), createdAt: goals[index].createdAt, updatedAt: data.updated_at };
            goals.sort((a, b) => a.name.localeCompare(b.name));
            // console.log("[updateGoalData] Meta atualizada no estado local."); // Log Removido: Info
        } else { console.warn("[updateGoalData] Meta ID", id, "não encontrada no estado local."); } // Log Mantido: Aviso
        // console.log("[updateGoalData] Meta atualizada com sucesso no DB."); // Log Removido: Info
        return true;

    } catch (e) {
        console.error(`[updateGoalData] Erro ID ${updatedGoalData.id}: ${e.message}`, e); // Log Mantido: Erro
        return false;
    }
}
export async function deleteGoalData(goalId) {
    // console.log("[deleteGoalData] Deletando meta ID:", goalId);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado para deletar meta.");

        const { error } = await supabase
            .from('goals')
            .delete()
            .match({ id: goalId, user_id: user.id });

        if (error) throw error;

        // *** CORREÇÃO: Modifica o array 'goals' existente ***
        const index = goals.findIndex(g => g.id === goalId);
        if (index > -1) {
            goals.splice(index, 1); // Remove o item no índice encontrado
             // console.log("[deleteGoalData] Meta removida do estado local.");
        } else {
             console.warn("[deleteGoalData] Meta ID", goalId, "não encontrada no estado local para remover.");
        }
        // console.log("[deleteGoalData] Meta deletada com sucesso do DB.");
        return true;

    } catch (e) {
        console.error(`[deleteGoalData] Erro ao deletar meta ID ${goalId}: ${e.message}`, e);
        return false;
    }
}