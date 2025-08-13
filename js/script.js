// js/script.js (Orquestrador)

import * as State from './state-manager.js';
import * as UI from './ui-handler.js';
import * as Data from './data-processor.js';
import Paginador from './paginador.js';
import { debounce } from './utils.js';

// --- FUNÇÕES DE ORQUESTRAÇÃO ---

function resetApplication() {
  State.resetAppState();
  UI.resetUI();
  document.querySelectorAll('.table-filter-input').forEach(input => input.value = '');
  Paginador.reset();
  UI.showToast('Sessão limpa. Pronto para uma nova análise!', 'success');
}

function handleComparar() {
    if (!State.appState.dadosBanco.length || !State.appState.dadosOrcamento.length) {
        UI.showToast("Importe os dados do banco e do orçamento antes de comparar.", 'error');
        return;
    }

    const { logEntries } = Data.comparar();
    UI.renderLog(logEntries);

    // Atualiza as tabelas e painéis com base no novo estado
    if (State.appState.possibleMatches.length > 0) {
        UI.renderPossibleMatches();
        UI.showToast(`Encontramos ${State.appState.possibleMatches.length} possíveis conciliações.`, 'info');
        UI.mostrarTabela([], 'tabelaBanco', 'Revise as possíveis coincidências acima.');
        UI.mostrarTabela([], 'tabelaOrcamento', 'Revise as possíveis coincidências acima.');
    } else {
        UI.DOM.possibleMatchesPanel.classList.add('hidden');
        UI.mostrarTabela(State.appState.discrepBanco, 'tabelaBanco', 'Nenhuma discrepância encontrada.');
        UI.mostrarTabela(State.appState.discrepOrc, 'tabelaOrcamento', 'Nenhuma discrepância encontrada.');
        UI.showToast('Comparação concluída!', 'success');
    }
    
    // Anima os contadores do resumo
    const reconciledCount = State.appState.dadosBancoOriginais.length - State.appState.dadosBanco.length;
    UI.animateCounter(UI.DOM.summaryReconciled, 0, reconciledCount, 750);
    UI.animateCounter(UI.DOM.summaryBank, 0, State.appState.discrepBanco.length, 750);
    UI.animateCounter(UI.DOM.summaryBudget, 0, State.appState.discrepOrc.length, 750);

    UI.DOM.summaryPanel.classList.remove('hidden');
    Paginador.updateState({ resumo: true });
}

function reanalisarAposMudanca() {
    UI.showSpinner();
    State.appState.possibleMatches = []; // Força reavaliação de sugestões
    handleComparar();
    UI.hideSpinner();
}

// --- HANDLERS DE EVENTOS DE ALTO NÍVEL ---

function handleProcessarTexto() {
  const texto = UI.DOM.textoBanco.value;
  if (!texto.trim()) {
    UI.showToast("Cole o extrato bruto antes de processar.", 'error');
    return;
  }
  UI.showSpinner();
  const dadosProcessados = Data.importarTextoBrutoInteligente(texto);
  State.appState.dadosBancoOriginais = [...dadosProcessados];
  State.appState.dadosBanco = [...dadosProcessados];
  UI.mostrarTabelaBanco(State.appState.dadosBanco, 'previewBanco');
  UI.hideSpinner();

  if (State.appState.dadosBanco.length > 0) {
    UI.DOM.painelRefinamento.classList.remove('hidden');
    UI.showToast(`${State.appState.dadosBanco.length} lançamentos encontrados.`, 'info');
    UI.DOM.bancoTitle.classList.add('completed');
    Paginador.updateState({ banco: true });
    UI.updateCompareButtonVisibility();
  } else {
    UI.showToast('Nenhum lançamento válido encontrado. Verifique o formato.', 'error');
  }
}

function handleSort(e) {
    const header = e.target.closest('.sortable-header');
    if (!header) return;

    const tableId = header.dataset.tableId;
    const sortKey = header.dataset.sortKey;
    const dataType = header.dataset.dataType || 'string';
    if (!tableId || !sortKey) return;

    const currentDir = State.sortState[tableId]?.key === sortKey ? State.sortState[tableId].dir : 'none';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';
    State.sortState[tableId] = { key: sortKey, dir: newDir, dataType };

    const renderMap = {
        'previewBanco': () => UI.mostrarTabelaBanco(State.appState.dadosBanco, 'previewBanco'),
        'previewOrcamento': () => UI.mostrarTabela(State.appState.dadosOrcamento, 'previewOrcamento', 'Nenhum orçamento importado.'),
        'tabelaBanco': () => UI.mostrarTabela(State.appState.discrepBanco, 'tabelaBanco', 'Nenhuma discrepância encontrada.'),
        'tabelaOrcamento': () => UI.mostrarTabela(State.appState.discrepOrc, 'tabelaOrcamento', 'Nenhuma discrepância encontrada.'),
        'possibleMatchesTbl': () => UI.renderPossibleMatches()
    };
    if (renderMap[tableId]) renderMap[tableId]();
}

const debouncedFilter = debounce((e) => {
    const input = e.target;
    if (!input.classList.contains('table-filter-input')) return;
    
    const tableId = input.dataset.tableId;
    State.filterState[tableId] = input.value;
    
    const renderMap = {
        'tabelaBanco': () => UI.mostrarTabela(State.appState.discrepBanco, 'tabelaBanco', 'Nenhuma discrepância encontrada.'),
        'tabelaOrcamento': () => UI.mostrarTabela(State.appState.discrepOrc, 'tabelaOrcamento', 'Nenhuma discrepância encontrada.'),
        'possibleMatchesTbl': () => UI.renderPossibleMatches()
    };
    if (renderMap[tableId]) renderMap[tableId]();
}, 300);

function openCreateRuleModal(match) {
    const bancoPattern = Data.extractPattern(match.bancoItem.descricao);
    const orcPattern = Data.extractPattern(match.orcItem.descricao);

    UI.DOM.createRuleModal.dataset.bancoDesc = match.bancoItem.descricao;
    UI.DOM.createRuleModal.dataset.orcDesc = match.orcItem.descricao;
    UI.DOM.createRuleModal.dataset.bancoPattern = bancoPattern;
    UI.DOM.createRuleModal.dataset.orcPattern = orcPattern;
    UI.DOM.createRuleModal.dataset.matchIndex = State.appState.possibleMatches.indexOf(match);

    UI.DOM.smartRulePreview.textContent = `Irá associar itens que comecem com "${bancoPattern}" (banco) a itens que comecem com "${orcPattern}" (orçamento).`;
    
    UI.DOM.ruleTypeExact.checked = true;
    UI.DOM.createRuleModal.classList.remove('hidden');
}

function handleMatchAction(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const tr = button.closest('tr');
    if (!tr || typeof tr.dataset.matchIndex === 'undefined') return;
    
    const matchIndex = parseInt(tr.dataset.matchIndex, 10);
    const match = State.appState.possibleMatches[matchIndex];
    if (!match) return;

    if (button.classList.contains('btn-save-rule')) {
        openCreateRuleModal(match);
        return;
    }
    
    if (button.classList.contains('btn-accept')) {
        State.appState.dadosBanco = State.appState.dadosBanco.filter(item => item !== match.bancoItem);
        State.appState.dadosOrcamento = State.appState.dadosOrcamento.filter(item => item !== match.orcItem);
        UI.showToast('Conciliação confirmada!', 'success');
    } else if (button.classList.contains('btn-reject')) {
        UI.showToast('Sugestão ignorada.', 'info');
    }
    
    State.appState.possibleMatches.splice(matchIndex, 1);
    handleComparar();
}

function handleDiscrepancyDeletion(e) {
    if (e.target.tagName !== 'INPUT' || e.target.type !== 'checkbox') return;

    const keyToDelete = e.target.dataset.key;
    if (!confirm(`Tem certeza que deseja apagar TODOS os lançamentos com a chave "${keyToDelete.replace('_', ' | R$ ')}"? Esta ação é irreversível e removerá o item de todas as listas.`)) {
        e.target.checked = false;
        return;
    }
    
    State.appState.dadosBanco = State.appState.dadosBanco.filter(item => Data.criarChaveItem(item) !== keyToDelete);
    State.appState.dadosBancoOriginais = State.appState.dadosBancoOriginais.filter(item => Data.criarChaveItem(item) !== keyToDelete);
    State.appState.dadosOrcamento = State.appState.dadosOrcamento.filter(item => Data.criarChaveItem(item) !== keyToDelete);
    
    UI.showToast('Item removido. Reanalisando...', 'info');
    
    UI.mostrarTabelaBanco(State.appState.dadosBanco, 'previewBanco');
    UI.mostrarTabela(State.appState.dadosOrcamento, 'previewOrcamento', 'Orçamento importado. Pronto para comparar.');
    reanalisarAposMudanca();
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
  // A chamada UI.initDOM() foi removida daqui.
  Paginador.init();

  const mainElement = document.querySelector('main');
  
  // --- Ações Principais ---
  UI.DOM.btnNovaConciliacao.addEventListener('click', resetApplication);
  UI.DOM.btnProcessarTexto.addEventListener('click', handleProcessarTexto);
  UI.DOM.btnComparar.addEventListener('click', () => reanalisarAposMudanca());

  // --- Importação / Exportação ---
  UI.DOM.fileOrcamento.addEventListener('change', e => {
    if (!e.target.files.length) return;
    UI.lerArquivo(e.target.files[0], linhas => {
      const result = Data.processarDadosOrcamento(linhas);
      if (result.success) {
        State.appState.dadosOrcamento = result.data;
        UI.mostrarTabela(State.appState.dadosOrcamento, 'previewOrcamento', 'Orçamento importado.');
        UI.showToast(`${State.appState.dadosOrcamento.length} itens importados.`, 'success');
        UI.DOM.orcamentoTitle.classList.add('completed');
        Paginador.updateState({ orcamento: true });
        UI.updateCompareButtonVisibility();
      } else {
        UI.showToast(result.message, 'error');
      }
    });
  });
  
  UI.DOM.btnExportarPlanilha.addEventListener('click', () => UI.exportarXLSX(State.appState.dadosBanco, 'importacao_pronta.xlsx'));
  UI.DOM.btnExportarDiscrepBanco.addEventListener('click', () => UI.exportarCSV(State.appState.discrepBanco, 'discrepancias_banco.csv'));
  UI.DOM.btnExportarDiscrepOrcamento.addEventListener('click', () => UI.exportarCSV(State.appState.discrepOrc, 'discrepancias_orcamento.csv'));

  // --- Tabelas e Interações ---
  mainElement.addEventListener('click', handleSort);
  mainElement.addEventListener('input', debouncedFilter);

  UI.DOM.possibleMatchesTbl.addEventListener('click', handleMatchAction);
  UI.DOM.tabelaBanco.addEventListener('click', handleDiscrepancyDeletion);
  UI.DOM.tabelaOrcamento.addEventListener('click', handleDiscrepancyDeletion);

  UI.DOM.btnAutoMatchHighConfidence.addEventListener('click', () => {
      const highConfidenceMatches = State.appState.possibleMatches.filter(m => m.score >= 0.8);
      if(!highConfidenceMatches.length) { UI.showToast('Nenhuma sugestão de alta confiança para conciliar.', 'info'); return; }
      
      highConfidenceMatches.forEach(match => {
          State.appState.dadosBanco = State.appState.dadosBanco.filter(item => item !== match.bancoItem);
          State.appState.dadosOrcamento = State.appState.dadosOrcamento.filter(item => item !== match.orcItem);
      });
      State.appState.possibleMatches = State.appState.possibleMatches.filter(m => m.score < 0.8);
      
      UI.showToast(`${highConfidenceMatches.length} itens conciliados automaticamente!`, 'success');
      handleComparar();
  });
  
  UI.DOM.btnIgnoreAllPossible.addEventListener('click', () => {
      if(!State.appState.possibleMatches.length) return;
      const count = State.appState.possibleMatches.length;
      State.appState.possibleMatches = []; 
      UI.showToast(`${count} sugestões ignoradas. Serão tratadas como discrepâncias.`, 'info');
      handleComparar();
  });

  // --- Modais de Regras ---
  UI.DOM.btnGerenciarRegras.addEventListener('click', () => {
    UI.DOM.regrasModal.classList.toggle('hidden');
    if (UI.DOM.regrasModal.classList.contains('hidden')) return;

    const { timestamp, regras } = State.getRulesObject();
    
    if (timestamp) {
        UI.DOM.infoVersaoRegras.classList.remove('hidden');
        UI.DOM.timestampRegras.textContent = timestamp;
    } else {
        UI.DOM.infoVersaoRegras.classList.add('hidden');
    }

    UI.DOM.listaRegras.innerHTML = '';
    if (regras.length > 0) {
        UI.DOM.regrasModalPlaceholder.classList.add('hidden');
        regras.forEach(rule => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>Banco:</strong> ${rule.banco} → <strong>Orçamento:</strong> ${rule.orc}</span>
                <button class="btn-delete-rule" data-banco="${rule.banco}" data-orc="${rule.orc}">Excluir</button>
            `;
            UI.DOM.listaRegras.appendChild(li);
        });
    } else {
        UI.DOM.regrasModalPlaceholder.classList.remove('hidden');
    }
  });

  UI.DOM.regrasModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
      UI.DOM.regrasModal.classList.add('hidden');
    }
    if (e.target.classList.contains('btn-delete-rule')) {
      const { banco, orc } = e.target.dataset;
      State.deleteRule(banco, orc);
      e.target.parentElement.remove();
      UI.showToast('Regra excluída.', 'success');
      if (State.getRulesObject().regras.length === 0) {
        UI.DOM.regrasModalPlaceholder.classList.remove('hidden');
        UI.DOM.infoVersaoRegras.classList.add('hidden');
      }
    }
  });

  UI.DOM.btnExportarRegras.addEventListener('click', () => {
    const result = State.exportarRegras();
    if (result.success) {
        UI.downloadFile(result.blob, result.nomeArquivo);
        UI.showToast(result.message, 'success');
    } else {
        UI.showToast(result.message, 'info');
    }
  });

  UI.DOM.btnImportarRegras.addEventListener('click', () => UI.DOM.importFile.click());
  UI.DOM.importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const result = State.importarRegras(event.target.result, file.name);
        UI.showToast(result.message, result.success ? 'success' : 'error');
        if (result.success && !UI.DOM.regrasModal.classList.contains('hidden')) {
            UI.DOM.btnGerenciarRegras.click(); // Fecha
            UI.DOM.btnGerenciarRegras.click(); // Reabre atualizado
        }
    };
    reader.readAsText(file);
  });
  
  UI.DOM.btnConfirmarSalvarRegra.addEventListener('click', () => {
      const ruleType = document.querySelector('input[name="rule-type"]:checked').value;
      const { bancoDesc, orcDesc, bancoPattern, orcPattern, matchIndex } = UI.DOM.createRuleModal.dataset;

      const ruleToSave = (ruleType === 'smart')
          ? { type: 'smart', banco: bancoPattern, orc: orcPattern }
          : { type: 'exact', banco: bancoDesc, orc: orcDesc };
      
      if (State.saveRule(ruleToSave)) {
          UI.showToast('Regra salva com sucesso!', 'success');
      } else {
          UI.showToast('Esta regra já existe.', 'info');
      }

      const match = State.appState.possibleMatches[parseInt(matchIndex, 10)];
      if(match) {
        State.appState.dadosBanco = State.appState.dadosBanco.filter(item => item !== match.bancoItem);
        State.appState.dadosOrcamento = State.appState.dadosOrcamento.filter(item => item !== match.orcItem);
        State.appState.possibleMatches.splice(parseInt(matchIndex, 10), 1);
        handleComparar();
      }
      
      UI.DOM.createRuleModal.classList.add('hidden');
  });

  UI.DOM.createRuleModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
          UI.DOM.createRuleModal.classList.add('hidden');
      }
  });

  // --- Inicialização ---
  resetApplication();
});
