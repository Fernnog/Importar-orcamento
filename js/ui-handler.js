// js/ui-handler.js
import { appState, sortState, filterState } from './state-manager.js';
import { parseDate } from './utils.js'; // Assumindo que parseDate será movido para um utils.js

export const DOM = {};

export function initDOM() {
    const ids = [
        'toastContainer', 'spinnerOverlay', 'textoBanco', 'fileBanco', 'filtroDataInicio',
        'novaDataLancamento', 'painelRefinamento', 'fileOrcamento', 'previewBanco',
        'previewOrcamento', 'tabelaBanco', 'tabelaOrcamento', 'btnNovaConciliacao',
        'btnGerenciarRegras', 'btnProcessarTexto', 'btnRefinarDados', 'btnExportarPlanilha',
        'actionCenter', 'btnComparar', 'btnExportarDiscrepBanco', 'btnExportarDiscrepOrcamento',
        'summaryPanel', 'summaryReconciled', 'summaryBank', 'summaryBudget',
        'possibleMatchesPanel', 'possibleMatchesTbl', 'btnAutoMatchHighConfidence',
        'btnIgnoreAllPossible', 'regrasModal', 'listaRegras', 'regrasModalPlaceholder',
        'btnExportarRegras', 'btnImportarRegras', 'importFile', 'infoVersaoRegras',
        'timestampRegras', 'createRuleModal', 'btnConfirmarSalvarRegra', 'smart-rule-preview',
        'rule-type-exact', 'modalCopia', 'info-copia-container', 'btnCopiarInfo', 'logPanel', 'logList'
    ];
    ids.forEach(id => DOM[id] = document.getElementById(id));
    DOM.bancoTitle = document.querySelector('.panel-title--banco');
    DOM.orcamentoTitle = document.querySelector('.panel-title--orcamento');
}

// --- FEEDBACK VISUAL ---
export const showSpinner = () => DOM.spinnerOverlay.classList.remove('hidden');
export const hideSpinner = () => DOM.spinnerOverlay.classList.add('hidden');

export function showToast(message, type = 'info') {
  DOM.toastContainer.insertAdjacentHTML('beforeend', `<div class="toast ${type}">${message}</div>`);
  const toast = DOM.toastContainer.lastElementChild;
  setTimeout(() => toast.remove(), 5000);
}

export function animateCounter(element, start, end, duration) {
    // ... (código da função original sem alterações)
    let startTime = null;
    const step = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        element.innerText = Math.floor(progress * (end - start) + start);
        if (progress < 1) { window.requestAnimationFrame(step); } 
        else { element.innerText = end; }
    };
    window.requestAnimationFrame(step);
}

export function updateCompareButtonVisibility() {
    const hasBankData = appState.dadosBanco.length > 0;
    const hasBudgetData = appState.dadosOrcamento.length > 0;
    if (hasBankData && hasBudgetData) {
        if (DOM.actionCenter.classList.contains('hidden')) {
        DOM.actionCenter.classList.remove('hidden');
        showToast("Pronto! Dados carregados. Clique em 'Comparar' para iniciar a análise.", 'warning');
        }
    } else {
        DOM.actionCenter.classList.add('hidden');
    }
}

// --- RENDERIZAÇÃO DE TABELAS E COMPONENTES ---
// NOTA: As funções de renderização como mostrarTabela, renderPossibleMatches, etc.,
// seriam movidas para cá. Para brevidade, apenas uma está representada na íntegra.

export function mostrarTabela(dados, id, noResultsMessage = 'Nenhum dado encontrado.') {
    // ... (código completo da função original movido para cá)
    let dadosParaRenderizar = [...dados];
    const filterTerm = (filterState[id] || '').toLowerCase();
    if (filterTerm) {
        dadosParaRenderizar = dadosParaRenderizar.filter(item => 
            item.descricao.toLowerCase().includes(filterTerm)
        );
        noResultsMessage = 'Nenhum resultado para o filtro aplicado.';
    }
    const sortInfo = sortState[id];
    if (sortInfo) {
        const { key, dir, dataType = 'string' } = sortInfo;
        dadosParaRenderizar.sort((a, b) => {
            const valA = a[key]; const valB = b[key];
            let comparison = 0;
            if (dataType === 'number') comparison = valA - valB;
            else comparison = String(valA).localeCompare(String(valB), 'pt-BR');
            return dir === 'asc' ? comparison : -comparison;
        });
    }
    const tbl = document.getElementById(id);
    const isDiscrepancyTable = id.startsWith('tabela');
    // ... (resto da lógica de renderização da tabela)
    const header = isDiscrepancyTable
        ? `<thead><tr><th class="sortable-header" data-table-id="${id}" data-sort-key="descricao">Descrição</th><th class="sortable-header" data-table-id="${id}" data-sort-key="valor" data-data-type="number">Valor (R$)</th><th class="col-action" title="Excluir">X</th></tr></thead>`
        : `<thead><tr><th class="sortable-header" data-table-id="${id}" data-sort-key="descricao">Descrição</th><th class="sortable-header" data-table-id="${id}" data-sort-key="valor" data-data-type="number">Valor (R$)</th></tr></thead>`;
    tbl.innerHTML = header;
    // ... (resto da lógica)
}

export function mostrarTabelaBanco(dados, id) {
    // ... (código completo da função original movido para cá)
}

export function renderPossibleMatches() {
    // ... (código completo da função original movido para cá)
}

export function renderLog(logEntries) {
    // ... (código completo da função original movido para cá)
}

export function resetUI() {
    DOM.textoBanco.value = '';
    DOM.fileBanco.value = '';
    DOM.fileOrcamento.value = '';
    // ... (resto da lógica de reset do DOM)
    mostrarTabela([], 'previewOrcamento', 'Nenhum orçamento importado.');
    mostrarTabela([], 'tabelaBanco', 'Nenhuma discrepância encontrada.');
    DOM.summaryPanel.classList.add('hidden');
    //...etc
}

export function downloadFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function lerArquivo(file, callback) {
    // Esta função interage com o DOM (spinner) e com o processamento.
    // É um caso híbrido, mas sua principal trigger é a UI.
    showSpinner();
    // ... (lógica de leitura de FileReader, que é assíncrona e ligada à UI)
    // No final, chama hideSpinner()
}