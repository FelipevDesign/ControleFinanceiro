// tests/helpers.test.js
// Importa TODAS as funções de helpers.js que serão testadas
import {
    formatCurrency,
    formatDate,
    formatMonthYear,
    normalizeText,
    formatDateForInput
    // Adicione outras funções de helpers.js aqui se/quando criar testes para elas
    // ex: isMobileView, applyCurrencyMask, getUnmaskedValue, destroyCurrencyMask, etc.
} from '../helpers.js';

// Os testes usam 'describe' e 'it' do Mocha e 'expect' do Chai (global via window.expect)

describe('Helper Functions (helpers.js)', () => {

    // Testes para formatCurrency
    describe('formatCurrency()', () => {
        it('should format positive numbers correctly', () => {
            expect(formatCurrency(1234.56)).to.equal('R$\xa01.234,56'); // \xa0 é non-breaking space
            expect(formatCurrency(0)).to.equal('R$\xa00,00');
            expect(formatCurrency(10)).to.equal('R$\xa010,00');
            expect(formatCurrency(0.5)).to.equal('R$\xa00,50');
        });

        it('should handle invalid inputs gracefully by returning R$ 0,00', () => {
            expect(formatCurrency(NaN)).to.equal('R$\xa00,00');
            expect(formatCurrency(null)).to.equal('R$\xa00,00');
            expect(formatCurrency(undefined)).to.equal('R$\xa00,00');
            expect(formatCurrency("abc")).to.equal('R$\xa00,00');
            // Supabase pode retornar valores como string, a função deve tratar isso como inválido
            expect(formatCurrency("150.75")).to.equal('R$\xa00,00');
        });

        // A função formatCurrency em si formata negativos, mas a lógica da app (via IMask) pode impedir a inserção.
        // Testamos o comportamento da *função de formatação isolada*.
        it('should format negative numbers correctly', () => {
            // CORREÇÃO: Remover o '0' extra esperado
            expect(formatCurrency(-100)).to.equal('-R$\xa0100,00');
            expect(formatCurrency(-0.5)).to.equal('-R$\xa00,50'); // Este estava correto
       });
    });

    // Testes para normalizeText
    describe('normalizeText()', () => {
        it('should convert to lowercase and remove accents', () => {
            expect(normalizeText('Maçã')).to.equal('maca');
            expect(normalizeText('PÊSSEGO')).to.equal('pessego');
            expect(normalizeText('Ação')).to.equal('acao');
            expect(normalizeText('Crédito')).to.equal('credito');
            expect(normalizeText('UTILIZAÇÃO')).to.equal('utilizacao');
        });

        it('should handle empty strings, null, and undefined', () => {
            expect(normalizeText('')).to.equal('');
            expect(normalizeText(null)).to.equal('');
            expect(normalizeText(undefined)).to.equal('');
        });

        it('should not remove numbers or basic symbols', () => {
            expect(normalizeText('Teste 123 - Final!')).to.equal('teste 123 - final!');
            expect(normalizeText('R$ 50,00 / Dia')).to.equal('r$ 50,00 / dia');
        });
    });

    // Testes para formatDate (YYYY-MM-DD -> DD/MM/YYYY)
    describe('formatDate()', () => {
        it('should format valid YYYY-MM-DD strings to DD/MM/YYYY', () => {
            expect(formatDate('2024-01-05')).to.equal('05/01/2024');
            expect(formatDate('2023-12-31')).to.equal('31/12/2023');
            expect(formatDate('2024-02-29')).to.equal('29/02/2024'); // Ano bissexto
        });

        it('should return empty string for invalid formats or dates', () => {
            expect(formatDate('2024/01/05')).to.equal(''); // Formato errado
            expect(formatDate('31-12-2023')).to.equal(''); // Formato errado
            expect(formatDate('2024-02-30')).to.equal(''); // Data inválida
            expect(formatDate('2023-02-29')).to.equal(''); // Data inválida (não bissexto)
            expect(formatDate('2024-13-01')).to.equal(''); // Mês inválido
            expect(formatDate('2024-00-10')).to.equal(''); // Mês inválido (zero)
            expect(formatDate('2024-12-32')).to.equal(''); // Dia inválido
            expect(formatDate('')).to.equal('');
            expect(formatDate(null)).to.equal('');
            expect(formatDate(undefined)).to.equal('');
            expect(formatDate('abc')).to.equal('');
            expect(formatDate('2024-1-5')).to.equal(''); // Mês/Dia precisam de 2 dígitos no input string
        });
    });

    // Testes para formatMonthYear (YYYY-MM -> Mês Ano)
    describe('formatMonthYear()', () => {
        it('should format YYYY-MM string correctly to "Month de Year"', () => {
            // Usando regex para ser robusto a variações menores (espaço, case)
            expect(formatMonthYear('2024-01')).to.match(/janeiro\s+de\s+2024/i);
            expect(formatMonthYear('2023-12')).to.match(/dezembro\s+de\s+2023/i);
            expect(formatMonthYear('2024-07')).to.match(/julho\s+de\s+2024/i);
        });

        it('should return original string for invalid formats or inputs', () => {
            expect(formatMonthYear('2024/01')).to.equal('2024/01');
            expect(formatMonthYear('01-2024')).to.equal('01-2024');
            expect(formatMonthYear('2024-13')).to.equal('2024-13'); // Mês inválido
            expect(formatMonthYear('')).to.equal(''); // String vazia retorna vazia
            expect(formatMonthYear(null)).to.equal(null); // Null retorna null
            expect(formatMonthYear(undefined)).to.equal(undefined); // Undefined retorna undefined
            expect(formatMonthYear('abc')).to.equal('abc'); // String inválida retorna ela mesma
        });
    });

     // Testes para formatDateForInput (Date -> YYYY-MM-DD)
     describe('formatDateForInput()', () => {
        it('should format Date object to YYYY-MM-DD using UTC', () => {
            // Cria datas usando UTC para evitar problemas de fuso horário local
            const date1 = new Date(Date.UTC(2024, 0, 15)); // 15 Jan 2024 (Mês 0 = Janeiro)
            const date2 = new Date(Date.UTC(2023, 11, 9)); // 09 Dec 2023 (Mês 11 = Dezembro)
            expect(formatDateForInput(date1)).to.equal('2024-01-15');
            expect(formatDateForInput(date2)).to.equal('2023-12-09');
        });

        it('should return empty string for invalid input (non-Date or invalid Date)', () => {
            expect(formatDateForInput(null)).to.equal('');
            expect(formatDateForInput(undefined)).to.equal('');
            expect(formatDateForInput("2024-01-15")).to.equal(''); // String não é objeto Date
            expect(formatDateForInput(123456789)).to.equal(''); // Número não é objeto Date
            expect(formatDateForInput({})).to.equal(''); // Objeto genérico não é Date
            expect(formatDateForInput(new Date("invalid date string"))).to.equal(''); // Objeto Date inválido
        });
    });

    // --- Adicionar testes para outras funções de helpers aqui ---
    // Exemplo:
    // describe('isMobileView()', () => {
    //     // Testar isso requer manipulação do window.innerWidth, mais complexo
    //     it('should return true if window width is small');
    //     it('should return false if window width is large');
    // });

    // describe('applyCurrencyMask() / getUnmaskedValue() / destroyCurrencyMask()', () => {
    //     // Testar funções que manipulam o DOM e dependem do IMask global
    //     // requer a criação de elementos input no DOM de teste.
    //     let input;
    //     beforeEach(() => {
    //         // Cria um input antes de cada teste neste bloco
    //         input = document.createElement('input');
    //         input.type = 'text';
    //         document.body.appendChild(input); // Adiciona ao DOM para IMask funcionar
    //     });
    //     afterEach(() => {
    //         // Remove o input depois de cada teste
    //         if (input.imaskInstance) {
    //             destroyCurrencyMask(input);
    //         }
    //         document.body.removeChild(input);
    //     });

    //     it('should apply mask and get correct unmasked value', () => {
    //         applyCurrencyMask(input);
    //         input.value = 'R$ 1.234,56'; // Simula digitação
    //         input.dispatchEvent(new Event('input')); // Dispara evento para IMask processar
    //         // IMask pode ser assíncrono, talvez precise de um pequeno delay ou usar API do IMask
    //         // expect(getUnmaskedValue(input)).to.equal(1234.56); // Pode falhar sem delay/API
    //         expect(input.imaskInstance).to.exist;
    //     });
    //     it('getUnmaskedValue should return NaN for empty/invalid masked input', () => {
    //          applyCurrencyMask(input);
    //          input.value = 'R$ ';
    //          input.dispatchEvent(new Event('input'));
    //          expect(getUnmaskedValue(input)).to.be.NaN;
    //          input.value = '';
    //          input.dispatchEvent(new Event('input'));
    //          expect(getUnmaskedValue(input)).to.be.NaN;
    //     });
    //      it('should destroy mask instance', () => {
    //          applyCurrencyMask(input);
    //          expect(input.imaskInstance).to.exist;
    //          destroyCurrencyMask(input);
    //          expect(input.imaskInstance).to.be.null;
    //      });
    // });

});

// Log para confirmar que o arquivo foi completamente lido pelo navegador
// console.log("helpers.test.js FULLY loaded and parsed!"); // Removido para não poluir