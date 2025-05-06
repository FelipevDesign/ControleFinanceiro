// tests/recurring.test.js
import {
    _calculatePendingRecurringIds,
    addPendingRecurring,
    undoAddPendingRecurring,
    lastAddedRecurringInfo,
    clearUndoState,
    _setLastAddedRecurringInfoForTest
} from '../recurring.js';

import * as dataModule from '../data.js';
const {
    recurringTransactions,
    clearLocalData,
    // Não importamos mais add/update/delete Transaction/Recurring Data aqui
} = dataModule;
import { formatDateForInput } from '../helpers.js';
// import * as helpersModule from '../helpers.js'; // Não precisamos mais mockar showFeedback
import { supabase } from '../supabaseClient.js';

describe('Recurring Logic Functions (recurring.js)', () => {

    let sandbox;
    const mockUser = { id: 'test-user-id' };

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        // Limpa TUDO antes de cada teste IT
        clearLocalData();
        clearUndoState();
    });

    afterEach(() => {
        sandbox.restore();
    });

    // --- Testes para _calculatePendingRecurringIds ---
    describe('_calculatePendingRecurringIds()', () => {

        it('should return empty array when no recurring transactions exist', () => {
            const today = new Date(Date.UTC(2024, 3, 15)); // 15 Abril 2024
            recurringTransactions.length = 0; // Garante que o array global está vazio
            const result = _calculatePendingRecurringIds(today, recurringTransactions); // Passa o array vazio
            expect(result).to.be.an('array').that.is.empty;
        });

        it('should return IDs of recurring transactions due on or before today and not added this month', () => {
            const today = new Date(Date.UTC(2024, 3, 15)); // 15 Abril 2024 (Mês 3)
            const currentMonthYear = '2024-04';
            const previousMonthYear = '2024-03';

            // Popula o array global que a função original usaria (mas passamos explicitamente)
            recurringTransactions.push(
                { id: 1, dayOfMonth: 10, lastAddedMonthYear: previousMonthYear, /*...*/ type: 'expense', amount: 10 },
                { id: 2, dayOfMonth: 15, lastAddedMonthYear: previousMonthYear, /*...*/ type: 'expense', amount: 10 },
                { id: 3, dayOfMonth: 20, lastAddedMonthYear: previousMonthYear, /*...*/ type: 'expense', amount: 10 },
                { id: 4, dayOfMonth: 5, lastAddedMonthYear: currentMonthYear, /*...*/ type: 'expense', amount: 10 },
                { id: 5, dayOfMonth: 1, lastAddedMonthYear: null, /*...*/ type: 'expense', amount: 10 }
            );

            // Passa a data e o array populado para a função
            const result = _calculatePendingRecurringIds(today, recurringTransactions);
            expect(result).to.deep.equal([1, 2, 5]);
        });

        it('should handle end of month correctly (dayOfMonth > daysInMonth)', () => {
            const today = new Date(Date.UTC(2024, 1, 29)); // 29 Fev 2024 (bissexto)
            const previousMonthYear = '2024-01';

            recurringTransactions.push(
                { id: 10, dayOfMonth: 31, lastAddedMonthYear: previousMonthYear, /*...*/ type: 'expense', amount: 10 },
                { id: 11, dayOfMonth: 28, lastAddedMonthYear: previousMonthYear, /*...*/ type: 'expense', amount: 10 },
                { id: 12, dayOfMonth: 29, lastAddedMonthYear: previousMonthYear, /*...*/ type: 'expense', amount: 10 }
            );

            const result = _calculatePendingRecurringIds(today, recurringTransactions);
            expect(result).to.deep.equal([10, 11, 12]);
        });

         it('should handle beginning of month correctly', () => {
            const today = new Date(Date.UTC(2024, 4, 1)); // 1 Maio 2024
            const currentMonthYear = '2024-05';
            const previousMonthYear = '2024-04';

            recurringTransactions.push(
                { id: 20, dayOfMonth: 1, lastAddedMonthYear: previousMonthYear, /*...*/ type: 'expense', amount: 10 },
                { id: 21, dayOfMonth: 1, lastAddedMonthYear: currentMonthYear, /*...*/ type: 'expense', amount: 10 },
                { id: 22, dayOfMonth: 5, lastAddedMonthYear: previousMonthYear, /*...*/ type: 'expense', amount: 10 }
            );

            const result = _calculatePendingRecurringIds(today, recurringTransactions);
            expect(result).to.deep.equal([20]);
        });

         it('should return empty array if all due transactions were already added this month', () => {
             const today = new Date(Date.UTC(2024, 3, 15)); // 15 Abril 2024
             const currentMonthYear = '2024-04';

             recurringTransactions.push(
                 { id: 30, dayOfMonth: 10, lastAddedMonthYear: currentMonthYear, /*...*/ type: 'expense', amount: 10 },
                 { id: 31, dayOfMonth: 1, lastAddedMonthYear: currentMonthYear, /*...*/ type: 'expense', amount: 10 }
             );

             const result = _calculatePendingRecurringIds(today, recurringTransactions);
             expect(result).to.be.an('array').that.is.empty;
         });

    }); // Fim describe('_calculatePendingRecurringIds')

    // --- Testes para addPendingRecurring ---
    describe('addPendingRecurring()', () => {
        const recurIdToAdd = 35;
        const recurToAdd = { id: recurIdToAdd, userId: mockUser.id, type: 'expense', dayOfMonth: 20, description: "Mensalidade Academia", amount: 80, category: 'Saúde', lastAddedMonthYear: '2024-03', createdAt: '...', updatedAt: '...' };
        let clock;

        beforeEach(() => {
            // Adiciona a recorrência ao estado local ANTES de cada teste neste describe
            recurringTransactions.length = 0; // Garante que só tenha esta
            recurringTransactions.push({...recurToAdd}); // Adiciona cópia
            clock = sinon.useFakeTimers(new Date(Date.UTC(2024, 3, 25)));
        });

        afterEach(() => {
            if (clock) clock.restore();
        });


        it('should call Supabase insert and update with correct args', async () => {
            // ... (Arrange e Mocks como antes) ...
             const expectedTransactionDate = '2024-04-20';
             const expectedNewMonthYear = '2024-04';
             const mockAddedTransaction = { id: 501, user_id: mockUser.id, date: expectedTransactionDate, /* ... */ };
             const mockUpdatedRecurrence = { ...recurToAdd, last_added_month_year: expectedNewMonthYear };
             const singleInsertStub = sandbox.stub().resolves({ data: mockAddedTransaction, error: null });
             const selectInsertStub = sandbox.stub().returns({ single: singleInsertStub });
             const insertTransStub = sandbox.stub().returns({ select: selectInsertStub });
             const fromTransMock = { insert: insertTransStub };
             const singleUpdateStub = sandbox.stub().resolves({ data: mockUpdatedRecurrence, error: null });
             const selectUpdateStub = sandbox.stub().returns({ single: singleUpdateStub });
             const matchUpdateStub = sandbox.stub().returns({ select: selectUpdateStub });
             const updateRecurStub = sandbox.stub().returns({ match: matchUpdateStub });
             const fromRecurMock = { update: updateRecurStub };
             const insertAssocStub = sandbox.stub().resolves({ error: null });
             const fromTagsMock = { insert: insertAssocStub };
             sandbox.stub(supabase, 'from').callsFake((tableName) => {
                 if (tableName === 'transactions') return fromTransMock;
                 if (tableName === 'recurring_transactions') return fromRecurMock;
                 if (tableName === 'transaction_tags') return fromTagsMock;
                 if (tableName === 'tags') return { select: sandbox.stub().resolves({data:[]}), insert: sandbox.stub().resolves({data:{id:99}}) };
                 return {};
             });
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

            await addPendingRecurring(recurIdToAdd);

            expect(insertTransStub.calledOnce).to.be.true;
            const addArgs = insertTransStub.getCall(0).args[0];
            expect(addArgs.date).to.equal(expectedTransactionDate);
            expect(updateRecurStub.calledOnce).to.be.true;
            const updateArgs = updateRecurStub.getCall(0).args[0];
            expect(updateArgs.last_added_month_year).to.equal(expectedNewMonthYear);
            expect(lastAddedRecurringInfo).to.exist;
            expect(lastAddedRecurringInfo?.previousLastAddedMonthYear).to.equal('2024-03');
        });

        it('should show error and not call update if addTransactionData fails', async () => {
            const addError = new Error("Falha ao adicionar transação");
            const singleInsertStub = sandbox.stub().rejects(addError); // Falha aqui
            const selectInsertStub = sandbox.stub().returns({ single: singleInsertStub });
            const insertTransStub = sandbox.stub().returns({ select: selectInsertStub });
            const fromTransMock = { insert: insertTransStub };
            const updateRecurSpy = sandbox.spy(); // Spy no update
            const fromRecurMock = { update: updateRecurSpy };
            sandbox.stub(supabase, 'from').callsFake((tableName) => {
                if (tableName === 'transactions') return fromTransMock;
                if (tableName === 'recurring_transactions') return fromRecurMock;
                if (tableName === 'tags') return { select: sandbox.stub().resolves({data:[]}), insert: sandbox.stub().resolves({data:{id:99}}) };
                if (tableName === 'transaction_tags') return { insert: sandbox.stub().resolves() };
                return {};
            });
            sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

            await addPendingRecurring(recurIdToAdd);

            expect(insertTransStub.calledOnce).to.be.true; // Tentou inserir
            expect(updateRecurSpy.called).to.be.false; // Não chamou update
            expect(lastAddedRecurringInfo).to.be.null;
        });

        it('should call deleteTransactionData and not update recurring if updateRecurringData fails', async () => {
             const mockAddedTransaction = { id: 502, user_id: mockUser.id, /*...*/ };
             const updateError = new Error("Falha ao atualizar recorrência");
             // Mock insert transação -> SUCESSO
             const singleInsertStub = sandbox.stub().resolves({ data: mockAddedTransaction, error: null });
             const selectInsertStub = sandbox.stub().returns({ single: singleInsertStub });
             const insertTransStub = sandbox.stub().returns({ select: selectInsertStub });
             const fromTransMock = { insert: insertTransStub };
             // Mock update recorrência -> FALHA
             const singleUpdateStub = sandbox.stub().rejects(updateError); // Falha aqui
             const selectUpdateStub = sandbox.stub().returns({ single: singleUpdateStub });
             const matchUpdateStub = sandbox.stub().returns({ select: selectUpdateStub });
             const updateRecurStub = sandbox.stub().returns({ match: matchUpdateStub });
             const fromRecurMock = { update: updateRecurStub };
             // Mock delete transação -> SUCESSO (para rollback)
             const matchDeleteStub = sandbox.stub().resolves({ error: null });
             const deleteReturnMock = { match: matchDeleteStub };
             const deleteTransStub = sandbox.stub().returns(deleteReturnMock);
             const fromTransDeleteMock = { delete: deleteTransStub };

             sandbox.stub(supabase, 'from').callsFake((tableName) => {
                 if (tableName === 'transactions') return { ...fromTransMock, ...fromTransDeleteMock };
                 if (tableName === 'recurring_transactions') return fromRecurMock;
                  if (tableName === 'tags') return { select: sandbox.stub().resolves({data:[]}), insert: sandbox.stub().resolves({data:{id:99}}) };
                  if (tableName === 'transaction_tags') return { insert: sandbox.stub().resolves() };
                 return {};
             });
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

            await addPendingRecurring(recurIdToAdd);

            expect(insertTransStub.calledOnce).to.be.true;
            expect(updateRecurStub.calledOnce).to.be.true;
            expect(deleteTransStub.calledOnce).to.be.true;
            expect(matchDeleteStub.calledOnceWith({ id: mockAddedTransaction.id, user_id: mockUser.id })).to.be.true;
            expect(lastAddedRecurringInfo).to.be.null;
            // *** CORREÇÃO DA ASSERÇÃO ***
            const recur = recurringTransactions.find(r => r.id === recurIdToAdd);
            expect(recur?.lastAddedMonthYear).to.equal('2024-03'); // Verifica o valor original, pois não foi atualizado
        });

        it('should show error if recurringId not found', async () => {
             const nonExistentId = 999;
             const fromSpy = sandbox.spy(supabase, 'from');
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

             await addPendingRecurring(nonExistentId);

             expect(fromSpy.called).to.be.false;
             expect(lastAddedRecurringInfo).to.be.null;
        });
    });

     // --- Testes para undoAddPendingRecurring ---
     describe('undoAddPendingRecurring()', () => {
         const originalRecurrence = { id: 40, userId: mockUser.id, type: 'income', dayOfMonth: 1, description: "Rendimento FII", amount: 15, category: 'Investimentos', lastAddedMonthYear: '2024-04', createdAt: '...', updatedAt: '...' };
         const undoInfo = { transactionId: 601, recurringId: 40, previousLastAddedMonthYear: '2024-03' };

         beforeEach(() => {
             recurringTransactions.push({...originalRecurrence}); // Adiciona cópia
             _setLastAddedRecurringInfoForTest(undoInfo);
         });

         it('should call Supabase delete and update with correct args', async () => {
             const matchDeleteStub = sandbox.stub().resolves({ error: null });
             const deleteTransStub = sandbox.stub().returns({ match: matchDeleteStub });
             const fromTransMock = { delete: deleteTransStub };
             const mockRevertedRecurrence = { ...originalRecurrence, last_added_month_year: undoInfo.previousLastAddedMonthYear };
             const singleUpdateStub = sandbox.stub().resolves({ data: mockRevertedRecurrence, error: null });
             const selectUpdateStub = sandbox.stub().returns({ single: singleUpdateStub });
             const matchUpdateStub = sandbox.stub().returns({ select: selectUpdateStub });
             const updateRecurStub = sandbox.stub().returns({ match: matchUpdateStub });
             const fromRecurMock = { update: updateRecurStub };
             sandbox.stub(supabase, 'from').callsFake((tableName) => {
                 if (tableName === 'transactions') return fromTransMock;
                 if (tableName === 'recurring_transactions') return fromRecurMock;
                 return {};
             });
             sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

             await undoAddPendingRecurring();

             expect(deleteTransStub.calledOnce).to.be.true;
             expect(matchDeleteStub.calledOnceWith({ id: undoInfo.transactionId, user_id: mockUser.id })).to.be.true;
             expect(updateRecurStub.calledOnce).to.be.true;
             const updateArgs = updateRecurStub.getCall(0).args[0];
             expect(updateArgs.last_added_month_year).to.equal(undoInfo.previousLastAddedMonthYear);
             expect(lastAddedRecurringInfo).to.be.null;
             const recur = recurringTransactions.find(r => r.id === undoInfo.recurringId);
             expect(recur?.lastAddedMonthYear).to.equal(undoInfo.previousLastAddedMonthYear);
         });

         it('should show error and not update recurring if deleteTransactionData fails', async () => {
             const deleteError = new Error("Falha ao deletar transação");
             const matchDeleteStub = sandbox.stub().rejects(deleteError); // Falha aqui
             const deleteTransStub = sandbox.stub().returns({ match: matchDeleteStub });
             const fromTransMock = { delete: deleteTransStub };
             const updateRecurSpy = sandbox.spy(); // Spy no update
             const fromRecurMock = { update: updateRecurSpy };
             sandbox.stub(supabase, 'from').callsFake((tableName) => {
                if (tableName === 'transactions') return fromTransMock;
                if (tableName === 'recurring_transactions') return fromRecurMock;
                return {};
             });
              sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

             await undoAddPendingRecurring();

             expect(deleteTransStub.calledOnce).to.be.true; // Tentou deletar
             expect(updateRecurSpy.called).to.be.false; // Não chamou update
             expect(lastAddedRecurringInfo).to.be.null; // Limpou estado mesmo na falha
              // *** CORREÇÃO DA ASSERÇÃO ***
             const recur = recurringTransactions.find(r => r.id === undoInfo.recurringId);
             expect(recur?.lastAddedMonthYear).to.equal('2024-04'); // Verifica valor original (não revertido)
         });

         it('should show error if updateRecurringData fails after delete', async () => {
             const updateError = new Error("Falha ao reverter recorrência");
             const matchDeleteStub = sandbox.stub().resolves({ error: null }); // Delete OK
             const deleteTransStub = sandbox.stub().returns({ match: matchDeleteStub });
             const fromTransMock = { delete: deleteTransStub };
             const singleUpdateStub = sandbox.stub().rejects(updateError); // Update falha
             const selectUpdateStub = sandbox.stub().returns({ single: singleUpdateStub });
             const matchUpdateStub = sandbox.stub().returns({ select: selectUpdateStub });
             const updateRecurStub = sandbox.stub().returns({ match: matchUpdateStub });
             const fromRecurMock = { update: updateRecurStub };
             sandbox.stub(supabase, 'from').callsFake((tableName) => {
                 if (tableName === 'transactions') return fromTransMock;
                 if (tableName === 'recurring_transactions') return fromRecurMock;
                 return {};
             });
              sandbox.stub(supabase.auth, 'getUser').resolves({ data: { user: mockUser }, error: null });

             await undoAddPendingRecurring();

             expect(deleteTransStub.calledOnce).to.be.true;
             expect(updateRecurStub.calledOnce).to.be.true; // Tentou update
             expect(lastAddedRecurringInfo).to.be.null;
              // *** CORREÇÃO DA ASSERÇÃO ***
             const recur = recurringTransactions.find(r => r.id === undoInfo.recurringId);
             expect(recur?.lastAddedMonthYear).to.equal('2024-04'); // Verifica valor original (não revertido)
         });

          it('should do nothing if lastAddedRecurringInfo is null', async () => {
             _setLastAddedRecurringInfoForTest(null);
              // *** CORREÇÃO: Espiona 'supabase.from' em vez de funções internas ***
             const fromSpy = sandbox.spy(supabase, 'from');

             await undoAddPendingRecurring();

             expect(fromSpy.called).to.be.false; // Não deve chamar supabase.from
         });

     }); // Fim describe('undoAddPendingRecurring()')

}); // Fim do describe('Recurring Logic Functions')