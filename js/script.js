// js/script.js (Orquestrador)
import * as State from './state-manager.js';
import * as UI from './ui-handler.js';
import * as Data from './data-processor.js';

function resetApplication() {
  State.resetAppState();
  UI.resetUI();
  document.querySelectorAll('.table-filter-input').forEach(input => input.value = '');
  window.Paginador.reset();
  UI.showToast('Sessão limpa. Pronto para uma nova análise!', 'success');
}

async function handleProcessarTexto() {
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
    window.Paginador.updateState({ banco: true });
    UI.updateCompareButtonVisibility();
  } else {
    UI.showToast('Nenhum lançamento válido encontrado. Verifique o formato.', 'error');
  }
}

function handleComparar() {
    if (!State.appState.dadosBanco.length || !State.appState.dadosOrcamento.length) {
        UI.showToast("Importe os dados do banco e do orçamento antes de comparar.", 'error');
        return;
    }
    UI.showSpinner();
    State.appState.possibleMatches = []; // Resetar sugestões antes de comparar
    const { logEntries } = Data.comparar();
    UI.hideSpinner();
    
    UI.renderLog(logEntries);

    const reconciledCount = State.appState.dadosBancoOriginais.length - State.appState.discrepBanco.length - State.appState.possibleMatches.map(m=>m.bancoItem).length;

    UI.animateCounter(UI.DOM.summaryReconciled, 0, reconciledCount, 750);
    UI.animateCounter(UI.DOM.summaryBank, 0, State.appState.discrepBanco.length, 750);
    UI.animateCounter(UI.DOM.summaryBudget, 0, State.appState.discrepOrc.length, 750);

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

    UI.DOM.summaryPanel.classList.remove('hidden');
    window.Paginador.updateState({ resumo: true });
}

document.addEventListener('DOMContentLoaded', () => {
  UI.initDOM();

  // --- EVENT LISTENERS PRINCIPAIS ---
  UI.DOM.btnNovaConciliacao.addEventListener('click', resetApplication);
  UI.DOM.btnProcessarTexto.addEventListener('click', handleProcessarTexto);
  UI.DOM.btnComparar.addEventListener('click', handleComparar);

  UI.DOM.fileOrcamento.addEventListener('change', e => {
    if (!e.target.files.length) return;
    UI.lerArquivo(e.target.files[0], linhas => {
      const result = Data.processarDadosOrcamento(linhas);
      if (result.success) {
        State.appState.dadosOrcamento = result.data;
        UI.mostrarTabela(State.appState.dadosOrcamento, 'previewOrcamento', 'Orçamento importado.');
        UI.showToast(`${State.appState.dadosOrcamento.length} itens importados.`, 'success');
        UI.DOM.orcamentoTitle.classList.add('completed');
        window.Paginador.updateState({ orcamento: true });
        UI.updateCompareButtonVisibility();
      } else {
        UI.showToast(result.message, 'error');
      }
    });
  });
  
  UI.DOM.btnExportarRegras.addEventListener('click', () => {
    const result = State.exportarRegras();
    if (result.success) {
        UI.downloadFile(result.blob, result.nomeArquivo);
        UI.showToast('Regras exportadas!', 'success');
    } else {
        UI.showToast(result.message, 'info');
    }
  });
  
  // Adicionar outros listeners que chamam funções de alto nível aqui...
  // Ex: UI.DOM.btnAutoMatchHighConfidence.addEventListener('click', handleAutoMatch);

  resetApplication();
});