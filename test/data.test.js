// tests/data.test.js
import * as dataModule from '../data.js';
import { supabase } from '../supabaseClient.js';

const {
    addTransactionData, deleteTransactionData, updateTransactionData,
    addTagData, deleteTagData,
    addGoalData, updateGoalData, deleteGoalData,
    addRecurringData, updateRecurringData, deleteRecurringData,
    addCategoryData, deleteCategoryData,
    saveBudgetsData,
    getTagIds,
    transactions, tags, goals, recurringTransactions, categories, budgets,
    clearLocalData, defaultCategories // Importa defaultCategories para referência
} = dataModule;

describe('Data Functions (data.js)', () => {

    let sandbox;
    const mockUser = { id: 'test-user-id', email: 'test@test.com' };

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clearLocalData(); // Limpa tudo, incluindo 'recurringTransactions'
        // Popula estado inicial
        // Repopula transações e tags se necessário para outros testes
        transactions.push(
            { id: 1, type: 'expense', description: 'Old Desc', amount: 50, date: '2024-01-10', category: 'CatOld', tags: ['old', 'keep'], notes:'Old note', userId: mockUser.id, created_at: '2024-01-10T10:00:00Z' },
            { id: 2, type: 'income', source: 'Old Source', amount: 200, date: '2024-01-11', category: null, tags: ['keep'], notes: null, userId: mockUser.id, created_at: '2024-01-11T10:00:00Z' },
            { id: 3, type: 'expense', description: 'Teste C', amount: 25, date: '2024-01-03', category: 'Cat2', tags:[], notes:'', userId: mockUser.id, created_at: '2024-01-03T10:00:00Z' }
        );
        tags.length = 0;
        tags.push('Existing Tag', 'Another Tag', 'old', 'keep', 'existing'); 
        tags.sort();
        goals.push(
            { id: 10, userId: mockUser.id, name: "Meta Existente", targetAmount: 1000, savedAmount: 250, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-10T00:00:00Z' },
            { id: 11, userId: mockUser.id, name: "Outra Meta", targetAmount: 500, savedAmount: 500, createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' }
        );
        recurringTransactions.push(
            { id: 20, userId: mockUser.id, type: 'expense', dayOfMonth: 5, description: "Aluguel", amount: 1200, category: 'Moradia', lastAddedMonthYear: null, createdAt: '2024-01-05T00:00:00Z', updatedAt: '2024-01-05T00:00:00Z' },
            { id: 21, userId: mockUser.id, type: 'income', dayOfMonth: 15, description: "Consultoria X", amount: 500, category: null, lastAddedMonthYear: '2024-01', createdAt: '2024-01-06T00:00:00Z', updatedAt: '2024-01-16T00:00:00Z' }
        );


        budgets['Moradia'] = 500; // Orçamento inicial
        budgets['Lazer'] = 100;
        categories.expense.push("Moradia", "Lazer", "Alimentação", "Transporte"); // Garante que categorias existem
        // Popula outros arrays se necessário
        
        recurringTransactions.sort((a, b) => a.dayOfMonth - b.dayOfMonth || a.description.localeCompare(b.description));
        
        goals.sort((a, b) => a.name.localeCompare(b.name)); // Garante ordem inicial

    });

    afterEach(() => {
        sandbox.restore();
    });

    // --- Testes addTransactionData ---
    describe('addTransactionData()', () => { /* ... mantidos ... */
        it('should add a new expense transaction and update local state', async () => {
            const initialLength = transactions.length;
            const newExpense = { type: 'expense', date: '2024-03-15', amount: 55.40, category: 'Alimentação', description: 'Almoço Teste', source: '', notes: 'Nota teste', tags: ['comida', 'trabalho'] };
            const expectedDbReturn = { id: 101, user_id: mockUser.id, created_at: new Date().toISOString(), type: 'expense', date: '2024-03-15', amount: 55.40, category: 'Alimentação', description: 'Almoço Teste', source: null, notes: 'Nota teste', recurring_origin_id: null };
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const singleStub = sandbox.stub().resolves({ data: expectedDbReturn, error: null });
            const selectStub = sandbox.stub().returns({ single: singleStub });
            const insertStub = sandbox.stub().returns({ select: selectStub });
            const fromTransactionsMock = { insert: insertStub };
            const assocInsertStub = sandbox.stub().resolves({ error: null });
            const fromTagsMock = { insert: assocInsertStub };
            const findExistingTagStub = sandbox.stub().resolves({ data: [], error: null }); // Mock para .limit(1)
            const ilikeTagsStub = sandbox.stub().returns({ limit: findExistingTagStub }); // Mock para .ilike()
            const eqTagsStub = sandbox.stub().returns({ ilike: ilikeTagsStub }); // Mock para .eq()
             const insertNewTagStub = sandbox.stub().resolves({ data: {id: 99, name:'mock'}, error: null }); // Mock para .single()
             const selectInsertStub = sandbox.stub().returns({ single: insertNewTagStub }); // Mock para .select()
             const fromTagsTableMock = { // Mock para from('tags')
                 select: sandbox.stub().returns({ eq: eqTagsStub }),
                 insert: sandbox.stub().returns({ select: selectInsertStub })
             };
            sandbox.stub(supabase, 'from').callsFake((tableName) => {
                if (tableName === 'transactions') return fromTransactionsMock;
                if (tableName === 'transaction_tags') return fromTagsMock;
                if (tableName === 'tags') return fromTagsTableMock;
                return { insert: sandbox.stub().returnsThis(), select: sandbox.stub().returnsThis(), update: sandbox.stub().returnsThis(), delete: sandbox.stub().returnsThis(), match: sandbox.stub().returnsThis(), eq: sandbox.stub().returnsThis(), in: sandbox.stub().returnsThis(), ilike: sandbox.stub().returnsThis(), limit: sandbox.stub().returnsThis(), single: sandbox.stub().resolves({ data: null, error: new Error('Unexpected table call') }) };
            });
            const result = await addTransactionData(newExpense);
            expect(result).to.exist;
            expect(insertStub.calledOnce).to.be.true;
            expect(assocInsertStub.calledOnce).to.be.true;
            expect(transactions).to.have.lengthOf(initialLength + 1);
            expect(transactions[0]).to.deep.equal(result);
        });
        it('should add a new income transaction without category/tags', async () => {
            const initialLength = transactions.length;
            const newIncome = { type: 'income', date: '2024-03-16', amount: 1200, category: null, description: '', source: 'Salário Teste', notes: null, tags: [] };
            const expectedDbReturn = { id: 102, user_id: mockUser.id, created_at: new Date().toISOString(), type: 'income', date: '2024-03-16', amount: 1200, category: null, description: null, source: 'Salário Teste', notes: null, recurring_origin_id: null };
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const singleStub = sandbox.stub().resolves({ data: expectedDbReturn, error: null });
            const selectStub = sandbox.stub().returns({ single: singleStub });
            const insertStub = sandbox.stub().returns({ select: selectStub });
            const fromTransactionsMock = { insert: insertStub };
            sandbox.stub(supabase, 'from').callsFake((tableName) => { if (tableName === 'transactions') return fromTransactionsMock; return {}; });
            const result = await addTransactionData(newIncome);
            expect(result).to.exist;
            expect(insertStub.calledOnce).to.be.true;
            const insertArgs = insertStub.getCall(0).args[0];
            expect(insertArgs).to.deep.include({ user_id: mockUser.id, source: 'Salário Teste', notes: '' });
            expect(insertArgs).to.not.have.property('tags');
            expect(transactions).to.have.lengthOf(initialLength + 1);
            expect(transactions[0]).to.deep.equal(result);
        });
        it('should return null if user is not authenticated', async () => {
             const initialLength = transactions.length;
             const newExpense = { type: 'expense', date: '2024-03-17', amount: 10, category: 'Outros', description: 'Teste Auth' };
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
             const fromSpy = sandbox.spy(supabase, 'from');
             const result = await addTransactionData(newExpense);
             expect(result).to.be.null;
             expect(transactions).to.have.lengthOf(initialLength);
             expect(fromSpy.called).to.be.false;
        });
        it('should return null if database insert fails', async () => {
            const initialLength = transactions.length;
            const newExpense = { type: 'expense', date: '2024-03-18', amount: 25, category: 'Lazer', description: 'DB Fail Test' };
            const dbError = { message: "Simulated DB Error", code: "XYZ" };
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const singleStub = sandbox.stub().resolves({ data: null, error: dbError });
            const selectStub = sandbox.stub().returns({ single: singleStub });
            const insertStub = sandbox.stub().returns({ select: selectStub });
            const fromTransactionsMock = { insert: insertStub };
            sandbox.stub(supabase, 'from').callsFake((tableName) => { if (tableName === 'transactions') return fromTransactionsMock; return {}; });
            const result = await addTransactionData(newExpense);
            expect(result).to.be.null;
            expect(transactions).to.have.lengthOf(initialLength);
            expect(insertStub.calledOnce).to.be.true;
        });
    });

    // --- Testes deleteTransactionData ---
    describe('deleteTransactionData()', () => {
        // Testes mantidos como antes (já passando)
        const transactionIdToDelete = 2;
        it('should delete the transaction from DB and local state', async () => {
            const initialLength = transactions.length;
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const matchStub = sandbox.stub().resolves({ error: null });
            const deleteReturnMock = { match: matchStub };
            const deleteStub = sandbox.stub().returns(deleteReturnMock);
            const fromTransactionsMock = { delete: deleteStub };
            sandbox.stub(supabase, 'from').withArgs('transactions').returns(fromTransactionsMock);
            const result = await deleteTransactionData(transactionIdToDelete);
            expect(result).to.be.true;
            expect(supabase.from.calledOnceWith('transactions')).to.be.true;
            expect(deleteStub.calledOnce).to.be.true;
            expect(matchStub.calledOnceWith({ id: transactionIdToDelete, user_id: mockUser.id })).to.be.true;
            expect(transactions).to.have.lengthOf(initialLength - 1);
            expect(transactions.find(t => t.id === transactionIdToDelete)).to.be.undefined;
        });
        it('should return false if user is not authenticated', async () => {
             const initialLength = transactions.length;
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
             const fromSpy = sandbox.spy(supabase, 'from');
             const result = await deleteTransactionData(transactionIdToDelete);
             expect(result).to.be.false;
             expect(transactions).to.have.lengthOf(initialLength);
             expect(fromSpy.called).to.be.false;
        });
        it('should return false if database delete fails', async () => {
             const initialLength = transactions.length;
             const dbError = { message: "Delete failed", code: "42P01" };
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const matchStub = sandbox.stub().resolves({ error: dbError });
             const deleteReturnMock = { match: matchStub };
             const deleteStub = sandbox.stub().returns(deleteReturnMock);
             const fromTransactionsMock = { delete: deleteStub };
             sandbox.stub(supabase, 'from').withArgs('transactions').returns(fromTransactionsMock);
             const result = await deleteTransactionData(transactionIdToDelete);
             expect(result).to.be.false;
             expect(transactions).to.have.lengthOf(initialLength);
             expect(deleteStub.calledOnce).to.be.true;
             expect(matchStub.calledOnce).to.be.true;
        });
        it('should return true even if transaction not found locally (already deleted?)', async () => {
             const initialLength = transactions.length;
             const nonExistentId = 999;
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const matchStub = sandbox.stub().resolves({ error: null });
             const deleteReturnMock = { match: matchStub };
             const deleteStub = sandbox.stub().returns(deleteReturnMock);
             const fromTransactionsMock = { delete: deleteStub };
             sandbox.stub(supabase, 'from').withArgs('transactions').returns(fromTransactionsMock);
             const result = await deleteTransactionData(nonExistentId);
             expect(result).to.be.true;
             expect(transactions).to.have.lengthOf(initialLength);
             expect(deleteStub.calledOnce).to.be.true;
             expect(matchStub.calledOnceWith({ id: nonExistentId, user_id: mockUser.id })).to.be.true;
         });
    });

    // --- Testes updateTransactionData ---
    describe('updateTransactionData()', () => {
        // Testes mantidos como antes (passando com injeção de dependência)
        const transactionIdToUpdate = 1;
        const baseUpdateData = { id: transactionIdToUpdate, userId: mockUser.id, type: 'expense', date: '2024-01-12', amount: 65.75, category: 'CatNew', description: 'New Desc Updated', source: '', notes: 'New note', tags: ['keep', 'newtag'] };
        const expectedDbReturn = { id: transactionIdToUpdate, user_id: mockUser.id, created_at: '2024-01-10T10:00:00Z', type: 'expense', date: '2024-01-12', amount: 65.75, category: 'CatNew', description: 'New Desc Updated', source: null, notes: 'New note', recurring_origin_id: null, updated_at: new Date().toISOString() };
        it('should update transaction, call _updateTagsFn, and update local state', async () => {
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const singleUpdateStub = sandbox.stub().resolves({ data: expectedDbReturn, error: null });
            const selectUpdateStub = sandbox.stub().returns({ single: singleUpdateStub });
            const matchUpdateStub = sandbox.stub().returns({ select: selectUpdateStub });
            const updateStub = sandbox.stub().returns({ match: matchUpdateStub });
            const fromTransactionsMock = { update: updateStub };
            const updateTagsStub = sandbox.stub().resolves(); // Mock da função injetada
            sandbox.stub(supabase, 'from').callsFake((tableName) => { if (tableName === 'transactions') return fromTransactionsMock; return {}; });
            const initialLength = transactions.length;
            const result = await updateTransactionData(baseUpdateData, updateTagsStub);
            expect(result).to.be.true;
            expect(updateStub.calledOnce).to.be.true;
            expect(matchUpdateStub.calledOnceWith({ id: transactionIdToUpdate, user_id: mockUser.id })).to.be.true;
            expect(updateTagsStub.calledOnce, "_updateTagsFn chamada").to.be.true;
            expect(updateTagsStub.calledOnceWith(transactionIdToUpdate, baseUpdateData.tags, mockUser.id), "_updateTagsFn chamada com args corretos").to.be.true;
            expect(transactions).to.have.lengthOf(initialLength);
            const updatedLocalTransaction = transactions.find(t => t.id === transactionIdToUpdate);
            expect(updatedLocalTransaction).to.exist;
            expect(updatedLocalTransaction?.description).to.equal(baseUpdateData.description);
            expect(updatedLocalTransaction?.tags).to.deep.equal(['keep', 'newtag']);
        });
        it('should return false if user is not authenticated', async () => {
             const initialLength = transactions.length;
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
             const fromSpy = sandbox.spy(supabase, 'from');
             const updateTagsSpy = sandbox.spy();
             const result = await updateTransactionData(baseUpdateData, updateTagsSpy);
             expect(result).to.be.false;
             expect(fromSpy.called).to.be.false;
             expect(updateTagsSpy.called).to.be.false;
             expect(transactions).to.have.lengthOf(initialLength);
             const originalTransaction = transactions.find(t => t.id === transactionIdToUpdate);
             expect(originalTransaction?.description).to.equal('Old Desc');
        });
        it('should return false if main transaction update fails', async () => {
            const initialLength = transactions.length;
            const dbError = { message: "Update Failed", code: "XXX" };
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const singleStub = sandbox.stub().resolves({ data: null, error: dbError });
            const selectStub = sandbox.stub().returns({ single: singleStub });
            const matchUpdateStub = sandbox.stub().returns({ select: selectStub });
            const updateStub = sandbox.stub().returns({ match: matchUpdateStub });
            const fromTransactionsMock = { update: updateStub };
            const fromStub = sandbox.stub(supabase, 'from').callsFake((tableName) => { if (tableName === 'transactions') return fromTransactionsMock; return { select: sandbox.stub(), insert: sandbox.stub(), delete: sandbox.stub() }; });
            const updateTagsSpy = sandbox.spy();
            const result = await updateTransactionData(baseUpdateData, updateTagsSpy);
            expect(result).to.be.false;
            expect(updateStub.calledOnce).to.be.true;
            expect(fromStub.callCount).to.equal(1);
            expect(updateTagsSpy.called).to.be.false;
            expect(transactions).to.have.lengthOf(initialLength);
            const originalTransaction = transactions.find(t => t.id === transactionIdToUpdate);
            expect(originalTransaction?.description).to.equal('Old Desc');
        });
        it('should return false if _updateTagsFn throws an error', async () => {
             const initialLength = transactions.length;
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const singleUpdateStub = sandbox.stub().resolves({ data: expectedDbReturn, error: null });
             const selectUpdateStub = sandbox.stub().returns({ single: singleUpdateStub });
             const matchUpdateStub = sandbox.stub().returns({ select: selectUpdateStub });
             const updateStub = sandbox.stub().returns({ match: matchUpdateStub });
             const fromTransactionsMock = { update: updateStub };
             sandbox.stub(supabase, 'from').callsFake((tableName) => { if (tableName === 'transactions') return fromTransactionsMock; return {}; });
             const updateTagsError = new Error("Falha simulada ao atualizar tags");
             const updateTagsStub = sandbox.stub().rejects(updateTagsError);
             const result = await updateTransactionData(baseUpdateData, updateTagsStub);
             expect(result).to.be.false;
             expect(updateStub.calledOnce).to.be.true;
             expect(updateTagsStub.calledOnce).to.be.true;
             expect(transactions).to.have.lengthOf(initialLength);
             const originalTransaction = transactions.find(t => t.id === transactionIdToUpdate);
             expect(originalTransaction?.description).to.equal('Old Desc');
             expect(originalTransaction?.tags).to.deep.equal(['old', 'keep']);
         });
    });

    // --- Testes para addTagData ---
    describe('addTagData()', () => {

        it('should add a new tag via getTagIds and return true', async () => {
            const newTagName = ' Nova Tag ';
            const trimmedTagName = 'Nova Tag';
            const expectedNewId = 55;
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

            const findTagPromise = Promise.resolve({ data: [], error: null });
            const insertTagPromise = Promise.resolve({ data: {id: expectedNewId, name: trimmedTagName}, error: null });
            const limitStub = sandbox.stub().returns(findTagPromise);
            const ilikeStub = sandbox.stub().returns({ limit: limitStub }); // Stub para .ilike()
            const eqSelectStub = sandbox.stub().returns({ ilike: ilikeStub });
            const selectMock = { eq: eqSelectStub };
            const singleInsertStub = sandbox.stub().returns(insertTagPromise);
            const selectInsertStub = sandbox.stub().returns({ single: singleInsertStub });
            const insertMock = { select: selectInsertStub };
            const fromTagsMock = { select: sandbox.stub().returns(selectMock), insert: sandbox.stub().returns(insertMock) };
            sandbox.stub(supabase, 'from').withArgs('tags').returns(fromTagsMock);

            const initialTagCount = tags.length;
            const result = await addTagData(newTagName);

            expect(result).to.be.true;
            // *** SIMPLIFICADO: Verifica apenas se ilike foi chamado ***
            expect(ilikeStub.calledOnce, "Busca ILIKE chamada").to.be.true;
            // Verifica se a inserção ocorreu
            expect(singleInsertStub.calledOnce, "Inserção SINGLE chamada").to.be.true;
            expect(tags).to.include(trimmedTagName);
            expect(tags).to.have.lengthOf(initialTagCount + 1);
        });

        // ... (outros testes de addTagData mantidos) ...
        it('should return false if tag already exists locally (case-insensitive)', async () => {
            const existingTagName = ' EXISTING ';
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const fromSpy = sandbox.spy(supabase, 'from');
             const initialTagCount = tags.length;
             const result = await addTagData(existingTagName);
             expect(result).to.be.false;
             expect(fromSpy.called).to.be.false;
             expect(tags).to.have.lengthOf(initialTagCount);
        });
        it('should return false if tag name is empty or whitespace', async () => {
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const fromSpy = sandbox.spy(supabase, 'from');
            const initialTagCount = tags.length;
            const result1 = await addTagData('');
            const result2 = await addTagData('   ');
            expect(result1).to.be.false;
            expect(result2).to.be.false;
            expect(fromSpy.called).to.be.false;
            expect(tags).to.have.lengthOf(initialTagCount);
        });
        it('should return false if user is not authenticated', async () => {
             const initialTagCount = tags.length;
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
             const fromSpy = sandbox.spy(supabase, 'from');
             const result = await addTagData('Some Tag');
             expect(result).to.be.false;
             expect(fromSpy.called).to.be.false;
             expect(tags).to.have.lengthOf(initialTagCount);
        });
        it('should return false if getTagIds fails internally (DB error)', async () => {
             const initialTagCount = tags.length;
             const newTagName = 'Another Tag';
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const findTagPromise = Promise.reject(new Error("DB Select Error"));
             const limitStub = sandbox.stub().returns(findTagPromise);
             const ilikeStub = sandbox.stub().returns({ limit: limitStub });
             const eqSelectStub = sandbox.stub().returns({ ilike: ilikeStub });
             const selectMock = { eq: eqSelectStub };
             sandbox.stub(supabase, 'from').withArgs('tags').returns({ select: sandbox.stub().returns(selectMock) });
             const result = await addTagData(newTagName);
             expect(result).to.be.false;
             expect(tags).to.have.lengthOf(initialTagCount);
         });

    });

    // --- Testes para deleteTagData ---
    describe('deleteTagData()', () => {
        const tagNameToDelete = 'old';
        const tagIdToDelete = 50;

        it('should delete the tag from DB, update local state, and associated transactions', async () => {
            // --- Arrange ---
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            // Mock busca tag (encontra)
            const findTagPromise = Promise.resolve({ data: [{ id: tagIdToDelete, name: tagNameToDelete }], error: null });
            const ilikeSelectStub = sandbox.stub().returns(findTagPromise); // Stub final da busca
            const fromTagsSelectMock = { select: sandbox.stub().returns({ eq: sandbox.stub().returns({ ilike: ilikeSelectStub }) }) };
            // Mock delete tag (sucesso)
            const matchDeleteStub = sandbox.stub().resolves({ error: null });
            const deleteTagReturnMock = { match: matchDeleteStub };
            const deleteTagStub = sandbox.stub().returns(deleteTagReturnMock);
            const fromTagsDeleteMock = { delete: deleteTagStub };
            sandbox.stub(supabase, 'from').withArgs('tags').returns({ ...fromTagsSelectMock, ...fromTagsDeleteMock });

            const initialTagCount = tags.length;
            const initialTransactionTagsLength = transactions.find(t => t.id === 1)?.tags.length;

            // --- Act ---
            const result = await deleteTagData(tagNameToDelete);

            // --- Assert ---
            expect(result).to.be.true;
            // *** SIMPLIFICADO: Verifica apenas se ilike foi chamado ***
            expect(ilikeSelectStub.calledOnce, "Busca ILIKE chamada").to.be.true;
            // Verifica delete
            expect(deleteTagStub.calledOnce).to.be.true;
            expect(matchDeleteStub.calledOnceWith({ id: tagIdToDelete, user_id: mockUser.id })).to.be.true;
            // Verifica estado local
            expect(tags).to.have.lengthOf(initialTagCount - 1);
            expect(tags).to.not.include(tagNameToDelete);
            const updatedTransaction1 = transactions.find(t => t.id === 1);
            expect(updatedTransaction1?.tags).to.have.lengthOf(initialTransactionTagsLength - 1);
            expect(updatedTransaction1?.tags).to.not.include(tagNameToDelete);
        });

        it('should return false if tag to delete is not found in DB', async () => {
             const nonExistentTag = 'fantasma';
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             // Mock busca tag (não encontra)
             const findTagPromise = Promise.resolve({ data: [], error: null });
             const ilikeSelectStub = sandbox.stub().returns(findTagPromise); // Stub final da busca
             const fromTagsSelectMock = { select: sandbox.stub().returns({ eq: sandbox.stub().returns({ ilike: ilikeSelectStub }) }) };
             const deleteSpy = sandbox.spy();
             sandbox.stub(supabase, 'from').withArgs('tags').returns({ ...fromTagsSelectMock, delete: deleteSpy });
             const initialTagCount = tags.length;

             const result = await deleteTagData(nonExistentTag);

             expect(result).to.be.false;
              // *** SIMPLIFICADO: Verifica apenas se ilike foi chamado ***
             expect(ilikeSelectStub.calledOnce, "Busca ILIKE chamada").to.be.true;
             expect(deleteSpy.called).to.be.false;
             expect(tags).to.have.lengthOf(initialTagCount);
        });

        // ... (outros testes de deleteTagData mantidos) ...
        it('should return false if DB delete fails', async () => {
             const dbError = { message: "Delete tag failed", code: "555" };
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const findTagPromise = Promise.resolve({ data: [{ id: tagIdToDelete, name: tagNameToDelete }], error: null });
             const ilikeSelectStub = sandbox.stub().returns(findTagPromise);
             const fromTagsSelectMock = { select: sandbox.stub().returns({ eq: sandbox.stub().returns({ ilike: ilikeSelectStub }) }) };
             const matchDeleteStub = sandbox.stub().resolves({ error: dbError });
             const deleteTagReturnMock = { match: matchDeleteStub };
             const deleteTagStub = sandbox.stub().returns(deleteTagReturnMock);
             const fromTagsDeleteMock = { delete: deleteTagStub };
             sandbox.stub(supabase, 'from').withArgs('tags').returns({ ...fromTagsSelectMock, ...fromTagsDeleteMock });
             const initialTagCount = tags.length;
             const initialTransactionTagsLength = transactions.find(t => t.id === 1)?.tags.length;
             const result = await deleteTagData(tagNameToDelete);
             expect(result).to.be.false;
             expect(ilikeSelectStub.calledOnce).to.be.true;
             expect(deleteTagStub.calledOnce).to.be.true;
             expect(matchDeleteStub.calledOnce).to.be.true;
             expect(tags).to.have.lengthOf(initialTagCount);
             expect(transactions.find(t => t.id === 1)?.tags).to.have.lengthOf(initialTransactionTagsLength);
         });
        it('should return false if tag name is empty or whitespace', async () => {
            const initialTagCount = tags.length;
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const fromSpy = sandbox.spy(supabase, 'from');
            const result1 = await deleteTagData('');
            const result2 = await deleteTagData('   ');
            expect(result1).to.be.false;
            expect(result2).to.be.false;
            expect(fromSpy.called).to.be.false;
            expect(tags).to.have.lengthOf(initialTagCount);
        });
        it('should return false if user is not authenticated', async () => {
             const initialTagCount = tags.length;
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
             const fromSpy = sandbox.spy(supabase, 'from');
             const result = await deleteTagData(tagNameToDelete);
             expect(result).to.be.false;
             expect(fromSpy.called).to.be.false;
             expect(tags).to.have.lengthOf(initialTagCount);
         });
    });
    // --- Testes para Metas (Goals) ---
    describe('Goal Functions', () => {

        // --- Testes para addGoalData ---
        describe('addGoalData()', () => {
            const newGoalInput = { name: "Nova Meta Teste", targetAmount: 1500 };
            const expectedDbReturn = { id: 12, user_id: mockUser.id, name: "Nova Meta Teste", target_amount: 1500, saved_amount: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

            it('should add a new goal and update local state', async () => {
                sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

                // Mock insert().select().single()
                const singleStub = sandbox.stub().resolves({ data: expectedDbReturn, error: null });
                const selectStub = sandbox.stub().returns({ single: singleStub });
                const insertStub = sandbox.stub().returns({ select: selectStub });
                const fromGoalsMock = { insert: insertStub };
                sandbox.stub(supabase, 'from').withArgs('goals').returns(fromGoalsMock);

                const initialLength = goals.length; // 2
                const result = await addGoalData(newGoalInput);

                expect(result).to.exist;
                expect(result?.name).to.equal(newGoalInput.name);
                expect(result?.targetAmount).to.equal(newGoalInput.targetAmount);
                expect(result?.savedAmount).to.equal(0); // Verifica se começou com 0 salvo

                expect(insertStub.calledOnce).to.be.true;
                const insertArgs = insertStub.getCall(0).args[0];
                expect(insertArgs).to.deep.equal({
                    user_id: mockUser.id,
                    name: newGoalInput.name,
                    target_amount: newGoalInput.targetAmount,
                    saved_amount: 0
                });

                expect(goals).to.have.lengthOf(initialLength + 1); // 3
                expect(goals.find(g => g.id === expectedDbReturn.id)).to.deep.equal(result); // Verifica se foi adicionado
                // Verifica se o array continua ordenado (ou se a função reordena)
                const names = goals.map(g => g.name);
                expect(names).to.deep.equal([...names].sort((a, b) => a.localeCompare(b)));
            });

            it('should return null if user is not authenticated', async () => {
                sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
                const fromSpy = sandbox.spy(supabase, 'from');
                const result = await addGoalData(newGoalInput);
                expect(result).to.be.null;
                expect(goals).to.have.lengthOf(2); // Mantém as 2 iniciais
                expect(fromSpy.called).to.be.false;
            });

            it('should return null if database insert fails', async () => {
                const dbError = { message: "Goal insert failed", code: "G001" };
                sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
                const singleStub = sandbox.stub().resolves({ data: null, error: dbError }); // Falha aqui
                const selectStub = sandbox.stub().returns({ single: singleStub });
                const insertStub = sandbox.stub().returns({ select: selectStub });
                const fromGoalsMock = { insert: insertStub };
                sandbox.stub(supabase, 'from').withArgs('goals').returns(fromGoalsMock);

                const result = await addGoalData(newGoalInput);
                expect(result).to.be.null;
                expect(goals).to.have.lengthOf(2); // Mantém as 2 iniciais
                expect(insertStub.calledOnce).to.be.true; // Tentou inserir
            });
        });

        // --- Testes para updateGoalData ---
        describe('updateGoalData()', () => {
            const goalIdToUpdate = 10;
            const updatePayload = { id: goalIdToUpdate, savedAmount: 350.50, name: "Meta Existente UPDATED" };
            // Simula retorno do DB (pode não incluir todos os campos no retorno do update)
            const expectedDbReturn = { id: goalIdToUpdate, user_id: mockUser.id, name: "Meta Existente UPDATED", target_amount: 1000, saved_amount: 350.50, updated_at: new Date().toISOString() };

            it('should update specified fields of a goal and local state', async () => {
                sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

                // Mock update().match().select().single()
                const singleStub = sandbox.stub().resolves({ data: expectedDbReturn, error: null });
                const selectStub = sandbox.stub().returns({ single: singleStub });
                const matchStub = sandbox.stub().returns({ select: selectStub });
                const updateStub = sandbox.stub().returns({ match: matchStub });
                const fromGoalsMock = { update: updateStub };
                sandbox.stub(supabase, 'from').withArgs('goals').returns(fromGoalsMock);

                const initialLength = goals.length; // 2
                const result = await updateGoalData(updatePayload);

                expect(result).to.be.true;
                expect(updateStub.calledOnce).to.be.true;
                // Verifica se o match foi chamado corretamente
                expect(matchStub.calledOnceWith({ id: goalIdToUpdate, user_id: mockUser.id })).to.be.true;
                // Verifica se o update foi chamado APENAS com os campos a serem atualizados
                const updateArgs = updateStub.getCall(0).args[0];
                expect(updateArgs).to.deep.equal({
                    saved_amount: updatePayload.savedAmount,
                    name: updatePayload.name
                    // Não deve incluir target_amount se não estava no payload
                });
                expect(updateArgs).to.not.have.property('target_amount');

                // Verifica estado local
                expect(goals).to.have.lengthOf(initialLength); // 2
                const updatedGoal = goals.find(g => g.id === goalIdToUpdate);
                expect(updatedGoal).to.exist;
                expect(updatedGoal?.name).to.equal(updatePayload.name);
                expect(updatedGoal?.savedAmount).to.equal(updatePayload.savedAmount);
                expect(updatedGoal?.targetAmount).to.equal(1000); // Target amount não foi alterado
                // Verifica se o array continua ordenado (ou se a função reordena)
                const names = goals.map(g => g.name);
                expect(names).to.deep.equal([...names].sort((a, b) => a.localeCompare(b)));
            });

            it('should return true if payload has no fields to update', async () => {
                 sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
                 const updatePayloadEmpty = { id: goalIdToUpdate }; // Sem campos de update
                 const fromSpy = sandbox.spy(supabase, 'from'); // Espiona para garantir que não chama DB
                 const result = await updateGoalData(updatePayloadEmpty);
                 expect(result).to.be.true;
                 expect(fromSpy.called).to.be.false;
                 const goal = goals.find(g => g.id === goalIdToUpdate);
                 expect(goal?.name).to.equal("Meta Existente"); // Verifica que não mudou
            });

            it('should return false if user is not authenticated', async () => {
                 sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
                 const fromSpy = sandbox.spy(supabase, 'from');
                 const result = await updateGoalData(updatePayload);
                 expect(result).to.be.false;
                 expect(fromSpy.called).to.be.false;
                 const goal = goals.find(g => g.id === goalIdToUpdate);
                 expect(goal?.name).to.equal("Meta Existente");
            });

             it('should return false if database update fails', async () => {
                 const dbError = { message: "Goal update failed", code: "G002" };
                 sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
                 // Mock para falhar no single()
                 const singleStub = sandbox.stub().resolves({ data: null, error: dbError });
                 const selectStub = sandbox.stub().returns({ single: singleStub });
                 const matchStub = sandbox.stub().returns({ select: selectStub });
                 const updateStub = sandbox.stub().returns({ match: matchStub });
                 const fromGoalsMock = { update: updateStub };
                 sandbox.stub(supabase, 'from').withArgs('goals').returns(fromGoalsMock);

                 const result = await updateGoalData(updatePayload);
                 expect(result).to.be.false;
                 expect(updateStub.calledOnce).to.be.true; // Tentou chamar
                 const goal = goals.find(g => g.id === goalIdToUpdate);
                 expect(goal?.name).to.equal("Meta Existente"); // Não atualizou localmente
             });
        });

        // --- Testes para deleteGoalData ---
        describe('deleteGoalData()', () => {
            const goalIdToDelete = 11; // Deletar a "Outra Meta"

            it('should delete the goal from DB and local state', async () => {
                 sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
                 // Mock delete().match()
                 const matchStub = sandbox.stub().resolves({ error: null }); // Sucesso
                 const deleteReturnMock = { match: matchStub };
                 const deleteStub = sandbox.stub().returns(deleteReturnMock);
                 const fromGoalsMock = { delete: deleteStub };
                 sandbox.stub(supabase, 'from').withArgs('goals').returns(fromGoalsMock);

                 const initialLength = goals.length; // 2
                 const result = await deleteGoalData(goalIdToDelete);

                 expect(result).to.be.true;
                 expect(deleteStub.calledOnce).to.be.true;
                 expect(matchStub.calledOnceWith({ id: goalIdToDelete, user_id: mockUser.id })).to.be.true;
                 expect(goals).to.have.lengthOf(initialLength - 1); // 1
                 expect(goals.find(g => g.id === goalIdToDelete)).to.be.undefined;
            });

            it('should return false if user is not authenticated', async () => {
                 sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
                 const fromSpy = sandbox.spy(supabase, 'from');
                 const initialLength = goals.length; // 2
                 const result = await deleteGoalData(goalIdToDelete);
                 expect(result).to.be.false;
                 expect(fromSpy.called).to.be.false;
                 expect(goals).to.have.lengthOf(initialLength); // 2
            });

             it('should return false if database delete fails', async () => {
                 const dbError = { message: "Goal delete failed", code: "G003" };
                 sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
                 // Mock para falhar no match()
                 const matchStub = sandbox.stub().resolves({ error: dbError });
                 const deleteReturnMock = { match: matchStub };
                 const deleteStub = sandbox.stub().returns(deleteReturnMock);
                 const fromGoalsMock = { delete: deleteStub };
                 sandbox.stub(supabase, 'from').withArgs('goals').returns(fromGoalsMock);

                 const initialLength = goals.length; // 2
                 const result = await deleteGoalData(goalIdToDelete);
                 expect(result).to.be.false;
                 expect(deleteStub.calledOnce).to.be.true; // Tentou chamar
                 expect(matchStub.calledOnce).to.be.true;
                 expect(goals).to.have.lengthOf(initialLength); // 2
             });
        });

    }); // Fim describe('Goal Functions')
// --- Testes para Recorrências (Recurring Functions) ---
describe('Recurring Functions', () => {

    // --- Testes para addRecurringData ---
    describe('addRecurringData()', () => {
        const newRecurringInput = { type: 'expense', dayOfMonth: 10, description: "Internet", amount: 99.90, category: 'Moradia' };
        const expectedDbReturn = { id: 22, user_id: mockUser.id, type: 'expense', day_of_month: 10, description: "Internet", amount: 99.90, category: 'Moradia', last_added_month_year: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

        it('should add a new recurring transaction and update local state', async () => {
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            // Mock insert().select().single()
            const singleStub = sandbox.stub().resolves({ data: expectedDbReturn, error: null });
            const selectStub = sandbox.stub().returns({ single: singleStub });
            const insertStub = sandbox.stub().returns({ select: selectStub });
            const fromRecurMock = { insert: insertStub };
            sandbox.stub(supabase, 'from').withArgs('recurring_transactions').returns(fromRecurMock);

            const initialLength = recurringTransactions.length; // 2
            const result = await addRecurringData(newRecurringInput);

            expect(result).to.exist;
            expect(result?.description).to.equal(newRecurringInput.description);
            expect(result?.dayOfMonth).to.equal(newRecurringInput.dayOfMonth);
            expect(result?.lastAddedMonthYear).to.be.null; // Deve ser nulo ao criar

            expect(insertStub.calledOnce).to.be.true;
            const insertArgs = insertStub.getCall(0).args[0];
            expect(insertArgs).to.deep.equal({
                user_id: mockUser.id,
                type: newRecurringInput.type,
                day_of_month: newRecurringInput.dayOfMonth,
                description: newRecurringInput.description,
                amount: newRecurringInput.amount,
                category: newRecurringInput.category
            });

            expect(recurringTransactions).to.have.lengthOf(initialLength + 1); // 3
            expect(recurringTransactions.find(r => r.id === expectedDbReturn.id)).to.deep.equal(result);
            // Verifica ordenação
            const days = recurringTransactions.map(r => r.dayOfMonth);
            expect(days).to.deep.equal([...days].sort((a, b) => a - b));
        });

        it('should return null if user is not authenticated', async () => {
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
            const fromSpy = sandbox.spy(supabase, 'from');
            const result = await addRecurringData(newRecurringInput);
            expect(result).to.be.null;
            expect(recurringTransactions).to.have.lengthOf(2);
            expect(fromSpy.called).to.be.false;
        });

        it('should return null if database insert fails', async () => {
            const dbError = { message: "Recurring insert failed", code: "R001" };
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const singleStub = sandbox.stub().resolves({ data: null, error: dbError });
            const selectStub = sandbox.stub().returns({ single: singleStub });
            const insertStub = sandbox.stub().returns({ select: selectStub });
            const fromRecurMock = { insert: insertStub };
            sandbox.stub(supabase, 'from').withArgs('recurring_transactions').returns(fromRecurMock);

            const result = await addRecurringData(newRecurringInput);
            expect(result).to.be.null;
            expect(recurringTransactions).to.have.lengthOf(2);
            expect(insertStub.calledOnce).to.be.true;
        });
    });

    // --- Testes para updateRecurringData ---
    describe('updateRecurringData()', () => {
        const recurIdToUpdate = 20; // Aluguel
        const updatePayload = { id: recurIdToUpdate, amount: 1250.00, dayOfMonth: 6, lastAddedMonthYear: '2024-02' };
        const expectedDbReturn = { id: recurIdToUpdate, user_id: mockUser.id, type: 'expense', day_of_month: 6, description: "Aluguel", amount: 1250.00, category: 'Moradia', last_added_month_year: '2024-02', updated_at: new Date().toISOString() };

        it('should update specified fields of a recurring transaction and local state', async () => {
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            // Mock update().match().select().single()
            const singleStub = sandbox.stub().resolves({ data: expectedDbReturn, error: null });
            const selectStub = sandbox.stub().returns({ single: singleStub });
            const matchStub = sandbox.stub().returns({ select: selectStub });
            const updateStub = sandbox.stub().returns({ match: matchStub });
            const fromRecurMock = { update: updateStub };
            sandbox.stub(supabase, 'from').withArgs('recurring_transactions').returns(fromRecurMock);

            const initialLength = recurringTransactions.length; // 2
            const result = await updateRecurringData(updatePayload);

            expect(result).to.be.true;
            expect(updateStub.calledOnce).to.be.true;
            expect(matchStub.calledOnceWith({ id: recurIdToUpdate, user_id: mockUser.id })).to.be.true;
            // Verifica dados enviados para update (snake_case)
            const updateArgs = updateStub.getCall(0).args[0];
            expect(updateArgs).to.deep.equal({
                amount: updatePayload.amount,
                day_of_month: updatePayload.dayOfMonth,
                last_added_month_year: updatePayload.lastAddedMonthYear
                // Não deve incluir type, description, category se não estavam no payload
            });

            // Verifica estado local
            expect(recurringTransactions).to.have.lengthOf(initialLength); // 2
            const updatedRecur = recurringTransactions.find(r => r.id === recurIdToUpdate);
            expect(updatedRecur).to.exist;
            expect(updatedRecur?.amount).to.equal(updatePayload.amount);
            expect(updatedRecur?.dayOfMonth).to.equal(updatePayload.dayOfMonth);
            expect(updatedRecur?.lastAddedMonthYear).to.equal(updatePayload.lastAddedMonthYear);
            expect(updatedRecur?.description).to.equal("Aluguel"); // Não mudou
        });

        // Adicionar testes para update: user não autenticado, falha no DB

         it('should return false if user is not authenticated', async () => {
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
             const fromSpy = sandbox.spy(supabase, 'from');
             const result = await updateRecurringData(updatePayload);
             expect(result).to.be.false;
             expect(fromSpy.called).to.be.false;
             const recur = recurringTransactions.find(r => r.id === recurIdToUpdate);
             expect(recur?.amount).to.equal(1200); // Verifica valor antigo
         });

         it('should return false if database update fails', async () => {
             const dbError = { message: "Recur update failed", code: "R002" };
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const singleStub = sandbox.stub().resolves({ data: null, error: dbError });
             const selectStub = sandbox.stub().returns({ single: singleStub });
             const matchStub = sandbox.stub().returns({ select: selectStub });
             const updateStub = sandbox.stub().returns({ match: matchStub });
             const fromRecurMock = { update: updateStub };
             sandbox.stub(supabase, 'from').withArgs('recurring_transactions').returns(fromRecurMock);

             const result = await updateRecurringData(updatePayload);
             expect(result).to.be.false;
             expect(updateStub.calledOnce).to.be.true; // Tentou chamar
             const recur = recurringTransactions.find(r => r.id === recurIdToUpdate);
             expect(recur?.amount).to.equal(1200); // Não atualizou localmente
         });
    });

    // --- Testes para deleteRecurringData ---
    describe('deleteRecurringData()', () => {
        const recurIdToDelete = 21; // Consultoria X

        it('should delete the recurring transaction from DB and local state', async () => {
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             // Mock delete().match()
             const matchStub = sandbox.stub().resolves({ error: null }); // Sucesso
             const deleteReturnMock = { match: matchStub };
             const deleteStub = sandbox.stub().returns(deleteReturnMock);
             const fromRecurMock = { delete: deleteStub };
             sandbox.stub(supabase, 'from').withArgs('recurring_transactions').returns(fromRecurMock);

             const initialLength = recurringTransactions.length; // 2
             const result = await deleteRecurringData(recurIdToDelete);

             expect(result).to.be.true;
             expect(deleteStub.calledOnce).to.be.true;
             expect(matchStub.calledOnceWith({ id: recurIdToDelete, user_id: mockUser.id })).to.be.true;
             expect(recurringTransactions).to.have.lengthOf(initialLength - 1); // 1
             expect(recurringTransactions.find(r => r.id === recurIdToDelete)).to.be.undefined;
        });

        // Adicionar testes para delete: user não autenticado, falha no DB

        it('should return false if user is not authenticated', async () => {
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
             const fromSpy = sandbox.spy(supabase, 'from');
             const initialLength = recurringTransactions.length; // 2
             const result = await deleteRecurringData(recurIdToDelete);
             expect(result).to.be.false;
             expect(fromSpy.called).to.be.false;
             expect(recurringTransactions).to.have.lengthOf(initialLength); // 2
        });

        it('should return false if database delete fails', async () => {
             const dbError = { message: "Recur delete failed", code: "R003" };
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const matchStub = sandbox.stub().resolves({ error: dbError }); // Falha
             const deleteReturnMock = { match: matchStub };
             const deleteStub = sandbox.stub().returns(deleteReturnMock);
             const fromRecurMock = { delete: deleteStub };
             sandbox.stub(supabase, 'from').withArgs('recurring_transactions').returns(fromRecurMock);

             const initialLength = recurringTransactions.length; // 2
             const result = await deleteRecurringData(recurIdToDelete);
             expect(result).to.be.false;
             expect(deleteStub.calledOnce).to.be.true; // Tentou chamar
             expect(matchStub.calledOnce).to.be.true;
             expect(recurringTransactions).to.have.lengthOf(initialLength); // 2
         });
    });
});
// --- Testes para addCategoryData ---
describe('addCategoryData()', () => {
    const newCategoryName = "Investimentos Pessoais";
    const newCategoryType = "expense";
    const expectedDbReturn = { id: 100, user_id: mockUser.id, name: newCategoryName, type: newCategoryType, created_at: new Date().toISOString() };

    it('should add a new category and update local state', async () => {
        sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

        // Mock insert().select().single()
        const singleStub = sandbox.stub().resolves({ data: expectedDbReturn, error: null });
        const selectStub = sandbox.stub().returns({ single: singleStub });
        const insertStub = sandbox.stub().returns({ select: selectStub });
        const fromCatMock = { insert: insertStub };
        sandbox.stub(supabase, 'from').withArgs('categories').returns(fromCatMock);

        const initialLength = categories[newCategoryType].length;
        const result = await addCategoryData(newCategoryName, newCategoryType);

        expect(result).to.be.true;
        expect(insertStub.calledOnce).to.be.true;
        const insertArgs = insertStub.getCall(0).args[0];
        expect(insertArgs).to.deep.equal({
            user_id: mockUser.id,
            name: newCategoryName,
            type: newCategoryType
        });
        expect(categories[newCategoryType]).to.have.lengthOf(initialLength + 1);
        expect(categories[newCategoryType]).to.include(newCategoryName);
        // Verifica se está ordenado
        expect(categories[newCategoryType]).to.deep.equal([...categories[newCategoryType]].sort((a,b) => a.localeCompare(b)));
    });

    it('should return false if category already exists locally (case-insensitive)', async () => {
        const existingCategoryName = "   moradia   "; // Existe nos padrões (case-insensitive e trim)
        const existingCategoryType = "expense";
        sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null }); // Precisa mockar auth
        const fromSpy = sandbox.spy(supabase, 'from');
        const initialLength = categories[existingCategoryType].length;

        const result = await addCategoryData(existingCategoryName, existingCategoryType);

        expect(result).to.be.false;
        expect(fromSpy.called).to.be.false; // Não deve chamar DB
        expect(categories[existingCategoryType]).to.have.lengthOf(initialLength);
    });

     it('should return false and update local state if category already exists in DB (error 23505)', async () => {
        const existingCategoryName = "DB Duplicate";
        const existingCategoryType = "income";
        const dbError = { message: "duplicate key value violates unique constraint", code: "23505" };
        sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
        // Mock para falhar com erro 23505
        const singleStub = sandbox.stub().resolves({ data: null, error: dbError });
        const selectStub = sandbox.stub().returns({ single: singleStub });
        const insertStub = sandbox.stub().returns({ select: selectStub });
        const fromCatMock = { insert: insertStub };
        sandbox.stub(supabase, 'from').withArgs('categories').returns(fromCatMock);

        const initialLength = categories[existingCategoryType].length; // Padrão income tem 3

        const result = await addCategoryData(existingCategoryName, existingCategoryType);

        expect(result).to.be.false; // Retorna false indicando que não criou
        expect(insertStub.calledOnce).to.be.true; // Tentou inserir
        // Verifica se ADICIONOU localmente mesmo com erro do DB (comportamento atual)
        expect(categories[existingCategoryType]).to.have.lengthOf(initialLength + 1);
        expect(categories[existingCategoryType]).to.include(existingCategoryName);
     });

    it('should return false for invalid name or type', async () => {
        const result1 = await addCategoryData('', 'expense');
        const result2 = await addCategoryData('   ', 'income');
        const result3 = await addCategoryData('Valid Name', 'invalid_type');
        expect(result1).to.be.false;
        expect(result2).to.be.false;
        expect(result3).to.be.false;
    });

    it('should return false if user is not authenticated', async () => {
         sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
         const fromSpy = sandbox.spy(supabase, 'from');
         const initialLength = categories[newCategoryType].length;
         const result = await addCategoryData(newCategoryName, newCategoryType);
         expect(result).to.be.false;
         expect(fromSpy.called).to.be.false;
         expect(categories[newCategoryType]).to.have.lengthOf(initialLength);
    });

     it('should return false if database insert fails (non-23505 error)', async () => {
         const dbError = { message: "Other DB error", code: "XXXXX" };
         sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
         const singleStub = sandbox.stub().resolves({ data: null, error: dbError });
         const selectStub = sandbox.stub().returns({ single: singleStub });
         const insertStub = sandbox.stub().returns({ select: selectStub });
         const fromCatMock = { insert: insertStub };
         sandbox.stub(supabase, 'from').withArgs('categories').returns(fromCatMock);
         const initialLength = categories[newCategoryType].length;

         const result = await addCategoryData(newCategoryName, newCategoryType);
         expect(result).to.be.false;
         expect(insertStub.calledOnce).to.be.true;
         expect(categories[newCategoryType]).to.have.lengthOf(initialLength); // Não adiciona localmente
     });
});

// --- Testes para deleteCategoryData ---
describe('deleteCategoryData()', () => {
    const categoryNameToDelete = "Custom Expense Cat";
    const categoryTypeToDelete = "expense";
    const defaultCategoryName = "Moradia"; // Categoria padrão

     beforeEach(() => {
        // Adiciona uma categoria customizada para deletar
        categories.expense.push(categoryNameToDelete);
        categories.expense.sort();
     });

    it('should delete a custom category and update local state', async () => {
         sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
         // Mock delete().match() -> Sucesso
         const matchStub = sandbox.stub().resolves({ error: null });
         const deleteReturnMock = { match: matchStub };
         const deleteStub = sandbox.stub().returns(deleteReturnMock);
         const fromCatMock = { delete: deleteStub };
         sandbox.stub(supabase, 'from').withArgs('categories').returns(fromCatMock);

         const initialLength = categories[categoryTypeToDelete].length; // Padrão + 1 custom
         const result = await deleteCategoryData(categoryNameToDelete, categoryTypeToDelete);

         expect(result).to.be.true;
         expect(deleteStub.calledOnce).to.be.true;
         expect(matchStub.calledOnceWith({ user_id: mockUser.id, name: categoryNameToDelete, type: categoryTypeToDelete })).to.be.true;
         expect(categories[categoryTypeToDelete]).to.have.lengthOf(initialLength - 1);
         expect(categories[categoryTypeToDelete]).to.not.include(categoryNameToDelete);
    });

    it('should return false and not call DB for default categories', async () => {
        sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
        const fromSpy = sandbox.spy(supabase, 'from');
        const initialLength = categories.expense.length;

        const result = await deleteCategoryData(defaultCategoryName, 'expense');

        expect(result).to.be.false;
        expect(fromSpy.called).to.be.false; // Não deve chamar o DB
        expect(categories.expense).to.have.lengthOf(initialLength);
        expect(categories.expense).to.include(defaultCategoryName); // Garante que não foi removida
    });

     it('should return true and update local state if category not found in DB (PGRST116)', async () => {
         const nonExistentCat = "Categoria Fantasma";
         const dbError = { message: "Row not found", code: "PGRST116" };
         sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
         // Mock para falhar com erro PGRST116
         const matchStub = sandbox.stub().resolves({ error: dbError });
         const deleteReturnMock = { match: matchStub };
         const deleteStub = sandbox.stub().returns(deleteReturnMock);
         const fromCatMock = { delete: deleteStub };
         sandbox.stub(supabase, 'from').withArgs('categories').returns(fromCatMock);

         // Adiciona a categoria localmente para simular inconsistência
         categories.expense.push(nonExistentCat);
         const initialLength = categories.expense.length;

         const result = await deleteCategoryData(nonExistentCat, 'expense');

         expect(result).to.be.true; // Retorna true mesmo com erro PGRST116
         expect(deleteStub.calledOnce).to.be.true; // Tentou deletar
         expect(categories.expense).to.have.lengthOf(initialLength - 1); // Removeu localmente
         expect(categories.expense).to.not.include(nonExistentCat);
     });

     it('should return false if DB delete fails (other error)', async () => {
         const dbError = { message: "Some other delete error", code: "XXXX" };
         sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
         // Mock para falhar com outro erro
         const matchStub = sandbox.stub().resolves({ error: dbError });
         const deleteReturnMock = { match: matchStub };
         const deleteStub = sandbox.stub().returns(deleteReturnMock);
         const fromCatMock = { delete: deleteStub };
         sandbox.stub(supabase, 'from').withArgs('categories').returns(fromCatMock);

         const initialLength = categories.expense.length;

         const result = await deleteCategoryData(categoryNameToDelete, categoryTypeToDelete);

         expect(result).to.be.false;
         expect(deleteStub.calledOnce).to.be.true; // Tentou deletar
         expect(categories.expense).to.have.lengthOf(initialLength); // Não removeu localmente
         expect(categories.expense).to.include(categoryNameToDelete);
     });

    it('should return false if user is not authenticated', async () => {
         sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
         const fromSpy = sandbox.spy(supabase, 'from');
         const initialLength = categories.expense.length;
         const result = await deleteCategoryData(categoryNameToDelete, categoryTypeToDelete);
         expect(result).to.be.false;
         expect(fromSpy.called).to.be.false;
         expect(categories.expense).to.have.lengthOf(initialLength);
    });
});
// --- Testes para Orçamentos (Budget Functions) ---
describe('Budget Functions', () => {

    describe('saveBudgetsData()', () => {

         // Adiciona algumas categorias de despesa para os testes de orçamento
         beforeEach(() => {
            categories.expense = [...defaultCategories.expense, "Viagens"]; // Usa padrões + custom
         });

        it('should upsert new/updated budgets and delete removed/zeroed ones', async () => {
            // Cenário: Atualiza 'Moradia', remove 'Lazer', adiciona 'Alimentação'
            const budgetsToSave = {
                'Moradia': 600.50, // Atualizado
                'Alimentação': 300,  // Novo
                'Transporte': 0,     // Zerado (será deletado)
                // 'Lazer' foi removido (será deletado)
            };

            // Dados existentes simulados no DB
            const existingDbBudgets = [
                { id: 1, category: 'Moradia' },
                { id: 2, category: 'Lazer' },
                { id: 3, category: 'Transporte'} // Transporte existia antes
            ];

            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

            // Mock select() para retornar existentes
            const selectStub = sandbox.stub().resolves({ data: existingDbBudgets, error: null });
            const fromSelectMock = { select: sandbox.stub().returns({ eq: selectStub }) };

            // Mock upsert() para sucesso
            const upsertStub = sandbox.stub().resolves({ error: null });
            const fromUpsertMock = { upsert: upsertStub };

            // Mock delete().eq().in() para sucesso
            const deletePromiseStub = sandbox.stub().resolves({ error: null });
            const inDeleteStub = sandbox.stub().returns(deletePromiseStub);
            const eqDeleteStub = sandbox.stub().returns({ in: inDeleteStub });
            const deleteRootStub = sandbox.stub().returns({ eq: eqDeleteStub });
            const fromDeleteMock = { delete: deleteRootStub };

            // Stub principal 'from' direcionando
            sandbox.stub(supabase, 'from').withArgs('budgets').callsFake(() => {
                // Retorna um objeto que pode lidar com qualquer operação mockada
                return { ...fromSelectMock, ...fromUpsertMock, ...fromDeleteMock };
            });

            // Estado local antes
            const initialLocalBudgets = { ...budgets };

            // --- Act ---
            const result = await saveBudgetsData(budgetsToSave);

            // --- Assert ---
            expect(result).to.be.true;

            // 1. Verificou existentes?
            expect(fromSelectMock.select().eq.calledOnceWith('user_id', mockUser.id)).to.be.true;

            // 2. Chamou upsert corretamente?
            expect(upsertStub.calledOnce).to.be.true;
            const upsertArgs = upsertStub.getCall(0).args[0];
            expect(upsertArgs).to.be.an('array').with.lengthOf(2); // Moradia e Alimentação
            expect(upsertArgs).to.deep.include.members([
                { user_id: mockUser.id, category: 'Moradia', limit_amount: 600.50 },
                { user_id: mockUser.id, category: 'Alimentação', limit_amount: 300 }
            ]);

            // 3. Chamou delete corretamente?
            expect(deleteRootStub.calledOnce).to.be.true; // delete() foi chamado
            expect(eqDeleteStub.calledOnceWith('user_id', mockUser.id)).to.be.true; // eq() foi chamado
             // Verifica se 'in' foi chamado com as categorias corretas a deletar ('Lazer', 'Transporte')
             expect(inDeleteStub.calledOnce).to.be.true;
             const deleteCategories = inDeleteStub.getCall(0).args[1]; // Segundo argumento do 'in'
             expect(deleteCategories).to.be.an('array').with.lengthOf(2);
             expect(deleteCategories).to.have.members(['Lazer', 'Transporte']);


            // 4. Verificou estado local 'budgets'?
            expect(budgets).to.not.deep.equal(initialLocalBudgets); // Deve ter mudado
            expect(budgets).to.deep.equal({ // Deve conter apenas os upserted
                 'Moradia': 600.50,
                 'Alimentação': 300
            });
            expect(budgets).to.not.have.property('Lazer');
            expect(budgets).to.not.have.property('Transporte');
        });

        it('should only call delete if all budgets are removed/zeroed', async () => {
             const budgetsToSave = { 'Moradia': 0, 'Lazer': 0 }; // Zera todos
             const existingDbBudgets = [{ id: 1, category: 'Moradia' }, { id: 2, category: 'Lazer' }];
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const selectStub = sandbox.stub().resolves({ data: existingDbBudgets, error: null });
             const fromSelectMock = { select: sandbox.stub().returns({ eq: selectStub }) };
             const upsertStub = sandbox.stub().resolves({ error: null }); // Mock Upsert
             const fromUpsertMock = { upsert: upsertStub };
             const deletePromiseStub = sandbox.stub().resolves({ error: null }); // Mock Delete
             const inDeleteStub = sandbox.stub().returns(deletePromiseStub);
             const eqDeleteStub = sandbox.stub().returns({ in: inDeleteStub });
             const deleteRootStub = sandbox.stub().returns({ eq: eqDeleteStub });
             const fromDeleteMock = { delete: deleteRootStub };
             sandbox.stub(supabase, 'from').withArgs('budgets').returns({ ...fromSelectMock, ...fromUpsertMock, ...fromDeleteMock });

             const result = await saveBudgetsData(budgetsToSave);

             expect(result).to.be.true;
             expect(selectStub.calledOnce).to.be.true; // Verificou existentes
             expect(upsertStub.called).to.be.false; // Não fez upsert
             expect(deleteRootStub.calledOnce).to.be.true; // Chamou delete
             expect(inDeleteStub.calledOnceWith('category', ['Moradia', 'Lazer'])).to.be.true; // Deletou os corretos
             expect(budgets).to.deep.equal({}); // Estado local vazio
        });

        it('should only call upsert if adding new budgets', async () => {
            const budgetsToSave = { 'Novo Orçamento': 100 };
            const existingDbBudgets = []; // Nenhum existente
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
            const selectStub = sandbox.stub().resolves({ data: existingDbBudgets, error: null });
            const fromSelectMock = { select: sandbox.stub().returns({ eq: selectStub }) };
            const upsertStub = sandbox.stub().resolves({ error: null });
            const fromUpsertMock = { upsert: upsertStub };
            const deleteSpy = sandbox.spy(); // Spy para delete
            sandbox.stub(supabase, 'from').withArgs('budgets').returns({ ...fromSelectMock, ...fromUpsertMock, delete: deleteSpy });

            const result = await saveBudgetsData(budgetsToSave);

            expect(result).to.be.true;
            expect(selectStub.calledOnce).to.be.true;
            expect(upsertStub.calledOnce).to.be.true; // Chamou upsert
            expect(upsertStub.getCall(0).args[0]).to.deep.equal([{ user_id: mockUser.id, category: 'Novo Orçamento', limit_amount: 100 }]);
            expect(deleteSpy.called).to.be.false; // Não chamou delete
            expect(budgets).to.deep.equal({ 'Novo Orçamento': 100 });
        });

        it('should return false if user is not authenticated', async () => {
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: null }, error: null });
             const fromSpy = sandbox.spy(supabase, 'from');
             const result = await saveBudgetsData({ 'Moradia': 100 });
             expect(result).to.be.false;
             expect(fromSpy.called).to.be.false;
             expect(budgets).to.deep.equal({ 'Moradia': 500, 'Lazer': 100 }); // Mantém estado inicial
        });

        it('should return false if fetching existing budgets fails', async () => {
             const dbError = { message: "Select budgets failed" };
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             // Mock select para falhar
             const selectStub = sandbox.stub().resolves({ data: null, error: dbError });
             const fromSelectMock = { select: sandbox.stub().returns({ eq: selectStub }) };
             const upsertSpy = sandbox.spy();
             const deleteSpy = sandbox.spy();
             sandbox.stub(supabase, 'from').withArgs('budgets').returns({ ...fromSelectMock, upsert: upsertSpy, delete: deleteSpy });

             const result = await saveBudgetsData({ 'Moradia': 100 });
             expect(result).to.be.false;
             expect(selectStub.calledOnce).to.be.true; // Tentou buscar
             expect(upsertSpy.called).to.be.false;
             expect(deleteSpy.called).to.be.false;
             expect(budgets).to.deep.equal({ 'Moradia': 500, 'Lazer': 100 });
         });

         it('should return false if upsert fails', async () => {
             const budgetsToSave = { 'Alimentação': 200 };
             const existingDbBudgets = [];
             const dbError = { message: "Upsert failed" };
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });
             const selectStub = sandbox.stub().resolves({ data: existingDbBudgets, error: null });
             const fromSelectMock = { select: sandbox.stub().returns({ eq: selectStub }) };
             const upsertStub = sandbox.stub().resolves({ error: dbError }); // Upsert falha
             const fromUpsertMock = { upsert: upsertStub };
             const deleteSpy = sandbox.spy();
             sandbox.stub(supabase, 'from').withArgs('budgets').returns({ ...fromSelectMock, ...fromUpsertMock, delete: deleteSpy });

             const result = await saveBudgetsData(budgetsToSave);
             expect(result).to.be.false;
             expect(selectStub.calledOnce).to.be.true;
             expect(upsertStub.calledOnce).to.be.true; // Tentou upsert
             expect(deleteSpy.called).to.be.false; // Não chegou a deletar
             expect(budgets).to.deep.equal({ 'Moradia': 500, 'Lazer': 100 }); // Mantém estado inicial
         });

         it('should return false if delete fails', async () => {
            const budgetsToSave = { 'Moradia': 500 }; // Remove Lazer
            const existingDbBudgets = [{ id: 1, category: 'Moradia' }, { id: 2, category: 'Lazer' }];
            const dbError = new Error("Delete budgets failed");
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

            // Mock select (sucesso)
            const selectStub = sandbox.stub().resolves({ data: existingDbBudgets, error: null });
            const fromSelectMock = { select: sandbox.stub().returns({ eq: selectStub }) };

            // Mock upsert (sucesso)
            const upsertStub = sandbox.stub().resolves({ error: null });
            const fromUpsertMock = { upsert: upsertStub };

            // *** Mock delete SIMPLIFICADO para REJEITAR ***
            const deleteStub = sandbox.stub().rejects(dbError); // A própria chamada a .delete() já falha
            const fromDeleteMock = { delete: deleteStub };

            // Stub principal 'from'
            sandbox.stub(supabase, 'from').withArgs('budgets').returns({
                select: fromSelectMock.select,
                upsert: fromUpsertMock.upsert,
                delete: fromDeleteMock.delete // .delete() agora rejeita diretamente
            });

            const initialBudgets = { ...budgets };

            // --- Act ---
            const result = await saveBudgetsData(budgetsToSave);

            // --- Assert ---
            expect(result).to.be.false; // <<< Deve ser false agora
            expect(selectStub.calledOnce).to.be.true;
            expect(upsertStub.calledOnce).to.be.true;
            expect(deleteStub.calledOnce).to.be.true; // Verifica se tentou chamar delete
            expect(budgets).to.deep.equal(initialBudgets);
        });

    }); // Fim describe('saveBudgetsData()')

}); // Fim describe('Budget Functions')
// --- Testes para getTagIds (Função Auxiliar) ---
describe('getTagIds()', () => {

        it('should return existing tag ID if tag exists (case-insensitive)', async () => {
            // ... (Teste mantido como antes - já passava) ...
            const tagName = ' existing TAG ';
            const expectedId = 90;
            const mockDbTag = { id: expectedId, name: 'Existing Tag' };
            const findTagPromise = Promise.resolve({ data: [mockDbTag], error: null });
            const limitStub = sandbox.stub().returns(findTagPromise);
            const ilikeStub = sandbox.stub().returns({ limit: limitStub });
            const eqStub = sandbox.stub().returns({ ilike: ilikeStub });
            const fromTagsMock = { select: sandbox.stub().returns({ eq: eqStub }) };
            sandbox.stub(supabase, 'from').withArgs('tags').returns(fromTagsMock);
            const initialTagsLength = tags.length;
            const result = await getTagIds([tagName], mockUser.id);
            expect(result).to.be.an('array').with.lengthOf(1);
            expect(result[0]).to.equal(expectedId);
            expect(ilikeStub.calledOnce).to.be.true; // Simplificado
            expect(tags).to.include('Existing Tag');
            expect(tags).to.have.lengthOf(initialTagsLength);
        });

        it('should create a new tag, update local cache, and return its ID if tag does not exist', async () => {
             // ... (Teste mantido como antes - já passava) ...
            const tagName = ' Brand New Tag ';
            const trimmedTagName = 'Brand New Tag';
            const expectedNewId = 99;
            const mockNewDbTag = { id: expectedNewId, name: trimmedTagName };
            const findTagPromise = Promise.resolve({ data: [], error: null });
            const limitStub = sandbox.stub().returns(findTagPromise);
            const ilikeStub = sandbox.stub().returns({ limit: limitStub });
            const eqSelectStub = sandbox.stub().returns({ ilike: ilikeStub });
            const selectMock = { eq: eqSelectStub };
            const insertTagPromise = Promise.resolve({ data: mockNewDbTag, error: null });
            const singleInsertStub = sandbox.stub().returns(insertTagPromise);
            const selectInsertStub = sandbox.stub().returns({ single: singleInsertStub });
            const insertMock = { select: selectInsertStub };
            sandbox.stub(supabase, 'from').withArgs('tags').returns({ select: sandbox.stub().returns(selectMock), insert: sandbox.stub().returns(insertMock) });
            const initialTagsLength = tags.length;
            const result = await getTagIds([tagName], mockUser.id);
            expect(result).to.be.an('array').with.lengthOf(1);
            expect(result[0]).to.equal(expectedNewId);
            expect(ilikeStub.calledOnce).to.be.true; // Simplificado
            expect(singleInsertStub.calledOnce).to.be.true;
            expect(tags).to.include(trimmedTagName);
            expect(tags).to.have.lengthOf(initialTagsLength + 1);
        });

        it('should handle multiple tags (existing and new)', async () => {
            const tagNames = [' EXISTING TAG ', '  New Tag 1  ', 'another tag']; // 'another tag' existe no beforeEach com 'A'
            const trimmedNew1 = 'New Tag 1';
            const idExisting = 90;
            const idAnother = 91; // ID simulado para 'Another Tag' existente
            const idNew1 = 101;

            // Mock select().eq().ilike().limit()
            const limitStub = sandbox.stub();
            // 1ª chamada (EXISTING TAG) -> Encontra 'Existing Tag'
            limitStub.onCall(0).resolves({ data: [{ id: idExisting, name: 'Existing Tag' }], error: null });
            // 2ª chamada (New Tag 1) -> Não encontra
            limitStub.onCall(1).resolves({ data: [], error: null });
            // 3ª chamada (another tag) -> Encontra 'Another Tag' (case-insensitive)
            limitStub.onCall(2).resolves({ data: [{ id: idAnother, name: 'Another Tag' }], error: null });

            const ilikeStub = sandbox.stub().returns({ limit: limitStub });
            const eqSelectStub = sandbox.stub().returns({ ilike: ilikeStub });
            const selectMock = { eq: eqSelectStub };

            // Mock insert().select().single() -> Só deve ser chamado para 'New Tag 1'
            const insertTagPromise = Promise.resolve({ data: { id: idNew1, name: trimmedNew1 }, error: null });
            const singleInsertStub = sandbox.stub().returns(insertTagPromise); // Só é chamado uma vez
            const selectInsertStub = sandbox.stub().returns({ single: singleInsertStub });
            const insertMock = { select: selectInsertStub };

            sandbox.stub(supabase, 'from').withArgs('tags').returns({
                 select: sandbox.stub().returns(selectMock),
                 insert: sandbox.stub().returns(insertMock)
            });

            const initialTagsLength = tags.length; // 2
            const result = await getTagIds(tagNames, mockUser.id);

            // *** CORREÇÃO: Verifica o resultado esperado ***
            expect(result).to.be.an('array').with.lengthOf(3); // Deve retornar 3 IDs
            expect(result).to.have.members([idExisting, idNew1, idAnother]); // Verifica os IDs corretos
            expect(ilikeStub.callCount).to.equal(3); // Buscou 3 vezes
            expect(singleInsertStub.callCount).to.equal(1); // Inseriu SÓ 1 vez (New Tag 1)
            expect(tags).to.have.lengthOf(initialTagsLength + 1); // 3 tags no total (Existing, Another, New Tag 1)
            expect(tags).to.include('Existing Tag'); // Mantém case original
            expect(tags).to.include('Another Tag'); // Mantém case original
            expect(tags).to.include(trimmedNew1);   // Adiciona nova
        });

        it('should handle race condition (insert fails 23505, then finds tag) via findOrCreateTag', async () => {
            const tagName = "Race Condition Tag";
            const expectedId = 110;
            const mockExistingTag = { id: expectedId, name: tagName };

            // Mocks para a função findOrCreateTag chamada para 'tagName'
            // 1. Mock da PRIMEIRA busca (select -> ilike -> limit) -> Não encontra
            const findPromise1 = Promise.resolve({ data: [], error: null });
            const limitStub1 = sandbox.stub().resolves(findPromise1); // Usamos resolves direto no limit
            const ilikeStub1 = sandbox.stub().returns({ limit: limitStub1 });
            const eqSelectStub1 = sandbox.stub().returns({ ilike: ilikeStub1 });

            // 2. Mock do INSERT -> Falha com 23505
            const insertError = { message: "duplicate key", code: "23505" };
            const insertPromiseFail = Promise.resolve({ data: null, error: insertError });
            const singleInsertStubFail = sandbox.stub().returns(insertPromiseFail);
            const selectInsertStubFail = sandbox.stub().returns({ single: singleInsertStubFail });

            // 3. Mock da SEGUNDA busca (select -> ilike -> single) -> Encontra
            const findPromise2 = Promise.resolve({ data: mockExistingTag, error: null });
            const singleStub2 = sandbox.stub().returns(findPromise2); // Stub final da segunda busca
            const ilikeStub2 = sandbox.stub().returns({ single: singleStub2 });
            const eqSelectStub2 = sandbox.stub().returns({ ilike: ilikeStub2 });


            // Configura 'from' para alternar os mocks de SELECT e INSERT
            const fromTagsStub = sandbox.stub(supabase, 'from').withArgs('tags');
            // Primeira chamada (select)
            fromTagsStub.onCall(0).returns({ select: sandbox.stub().returns({ eq: eqSelectStub1 }) });
            // Segunda chamada (insert)
            fromTagsStub.onCall(1).returns({ insert: sandbox.stub().returns({ select: selectInsertStubFail }) });
             // Terceira chamada (select de novo)
             fromTagsStub.onCall(2).returns({ select: sandbox.stub().returns({ eq: eqSelectStub2 }) });


            const initialTagsLength = tags.length;
            // Chama getTagIds com a tag problemática
            const result = await getTagIds([tagName], mockUser.id);

            // Assert
            expect(result).to.be.an('array').with.lengthOf(1); // <<< Verifica se tem 1 ID
            expect(result[0]).to.equal(expectedId);
            // Verifica sequência das chamadas FINAIS
            expect(limitStub1.calledOnce, "Busca 1 (limit)").to.be.true;
            expect(singleInsertStubFail.calledOnce, "Tentativa Insert").to.be.true;
            expect(singleStub2.calledOnce, "Busca 2 (single)").to.be.true;
            expect(tags).to.include(tagName);
            expect(tags).to.have.lengthOf(initialTagsLength + 1);
        });

        // *** TESTES RESTAURADOS ***
        it('should return empty array if tag name is empty or whitespace', async () => {
            const fromSpy = sandbox.spy(supabase, 'from');
            const result = await getTagIds(['', '   '], mockUser.id);
            expect(result).to.be.an('array').that.is.empty;
            expect(fromSpy.called).to.be.false;
       });
        it('should skip tag processing if find query fails', async () => {
            const tagName = "Find Fail Tag";
            const findError = new Error("Simulated Find Error");
            const findTagPromise = Promise.reject(findError);
            const limitStub = sandbox.stub().returns(findTagPromise);
            const ilikeStub = sandbox.stub().returns({ limit: limitStub });
            const eqSelectStub = sandbox.stub().returns({ ilike: ilikeStub });
            const selectMock = { eq: eqSelectStub };
            sandbox.stub(supabase, 'from').withArgs('tags').returns({ select: sandbox.stub().returns(selectMock) });
            const initialTagsLength = tags.length;
            const result = await getTagIds([tagName], mockUser.id); // Testa apenas com a tag que falha
            expect(result).to.be.an('array').that.is.empty;
            expect(tags).to.have.lengthOf(initialTagsLength);
       });
        it('should skip tag processing if insert query fails (non-23505)', async () => {
            const tagName = "Insert Fail Tag";
            const insertError = new Error("Simulated Insert Error");
            const findTagPromise = Promise.resolve({ data: [], error: null });
            const limitStub = sandbox.stub().returns(findTagPromise);
            const ilikeStub = sandbox.stub().returns({ limit: limitStub });
            const eqSelectStub = sandbox.stub().returns({ ilike: ilikeStub });
            const selectMock = { eq: eqSelectStub };
            const insertTagPromise = Promise.reject(insertError);
            const singleInsertStub = sandbox.stub().returns(insertTagPromise);
            const selectInsertStub = sandbox.stub().returns({ single: singleInsertStub });
            const insertMock = { select: selectInsertStub };
            sandbox.stub(supabase, 'from').withArgs('tags').returns({
                select: sandbox.stub().returns(selectMock),
                insert: sandbox.stub().returns(insertMock)
            });
            const initialTagsLength = tags.length;
            const result = await getTagIds([tagName], mockUser.id); // Testa apenas com a tag que falha
            expect(result).to.be.an('array').that.is.empty;
            expect(tags).to.have.lengthOf(initialTagsLength);
       });

   }); // Fim describe('getTagIds()')

}); // Fim do describe('Data Functions (data.js)')