// charts.js - Lógica e Renderização dos Gráficos e Relatórios

import { formatCurrency, formatDateForInput, formatDate, formatMonthYear } from './helpers.js';
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
    if (categoryApexChart) { try { categoryApexChart.destroy(); } catch(e) { console.error("Error destroying category chart", e);} }
    if (balanceEvolutionApexChart) { try { balanceEvolutionApexChart.destroy(); } catch(e) { console.error("Error destroying balance chart", e);} }
    if (comparisonApexChart) { try { comparisonApexChart.destroy(); } catch(e) { console.error("Error destroying comparison chart", e);} }

    categoryApexChart = null;
    balanceEvolutionApexChart = null;
    comparisonApexChart = null;
    reportsStartDate = null;
    reportsEndDate = null;
    console.log("[Charts State] Variables initialized.");
}

// --- Funções de Cálculo ---

// **MODIFICADO**: Aceita transactionsData
function calculateSpendingByCategory(startDate, endDate, transactionsData) {
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
function calculateMonthlyBalances(startDate = null, endDate = null, transactionsData) {
    console.log(`[calculateMonthlyBalances] Calculating for period: ${startDate}-${endDate} with ${transactionsData?.length} transactions.`);
    const monthlyData = {};
    const filteredTransactions = transactionsData.filter(t => {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
    });
     console.log(`[calculateMonthlyBalances] Filtered count: ${filteredTransactions.length}`);

    const sorted = [...filteredTransactions].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach(t => {
        const monthYear = t.date.slice(0, 7);
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { income: 0, expense: 0, date: new Date(Date.UTC(parseInt(t.date.slice(0,4)), parseInt(t.date.slice(5,7)) - 1, 1)) };
        }
        if (t.type === 'income') { monthlyData[monthYear].income += t.amount; }
        else { monthlyData[monthYear].expense += t.amount; }
    });

    let cumulativeBalance = 0;
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
function calculateComparisonDataByCategory(comparisonType, transactionType, transactionsData) {
    const now = new Date();
    let currentStart = new Date(now); let currentEnd = new Date(now);
    let previousStart = new Date(now); let previousEnd = new Date(now);
    let currentLabel, previousLabel;

    switch (comparisonType) {
        // ... (lógica de cálculo de datas mantida) ...
         case 'month-vs-last': currentStart.setUTCDate(1); currentStart.setUTCHours(0, 0, 0, 0); currentEnd = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() + 1, 0, 23, 59, 59, 999)); previousStart = new Date(currentStart); previousStart.setUTCMonth(previousStart.getUTCMonth() - 1); previousEnd = new Date(Date.UTC(previousStart.getUTCFullYear(), previousStart.getUTCMonth() + 1, 0, 23, 59, 59, 999)); currentLabel = currentStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }); previousLabel = previousStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }); break;
         case 'year-vs-last': currentStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)); currentEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999)); previousStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)); previousEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999)); currentLabel = now.getUTCFullYear().toString(); previousLabel = (now.getUTCFullYear() - 1).toString(); break;
         case 'quarter-vs-last': const cQ = Math.floor(now.getUTCMonth() / 3); currentStart = new Date(Date.UTC(now.getUTCFullYear(), cQ * 3, 1)); currentEnd = new Date(Date.UTC(now.getUTCFullYear(), cQ * 3 + 3, 0, 23, 59, 59, 999)); previousStart = new Date(currentStart); previousStart.setUTCMonth(previousStart.getUTCMonth() - 3); previousEnd = new Date(Date.UTC(previousStart.getUTCFullYear(), previousStart.getUTCMonth() + 3, 0, 23, 59, 59, 999)); currentLabel = `T${cQ + 1}/${now.getUTCFullYear().toString().slice(-2)}`; previousLabel = `T${Math.floor(previousStart.getUTCMonth() / 3) + 1}/${previousStart.getUTCFullYear().toString().slice(-2)}`; break;
         case 'month-vs-last-year': currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)); previousStart = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)); previousEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 0, 23, 59, 59, 999)); currentLabel = currentStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }); previousLabel = previousStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }); break;
         case 'ytd-vs-last': currentStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)); currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)); previousStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)); previousEnd = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)); currentLabel = `${now.getUTCFullYear()} (YTD)`; previousLabel = `${now.getUTCFullYear() - 1} (YTD)`; break;
        default: console.error("Tipo de comparação inválido:", comparisonType); return { categories: [], series: [] , labels: { current: 'Erro', previous: 'Erro' }};
    }

    const currentStartStr = formatDateForInput(currentStart); const currentEndStr = formatDateForInput(currentEnd);
    const previousStartStr = formatDateForInput(previousStart); const previousEndStr = formatDateForInput(previousEnd);

    const currentTransactions = transactionsData.filter(t => t.type === transactionType && t.date >= currentStartStr && t.date <= currentEndStr);
    const previousTransactions = transactionsData.filter(t => t.type === transactionType && t.date >= previousStartStr && t.date <= previousEndStr);

    const calculateTotals = (trans) => trans.reduce((acc, t) => { const cat = t.category || 'Sem Categoria'; acc[cat] = (acc[cat] || 0) + t.amount; return acc; }, {});
    const currentTotals = calculateTotals(currentTransactions);
    const previousTotals = calculateTotals(previousTransactions);

    const allCategories = [...new Set([...Object.keys(currentTotals), ...Object.keys(previousTotals)])].sort((a, b) => (currentTotals[b] || 0) - (currentTotals[a] || 0));

    const series = [
        { name: previousLabel, data: allCategories.map(cat => previousTotals[cat] || 0) },
        { name: currentLabel, data: allCategories.map(cat => currentTotals[cat] || 0) }
    ];

    // console.log("[Comparison Calc] Result:", { categories: allCategories, series });
    return { categories: allCategories, series: series, labels: { current: currentLabel, previous: previousLabel } };
}


// --- Funções de Renderização ---

// **MODIFICADO**: Aceita transactionsData
export function renderCategoryChart(transactionsData = []) {
    const chartElementId = 'category-apex-chart';
    const chartContainer = document.getElementById(chartElementId);
    const noChartDataEl = document.getElementById('no-category-chart-data');
    if (!chartContainer || !noChartDataEl) { console.error("Category chart container or placeholder not found"); return; }
    console.log(`[renderCategoryChart] Rendering. Period: ${reportsStartDate} to ${reportsEndDate}. Data length: ${transactionsData.length}`);
    try {
        const spendingByCategory = calculateSpendingByCategory(reportsStartDate, reportsEndDate, transactionsData); // Passa transactionsData
        const labels = Object.keys(spendingByCategory);
        const series = Object.values(spendingByCategory);
        const hasData = series.length > 0 && series.some(s => s > 0);
        console.log(`[renderCategoryChart] HasData: ${hasData}`, { series, labels });
        noChartDataEl.classList.toggle('hidden', hasData);
        chartContainer.style.display = hasData ? 'block' : 'none';
        if (categoryApexChart) { try { categoryApexChart.destroy(); } catch(e){} categoryApexChart = null; } // Destrói antes de verificar hasData
        if (!hasData) { console.log("[renderCategoryChart] No data for the selected period."); return; }
        const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333';
        const options = {
            series: series, labels: labels,
            chart: { type: 'donut', height: 350, foreColor: labelColor, toolbar: { show: true, tools: { download: true } } },
            plotOptions: { pie: { donut: { size: '65%', labels: { show: true, value: { show: true, formatter: (val) => formatCurrency(parseFloat(val)) }, total: { show: true, label: 'Total', formatter: (w) => formatCurrency(w.globals.seriesTotals.reduce((a, b) => a + b, 0)) } } } } },
            dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%`, style: { fontSize: '11px', fontWeight: 'bold', colors: ['#fff'] }, dropShadow: { enabled: false } },
            legend: { position: 'bottom', horizontalAlign: 'center', labels: { colors: labelColor }, itemMargin: { horizontal: 10, vertical: 5 }, markers: { width: 12, height: 12, radius: 12 } },
            tooltip: { y: { formatter: (value) => formatCurrency(value) }, theme: 'dark' },
            responsive: [{ breakpoint: 480, options: { chart: { width: '100%', height: 300 }, legend: { position: 'bottom' }, dataLabels: { style: { fontSize: '9px' } } } }],
        };
        chartContainer.innerHTML = '';
        categoryApexChart = new ApexCharts(chartContainer, options);
        categoryApexChart.render().catch(err => console.error("[renderCategoryChart] Error rendering:", err));
    } catch (e) { console.error("Error in renderCategoryChart:", e); noChartDataEl.classList.remove('hidden'); chartContainer.style.display = 'none'; if (categoryApexChart) { try { categoryApexChart.destroy(); categoryApexChart = null; } catch(err) {} } }
}

// **MODIFICADO**: Aceita transactionsData
export function renderBalanceEvolutionChart(transactionsData = []) {
    const chartElementId = 'balance-evolution-apex-chart';
    const chartContainer = document.getElementById(chartElementId);
    const noBalanceDataEl = document.getElementById('no-balance-chart-data');
     if (!chartContainer || !noBalanceDataEl) { console.error("Balance chart container or placeholder not found"); return; }
     console.log(`[renderBalanceEvolutionChart] Rendering. Period: ${reportsStartDate} to ${reportsEndDate}. Data length: ${transactionsData.length}`);
    try {
        const balanceHistory = calculateMonthlyBalances(reportsStartDate, reportsEndDate, transactionsData); // Passa transactionsData
        const hasData = balanceHistory.length >= 2;
        // console.log(`[renderBalanceEvolutionChart] HasData: ${hasData}`, balanceHistory);
        noBalanceDataEl.classList.toggle('hidden', hasData);
        chartContainer.style.display = hasData ? 'block' : 'none';
        if (balanceEvolutionApexChart) { balanceEvolutionApexChart.destroy(); balanceEvolutionApexChart = null; }
        if (!hasData) { console.log("[renderBalanceEvolutionChart] Not enough data points."); return; }
        const labels = balanceHistory.map(item => formatMonthYear(item.monthYear));
        const dataPoints = balanceHistory.map(item => item.balance);
        const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333';
        const lineColor = '#007bff';
        const options = {
             series: [{ name: "Saldo Acumulado", data: dataPoints }],
             chart: { height: 350, type: 'area', foreColor: labelColor, toolbar: { show: true, tools: { download: true, zoom: true, pan: true, reset: true } } },
             dataLabels: { enabled: false },
             stroke: { curve: 'smooth', width: 2 },
             xaxis: { categories: labels, labels: { style: { colors: labelColor } } },
             yaxis: { labels: { style: { colors: labelColor }, formatter: (value) => formatCurrency(value) } },
             tooltip: { x: { format: 'MMM yyyy' }, y: { formatter: (value) => formatCurrency(value) }, theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light' },
             fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 90, 100] } },
             colors: [lineColor],
             grid: { borderColor: '#e0e0e0', strokeDashArray: 4 }
         };
        chartContainer.innerHTML = '';
        balanceEvolutionApexChart = new ApexCharts(chartContainer, options);
        balanceEvolutionApexChart.render().catch(err => console.error("[renderBalanceEvolutionChart] Error rendering:", err));
    } catch (e) { console.error("Error in renderBalanceEvolutionChart:", e); noBalanceDataEl.classList.remove('hidden'); chartContainer.style.display = 'none'; if (balanceEvolutionApexChart) { try { balanceEvolutionApexChart.destroy(); balanceEvolutionApexChart = null; } catch(err) {} } }
}

// **MODIFICADO**: Aceita transactionsData
export function renderComparisonReport(comparisonType = 'month-vs-last', transactionTypeValue = 'expense', transactionsData = []) {
    const chartElementId = 'comparison-apex-chart';
    const chartContainer = document.getElementById(chartElementId);
    const noComparisonDataEl = document.getElementById('no-comparison-data');
    if (!chartContainer || !noComparisonDataEl) { console.error("[renderComparisonReport] Elementos do DOM não encontrados."); return; }
    console.log(`[renderComparisonReport] Rendering for comparison: ${comparisonType}, type: ${transactionTypeValue}. Data length: ${transactionsData.length}`);
    if (comparisonApexChart) { comparisonApexChart.destroy(); comparisonApexChart = null; }

    try {
        const { categories: categoryLabels, series: comparisonSeries, labels: periodLabels } =
            calculateComparisonDataByCategory(comparisonType, transactionTypeValue, transactionsData); // Passa transactionsData
        const hasData = categoryLabels.length > 0 && comparisonSeries.some(s => s.data.some(d => d !== 0));
        // console.log("[renderComparisonReport] Data:", { hasData, categoryLabels, comparisonSeries });
        noComparisonDataEl.classList.toggle('hidden', hasData);
        chartContainer.style.display = hasData ? 'block' : 'none';
        if (!hasData) { console.log("[renderComparisonReport] No data for comparison."); return; }

        const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333';
        const barColorCurrent = transactionTypeValue === 'income' ? '#28a745' : '#dc3545';
        const barColorPrevious = transactionTypeValue === 'income' ? 'rgba(40, 167, 69, 0.6)' : 'rgba(220, 53, 69, 0.6)';
        const options = {
            series: comparisonSeries,
            chart: { type: 'bar', height: 350, foreColor: labelColor, toolbar: { show: true, tools: { download: true } } },
            plotOptions: { bar: { horizontal: false, columnWidth: '60%', dataLabels: { position: 'top' } } },
            colors: [barColorPrevious, barColorCurrent],
            dataLabels: { enabled: false }, // Labels externos removidos
            stroke: { show: true, width: 2, colors: ['transparent'] },
            xaxis: { categories: categoryLabels, labels: { style: { colors: labelColor }, rotate: -45, hideOverlappingLabels: false, trim: false } },
            yaxis: { title: { text: 'Valor', style: { color: labelColor } }, labels: { style: { colors: labelColor }, formatter: (value) => formatCurrency(value) } },
            fill: { opacity: 1 },
            legend: { position: 'top', horizontalAlign: 'center', labels: { colors: labelColor } },
            tooltip: { shared: true, intersect: false, y: { formatter: (val) => formatCurrency(val) }, theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light' },
            grid: { borderColor: '#e0e0e0', strokeDashArray: 4 }
        };
        chartContainer.innerHTML = '';
        comparisonApexChart = new ApexCharts(chartContainer, options);
        comparisonApexChart.render().catch(err => console.error("[renderComparisonReport] Error rendering:", err));
    } catch (error) { console.error("Error in renderComparisonReport:", error); noComparisonDataEl.classList.remove('hidden'); chartContainer.style.display = 'none'; if (comparisonApexChart) { try { comparisonApexChart.destroy(); comparisonApexChart = null; } catch(err) {} } }
}

// Listener de Redimensionamento (não essencial para ApexCharts)
window.addEventListener('sidebarToggled', () => {});