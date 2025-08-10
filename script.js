// --- ESTADO CENTRALIZADO DA APLICAÇÃO (MELHORIA DE ARQUITETURA) ---
const appState = {
  dadosBanco: [],
  dadosOrcamento: [],
  dadosBancoOriginais: [],
  discrepBanco: [],
  discrepOrc: [],
  possibleMatches: [],
};

// --- ELEMENTOS DO DOM (CACHE PARA PERFORMANCE) ---
const DOM = {
  toastContainer: document.getElementById('toastContainer'),
  spinnerOverlay: document.getElementById('spinnerOverlay'),
  
  textoBanco: document.getElementById('textoBanco'),
  fileBanco: document.getElementById('fileBanco'),
  filtroDataInicio: document.getElementById('filtroDataInicio'),
  novaDataLancamento: document.getElementById('novaDataLancamento'),
  painelRefinamento: document.getElementById('painelRefinamento'),
  
  fileOrcamento: document.getElementById('fileOrcamento'),
  
  previewBancoTbl: document.getElementById('previewBanco'),
  previewOrcamentoTbl: document.getElementById('previewOrcamento'),
  tabelaBancoTbl: document.getElementById('tabelaBanco'),
  tabelaOrcamentoTbl: document.getElementById('tabelaOrcamento'),

  btnNovaConciliacao: document.getElementById('btnNovaConciliacao'),
  btnProcessarTexto: document.getElementById('btnProcessarTexto'),
  btnRefinarDados: document.getElementById('btnRefinarDados'),
  btnExportarPlanilha: document.getElementById('btnExportarPlanilha'),
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
};

// --- SPINNER, NOTIFICAÇÕES E ANIMAÇÕES (MELHORIA UX) ---
const showSpinner = () => DOM.spinnerOverlay.classList.remove('hidden');
const hideSpinner = () => DOM.spinnerOverlay.classList.add('hidden');

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function animateCounter(element, start, end, duration) {
    let startTime = null;

    const step = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        element.innerText = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.innerText = end; // Garante o valor final exato
        }
    };

    window.requestAnimationFrame(step);
}

// --- FUNÇÕES DE RESET ---
function resetApplication() {
  Object.assign(appState, {
    dadosBanco: [], dadosOrcamento: [], dadosBancoOriginais: [],
    discrepBanco: [], discrepOrc: [], possibleMatches: []
  });

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
  showToast('Sessão limpa. Pronto para uma nova conciliação!', 'success');
}

// --- FUNÇÕES DE PROCESSAMENTO DE DADOS ---

let xlsxLibraryLoaded = false;

function loadXLSXLibrary() {
  if (xlsxLibraryLoaded) return Promise.resolve();
  if (typeof XLSX !== 'undefined') {
    xlsxLibraryLoaded = true;
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const primaryCDN = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
    const fallbackCDN = 'https://unpkg.com/xlsx/dist/xlsx.full.min.js';

    const script = document.createElement('script');
    script.src = primaryCDN;

    script.onload = () => {
      xlsxLibraryLoaded = true;
      resolve();
    };

    script.onerror = () => {
      const fallbackScript = document.createElement('script');
      fallbackScript.src = fallbackCDN;
      fallbackScript.onload = () => {
        xlsxLibraryLoaded = true;
        resolve();
      };
      fallbackScript.onerror = () => {
        reject(new Error("Falha ao carregar a funcionalidade de planilhas."));
      };
      document.head.appendChild(fallbackScript);
    };

    document.head.appendChild(script);
  });
}

async function lerArquivo(file, callback) {
  showSpinner();
  const ext = file.name.split('.').pop().toLowerCase();

  if (['xlsx', 'xls'].includes(ext)) {
    try {
      await loadXLSXLibrary();
    } catch (error) {
      showToast(error.message, 'error');
      hideSpinner();
      return;
    }
  }

  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    showToast('Formato de arquivo não suportado: ' + ext, 'error');
    hideSpinner();
    return;
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let linhas;
      if (ext === 'csv') {
        const text = new TextDecoder('utf-8').decode(e.target.result);
        linhas = text.split(/\r?\n/).map(l => l.split(','));
      } else {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const primeiraAba = workbook.SheetNames[0];
        linhas = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba], { header: 1 });
      }
      callback(linhas);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      showToast("Ocorreu um erro ao processar o arquivo.", 'error');
    } finally {
      hideSpinner();
    }
  };
  reader.onerror = () => {
      showToast("Não foi possível ler o arquivo.", 'error');
      hideSpinner();
  };
  reader.readAsArrayBuffer(file);
}

function importarTextoBrutoInteligente(texto) {
  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const anoCorrente = new Date().getFullYear();
  const dados = [];
  const regexData = /^\d{2}\/\d{2}$/;
  const regexValor = /^[\d.,]+$/;

  for (let i = 0; i < linhas.length; i++) {
    if (regexData.test(linhas[i]) && (i + 2 < linhas.length) && regexValor.test(linhas[i + 2])) {
      
      const dataStr = linhas[i];
      const descricao = linhas[i + 1];
      const valorStr = linhas[i + 2];

      const dataCompleta = `${dataStr}/${anoCorrente}`;
      const valorNumerico = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));

      const isCredito = /pagamento em|crédito/i.test(descricao);
      const valorFinal = isCredito ? valorNumerico : -valorNumerico;

      dados.push({
        data: dataCompleta,
        descricao: descricao.trim(),
        valor: valorFinal
      });
      i += 2;
    }
  }
  
  return dados;
}

function processarDadosOrcamento(linhas) {
  if (!linhas || linhas.length < 2) {
    showToast('Arquivo de orçamento está vazio ou não contém cabeçalho e dados.', 'error');
    return [];
  }
  const cabecalho = linhas[0].map(h => String(h).toLowerCase().trim());
  const idxDescricao = cabecalho.indexOf('descrição');
  const idxValor = cabecalho.indexOf('valor');

  if (idxDescricao === -1 || idxValor === -1) {
    showToast("Erro: Arquivo deve conter colunas com os nomes 'Descrição' e 'Valor'.", 'error');
    return [];
  }

  return linhas.slice(1).map(linha => {
    const descricao = linha[idxDescricao] ? String(linha[idxDescricao]).trim() : '';
    const valorStr = linha[idxValor] ? String(linha[idxValor]).replace(',', '.') : '0';
    const valor = parseFloat(valorStr);
    return (descricao && !isNaN(valor)) ? [descricao, valor] : null;
  }).filter(Boolean);
}

// --- RENDERIZAÇÃO E EXPORTAÇÃO ---

function mostrarTabelaBanco(dados, id) {
  const tbl = document.getElementById(id);
  tbl.innerHTML = '<thead><tr><th>Data</th><th>Descrição</th><th>Valor (R$)</th></tr></thead>';
  const tbody = document.createElement('tbody');
  if (!dados || !dados.length) {
    const msg = DOM.textoBanco.value.trim() ? 'Nenhum lançamento válido encontrado.' : 'Aguardando dados...';
    tbody.innerHTML = `<tr><td colspan="3" class="no-results">${msg}</td></tr>`;
  } else {
    dados.forEach(l => {
      const row = tbody.insertRow();
      row.insertCell().innerText = l.data;
      row.insertCell().innerText = l.descricao;
      row.insertCell().innerText = l.valor.toFixed(2);
    });
  }
  tbl.appendChild(tbody);
}

function mostrarTabela(dados, id, noResultsMessage = 'Nenhum dado encontrado.') {
  const tbl = document.getElementById(id);
  tbl.innerHTML = '<thead><tr><th>Descrição</th><th>Valor (R$)</th></tr></thead>';
  const tbody = document.createElement('tbody');
  if (!dados || !dados.length) {
    tbody.innerHTML = `<tr><td colspan="2" class="no-results">${noResultsMessage}</td></tr>`;
  } else {
    dados.forEach(l => {
      const row = tbody.insertRow();
      row.insertCell().innerText = l[0];
      row.insertCell().innerText = l[1].toFixed(2);
    });
  }
  tbl.appendChild(tbody);
}

async function exportarXLSX(dados, nomeArquivo) {
  if (!dados || !dados.length) {
    showToast("A lista de transações para exportar está vazia.", 'error');
    return;
  }
  
  try {
    await loadXLSXLibrary();
    const dadosParaPlanilha = dados.map(linha => ({
      'Data Ocorrência': linha.data, 'Descrição': linha.descricao, 'Valor': linha.valor
    }));
    const ws = XLSX.utils.json_to_sheet(dadosParaPlanilha);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
    XLSX.writeFile(wb, nomeArquivo);
    showToast('Planilha exportada com sucesso!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function exportarCSV(dados, nomeArquivo) {
  if (!dados || !dados.length) {
    showToast("Não há discrepâncias para exportar.", 'error');
    return;
  }
  const conteudo = 'Descrição,Valor\n' + dados.map(l => `"${l[0]}",${l[1]}`).join('\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Arquivo ${nomeArquivo} gerado!`, 'success');
}

// --- FUNÇÕES DE LÓGICA DE SUGESTÃO ---

function normalizeText(s = '') {
  return String(s).toUpperCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function levenshteinDistance(a = '', b = '') {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const matrix = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) matrix[i][0] = i;
  for (let j = 0; j <= lb; j++) matrix[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  const dist = matrix[la][lb];
  const maxLen = Math.max(la, lb);
  return 1 - (dist / maxLen);
}

function encontrarPossiveisMatches(bancoRest, orcRest) {
  const suggestions = new Map(); 
  
  bancoRest.forEach((bancoItem) => {
    orcRest.forEach((orcItem) => {
      const valorBanco = Math.round(bancoItem.valor * 100);
      const valorOrc = Math.round(orcItem[1] * 100);

      if (valorBanco === valorOrc) { 
        const descBancoNorm = normalizeText(bancoItem.descricao);
        const descOrcNorm = normalizeText(orcItem[0]);
        
        if (descBancoNorm !== descOrcNorm) {
          const score = levenshteinDistance(descBancoNorm, descOrcNorm);
          if (score > 0.3) {
             const key = bancoItem.descricao + bancoItem.valor;
             if (!suggestions.has(key) || suggestions.get(key).score < score) {
                suggestions.set(key, { bancoItem, orcItem, score });
             }
          }
        }
      }
    });
  });
  
  const possible = Array.from(suggestions.values());
  possible.sort((a, b) => b.score - a.score);
  return possible;
}

function renderPossibleMatches() {
    const matches = appState.possibleMatches;
    const tbl = DOM.possibleMatchesTbl;
    tbl.innerHTML = `<thead><tr>
        <th>Banco (Descrição)</th>
        <th>Orçamento (Descrição)</th>
        <th>Valor (R$)</th>
        <th>Confiança</th>
        <th>Ação</th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');

    if (!matches.length) {
        DOM.possibleMatchesPanel.classList.add('hidden');
        return;
    }

    DOM.possibleMatchesPanel.classList.remove('hidden');
    matches.forEach((match, index) => {
        const tr = tbody.insertRow();
        tr.className = 'possible-match-row';
        tr.dataset.matchIndex = index;

        tr.insertCell().innerText = match.bancoItem.descricao;
        tr.insertCell().innerText = match.orcItem[0];
        tr.insertCell().innerText = match.bancoItem.valor.toFixed(2);
        
        const scoreClass = match.score >= 0.8 ? 'high' : (match.score >= 0.5 ? 'medium' : 'low');
        tr.insertCell().innerHTML = `<span class="match-score ${scoreClass}">${(match.score * 100).toFixed(0)}%</span>`;

        const actionCell = tr.insertCell();
        actionCell.className = 'possible-match-actions';
        actionCell.innerHTML = `
            <button class="btn-accept" title="Confirmar conciliação">✓</button>
            <button class="btn-reject" title="Marcar como discrepância">✕</button>
        `;
    });
    tbl.appendChild(tbody);
}

function handleMatchAction(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const tr = button.closest('tr');
    if (!tr || !tr.dataset.matchIndex) return;
    
    const matchIndex = parseInt(tr.dataset.matchIndex, 10);
    const match = appState.possibleMatches[matchIndex];

    if (!match) return;

    if (button.classList.contains('btn-accept')) {
        appState.dadosBanco = appState.dadosBanco.filter(item => item !== match.bancoItem);
        appState.dadosOrcamento = appState.dadosOrcamento.filter(item => item !== match.orcItem);
        showToast('Conciliação confirmada!', 'success');
    } else if (button.classList.contains('btn-reject')) {
        showToast('Sugestão ignorada.', 'info');
    }
    
    appState.possibleMatches.splice(matchIndex, 1);
    comparar(); 
}

// --- LÓGICA DE CONCILIAÇÃO ---

const criarChaveExata = linha => `${String(linha[0]).toUpperCase().replace(/\s+/g,' ').trim()}_${(Math.round(linha[1]*100)/100).toFixed(2)}`;
const criarChaveParcial = linha => `${String(linha[0]).toUpperCase().replace(/\s+/g,' ').trim().substring(0,8)}_${(Math.round(linha[1]*100)/100).toFixed(2)}`;

function comparar() {
  if (!appState.dadosBanco.length || !appState.dadosOrcamento.length) {
    showToast("Importe os dados do banco e do orçamento antes de comparar.", 'error');
    return;
  }
  
  // PASSO 1: Conciliação exata
  const chavesOrcamentoExatas = new Set(appState.dadosOrcamento.map(criarChaveExata));
  const bancoConciliados = new Set();
  const orcamentoConciliados = new Set();

  appState.dadosBanco.forEach(bancoItem => {
    const chave = criarChaveExata([bancoItem.descricao, bancoItem.valor]);
    if (chavesOrcamentoExatas.has(chave)) {
      bancoConciliados.add(bancoItem);
    }
  });

  const chavesBancoExatas = new Set(appState.dadosBanco.map(item => criarChaveExata([item.descricao, item.valor])));
  appState.dadosOrcamento.forEach(orcItem => {
    const chave = criarChaveExata(orcItem);
    if (chavesBancoExatas.has(chave)) {
      orcamentoConciliados.add(orcItem);
    }
  });
  
  let bancoRestante = appState.dadosBanco.filter(item => !bancoConciliados.has(item));
  let orcRestante = appState.dadosOrcamento.filter(item => !orcamentoConciliados.has(item));

  // PASSO 2: Encontrar e APRESENTAR possíveis matches
  if (!appState.possibleMatches || appState.possibleMatches.length === 0) {
      appState.possibleMatches = encontrarPossiveisMatches(bancoRestante, orcRestante);
  }

  if (appState.possibleMatches.length > 0) {
      renderPossibleMatches();
      showToast(`Encontramos ${appState.possibleMatches.length} possíveis conciliações para sua revisão.`, 'info');
      
      const reconciledCount = appState.dadosBanco.length - bancoRestante.length;
      animateCounter(DOM.summaryReconciled, 0, reconciledCount, 750);
      animateCounter(DOM.summaryBank, 0, 0, 750);
      animateCounter(DOM.summaryBudget, 0, 0, 750);
      DOM.summaryPanel.classList.remove('hidden');

      mostrarTabela([], 'tabelaBanco', 'Revise as possíveis coincidências acima.');
      mostrarTabela([], 'tabelaOrcamento', 'Revise as possíveis coincidências acima.');
      return; 
  }
  
  // PASSO 3: Se não há sugestões, calcula as DISCREPÂNCIAS finais (com match parcial)
  DOM.possibleMatchesPanel.classList.add('hidden');

  const chavesOrcamentoParciais = new Set(orcRestante.map(criarChaveParcial));
  const chavesBancoParciais = new Set(bancoRestante.map(item => criarChaveParcial([item.descricao, item.valor])));

  appState.discrepBanco = bancoRestante
      .filter(item => !chavesOrcamentoParciais.has(criarChaveParcial([item.descricao, item.valor])))
      .map(item => [item.descricao, item.valor]);
  
  appState.discrepOrc = orcRestante
      .filter(item => !chavesBancoParciais.has(criarChaveParcial(item)));

  // PASSO 4: Atualiza o resumo e as tabelas de discrepâncias
  const reconciledCountFinal = appState.dadosBanco.length - appState.discrepBanco.length;
  animateCounter(DOM.summaryReconciled, 0, reconciledCountFinal, 750);
  animateCounter(DOM.summaryBank, 0, appState.discrepBanco.length, 750);
  animateCounter(DOM.summaryBudget, 0, appState.discrepOrc.length, 750);
  DOM.summaryPanel.classList.remove('hidden');

  mostrarTabela(appState.discrepBanco, 'tabelaBanco', 'Nenhuma discrepância encontrada.');
  mostrarTabela(appState.discrepOrc, 'tabelaOrcamento', 'Nenhuma discrepância encontrada.');
  showToast('Comparação concluída!', 'success');
}


// --- EVENT LISTENERS (CENTRALIZADOS) ---

document.addEventListener('DOMContentLoaded', () => {
  DOM.btnNovaConciliacao.addEventListener('click', resetApplication);

  DOM.btnProcessarTexto.addEventListener('click', () => {
    const texto = DOM.textoBanco.value;
    if (!texto.trim()) {
      showToast("Cole o extrato bruto antes de processar.", 'error');
      return;
    }
    appState.dadosBancoOriginais = importarTextoBrutoInteligente(texto);
    appState.dadosBanco = [...appState.dadosBancoOriginais];
    mostrarTabelaBanco(appState.dadosBanco, 'previewBanco');
    
    if (appState.dadosBanco.length > 0) {
      DOM.painelRefinamento.classList.remove('hidden');
      showToast(`Foram encontrados ${appState.dadosBanco.length} lançamentos.`, 'info');
    } else {
      showToast(`Nenhum lançamento válido encontrado. Verifique o formato do texto.`, 'error');
    }
  });

  DOM.btnRefinarDados.addEventListener('click', () => {
    const filtroDataInicio = DOM.filtroDataInicio.value;
    const novaDataLancamentoStr = DOM.novaDataLancamento.value;

    if (!filtroDataInicio) {
      showToast('Selecione a data de início para filtrar.', 'error');
      return;
    }

    const filtroDate = new Date(filtroDataInicio + 'T00:00:00');
    let dadosFiltrados = appState.dadosBancoOriginais.filter(l => {
        const [dia, mes, ano] = l.data.split('/');
        return new Date(`${ano}-${mes}-${dia}T00:00:00`) >= filtroDate;
    });

    if (novaDataLancamentoStr) {
        const [ano, mes, dia] = novaDataLancamentoStr.split('-');
        dadosFiltrados = dadosFiltrados.map(l => ({ ...l, data: `${dia}/${mes}/${ano}` }));
    }

    appState.dadosBanco = dadosFiltrados;
    mostrarTabelaBanco(appState.dadosBanco, 'previewBanco');
    showToast('Filtro aplicado com sucesso!', 'success');
  });

  DOM.btnExportarPlanilha.addEventListener('click', () => {
    exportarXLSX(appState.dadosBanco, 'importacao_pronta.xlsx');
  });

  DOM.fileOrcamento.addEventListener('change', e => {
    if (!e.target.files.length) return;
    lerArquivo(e.target.files[0], linhas => {
      appState.dadosOrcamento = processarDadosOrcamento(linhas);
      mostrarTabela(appState.dadosOrcamento, 'previewOrcamento', 'Orçamento importado. Pronto para comparar.');
      if (appState.dadosOrcamento.length > 0) {
        showToast(`Orçamento com ${appState.dadosOrcamento.length} itens importado.`, 'success');
      }
    });
  });
  
  DOM.fileBanco.addEventListener('change', e => {
      if(!e.target.files.length) return;
      lerArquivo(e.target.files[0], linhas => {
          showToast('Importação de arquivo do banco ainda não implementada.', 'info');
      });
  });

  DOM.btnComparar.addEventListener('click', () => {
    appState.possibleMatches = []; // Limpa sugestões anteriores antes de uma nova comparação
    comparar();
  });
  
  DOM.btnExportarDiscrepBanco.addEventListener('click', () => exportarCSV(appState.discrepBanco, 'discrepancias_banco.csv'));
  DOM.btnExportarDiscrepOrcamento.addEventListener('click', () => exportarCSV(appState.discrepOrc, 'discrepancias_orcamento.csv'));
  
  DOM.possibleMatchesTbl.addEventListener('click', handleMatchAction);
    
  DOM.btnAutoMatchHighConfidence.addEventListener('click', () => {
      const highConfidenceMatches = appState.possibleMatches.filter(m => m.score >= 0.8);
      if(!highConfidenceMatches.length) {
          showToast('Nenhuma sugestão de alta confiança para conciliar.', 'info');
          return;
      }
      highConfidenceMatches.forEach(match => {
          appState.dadosBanco = appState.dadosBanco.filter(item => item !== match.bancoItem);
          appState.dadosOrcamento = appState.dadosOrcamento.filter(item => item !== match.orcItem);
      });
      appState.possibleMatches = appState.possibleMatches.filter(m => m.score < 0.8);
      showToast(`${highConfidenceMatches.length} itens conciliados automaticamente!`, 'success');
      comparar();
  });
  
  DOM.btnIgnoreAllPossible.addEventListener('click', () => {
      if(!appState.possibleMatches.length) return;
      const count = appState.possibleMatches.length;
      appState.possibleMatches = []; 
      showToast(`${count} sugestões ignoradas. Serão tratadas como discrepâncias.`, 'info');
      comparar();
  });

  // --- INICIALIZAÇÃO ---
  resetApplication();
});
