// charts.js - Lógica e Renderização dos Gráficos e Relatórios

import {
    formatCurrency, formatDateForInput, formatDate, formatMonthYear
} from './helpers.js';
// Removido import de transactions daqui, será passado como argumento

// --- Estado do Período dos Relatórios ---
let reportsStartDate = null;
let reportsEndDate = null;

export function setReportsDateRange(start, end) {
    reportsStartDate = start;
    reportsEndDate = end;
    console.log(`[Charts State] Report period set: ${start} to ${end}`);
}
export function getReportsStartDate() { return reportsStartDate; }
export function getReportsEndDate() { return reportsEndDate; }

// --- Variáveis de Instância dos Gráficos ---
let categoryApexChart = null;
let balanceEvolutionApexChart = null;
let comparisonApexChart = null;

// Inicializa/Destrói Gráficos
export function initializeChartVariables() {
    if (categoryApexChart) {
        try { categoryApexChart.destroy(); } catch (e) { console.error("Error destroying category chart", e); }
    }
    if (balanceEvolutionApexChart) {
        try { balanceEvolutionApexChart.destroy(); } catch (e) { console.error("Error destroying balance chart", e); }
    }
    if (comparisonApexChart) {
        try { comparisonApexChart.destroy(); } catch (e) { console.error("Error destroying comparison chart", e); }
    }

    categoryApexChart = null;
    balanceEvolutionApexChart = null;
    comparisonApexChart = null;
    reportsStartDate = null;
    reportsEndDate = null;
    console.log("[Charts State] Variables initialized.");
}

// --- Funções de Cálculo ---

// **MODIFICADO**: Aceita transactionsData
export function calculateSpendingByCategory(startDate, endDate, transactionsData) {
    console.log(`[calculateSpendingByCategory] Calculating for period: ${startDate}-${endDate} with ${transactionsData?.length} transactions.`);
    const filteredTransactions = transactionsData.filter(t => {
        if (t.type !== 'expense') return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
    });
    console.log(`[calculateSpendingByCategory] Filtered count: ${filteredTransactions.length}`);

    return filteredTransactions.reduce((acc, t) => {
        const category = t.category || 'Outros';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
    }, {});
}

// **MODIFICADO**: Aceita transactionsData
export function calculateMonthlyBalances(startDate = null, endDate = null, transactionsData) {
    console.log(`[calculateMonthlyBalances] Calculating for period: ${startDate}-${endDate} with ${transactionsData?.length} transactions.`);
    const monthlyData = {};

    // Filtra transações pelo período geral antes de agrupar
    const filteredTransactions = transactionsData.filter(t => {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
    });
    console.log(`[calculateMonthlyBalances] Filtered count: ${filteredTransactions.length}`);

    // Ordena as transações filtradas por data para cálculo cumulativo correto
    const sorted = [...filteredTransactions].sort((a, b) => a.date.localeCompare(b.date));

    // Agrupa por mês/ano e calcula totais mensais
    sorted.forEach(t => {
        const monthYear = t.date.slice(0, 7); // YYYY-MM
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
                income: 0,
                expense: 0,
                // Armazena um objeto Date para facilitar ordenação posterior
                date: new Date(Date.UTC(
                    parseInt(t.date.slice(0, 4)),
                    parseInt(t.date.slice(5, 7)) - 1, // Mês é 0-indexed no Date
                    1 // Dia 1 do mês
                ))
            };
        }
        if (t.type === 'income') {
            monthlyData[monthYear].income += t.amount;
        } else {
            monthlyData[monthYear].expense += t.amount;
        }
    });

    // Calcula saldo cumulativo
    let cumulativeBalance = 0;
    // Ordena os meses com base no objeto Date armazenado
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => monthlyData[a].date - monthlyData[b].date);

    const balanceHistory = sortedMonths.map(monthYear => {
        const monthInfo = monthlyData[monthYear];
        const monthlyNet = monthInfo.income - monthInfo.expense;
        cumulativeBalance += monthlyNet;
        return { monthYear: monthYear, balance: cumulativeBalance };
    });

    console.log("[calculateMonthlyBalances] History calculated:", balanceHistory);
    return balanceHistory;
}

// **MODIFICADO**: Aceita transactionsData
export function calculateComparisonDataByCategory(comparisonType, transactionType, transactionsData) {
    const now = new Date();
    let currentStart = new Date(now);
    let currentEnd = new Date(now);
    let previousStart = new Date(now);
    let previousEnd = new Date(now);
    let currentLabel, previousLabel;

    // Configura datas UTC para evitar problemas de fuso horário
    // Nota: getUTCMonth() retorna 0-11
    switch (comparisonType) {
        case 'month-vs-last':
            currentStart.setUTCDate(1); // Primeiro dia do mês atual
            currentStart.setUTCHours(0, 0, 0, 0);
            currentEnd = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() + 1, 0, 23, 59, 59, 999)); // Último dia do mês atual
            previousStart = new Date(currentStart);
            previousStart.setUTCMonth(previousStart.getUTCMonth() - 1); // Primeiro dia do mês anterior
            previousEnd = new Date(Date.UTC(previousStart.getUTCFullYear(), previousStart.getUTCMonth() + 1, 0, 23, 59, 59, 999)); // Último dia do mês anterior
            currentLabel = currentStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            previousLabel = previousStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            break;
        case 'year-vs-last':
            currentStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)); // 1 Jan atual
            currentEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999)); // 31 Dez atual
            previousStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)); // 1 Jan anterior
            previousEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999)); // 31 Dez anterior
            currentLabel = now.getUTCFullYear().toString();
            previousLabel = (now.getUTCFullYear() - 1).toString();
            break;
        case 'quarter-vs-last':
            const currentQuarter = Math.floor(now.getUTCMonth() / 3); // 0, 1, 2, 3
            currentStart = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3, 1)); // Início do trimestre atual
            currentEnd = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999)); // Fim do trimestre atual
            previousStart = new Date(currentStart);
            previousStart.setUTCMonth(previousStart.getUTCMonth() - 3); // Início do trimestre anterior
            previousEnd = new Date(Date.UTC(previousStart.getUTCFullYear(), previousStart.getUTCMonth() + 3, 0, 23, 59, 59, 999)); // Fim do trimestre anterior
            currentLabel = `T${currentQuarter + 1}/${now.getUTCFullYear().toString().slice(-2)}`;
            previousLabel = `T${Math.floor(previousStart.getUTCMonth() / 3) + 1}/${previousStart.getUTCFullYear().toString().slice(-2)}`;
            break;
        case 'month-vs-last-year':
            currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); // Mês atual, ano atual
            currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
            previousStart = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)); // Mês atual, ano anterior
            previousEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
            currentLabel = currentStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            previousLabel = previousStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
            break;
        case 'ytd-vs-last':
            currentStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)); // 1 Jan atual
            currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)); // Hoje
            previousStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)); // 1 Jan anterior
            previousEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)); // Dia equiv. ano anterior
            currentLabel = `${now.getUTCFullYear()} (YTD)`;
            previousLabel = `${now.getUTCFullYear() - 1} (YTD)`;
            break;
        default:
            console.error("Tipo de comparação inválido:", comparisonType);
            return { categories: [], series: [], labels: { current: 'Erro', previous: 'Erro' } };
    }

    const currentStartStr = formatDateForInput(currentStart);
    const currentEndStr = formatDateForInput(currentEnd);
    const previousStartStr = formatDateForInput(previousStart);
    const previousEndStr = formatDateForInput(previousEnd);

    // Filtra transações pelos períodos calculados
    const currentTransactions = transactionsData.filter(t =>
        t.type === transactionType &&
        t.date >= currentStartStr &&
        t.date <= currentEndStr
    );
    const previousTransactions = transactionsData.filter(t =>
        t.type === transactionType &&
        t.date >= previousStartStr &&
        t.date <= previousEndStr
    );

    // Calcula totais por categoria para cada período
    const calculateTotals = (trans) => trans.reduce((acc, t) => {
        const cat = t.category || 'Sem Categoria';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
    }, {});
    const currentTotals = calculateTotals(currentTransactions);
    const previousTotals = calculateTotals(previousTransactions);

    // Combina todas as categorias de ambos os períodos e ordena (pode ser por nome ou valor)
    const allCategories = [...new Set([...Object.keys(currentTotals), ...Object.keys(previousTotals)])]
        .sort((a, b) => (currentTotals[b] || 0) - (currentTotals[a] || 0)); // Ordena por valor atual (decrescente)

    // Formata dados para o gráfico
    const series = [
        { name: previousLabel, data: allCategories.map(cat => previousTotals[cat] || 0) },
        { name: currentLabel, data: allCategories.map(cat => currentTotals[cat] || 0) }
    ];

    return {
        categories: allCategories,
        series: series,
        labels: { current: currentLabel, previous: previousLabel }
    };
}


// --- Funções de Renderização ---

// **MODIFICADO**: Aceita transactionsData
export function renderCategoryChart(transactionsData = []) {
    const chartElementId = 'category-apex-chart';
    const chartContainer = document.getElementById(chartElementId);
    const noChartDataEl = document.getElementById('no-category-chart-data');

    if (!chartContainer || !noChartDataEl) {
        console.error("Category chart container or placeholder not found");
        return;
    }
    console.log(`[renderCategoryChart] Rendering. Period: ${reportsStartDate} to ${reportsEndDate}. Data length: ${transactionsData.length}`);

    try {
        const spendingByCategory = calculateSpendingByCategory(reportsStartDate, reportsEndDate, transactionsData); // Passa transactionsData
        const labels = Object.keys(spendingByCategory);
        const series = Object.values(spendingByCategory);
        const hasData = series.length > 0 && series.some(s => s > 0);

        console.log(`[renderCategoryChart] HasData: ${hasData}`, { series, labels });

        // Mostra/esconde placeholder e container
        noChartDataEl.classList.toggle('hidden', hasData);
        chartContainer.style.display = hasData ? 'block' : 'none';

        // Destrói gráfico antigo ANTES de verificar se há dados novos
        if (categoryApexChart) {
            try { categoryApexChart.destroy(); } catch (e) { console.warn("Error destroying old category chart", e); }
            categoryApexChart = null;
        }

        if (!hasData) {
            console.log("[renderCategoryChart] No data for the selected period.");
            return; // Sai se não há dados para renderizar
        }

        // Obtém cor do texto para labels (considera tema)
        const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333';

        const options = {
            series: series,
            labels: labels,
            chart: {
                type: 'donut',
                height: 350,
                foreColor: labelColor, // Cor base do texto
                toolbar: {
                    show: true,
                    tools: {
                        download: true // Habilita botão de download
                    }
                }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%', // Tamanho do buraco
                        labels: {
                            show: true,
                            value: {
                                show: true,
                                // Formata valor dentro do donut
                                formatter: (val) => formatCurrency(parseFloat(val))
                            },
                            total: {
                                show: true,
                                label: 'Total',
                                // Formata total no centro
                                formatter: (w) => formatCurrency(
                                    w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                                )
                            }
                        }
                    }
                }
            },
            dataLabels: {
                enabled: true,
                // Formata label de dados (porcentagem)
                formatter: (val) => `${val.toFixed(1)}%`,
                style: {
                    fontSize: '11px',
                    fontWeight: 'bold',
                    colors: ['#fff'] // Cor do texto da porcentagem (branco)
                },
                dropShadow: {
                    enabled: false // Remove sombra padrão
                }
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                labels: {
                    colors: labelColor // Cor do texto da legenda
                },
                itemMargin: {
                    horizontal: 10,
                    vertical: 5
                },
                markers: { // Estilo dos marcadores da legenda
                    width: 12,
                    height: 12,
                    radius: 12
                }
            },
            tooltip: {
                y: {
                    // Formata tooltip
                    formatter: (value) => formatCurrency(value)
                },
                theme: 'dark' // Tema do tooltip
            },
            responsive: [{
                breakpoint: 480, // Ajustes para telas menores
                options: {
                    chart: {
                        width: '100%',
                        height: 300
                    },
                    legend: {
                        position: 'bottom'
                    },
                    dataLabels: {
                        style: {
                            fontSize: '9px' // Diminui fonte dos labels em telas pequenas
                        }
                    }
                }
            }],
        };

        chartContainer.innerHTML = ''; // Limpa container antes de renderizar
        categoryApexChart = new ApexCharts(chartContainer, options);
        categoryApexChart.render().catch(err => console.error("[renderCategoryChart] Error rendering:", err));

    } catch (e) {
        console.error("Error in renderCategoryChart:", e);
        noChartDataEl.classList.remove('hidden');
        chartContainer.style.display = 'none';
        if (categoryApexChart) {
            try { categoryApexChart.destroy(); categoryApexChart = null; } catch (err) { /* Ignora erro na destruição */ }
        }
    }
}

// **MODIFICADO**: Aceita transactionsData
export function renderBalanceEvolutionChart(transactionsData = []) {
    const chartElementId = 'balance-evolution-apex-chart';
    const chartContainer = document.getElementById(chartElementId);
    const noBalanceDataEl = document.getElementById('no-balance-chart-data');

    if (!chartContainer || !noBalanceDataEl) {
        console.error("Balance chart container or placeholder not found");
        return;
    }
    console.log(`[renderBalanceEvolutionChart] Rendering. Period: ${reportsStartDate} to ${reportsEndDate}. Data length: ${transactionsData.length}`);

    try {
        const balanceHistory = calculateMonthlyBalances(reportsStartDate, reportsEndDate, transactionsData); // Passa transactionsData

        // Precisa de pelo menos 2 pontos para desenhar uma linha/área
        const hasData = balanceHistory.length >= 2;
        console.log(`[renderBalanceEvolutionChart] HasData: ${hasData}`, balanceHistory);

        // Mostra/esconde placeholder e container
        noBalanceDataEl.classList.toggle('hidden', hasData);
        chartContainer.style.display = hasData ? 'block' : 'none';

        // Destrói gráfico antigo
        if (balanceEvolutionApexChart) {
             try { balanceEvolutionApexChart.destroy(); } catch(e) { console.warn("Error destroying old balance chart", e); }
             balanceEvolutionApexChart = null;
        }

        if (!hasData) {
            console.log("[renderBalanceEvolutionChart] Not enough data points (need at least 2).");
            return; // Sai se não há dados suficientes
        }

        const labels = balanceHistory.map(item => formatMonthYear(item.monthYear));
        const dataPoints = balanceHistory.map(item => item.balance);

        // Obtém cores do CSS
        const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333';
        const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#007bff'; // Usa cor primária

        const options = {
            series: [{
                name: "Saldo Acumulado",
                data: dataPoints
            }],
            chart: {
                height: 350,
                type: 'area', // Gráfico de área
                foreColor: labelColor,
                toolbar: {
                    show: true,
                    tools: {
                        download: true,
                        zoom: true,
                        pan: true,
                        reset: true
                    }
                },
                zoom: { // Configuração de zoom (opcional)
                  enabled: true
                }
            },
            dataLabels: {
                enabled: false // Labels nos pontos geralmente poluem gráficos de área/linha
            },
            stroke: {
                curve: 'smooth', // Linha suavizada
                width: 2 // Espessura da linha
            },
            xaxis: {
                categories: labels,
                labels: {
                    style: {
                        colors: labelColor // Cor dos labels do eixo X
                    }
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: labelColor // Cor dos labels do eixo Y
                    },
                    // Formata valores do eixo Y como moeda
                    formatter: (value) => formatCurrency(value)
                }
            },
            tooltip: {
                // Formata data no tooltip
                x: {
                    // Assumindo que os labels são meses, podemos usar format simples
                    // Se fossem datas completas, usaríamos: format: 'dd MMM yyyy'
                     formatter: (val, { dataPointIndex }) => labels[dataPointIndex] // Mostra o label formatado
                },
                // Formata valor no tooltip
                y: {
                    formatter: (value) => formatCurrency(value)
                },
                // Adapta tema do tooltip ao tema da página
                theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light'
            },
            fill: { // Preenchimento da área abaixo da linha
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.4, // Opacidade no topo
                    opacityTo: 0.1,   // Opacidade na base
                    stops: [0, 90, 100] // Pontos de parada do gradiente
                }
            },
            colors: [lineColor], // Cor da linha e do gradiente
            grid: {
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#e0e0e0', // Cor da grade
                strokeDashArray: 4 // Linhas tracejadas
            }
        };

        chartContainer.innerHTML = '';
        balanceEvolutionApexChart = new ApexCharts(chartContainer, options);
        balanceEvolutionApexChart.render().catch(err => console.error("[renderBalanceEvolutionChart] Error rendering:", err));

    } catch (e) {
        console.error("Error in renderBalanceEvolutionChart:", e);
        noBalanceDataEl.classList.remove('hidden');
        chartContainer.style.display = 'none';
        if (balanceEvolutionApexChart) {
            try { balanceEvolutionApexChart.destroy(); balanceEvolutionApexChart = null; } catch (err) { /* Ignora erro */ }
        }
    }
}

// **MODIFICADO**: Aceita transactionsData
export function renderComparisonReport(comparisonType = 'month-vs-last', transactionTypeValue = 'expense', transactionsData = []) {
    const chartElementId = 'comparison-apex-chart';
    const chartContainer = document.getElementById(chartElementId);
    const noComparisonDataEl = document.getElementById('no-comparison-data');

    if (!chartContainer || !noComparisonDataEl) {
        console.error("[renderComparisonReport] Elementos do DOM não encontrados.");
        return;
    }
    console.log(`[renderComparisonReport] Rendering for comparison: ${comparisonType}, type: ${transactionTypeValue}. Data length: ${transactionsData.length}`);

    // Destrói gráfico antigo
    if (comparisonApexChart) {
        try { comparisonApexChart.destroy(); } catch (e) { console.warn("Error destroying old comparison chart", e); }
        comparisonApexChart = null;
    }

    try {
        const { categories: categoryLabels, series: comparisonSeries, labels: periodLabels } =
            calculateComparisonDataByCategory(comparisonType, transactionTypeValue, transactionsData); // Passa transactionsData

        const hasData = categoryLabels.length > 0 &&
                        comparisonSeries.some(s => s.data.some(d => d !== 0));
        console.log("[renderComparisonReport] Data:", { hasData, categoryLabels, comparisonSeries });

        // Mostra/esconde placeholder e container
        noComparisonDataEl.classList.toggle('hidden', hasData);
        chartContainer.style.display = hasData ? 'block' : 'none';

        if (!hasData) {
            console.log("[renderComparisonReport] No data for comparison.");
            return; // Sai se não há dados
        }

        // Obtém cores do CSS
        const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333';
        const barColorCurrent = transactionTypeValue === 'income'
            ? (getComputedStyle(document.documentElement).getPropertyValue('--income-color') || '#28a745')
            : (getComputedStyle(document.documentElement).getPropertyValue('--expense-color') || '#dc3545');
        const barColorPrevious = transactionTypeValue === 'income'
            ? 'rgba(40, 167, 69, 0.6)' // Verde mais claro/transparente
            : 'rgba(220, 53, 69, 0.6)'; // Vermelho mais claro/transparente

        const options = {
            series: comparisonSeries, // Já vem no formato [{ name: 'Label Antigo', data: [...] }, { name: 'Label Atual', data: [...] }]
            chart: {
                type: 'bar',
                height: 350,
                foreColor: labelColor,
                toolbar: {
                    show: true,
                    tools: {
                        download: true
                    }
                }
            },
            plotOptions: {
                bar: {
                    horizontal: false, // Barras verticais
                    columnWidth: '60%', // Largura das colunas
                    dataLabels: {
                        position: 'top', // Posição dos labels (se habilitados)
                    },
                }
            },
            colors: [barColorPrevious, barColorCurrent], // Cor para série anterior e atual
            dataLabels: {
                enabled: false // Desabilita labels em cima das barras (pode poluir)
            },
            stroke: { // Borda das barras
                show: true,
                width: 2,
                colors: ['transparent'] // Borda transparente
            },
            xaxis: {
                categories: categoryLabels, // Nomes das categorias no eixo X
                labels: {
                    style: {
                        colors: labelColor
                    },
                    rotate: -45, // Rotaciona labels para caberem melhor
                    hideOverlappingLabels: false, // Tenta mostrar todos os labels
                    trim: false // Não corta labels longos
                }
            },
            yaxis: {
                title: {
                    text: 'Valor', // Título do eixo Y
                    style: {
                        color: labelColor
                    }
                },
                labels: {
                    style: {
                        colors: labelColor
                    },
                    // Formata valores do eixo Y
                    formatter: (value) => formatCurrency(value)
                }
            },
            fill: {
                opacity: 1 // Opacidade das barras
            },
            legend: {
                position: 'top',
                horizontalAlign: 'center',
                labels: {
                    colors: labelColor
                }
            },
            tooltip: {
                shared: true, // Mostra tooltip para ambas as barras juntas
                intersect: false, // Mostra mesmo sem passar o mouse exatamente sobre a barra
                y: {
                    // Formata valor no tooltip
                    formatter: (val) => formatCurrency(val)
                },
                theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light'
            },
            grid: {
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color') || '#e0e0e0',
                strokeDashArray: 4
            }
        };

        chartContainer.innerHTML = '';
        comparisonApexChart = new ApexCharts(chartContainer, options);
        comparisonApexChart.render().catch(err => console.error("[renderComparisonReport] Error rendering:", err));

    } catch (error) {
        console.error("Error in renderComparisonReport:", error);
        noComparisonDataEl.classList.remove('hidden');
        chartContainer.style.display = 'none';
        if (comparisonApexChart) {
            try { comparisonApexChart.destroy(); comparisonApexChart = null; } catch (err) { /* Ignora */ }
        }
    }
}

// Listener de Redimensionamento (não essencial para ApexCharts, mas pode ser usado para outros ajustes)
window.addEventListener('sidebarToggled', () => {
    // ApexCharts geralmente se redimensiona sozinho, mas podemos forçar se necessário
    // setTimeout(() => {
    //     if (categoryApexChart) categoryApexChart.windowResizeHandler();
    //     if (balanceEvolutionApexChart) balanceEvolutionApexChart.windowResizeHandler();
    //     if (comparisonApexChart) comparisonApexChart.windowResizeHandler();
    // }, 350); // Delay para esperar a animação da sidebar
});