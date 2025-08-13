// js/ui-handler.js
import { appState, sortState, filterState } from './state-manager.js';
import { parseDate, loadXLSXLibrary } from './utils.js';
import { criarChaveItem } from './data-processor.js';

export const DOM = {};

export function initDOM() {
    Object.assign(DOM, {
        toastContainer: document.getElementById('toastContainer'),
        spinnerOverlay: document.getElementById('spinnerOverlay'),
        textoBanco: document.getElementById('textoBanco'),
        fileBanco: document.getElementById('fileBanco'),
        filtroDataInicio: document.getElementById('filtroDataInicio'),
        novaDataLancamento: document.getElementById('novaDataLancamento'),
        painelRefinamento: document.getElementById('painelRefinamento'),
        fileOrcamento: document.getElementById('fileOrcamento'),
        previewBanco: document.getElementById('previewBanco'),
        previewOrcamento: document.getElementById('previewOrcamento'),
        tabelaBanco: document.getElementById('tabelaBanco'),
        tabelaOrcamento: document.getElementById('tabelaOrcamento'),
        btnNovaConciliacao: document.getElementById('btnNovaConciliacao'),
        btnGerenciarRegras: document.getElementById('btnGerenciarRegras'),
        btnProcessarTexto: document.getElementById('btnProcessarTexto'),
        btnRefinarDados: document.getElementById('btnRefinarDados'),
        btnExportarPlanilha: document.getElementById('btnExportarPlanilha'),
        actionCenter: document.getElementById('actionCenter'),
        bancoTitle: document.querySelector('.panel-title--banco'),
        orcamentoTitle: document.querySelector('.panel-title--orcamento'),
        btnComparar: document.getElementById('btnComparar'),
        btnExportarDiscrepBanco: document.getElementById('btnExportarDiscrepBanco'),
        btnExportarDiscrepOrcamento: document.getElementById('btnExportarDiscrepOrcamento'),
        summaryPanel: document.getElementById('summaryPanel'),
        summaryReconciled: document.getElementById('summaryReconciled'),
        summaryBank: document.getElementById('summaryBank'),
        summaryBudget: document.getElementById('summaryBudget'),
        possibleMatchesPanel: document.getElementById('possibleMatchesPanel'),
        possibleMatchesTbl: document.getElementById('possibleMatchesTbl'),
        btnAutoMatchHighConfidence: document.getElementById('btnAutoMatchHighConfidence'),
        btnIgnoreAllPossible: document.getElementById('btnIgnoreAllPossible'),
        regrasModal: document.getElementById('regrasModal'),
        listaRegras: document.getElementById('listaRegras'),
        regrasModalPlaceholder: document.getElementById('regrasModalPlaceholder'),
        btnExportarRegras: document.getElementById('btnExportarRegras'),
        btnImportarRegras: document.getElementById('btnImportarRegras'),
        importFile: document.getElementById('importFile'),
        infoVersaoRegras: document.getElementById('infoVersaoRegras'),
        timestampRegras: document.getElementById('timestampRegras'),
        createRuleModal: document.getElementById('createRuleModal'),
        btnConfirmarSalvarRegra: document.getElementById('btnConfirmarSalvarRegra'),
        smartRulePreview: document.getElementById('smart-rule-preview'),
        ruleTypeExact: document.getElementById('rule-type-exact'),
        modalCopia: document.getElementById('modalCopia'),
        infoCopiaContainer: document.getElementById('info-copia-container'),
        btnCopiarInfo: document.getElementById('btnCopiarInfo'),
        logPanel: document.getElementById('logPanel'),
        logList: document.getElementById('logList'),
    });
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
    let startTime = null;
    const step = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        element.innerText = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.innerText = end;
        }
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

// --- RENDERIZAÇÃO DE TABELAS ---

export function mostrarTabelaBanco(dados, id) {
    let dadosParaRenderizar = [...dados];
    const sortInfo = sortState[id];
    if (sortInfo) {
        const { key, dir, dataType = 'string' } = sortInfo;
        dadosParaRenderizar.sort((a, b) => {
            const valA = a[key];
            const valB = b[key];
            let comparison = 0;
            if (dataType === 'number') comparison = valA - valB;
            else if (dataType === 'date') comparison = parseDate(valA) - parseDate(valB);
            else comparison = String(valA).localeCompare(String(valB), 'pt-BR');
            return dir === 'asc' ? comparison : -comparison;
        });
    }

    const tbl = document.getElementById(id);
    tbl.innerHTML = `<thead><tr>
        <th class="sortable-header" data-table-id="${id}" data-sort-key="data" data-data-type="date">Data</th>
        <th class="sortable-header" data-table-id="${id}" data-sort-key="descricao">Descrição</th>
        <th class="sortable-header" data-table-id="${id}" data-sort-key="valor" data-data-type="number">Valor (R$)</th>
    </tr></thead>`;
    
    if (sortInfo) {
        const th = tbl.querySelector(`th[data-sort-key="${sortInfo.key}"]`);
        if(th) th.setAttribute('data-sort-dir', sortInfo.dir);
    }

    const tbody = document.createElement('tbody');
    const noResultsMessage = DOM.textoBanco.value.trim() ? 'Nenhum lançamento válido.' : 'Aguardando dados...';
    
    if (!dadosParaRenderizar || !dadosParaRenderizar.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="no-results">${noResultsMessage}</td></tr>`;
    } else {
        dadosParaRenderizar.forEach(l => {
            const row = tbody.insertRow();
            row.insertCell().innerText = l.data; 
            const descCell = row.insertCell();
            descCell.innerText = l.descricao;
            if (l.count > 1) {
                descCell.innerHTML += ` <span class="count-badge banco">${l.count}x</span>`;
            }
            row.insertCell().innerText = l.valor.toFixed(2);
        });
    }
    tbl.appendChild(tbody);
}

export function mostrarTabela(dados, id, noResultsMessage = 'Nenhum dado encontrado.') {
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
            const valA = a[key];
            const valB = b[key];
            let comparison = 0;
            if (dataType === 'number') comparison = valA - valB;
            else comparison = String(valA).localeCompare(String(valB), 'pt-BR');
            return dir === 'asc' ? comparison : -comparison;
        });
    }

    const tbl = document.getElementById(id);
    const isDiscrepancyTable = id.startsWith('tabela');
    const header = isDiscrepancyTable
        ? `<thead><tr>
            <th class="sortable-header" data-table-id="${id}" data-sort-key="descricao">Descrição</th>
            <th class="sortable-header" data-table-id="${id}" data-sort-key="valor" data-data-type="number">Valor (R$)</th>
            <th class="col-action" title="Excluir">X</th>
           </tr></thead>`
        : `<thead><tr>
            <th class="sortable-header" data-table-id="${id}" data-sort-key="descricao">Descrição</th>
            <th class="sortable-header" data-table-id="${id}" data-sort-key="valor" data-data-type="number">Valor (R$)</th>
           </tr></thead>`;
    tbl.innerHTML = header;
    
    if (sortInfo) {
        const th = tbl.querySelector(`th[data-sort-key="${sortInfo.key}"]`);
        if(th) th.setAttribute('data-sort-dir', sortInfo.dir);
    }

    const tbody = document.createElement('tbody');
    if (!dadosParaRenderizar || !dadosParaRenderizar.length) {
        const colspan = isDiscrepancyTable ? 3 : 2;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="no-results">${noResultsMessage}</td></tr>`;
    } else {
        dadosParaRenderizar.forEach(l => {
            const row = tbody.insertRow();
            const descCell = row.insertCell();
            descCell.innerText = l.descricao;
            if (l.count > 1) {
                const badgeType = id.includes('Banco') || id.includes('banco') ? 'banco' : 'orcamento';
                descCell.innerHTML += ` <span class="count-badge ${badgeType}">${l.count}x</span>`;
            }
            row.insertCell().innerText = l.valor.toFixed(2);
            if (isDiscrepancyTable) {
                const actionCell = row.insertCell();
                actionCell.className = 'col-action';
                const key = criarChaveItem(l);
                actionCell.innerHTML = `<input type="checkbox" data-key="${key}" title="Excluir este item de toda a análise">`;
            }
        });
    }
    tbl.appendChild(tbody);
}

export function renderPossibleMatches() {
    let matches = [...appState.possibleMatches];
    const tableId = 'possibleMatchesTbl';
    const filterTerm = (filterState[tableId] || '').toLowerCase();
    if (filterTerm) {
        matches = matches.filter(match => 
            match.bancoItem.descricao.toLowerCase().includes(filterTerm) ||
            match.orcItem.descricao.toLowerCase().includes(filterTerm)
        );
    }
    
    const sortInfo = sortState[tableId];
    if (sortInfo) {
        const { key, dir, dataType = 'string' } = sortInfo;
        matches.sort((a, b) => {
            const valA = key === 'score' ? a[key] : a.bancoItem[key];
            const valB = key === 'score' ? b[key] : b.bancoItem[key];
            let comparison = 0;
            if (dataType === 'number') {
                comparison = valA - valB;
            } else {
                comparison = String(valA).localeCompare(String(valB), 'pt-BR', { sensitivity: 'base' });
            }
            return dir === 'asc' ? comparison : -comparison;
        });
    }

    const tbl = DOM.possibleMatchesTbl;
    tbl.innerHTML = `<thead><tr>
        <th class="sortable-header" data-table-id="possibleMatchesTbl" data-sort-key="descricao">Banco (Descrição)</th>
        <th class="sortable-header" data-table-id="possibleMatchesTbl" data-sort-key="descricao">Orçamento (Descrição)</th>
        <th class="sortable-header" data-table-id="possibleMatchesTbl" data-sort-key="valor" data-data-type="number">Valor (R$)</th>
        <th class="sortable-header" data-table-id="possibleMatchesTbl" data-sort-key="score" data-data-type="number">Confiança</th>
        <th>Ação</th>
    </tr></thead>`;
    
    if (sortInfo) {
        const th = tbl.querySelector(`th[data-sort-key="${sortInfo.key}"]`);
        if(th) th.setAttribute('data-sort-dir', sortInfo.dir);
    }
    const tbody = document.createElement('tbody');

    if (!matches.length && !filterTerm) {
        DOM.possibleMatchesPanel.classList.add('hidden');
        return;
    }
    DOM.possibleMatchesPanel.classList.remove('hidden');

    if (!matches.length && filterTerm) {
        tbody.innerHTML = `<tr><td colspan="5" class="no-results">Nenhum resultado para o filtro aplicado.</td></tr>`;
    } else {
        matches.forEach(match => {
            const originalIndex = appState.possibleMatches.indexOf(match);
            const tr = tbody.insertRow();
            tr.className = 'possible-match-row';
            tr.dataset.matchIndex = originalIndex;
            tr.draggable = true;
            tr.insertCell().innerText = match.bancoItem.descricao;
            tr.insertCell().innerText = match.orcItem.descricao;
            tr.insertCell().innerText = match.bancoItem.valor.toFixed(2);
            const scoreClass = match.score >= 0.8 ? 'high' : (match.score >= 0.5 ? 'medium' : 'low');
            tr.insertCell().innerHTML = `<span class="match-score ${scoreClass}">${(match.score * 100).toFixed(0)}%</span>`;
            const actionCell = tr.insertCell();
            actionCell.className = 'possible-match-actions';
            actionCell.innerHTML = `
                <button class="btn-accept" title="Confirmar conciliação">✓</button>
                <button class="btn-save-rule" title="Confirmar e Salvar Regra">✓+</button>
                <button class="btn-reject" title="Marcar como discrepância">✕</button>
            `;
        });
    }
    tbl.appendChild(tbody);
}

export function renderLog(logEntries) {
    if (!logEntries || logEntries.length === 0) {
        DOM.logPanel.classList.add('hidden');
        return;
    }
    DOM.logList.innerHTML = logEntries.map(entry => `<li>${entry}</li>`).join('');
    DOM.logPanel.classList.remove('hidden');
    DOM.logList.classList.remove('no-results');
}


// --- LÓGICA DE UI E ARQUIVOS ---

export async function lerArquivo(file, callback) {
    showSpinner();
    const ext = file.name.split('.').pop().toLowerCase();
    if (['xlsx', 'xls'].includes(ext)) {
        try { await loadXLSXLibrary(); } catch (error) {
            showToast(error.message, 'error'); hideSpinner(); return;
        }
    }
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
        showToast('Formato de arquivo não suportado: ' + ext, 'error'); hideSpinner(); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            let linhas;
            if (ext === 'csv') {
                linhas = new TextDecoder('utf-8').decode(e.target.result).split(/\r?\n/).map(l => l.split(';'));
            } else {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
            }
            callback(linhas);
        } catch (error) {
            console.error("Erro ao processar arquivo:", error); showToast("Ocorreu um erro ao processar o arquivo.", 'error');
        } finally { hideSpinner(); }
    };
    reader.onerror = () => { showToast("Não foi possível ler o arquivo.", 'error'); hideSpinner(); };
    reader.readAsArrayBuffer(file);
}

export async function exportarXLSX(dados, nomeArquivo) {
    if (!dados || !dados.length) { showToast("Lista para exportar está vazia.", 'error'); return; }
    try {
        await loadXLSXLibrary();
        const ws = XLSX.utils.json_to_sheet(dados.map(l => ({ 'Data': l.data, 'Descrição': l.descricao, 'Valor': l.valor })));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
        XLSX.writeFile(wb, nomeArquivo); showToast('Planilha exportada!', 'success');
    } catch (error) { showToast(error.message, 'error'); }
}

export function exportarCSV(dados, nomeArquivo) {
    if (!dados || !dados.length) { showToast("Não há discrepâncias para exportar.", 'error'); return; }
    const conteudo = 'Descrição,Valor\n' + dados.map(l => `"${l.descricao}",${l.valor}`).join('\n');
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8;' }));
    link.download = nomeArquivo; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast(`Arquivo ${nomeArquivo} gerado!`, 'success');
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

// --- FUNÇÕES DE RESET ---
export function resetUI() {
    DOM.textoBanco.value = '';
    DOM.fileBanco.value = '';
    DOM.fileOrcamento.value = '';
    DOM.filtroDataInicio.value = '';
    DOM.novaDataLancamento.value = '';
    mostrarTabelaBanco([], 'previewBanco');
    mostrarTabela([], 'previewOrcamento', 'Nenhum orçamento importado.');
    mostrarTabela([], 'tabelaBanco', 'Nenhuma discrepância encontrada.');
    mostrarTabela([], 'tabelaOrcamento', 'Nenhuma discrepância encontrada.');
    DOM.painelRefinamento.classList.add('hidden');
    DOM.summaryPanel.classList.add('hidden');
    DOM.possibleMatchesPanel.classList.add('hidden');
    DOM.logPanel.classList.add('hidden');
    DOM.logList.innerHTML = '';
    DOM.actionCenter.classList.add('hidden');
    DOM.bancoTitle.classList.remove('completed');
    DOM.orcamentoTitle.classList.remove('completed');
}
