// helpers.js - Funções Utilitárias

import { getUndoTimeoutId, setUndoTimeoutId, clearUndoState } from './recurring.js'; // Comentado
// Importa IMask (se não estiver globalmente disponível, ajuste o path ou use CDN)
// import IMask from 'imask'; // Exemplo se estivesse usando um bundler

// Seletores de feedback legados (apenas para auth)
let authFeedbackEl;

const MOBILE_BREAKPOINT = 768; // Ponto de corte para visualização móvel

// Inicializa elementos de feedback (principalmente para Toast container)
export function initializeFeedbackElements() {
    authFeedbackEl = document.getElementById('auth-feedback'); // Feedback legado de auth
    let toastContainer = document.getElementById('toast-container');
    // Cria o container de toasts se não existir
    if (!toastContainer) {
        // console.log("[initializeFeedbackElements] Criando #toast-container...");
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    // console.log("[initializeFeedbackElements] Elementos de feedback inicializados.");
}

// Função para obter elementos de feedback LEGADOS (Apenas Auth atualmente)
function getLegacyFeedbackElementById(elementId) {
    if (elementId === 'auth-feedback') {
        return authFeedbackEl;
    }
    console.warn(`[getLegacyFeedbackElementById] Elemento legado não suportado ou não encontrado: ${elementId}`);
    return null;
}

// Funções Utilitárias Gerais
export function isMobileView() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}
export function normalizeText(text) {
    if (!text) return '';
    // Converte para minúsculas, remove acentos e caracteres especiais
    return text
        .toLowerCase()
        .normalize('NFD') // Decompõe caracteres acentuados
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacríticos (acentos)
}
export function formatCurrency(value) {
    // Garante que o valor seja um número, tratando NaN e outros tipos
    if (typeof value !== 'number' || isNaN(value)) {
        value = 0;
    }
    // Formata como moeda brasileira (BRL)
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}
export function formatDate(dateString) {
    // 1. Validação inicial
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) {
        return '';
    }
    try {
        const parts = dateString.split('-');
        if (parts.length !== 3) return '';

        // *** ADICIONA VALIDAÇÃO DE COMPRIMENTO DAS PARTES ***
        const yearPart = parts[0];
        const monthPart = parts[1];
        const dayPart = parts[2];

        if (yearPart.length !== 4 || monthPart.length !== 2 || dayPart.length !== 2) {
            console.warn(`[formatDate] Formato inválido (esperado YYYY-MM-DD): ${dateString}`);
            return ''; // Rejeita se as partes não tiverem o comprimento correto
        }
        // *** FIM DA VALIDAÇÃO DE COMPRIMENTO ***

        // 2. Parse e validação numérica
        const y = parseInt(yearPart); // Usa as partes já validadas
        const m = parseInt(monthPart);
        const d = parseInt(dayPart);
        if (isNaN(y) || isNaN(m) || isNaN(d)) {
            // Esta validação ainda é útil caso as partes contenham algo não numérico
            // apesar de terem o comprimento certo (ex: 'AAAA-MM-DD')
             console.warn(`[formatDate] Falha ao parsear componentes numéricos: ${dateString}`);
             return '';
        }

        // 3. Validação de limites (mês/dia) - Redundante se parseInt falhar, mas seguro manter
        if (m < 1 || m > 12 || d < 1 || d > 31) {
            return '';
        }

        // 4. Criação e validação do objeto Date
        const date = new Date(Date.UTC(y, m - 1, d));
        if (isNaN(date.getTime()) ||
            date.getUTCFullYear() !== y ||
            date.getUTCMonth() !== m - 1 ||
            date.getUTCDate() !== d)
        {
            console.warn(`[formatDate] Data inválida ou inexistente detectada (ex: 31/02): ${dateString}`);
            return '';
        }

        // 5. Formatação final
        return date.toLocaleDateString('pt-BR', {
            timeZone: 'UTC',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

    } catch (e) {
        console.error(`[formatDate] Erro ao formatar data "${dateString}":`, e);
        return '';
    }
}

export function formatMonthYear(monthYearString) {
    if (!monthYearString || typeof monthYearString !== 'string' || !monthYearString.includes('-')) {
        return monthYearString;
    }
    try {
        const parts = monthYearString.split('-');
        if (parts.length !== 2) return monthYearString; // Retorna original se não for YYYY-MM

        // *** ADICIONA VALIDAÇÃO DE PARSE INT ***
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);

        // Verifica se são números e se o mês está entre 1 e 12
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || String(year).length !== 4) {
            console.warn(`[formatMonthYear] Formato ou valores inválidos: ${monthYearString}`);
            return monthYearString; // Retorna original se inválido
        }

        const date = new Date(Date.UTC(year, month - 1, 1));
        if (isNaN(date.getTime())) return monthYearString; // Retorna original se data inválida

        return date.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
        });
    } catch (e) {
        console.error(`[formatMonthYear] Erro ao formatar "${monthYearString}":`, e);
        return monthYearString;
    }
}

export function formatDateForInput(date) {
    // Formata um objeto Date para 'YYYY-MM-DD' (usado em inputs type="date")
    if (!(date instanceof Date) || isNaN(date)) {
        // console.warn("[formatDateForInput] Input inválido, esperado objeto Date.");
        return '';
    }
    try {
        // Usa métodos UTC para evitar problemas de fuso
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Mês é 0-indexed, padStart adiciona zero à esquerda se necessário
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("[formatDateForInput] Erro ao formatar objeto Date:", date, e);
        return '';
    }
}


// --- Função showFeedback para TOASTS (REVISADA) ---
/**
 * Exibe uma notificação toast.
 * @param {string} message A mensagem a ser exibida.
 * @param {'success'|'error'|'warning'|'info'} type O tipo de toast (afeta a cor). Padrão 'success'.
 * @param {number} duration Duração em ms. 0 para não desaparecer automaticamente. Padrão 3000.
 * @param {boolean} includeUndo Se deve incluir um botão "Desfazer".
 * @param {function|null} undoCallback A função a ser chamada quando o botão "Desfazer" for clicado.
 * @param {string|null} targetElementId (OPCIONAL) ID de um elemento legado para feedback (ex: 'auth-feedback'). Se fornecido, usa o sistema antigo.
 */
export function showFeedback(message, type = 'success', duration = 3000, includeUndo = false, undoCallback = null, targetElementId = null) {

    // *** Lógica para Feedback Legado (ex: auth) ***
    if (targetElementId) {
        const legacyElement = getLegacyFeedbackElementById(targetElementId);
        if (legacyElement) {
            // console.log(`[showFeedback] Usando feedback legado para ${targetElementId}`);
            // Limpa timeout anterior se houver
            if (legacyElement.timeoutId) clearTimeout(legacyElement.timeoutId);

            // Define conteúdo e classe
            legacyElement.innerHTML = `<span>${message}</span>`;
            legacyElement.className = `feedback ${type}`; // Aplica classe de tipo (success, error, etc.)
            legacyElement.style.display = 'flex'; // Garante visibilidade
            legacyElement.style.opacity = '1';    // Garante opacidade total

            // Define timeout para esconder, se duração > 0
            if (duration > 0) {
                const currentTimeoutId = setTimeout(() => {
                    // Verifica se este é o timeout mais recente para este elemento
                    if (legacyElement && legacyElement.timeoutId === currentTimeoutId) {
                        legacyElement.style.opacity = '0'; // Inicia fade out
                        // Esconde o elemento após a animação de fade out
                        setTimeout(() => {
                            if (legacyElement) {
                                legacyElement.style.display = 'none';
                                legacyElement.innerHTML = ''; // Limpa conteúdo
                                legacyElement.className = 'feedback'; // Reseta classe
                                legacyElement.timeoutId = null; // Limpa ID do timeout
                            }
                        }, 300); // Tempo da transição de opacidade
                    }
                }, duration);
                legacyElement.timeoutId = currentTimeoutId; // Armazena ID do timeout atual
            } else {
                // Se duração for 0, não define timeout para esconder
                legacyElement.timeoutId = null;
            }
            return; // Sai da função após lidar com feedback legado
        } else {
            console.warn(`[showFeedback] Elemento legado ${targetElementId} não encontrado, fallback para toast.`);
        }
    }

    // *** Lógica para Toasts ***
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error("[showFeedback] ERRO CRÍTICO: #toast-container não encontrado no DOM!");
        return;
    }

    // Cria elemento do toast
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`; // Adiciona classe de tipo

    // Cria span para a mensagem
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    let timeoutId = null; // Referência para o timeout de remoção automática

    // Adiciona botão "Desfazer" se necessário
    if (includeUndo && typeof undoCallback === 'function') {
        // Limpa timeout de undo anterior (se houver um toast de undo pendente)
        const currentUndoTimeoutId = getUndoTimeoutId();
        if (currentUndoTimeoutId) {
            clearTimeout(currentUndoTimeoutId);
            console.log("[showFeedback] Timeout de undo anterior cancelado.");
        }

        // Cria botão "Desfazer"
        const undoButton = document.createElement('button');
        // Aplica classes de botão padrão para estilização base + classe específica
        undoButton.className = 'btn btn-secondary btn-sm undo-button';
        undoButton.textContent = 'Desfazer';
        // undoButton.style.marginLeft = '10px'; // Pode ser feito via CSS

        // Ação do botão "Desfazer"
        undoButton.onclick = () => {
            if(timeoutId) clearTimeout(timeoutId); // Cancela remoção automática se clicar em undo
            undoCallback(); // Chama a função de desfazer passada como argumento
            // Inicia animação de saída do toast
            toast.classList.remove('show');
            toast.classList.add('hide');
            // Remove o toast do DOM após a animação
            setTimeout(() => { if (toast.parentNode === toastContainer) toast.remove(); }, 500);
            clearUndoState(); // Limpa estado de undo (recurring.js)
        };
        toast.appendChild(undoButton);
        toast.classList.add('with-undo'); // Classe para possível estilização extra
    }

    // Adiciona toast ao container
    toastContainer.appendChild(toast);
    // Força reflow para garantir que a animação inicial funcione
    void toast.offsetWidth;
    // Adiciona classe 'show' para iniciar animação de entrada
    toast.classList.add('show');

    // Define timeout para remover o toast automaticamente (se duration > 0)
    if (duration > 0) {
        timeoutId = setTimeout(() => {
            // Aplica classe 'hide' para iniciar animação de saída
            toast.classList.remove('show');
            toast.classList.add('hide');
            // Remove o elemento do DOM após a animação de saída
            setTimeout(() => {
                // Verifica se o toast ainda está no container antes de remover
                if (toast.parentNode === toastContainer) {
                    toast.remove();
                    // console.log("[showFeedback] Toast removido após duração.");
                }
                // Limpa estado de undo SE este era um toast de undo e não foi clicado
                if (includeUndo && getUndoTimeoutId() === timeoutId) {
                    clearUndoState();
                }
            }, 500); // Tempo da animação de saída (igual à transição CSS)

        }, duration);

        // Se for um toast com undo, armazena o ID do timeout em recurring.js
        if (includeUndo) { setUndoTimeoutId(timeoutId); }
        // Guarda o ID do timeout no próprio elemento (pode ser útil para debug)
        // toast.dataset.timeoutId = timeoutId;
    }
}

// --- clearFeedback (mantida apenas para limpar feedbacks legados como o de auth) ---
export function clearFeedback(elementOrId = null) {
    if (typeof elementOrId === 'string') {
        const legacyElement = getLegacyFeedbackElementById(elementOrId);
        if (legacyElement) {
            // Limpa timeout se existir
            if (legacyElement.timeoutId) {
                clearTimeout(legacyElement.timeoutId);
                legacyElement.timeoutId = null;
            }
            // Esconde e reseta o elemento
            legacyElement.style.opacity = '0';
            legacyElement.style.display = 'none';
            legacyElement.innerHTML = '';
            legacyElement.className = 'feedback'; // Reseta classes
            // console.log(`[clearFeedback] Feedback legado limpo para: ${elementOrId}`);
        }
    }
    // Não limpa toasts, eles desaparecem sozinhos ou com interação
}

// --- Funções para Máscara de Moeda (IMask.js) ---

/**
 * Aplica a máscara de moeda a um elemento de input.
 * @param {HTMLInputElement} inputElement O elemento input.
 * @param {boolean} setInitialValue Se true, tenta formatar o valor já existente no input.
 */
export function applyCurrencyMask(inputElement, setInitialValue = false) {
    if (!inputElement || typeof IMask === 'undefined') {
        if (!inputElement) console.warn('applyCurrencyMask: Elemento de input inválido.');
        if (typeof IMask === 'undefined') console.warn('applyCurrencyMask: Biblioteca IMask não carregada.');
        return;
    }

    const initialValue = inputElement.value; // Guarda valor inicial

    // Destroi máscara anterior se existir no elemento
    if (inputElement.imaskInstance) {
        try {
            inputElement.imaskInstance.destroy();
        } catch (e) {
            console.warn('Erro ao destruir máscara IMask anterior:', e);
        }
        inputElement.imaskInstance = null;
    }

    // Opções da máscara BRL
    const maskOptions = {
        mask: 'R$ num', // Prefixo R$ e bloco numérico
        blocks: {
            num: {
                mask: Number,           // Tipo numérico
                scale: 2,               // 2 casas decimais
                signed: false,          // Apenas números positivos
                thousandsSeparator: '.',// Separador de milhar
                padFractionalZeros: true,// Completa com zeros decimais (ex: 10 -> R$ 10,00)
                normalizeZeros: true,   // Remove zeros à esquerda (ex: 05 -> 5)
                radix: ',',             // Separador decimal
                mapToRadix: ['.'],      // Permite digitar '.' como separador decimal
                min: 0                  // Valor mínimo 0
            }
        }
    };

    // Cria a instância da máscara e a armazena no elemento
    const mask = IMask(inputElement, maskOptions);
    inputElement.imaskInstance = mask;

    // Formata o valor inicial se solicitado e se houver valor
    if (setInitialValue && initialValue) {
        mask.typedValue = initialValue; // Define valor via API da máscara para formatação correta
    }
}

/**
 * Obtém o valor numérico (não mascarado) de um input com máscara de moeda.
 * @param {HTMLInputElement} inputElement O elemento input.
 * @returns {number|NaN} O valor numérico ou NaN se inválido/vazio.
 */
export function getUnmaskedValue(inputElement) {
    if (inputElement && inputElement.imaskInstance) {
        // Obtém valor não mascarado (string)
        const unmasked = inputElement.imaskInstance.unmaskedValue;
        // Retorna NaN se vazio ou nulo
        if (unmasked === '' || unmasked === null || unmasked === undefined) {
            return NaN;
        }
        // Converte para float
        const numericValue = parseFloat(unmasked);
        return isNaN(numericValue) ? NaN : numericValue; // Retorna NaN se conversão falhar
    } else {
        // Fallback se a instância da máscara não for encontrada
        console.warn('getUnmaskedValue: Instância IMask não encontrada:', inputElement?.id || inputElement?.className);
        // Tenta obter valor manualmente (menos confiável)
        const fallbackValue = parseFloat(
            inputElement?.value
                ?.replace("R$", "")      // Remove prefixo
                .trim()
                .replace(/\./g, '')      // Remove separador de milhar
                .replace(',', '.') || '' // Troca separador decimal e fornece '' se vazio
        );
        return isNaN(fallbackValue) ? NaN : fallbackValue;
    }
}

/**
 * Remove a máscara de moeda de um elemento de input.
 * @param {HTMLInputElement} inputElement O elemento input.
 */
export function destroyCurrencyMask(inputElement) {
    if (inputElement && inputElement.imaskInstance) {
        try {
            inputElement.imaskInstance.destroy();
            inputElement.imaskInstance = null; // Limpa referência
        } catch (e) {
            console.warn('Erro ao destruir máscara IMask:', e);
        }
    }
}