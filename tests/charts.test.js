// tests/charts.test.js
import {
    calculateSpendingByCategory,
    calculateMonthlyBalances,
    calculateComparisonDataByCategory,
} from '../charts.js';
import { formatDateForInput, formatMonthYear } from '../helpers.js'; // Import correto

const sampleTransactions = [
    // Mês 1: Jan 2024
    { id: 1, type: 'income', date: '2024-01-05', amount: 2000, category: 'Salário', source: 'Empresa A' },
    { id: 2, type: 'expense', date: '2024-01-10', amount: 150, category: 'Alimentação', description: 'Supermercado' },
    { id: 3, type: 'expense', date: '2024-01-15', amount: 80, category: 'Transporte', description: 'Gasolina' },
    { id: 4, type: 'expense', date: '2024-01-20', amount: 200, category: 'Alimentação', description: 'Restaurante' },
    { id: 5, type: 'expense', date: '2024-01-25', amount: 50, category: 'Lazer', description: 'Cinema' },
    // Mês 2: Fev 2024
    { id: 6, type: 'income', date: '2024-02-05', amount: 2100, category: 'Salário', source: 'Empresa A' },
    { id: 7, type: 'expense', date: '2024-02-08', amount: 500, category: 'Moradia', description: 'Aluguel Fev' },
    { id: 8, type: 'expense', date: '2024-02-12', amount: 180, category: 'Alimentação', description: 'Supermercado Fev' },
    { id: 9, type: 'expense', date: '2024-02-20', amount: 90, category: 'Transporte', description: 'Uber' },
    // Mês 3: Mar 2024
    { id: 10, type: 'income', date: '2024-03-05', amount: 2150, category: 'Salário', source: 'Empresa A' },
    { id: 11, type: 'expense', date: '2024-03-01', amount: 500, category: 'Moradia', description: 'Aluguel Mar' },
    { id: 12, type: 'expense', date: '2024-03-10', amount: 160, category: 'Alimentação', description: 'Supermercado Mar' },
    { id: 13, type: 'expense', date: '2024-03-18', amount: 70, category: 'Saúde', description: 'Farmácia' },
     // Ano Anterior
     { id: 14, type: 'expense', date: '2023-03-15', amount: 140, category: 'Alimentação', description: 'Supermercado Mar/23' },
     { id: 15, type: 'expense', date: '2023-03-20', amount: 450, category: 'Moradia', description: 'Aluguel Mar/23' },
     { id: 16, type: 'expense', date: '2023-02-10', amount: 170, category: 'Alimentação', description: 'Supermercado Fev/23' },
];

describe('Chart Calculation Functions (charts.js)', () => {

    describe('calculateSpendingByCategory()', () => {
        it('should return total spending per category for all data', () => {
            const result = calculateSpendingByCategory(null, null, sampleTransactions);
            // *** CORREÇÃO NO VALOR ESPERADO ***
            expect(result).to.deep.equal({
                'Alimentação': 1000, // Valor correto = 150+200+180+160+140+170
                'Transporte': 170, // 80 + 90
                'Lazer': 50,
                'Moradia': 1450, // 500 + 500 + 450
                'Saúde': 70
            });
        });

        it('should filter by date range', () => {
            const result = calculateSpendingByCategory('2024-02-01', '2024-02-29', sampleTransactions);
            expect(result).to.deep.equal({
                'Moradia': 500,
                'Alimentação': 180,
                'Transporte': 90
            });
        });

        it('should handle cases with no expenses in the period', () => {
            const onlyIncome = [{ id: 1, type: 'income', date: '2024-01-05', amount: 1000 }];
            const result = calculateSpendingByCategory(null, null, onlyIncome);
            expect(result).to.deep.equal({});
             const resultFiltered = calculateSpendingByCategory('2024-04-01', '2024-04-30', sampleTransactions);
             expect(resultFiltered).to.deep.equal({});
        });

        it('should assign uncategorized expenses to "Outros"', () => {
             const transactionsWithUncategorized = [
                ...sampleTransactions,
                { id: 17, type: 'expense', date: '2024-01-12', amount: 25, category: null, description: 'Diversos' },
                { id: 18, type: 'expense', date: '2024-02-15', amount: 30, category: '', description: 'Outro' }
            ];
             const result = calculateSpendingByCategory(null, null, transactionsWithUncategorized);
             expect(result).to.have.property('Outros', 55); // 25 + 30
             // *** CORREÇÃO NO VALOR ESPERADO ***
             expect(result['Alimentação']).to.equal(1000); // Verifica se Alimentação ainda está correta
             expect(result['Moradia']).to.equal(1450); // Verifica outra categoria
        });
    });

    // --- Testes para calculateMonthlyBalances ---
    describe('calculateMonthlyBalances()', () => {
       // Testes mantidos como antes (já passando)
        it('should calculate cumulative balance history correctly', () => {
            const result = calculateMonthlyBalances(null, null, sampleTransactions);
            expect(result).to.deep.equal([
                { monthYear: '2023-02', balance: -170 },
                { monthYear: '2023-03', balance: -760 },
                { monthYear: '2024-01', balance: 760 },
                { monthYear: '2024-02', balance: 2090 },
                { monthYear: '2024-03', balance: 3510 }
            ]);
        });
        it('should filter by date range before calculating balances', () => {
            const result = calculateMonthlyBalances('2024-01-01', '2024-02-29', sampleTransactions);
            expect(result).to.deep.equal([
                { monthYear: '2024-01', balance: 1520 },
                { monthYear: '2024-02', balance: 2850 }
            ]);
        });
        it('should return empty array if no transactions in the period', () => {
             const result = calculateMonthlyBalances('2025-01-01', '2025-12-31', sampleTransactions);
             expect(result).to.be.an('array').that.is.empty;
        });
    });

    // --- Testes para calculateComparisonDataByCategory ---
    describe('calculateComparisonDataByCategory()', () => {
        // Testes mantidos como antes (já passando)
        let clock;
        beforeEach(() => { clock = sinon.useFakeTimers(new Date(Date.UTC(2024, 3, 15))); }); // Fixa em 15 Abr 2024
        afterEach(() => { clock.restore(); });

        it('should compare current month vs last month correctly (month-vs-last)', () => {
            const result = calculateComparisonDataByCategory('month-vs-last', 'expense', sampleTransactions);
            expect(result.categories).to.deep.equal(['Moradia', 'Alimentação', 'Saúde']);
            expect(result.series[0].data).to.deep.equal([500, 160, 70]); // Março/24
            expect(result.series[1].data).to.deep.equal([0, 0, 0]);    // Abril/24
        });
        it('should compare current month vs same month last year (month-vs-last-year)', () => {
             clock.restore(); // Restaura para usar outra data fixa
             clock = sinon.useFakeTimers(new Date(Date.UTC(2024, 2, 15))); // Fixa em 15 Mar 2024
             const result = calculateComparisonDataByCategory('month-vs-last-year', 'expense', sampleTransactions);
             expect(result.categories).to.deep.equal(['Moradia', 'Alimentação', 'Saúde']);
             expect(result.series[0].data).to.deep.equal([450, 140, 0]); // Mar/23
             expect(result.series[1].data).to.deep.equal([500, 160, 70]); // Mar/24
        });
         it('should compare year vs last year (year-vs-last)', () => {
             const result = calculateComparisonDataByCategory('year-vs-last', 'expense', sampleTransactions);
             expect(result.categories).to.deep.equal(['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer']);
             // 2023: Moradia(450), Alimentação(170+140=310), Transporte(0), Saúde(0), Lazer(0)
             expect(result.series[0].data).to.deep.equal([450, 310, 0, 0, 0]);
             // 2024: Moradia(500+500=1000), Alimentação(150+200+180+160=690), Transporte(80+90=170), Saúde(70), Lazer(50)
             expect(result.series[1].data).to.deep.equal([1000, 690, 170, 70, 50]);
        });
    });

}); // Fim do describe('Chart Calculation Functions')