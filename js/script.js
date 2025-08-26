// js/script.js

// --- ESTADO CENTRALIZADO DA APLICAÇÃO ---
const appState = {
  dadosBanco: [],
  dadosOrcamento: [],
  dadosBancoOriginais: [],
  discrepBanco: [],
  discrepOrc: [],
  possibleMatches: [],
};

// --- ESTADO DA INTERFACE (ORDENAÇÃO E FILTRO) ---
let sortState = {}; // Ex: { previewBanco: { key: 'valor', dir: 'asc' } }
let filterState = {}; // Ex: { tabelaBanco: 'mercado' }


// --- ELEMENTOS DO DOM (CACHE PARA PERFORMANCE) ---
const DOM = {};

// --- LÓgica de REGRAS DE CONCILIAÇÃO ---
// Toda a lógica foi movida para motor-regras.js

// --- FUNÇÕES DE LÓGICA DE SUGESTÃO ---
function normalizeText(s = '') {
  return String(s).toUpperCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function calculateRepetitions(data, keyExtractor) {
    const counts = new Map();
    data.forEach(item => {
        const key = keyExtractor(item);
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    return data.map(item => ({...item, count: counts.get(keyExtractor(item)) }));
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
      const valorOrc = Math.round(orcItem.valor * 100);

      if (valorBanco === valorOrc) {
        const descBancoNorm = normalizeText(bancoItem.descricao);
        const descOrcNorm = normalizeText(orcItem.descricao);
        
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

// --- FUNÇÕES DE ORDENAÇÃO E FILTRAGEM ---

function debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

function handleSort(e) {
    const header = e.target.closest('.sortable-header');
    if (!header) return;

    const tableId = header.dataset.tableId;
    const sortKey = header.dataset.sortKey;
    const dataType = header.dataset.dataType || 'string';

    if (!tableId || !sortKey) return;

    const currentDir = sortState[tableId]?.key === sortKey ? sortState[tableId].dir : 'none';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';
    
    sortState[tableId] = { key: sortKey, dir: newDir, dataType };

    rerenderTable(tableId);
}

function handleFilter(e) {
    const input = e.target;
    if (!input.classList.contains('table-filter-input')) return;
    
    const tableId = input.dataset.tableId;
    filterState[tableId] = input.value;
    
    rerenderTable(tableId);
}

const debouncedHandleFilter = debounce(handleFilter, 300);

function rerenderTable(tableId) {
    const renderMap = {
        'previewBanco':       () => mostrarTabelaBanco(appState.dadosBanco, tableId),
        'previewOrcamento':   () => mostrarTabela(appState.dadosOrcamento, tableId, 'Nenhum orçamento importado.'),
        'tabelaBanco':        () => mostrarTabela(appState.discrepBanco, tableId, 'Nenhuma discrepância encontrada.'),
        'tabelaOrcamento':    () => mostrarTabela(appState.discrepOrc, tableId, 'Nenhuma discrepância encontrada.'),
        'possibleMatchesTbl': () => renderPossibleMatches()
    };

    if (renderMap[tableId]) {
        renderMap[tableId]();
    }
}

function renderPossibleMatches() {
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

    if (!matches.length && !filterTerm) { // Apenas esconde se não tiver NENHUM match, e não por filtro
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
    
            tr.addEventListener('dragstart', handleDragStart);
            tr.addEventListener('dragend', handleDragEnd);
    
            const descBancoCell = tr.insertCell();
            descBancoCell.innerText = match.bancoItem.descricao;
            if (match.bancoItem.count > 1) {
                descBancoCell.innerHTML += ` <span class="count-badge banco">${match.bancoItem.count}x</span>`;
            }
            
            const descOrcCell = tr.insertCell();
            descOrcCell.innerText = match.orcItem.descricao;
             if (match.orcItem.count > 1) {
                descOrcCell.innerHTML += ` <span class="count-badge orcamento">${match.orcItem.count}x</span>`;
            }
            
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

function handleMatchAction(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const tr = button.closest('tr');
    if (!tr || typeof tr.dataset.matchIndex === 'undefined') return;
    
    const matchIndex = parseInt(tr.dataset.matchIndex, 10);
    const match = appState.possibleMatches[matchIndex];
    if (!match) return;

    if (button.classList.contains('btn-save-rule')) {
        openCreateRuleModal(match);
        return;
    }
    
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

function openCreateRuleModal(match) {
    const bancoPattern = extractPattern(match.bancoItem.descricao);
    const orcPattern = extractPattern(match.orcItem.descricao);

    DOM.createRuleModal.dataset.bancoDesc = match.bancoItem.descricao;
    DOM.createRuleModal.dataset.orcDesc = match.orcItem.descricao;
    DOM.createRuleModal.dataset.bancoPattern = bancoPattern;
    DOM.createRuleModal.dataset.orcPattern = orcPattern;
    DOM.createRuleModal.dataset.matchIndex = appState.possibleMatches.indexOf(match);

    DOM.smartRulePreview.textContent = `Irá associar itens que comecem com "${bancoPattern}" (banco) a itens que comecem com "${orcPattern}" (orçamento).`;
    
    DOM.ruleTypeExact.checked = true;
    DOM.createRuleModal.classList.remove('hidden');
}

// --- LÓGICA DE CONCILIAÇÃO ---
const criarChaveItem = item => `${normalizeText(item.descricao)}_${(Math.round(item.valor*100)/100).toFixed(2)}`;
const criarChaveParcialItem = item => `${normalizeText(item.descricao).substring(0,8)}_${(Math.round(item.valor*100)/100).toFixed(2)}`;

function comparar() {
  if (!appState.dadosBanco.length || !appState.dadosOrcamento.length) {
    showToast("Importe os dados do banco e do orçamento antes de comparar.", 'error');
    return;
  }
  
  let logEntries = [];
  
  const { regras } = getRulesObject();
  const { bancoConciliados, orcamentoConciliados } = aplicarRegrasDeConciliacao(appState.dadosBanco, appState.dadosOrcamento, regras);
  
  if (bancoConciliados.size > 0) {
    const msg = `✅ ${bancoConciliados.size} itens conciliados por regras automáticas.`;
    logEntries.push(msg);
    showToast(msg, 'info');
  }

  let bancoRestante = appState.dadosBanco.filter(i => !bancoConciliados.has(i));
  let orcRestante = appState.dadosOrcamento.filter(i => !orcamentoConciliados.has(i));
  
  const chavesOrcamentoExatas = new Set(orcRestante.map(criarChaveItem));
  const bancoConciliadosExatos = new Set();

  bancoRestante.forEach(bancoItem => {
    const chave = criarChaveItem(bancoItem);
    if (chavesOrcamentoExatas.has(chave)) {
      chavesOrcamentoExatas.delete(chave);
      bancoConciliadosExatos.add(bancoItem);
    }
  });
  
  if (bancoConciliadosExatos.size > 0) {
      logEntries.push(`✅ ${bancoConciliadosExatos.size} itens conciliados por correspondência exata.`);
  }

  const chavesBancoConciliadasExatas = new Set(Array.from(bancoConciliadosExatos).map(criarChaveItem));
  const orcamentoConciliadosExatos = new Set(orcRestante.filter(item => {
      if(orcamentoConciliados.has(item)) return false;
      const chave = criarChaveItem(item);
      if(chavesBancoConciliadasExatas.has(chave)){
          chavesBancoConciliadasExatas.delete(chave);
          return true;
      }
      return false;
  }));
  
  bancoConciliadosExatos.forEach(item => bancoConciliados.add(item));
  orcamentoConciliadosExatos.forEach(item => orcamentoConciliados.add(item));

  bancoRestante = appState.dadosBanco.filter(item => !bancoConciliados.has(item));
  orcRestante = appState.dadosOrcamento.filter(item => !orcamentoConciliados.has(item));

  if (!appState.possibleMatches.length) {
      appState.possibleMatches = encontrarPossiveisMatches(bancoRestante, orcRestante);
  }

  renderLog(logEntries);

  if (appState.possibleMatches.length > 0) {
      renderPossibleMatches();
      showToast(`Encontramos ${appState.possibleMatches.length} possíveis conciliações para sua revisão.`, 'info');
      
      const reconciledCount = appState.dadosBancoOriginais.length - bancoRestante.length;
      animateCounter(DOM.summaryReconciled, 0, reconciledCount, 750);
      animateCounter(DOM.summaryBank, 0, 0, 750);
      animateCounter(DOM.summaryBudget, 0, 0, 750);
      DOM.summaryPanel.classList.remove('hidden');

      mostrarTabela([], 'tabelaBanco', 'Revise as possíveis coincidências acima.');
      mostrarTabela([], 'tabelaOrcamento', 'Revise as possíveis coincidências acima.');
      return; 
  }
  
  DOM.possibleMatchesPanel.classList.add('hidden');
  const chavesOrcamentoParciais = new Set(orcRestante.map(criarChaveParcialItem));
  const chavesBancoParciais = new Set(bancoRestante.map(criarChaveParcialItem));

  appState.discrepBanco = bancoRestante
      .filter(item => !chavesOrcamentoParciais.has(criarChaveParcialItem(item)));
  
  appState.discrepOrc = orcRestante
      .filter(item => !chavesBancoParciais.has(criarChaveParcialItem(item)));

  const reconciledCountFinal = appState.dadosBancoOriginais.length - appState.discrepBanco.length;
  animateCounter(DOM.summaryReconciled, 0, reconciledCountFinal, 750);
  animateCounter(DOM.summaryBank, 0, appState.discrepBanco.length, 750);
  animateCounter(DOM.summaryBudget, 0, appState.discrepOrc.length, 750);
  DOM.summaryPanel.classList.remove('hidden');

  mostrarTabela(appState.discrepBanco, 'tabelaBanco', 'Nenhuma discrepância encontrada.');
  mostrarTabela(appState.discrepOrc, 'tabelaOrcamento', 'Nenhuma discrepância encontrada.');
  showToast('Comparação concluída!', 'success');
}

// --- SPINNER, NOTIFICAÇÕES E ANIMAÇÕES (MELHORIA UX) ---
const showSpinner = () => DOM.spinnerOverlay.classList.remove('hidden');
const hideSpinner = () => DOM.spinnerOverlay.classList.add('hidden');

function showToast(message, type = 'info') {
  DOM.toastContainer.insertAdjacentHTML('beforeend', `<div class="toast ${type}">${message}</div>`);
  const toast = DOM.toastContainer.lastElementChild;
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
            element.innerText = end;
        }
    };
    window.requestAnimationFrame(step);
}

function updateCompareButtonVisibility() {
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

// --- FUNÇÕES DE RESET ---
function resetApplication() {
  Object.assign(appState, {
    dadosBanco: [], dadosOrcamento: [], dadosBancoOriginais: [],
    discrepBanco: [], discrepOrc: [], possibleMatches: []
  });
  
  sortState = {};
  filterState = {};
  document.querySelectorAll('.table-filter-input').forEach(input => input.value = '');

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
  window.Paginador.reset();
  showToast('Sessão limpa. Pronto para uma nova análise!', 'success');
}

// --- FUNÇÕES DE PROCESSAMENTO DE DADOS ---
let xlsxLibraryLoaded = false;
function loadXLSXLibrary() {
  if (xlsxLibraryLoaded) return Promise.resolve();
  if (typeof XLSX !== 'undefined') { xlsxLibraryLoaded = true; return Promise.resolve(); }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
    script.onload = () => { xlsxLibraryLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Falha ao carregar a biblioteca de planilhas."));
    document.head.appendChild(script);
  });
}

function parseDate(dateString) {
    if (!dateString) return new Date(0);
    const [day, month, year] = dateString.split('/');
    return new Date(year, month - 1, day);
}

async function lerArquivo(file, callback) {
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

function importarTextoBrutoInteligente(texto) {
  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); 
  const anoCorrente = hoje.getFullYear();

  let dados = [];

  const regexTabular = /^(\d{2}\/\d{2})\s+(.*?)\s+([\d.,]+)$/;
  
  linhas.forEach(linha => {
    const match = linha.match(regexTabular);
    if (match) {
      const [, dataStr, descricao, valorStr] = match;
      
      const [dia, mes] = dataStr.split('/');
      let anoLancamento = anoCorrente;
      
      const dataLancamentoTemp = new Date(anoCorrente, mes - 1, dia);
      
      if (dataLancamentoTemp > hoje) {
        anoLancamento = anoCorrente - 1;
      }
      
      const dataCompleta = `${dataStr}/${anoLancamento}`;
      const valorNumerico = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
      const isCredito = /ajuste cred|pagamento em|crédito/i.test(descricao);
      dados.push({
        data: dataCompleta,
        descricao: descricao.trim(),
        valor: isCredito ? valorNumerico : -valorNumerico
      });
    }
  });

  if (dados.length === 0) {
    console.log("Formato tabular não detectado, tentando formato de 3 linhas.");
    const regexData = /^\d{2}\/\d{2}$/;
    const regexValor = /^[\d.,]+$/;
    for (let i = 0; i < linhas.length; i++) {
      if (regexData.test(linhas[i]) && (i + 2 < linhas.length) && regexValor.test(linhas[i + 2])) {
        
        const [dia, mes] = linhas[i].split('/');
        let anoLancamento = anoCorrente;
        const dataLancamentoTemp = new Date(anoCorrente, mes - 1, dia);
        if (dataLancamentoTemp > hoje) {
            anoLancamento = anoCorrente - 1;
        }
        const dataCompleta = `${linhas[i]}/${anoLancamento}`;

        const valorNumerico = parseFloat(linhas[i + 2].replace(/\./g, '').replace(',', '.'));
        const isCredito = /pagamento em|crédito/i.test(linhas[i + 1]);
        dados.push({ 
          data: dataCompleta, 
          descricao: linhas[i + 1].trim(), 
          valor: isCredito ? valorNumerico : -valorNumerico 
        });
        i += 2;
      }
    }
  }

  const keyExtractor = item => `${normalizeText(item.descricao)}_${item.valor.toFixed(2)}`;
  return calculateRepetitions(dados, keyExtractor);
}

function processarDadosOrcamento(linhas) {
  if (!linhas || linhas.length < 2) { showToast('Arquivo de orçamento vazio.', 'error'); return []; }
  const cabecalho = linhas[0].map(h => String(h).toLowerCase().trim());
  const idxDescricao = cabecalho.indexOf('descrição');
  const idxValor = cabecalho.indexOf('valor');
  if (idxDescricao === -1 || idxValor === -1) { showToast("Arquivo deve ter colunas 'Descrição' e 'Valor'.", 'error'); return []; }
  
  const dadosProcessados = linhas.slice(1).map(linha => {
    const descricao = linha[idxDescricao] ? String(linha[idxDescricao]).trim() : '';
    const valor = parseFloat(String(linha[idxValor] || '0').replace(',', '.'));
    return (descricao && !isNaN(valor)) ? { descricao, valor } : null;
  }).filter(Boolean);
  
  const keyExtractor = item => `${normalizeText(item.descricao)}_${item.valor.toFixed(2)}`;
  return calculateRepetitions(dadosProcessados, keyExtractor);
}

// --- RENDERIZAÇÃO E EXPORTAÇÃO (CORRIGIDO) ---
function mostrarTabelaBanco(dados, id) {
  const exclusionRules = getExclusionRules();
  let dadosParaRenderizar = dados.filter(item => !exclusionRules.includes(item.descricao));

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
    <th class="col-action">Ação</th>
  </tr></thead>`;
  
  if (sortInfo) {
      const th = tbl.querySelector(`th[data-sort-key="${sortInfo.key}"]`);
      if(th) th.setAttribute('data-sort-dir', sortInfo.dir);
  }

  const tbody = document.createElement('tbody');
  const noResultsMessage = DOM.textoBanco.value.trim() ? 'Nenhum lançamento válido.' : 'Aguardando dados...';
  
  if (!dadosParaRenderizar || !dadosParaRenderizar.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="no-results">${noResultsMessage}</td></tr>`;
  } else {
    dadosParaRenderizar.forEach(l => {
      const row = tbody.insertRow();
      row.classList.add('preview-table-row');
      row.insertCell().innerText = l.data; 
      const descCell = row.insertCell();
      descCell.innerText = l.descricao;
      if (l.count > 1) {
          descCell.innerHTML += ` <span class="count-badge banco">${l.count}x</span>`;
      }
      row.insertCell().innerText = l.valor.toFixed(2);
      const actionCell = row.insertCell();
      actionCell.className = 'col-action';
      actionCell.innerHTML = `<button class="btn-add-exclusion-rule" data-description="${l.descricao}" title="Criar regra para ignorar esta descrição">Ignorar</button>`;
    });
  }
  tbl.appendChild(tbody);
}

function mostrarTabela(dados, id, noResultsMessage = 'Nenhum dado encontrado.') {
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

function renderLog(logEntries) {
    if (!logEntries || logEntries.length === 0) {
        DOM.logPanel.classList.add('hidden');
        return;
    }
    DOM.logList.innerHTML = logEntries.map(entry => `<li>${entry}</li>`).join('');
    DOM.logPanel.classList.remove('hidden');
    DOM.logList.classList.remove('no-results');
}

async function exportarXLSX(dados, nomeArquivo) {
  if (!dados || !dados.length) { showToast("Lista para exportar está vazia.", 'error'); return; }
  try {
    await loadXLSXLibrary();
    const ws = XLSX.utils.json_to_sheet(dados.map(l => ({
      'Data Ocorrência': l.data,
      'Descrição': l.descricao,
      'Valor': l.valor,
      'Categoria': '', // Adiciona a coluna Categoria vazia
      'Conta': 'CEF 204-5' // Adiciona a coluna Conta com valor fixo
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
    XLSX.writeFile(wb, nomeArquivo); showToast('Planilha exportada!', 'success');
  } catch (error) { showToast(error.message, 'error'); }
}

function exportarCSV(dados, nomeArquivo) {
  if (!dados || !dados.length) { showToast("Não há discrepâncias para exportar.", 'error'); return; }
  const conteudo = 'Descrição,Valor\n' + dados.map(l => `"${l.descricao}",${l.valor}`).join('\n');
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8;' }));
  link.download = nomeArquivo; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  showToast(`Arquivo ${nomeArquivo} gerado!`, 'success');
}

// --- FUNÇÕES DE DRAG-AND-DROP ---
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.matchIndex);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault(); 
    if (e.target.closest('.metric-item')) {
        e.target.closest('.metric-item').classList.add('drop-target-hover');
    }
}

function handleDragLeave(e) {
    if (e.target.closest('.metric-item')) {
        e.target.closest('.metric-item').classList.remove('drop-target-hover');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const dropZone = e.target.closest('.metric-item');
    if (!dropZone) return;

    dropZone.classList.remove('drop-target-hover');
    const matchIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const match = appState.possibleMatches[matchIndex];

    if (!match) return;

    const targetType = dropZone.dataset.dropTarget;

    if (targetType === 'reconciled') {
        appState.dadosBanco = appState.dadosBanco.filter(item => item !== match.bancoItem);
        appState.dadosOrcamento = appState.dadosOrcamento.filter(item => item !== match.orcItem);
        showToast('Conciliação confirmada via Arrastar e Soltar!', 'success');
    } else {
        showToast('Sugestão marcada como discrepância.', 'info');
    }

    appState.possibleMatches.splice(matchIndex, 1);
    comparar();
}

function handleDiscrepancyDeletion(e) {
    if (e.target.tagName !== 'INPUT' || e.target.type !== 'checkbox') return;

    const keyToDelete = e.target.dataset.key;
    if (!confirm(`Tem certeza que deseja apagar TODOS os lançamentos com a chave "${keyToDelete.replace('_', ' | R$ ')}"? Esta ação é irreversível e removerá o item de todas as listas.`)) {
        e.target.checked = false;
        return;
    }
    
    showSpinner();
    
    appState.dadosBanco = appState.dadosBanco.filter(item => criarChaveItem(item) !== keyToDelete);
    appState.dadosBancoOriginais = appState.dadosBancoOriginais.filter(item => criarChaveItem(item) !== keyToDelete);
    appState.dadosOrcamento = appState.dadosOrcamento.filter(item => criarChaveItem(item) !== keyToDelete);
    
    showToast('Item removido. Reanalisando...', 'info');
    
    appState.possibleMatches = [];
    comparar();

    mostrarTabelaBanco(appState.dadosBanco, 'previewBanco');
    mostrarTabela(appState.dadosOrcamento, 'previewOrcamento', 'Orçamento importado. Pronto para comparar.');

    hideSpinner();
}

// --- EVENT LISTENERS (CENTRALIZADOS) ---
document.addEventListener('DOMContentLoaded', () => {
  Object.assign(DOM, {
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
    btnModoFoco: document.getElementById('btnModoFoco'),
    btnExitFocusMode: document.getElementById('btnExitFocusMode'),
  });

  const dropTargets = document.querySelectorAll('.summary-panel .metric-item');
  dropTargets.forEach(target => {
      target.addEventListener('dragover', handleDragOver);
      target.addEventListener('dragleave', handleDragLeave);
      target.addEventListener('drop', handleDrop);
  });
  
  const mainElement = document.querySelector('main');
  mainElement.addEventListener('click', handleSort);
  mainElement.addEventListener('input', debouncedHandleFilter);

  DOM.btnNovaConciliacao.addEventListener('click', resetApplication);
  
  DOM.btnProcessarTexto.addEventListener('click', () => {
    const texto = DOM.textoBanco.value;
    if (!texto.trim()) { showToast("Cole o extrato bruto antes de processar.", 'error'); return; }
    appState.dadosBancoOriginais = importarTextoBrutoInteligente(texto);
    appState.dadosBanco = [...appState.dadosBancoOriginais];
    mostrarTabelaBanco(appState.dadosBanco, 'previewBanco');
    if (appState.dadosBanco.length > 0) {
        DOM.painelRefinamento.classList.remove('hidden');
        showToast(`${appState.dadosBanco.length} lançamentos encontrados.`, 'info');
        
        const lancamentosOrdenados = [...appState.dadosBanco].sort((a, b) => {
            return parseDate(b.data) - parseDate(a.data);
        });
        const lancamentoMaisRecente = lancamentosOrdenados[0];

        window.Paginador.updateState({ banco: true });
        abrirModalCopia(lancamentoMaisRecente);
        DOM.bancoTitle.classList.add('completed');
        updateCompareButtonVisibility();
        
    } else {
      showToast(`Nenhum lançamento válido encontrado. Verifique o formato.`, 'error');
    }
  });

  DOM.btnRefinarDados.addEventListener('click', () => {
    if (!DOM.filtroDataInicio.value) { showToast('Selecione a data de início para filtrar.', 'error'); return; }
    const filtroDate = new Date(DOM.filtroDataInicio.value + 'T00:00:00');
    let dadosFiltrados = appState.dadosBancoOriginais.filter(l => {
        const [dia, mes, ano] = l.data.split('/');
        return new Date(`${ano}-${mes}-${dia}T00:00:00`) >= filtroDate;
    });
    if (DOM.novaDataLancamento.value) {
        const [ano, mes, dia] = DOM.novaDataLancamento.value.split('-');
        dadosFiltrados = dadosFiltrados.map(l => ({ ...l, data: `${dia}/${mes}/${ano}` }));
    }
    appState.dadosBanco = dadosFiltrados;
    mostrarTabelaBanco(appState.dadosBanco, 'previewBanco');
    showToast('Filtro aplicado com sucesso!', 'success');
  });

  DOM.btnExportarPlanilha.addEventListener('click', () => {
    // Pega as regras de exclusão salvas pelo usuário
    const exclusionRules = getExclusionRules();
    
    // Filtra a lista de dados do banco, removendo os itens que correspondem a uma regra de exclusão
    const dadosParaExportar = appState.dadosBanco.filter(
      item => !exclusionRules.includes(item.descricao)
    );

    // Chama a função de exportação apenas com os dados filtrados
    exportarXLSX(dadosParaExportar, 'importacao_pronta.xlsx');
  });

  DOM.fileOrcamento.addEventListener('change', e => {
    if (!e.target.files.length) return;
    lerArquivo(e.target.files[0], linhas => {
      appState.dadosOrcamento = processarDadosOrcamento(linhas);
      mostrarTabela(appState.dadosOrcamento, 'previewOrcamento', 'Orçamento importado. Pronto para comparar.');
      if (appState.dadosOrcamento.length > 0) {
        showToast(`${appState.dadosOrcamento.length} itens importados.`, 'success');
        window.Paginador.updateState({ orcamento: true });
        DOM.orcamentoTitle.classList.add('completed');
        updateCompareButtonVisibility();
      }
    });
  });
  
  DOM.fileBanco.addEventListener('change', e => {
      if(!e.target.files.length) return;
      lerArquivo(e.target.files[0], () => { showToast('Importação de arquivo do banco ainda não implementada.', 'info'); });
  });

  DOM.btnComparar.addEventListener('click', () => {
    appState.possibleMatches = [];
    comparar();
    if (!DOM.summaryPanel.classList.contains('hidden')) {
        window.Paginador.updateState({ resumo: true });
    }
  });
  
  DOM.btnExportarDiscrepBanco.addEventListener('click', () => exportarCSV(appState.discrepBanco, 'discrepancias_banco.csv'));
  DOM.btnExportarDiscrepOrcamento.addEventListener('click', () => exportarCSV(appState.discrepOrc, 'discrepancias_orcamento.csv'));
  
  DOM.possibleMatchesTbl.addEventListener('click', handleMatchAction);
  DOM.tabelaBancoTbl.addEventListener('click', handleDiscrepancyDeletion);
  DOM.tabelaOrcamentoTbl.addEventListener('click', handleDiscrepancyDeletion);
    
  DOM.btnAutoMatchHighConfidence.addEventListener('click', () => {
      const highConfidenceMatches = appState.possibleMatches.filter(m => m.score >= 0.8);
      if(!highConfidenceMatches.length) { showToast('Nenhuma sugestão de alta confiança para conciliar.', 'info'); return; }
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

  DOM.previewBancoTbl.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('btn-add-exclusion-rule')) {
          const description = target.dataset.description;
          if (saveExclusionRule(description)) {
              showToast(`Regra de exclusão para "${description}" salva!`, 'success');
              rerenderTable('previewBanco');
          } else {
              showToast('Esta regra de exclusão já existe.', 'info');
          }
      }
  });

  DOM.btnGerenciarRegras.addEventListener('click', () => {
      DOM.regrasModal.classList.toggle('hidden');
      if (DOM.regrasModal.classList.contains('hidden')) return;
  
      // --- Seção 1: Regras de Conciliação ---
      const { timestamp, regras } = getRulesObject();
      if (timestamp) {
          DOM.infoVersaoRegras.classList.remove('hidden');
          DOM.timestampRegras.textContent = timestamp;
      } else {
          DOM.infoVersaoRegras.classList.add('hidden');
      }
  
      DOM.listaRegras.innerHTML = '';
      if (regras.length > 0) {
          regras.forEach(rule => {
              const li = document.createElement('li');
              li.innerHTML = `
                  <span><strong>Banco:</strong> ${rule.banco} → <strong>Orçamento:</strong> ${rule.orc}</span>
                  <button class="btn-delete-rule" data-banco="${rule.banco}" data-orc="${rule.orc}">Excluir</button>
              `;
              DOM.listaRegras.appendChild(li);
          });
      }
  
      // --- Seção 2: Regras de Exclusão ---
      const exclusionRules = getExclusionRules();
      if (exclusionRules.length > 0) {
          if (regras.length > 0) {
              const separator = document.createElement('hr');
              separator.style.margin = '20px 0';
              DOM.listaRegras.appendChild(separator);
          }
          exclusionRules.forEach(ruleDesc => {
              const li = document.createElement('li');
              li.innerHTML = `
                  <span>Ignorar descrição: <strong>${ruleDesc}</strong></span>
                  <button class="btn-delete-exclusion-rule" data-description="${ruleDesc}" style="background-color: var(--color-red-error);">Excluir</button>
              `;
              DOM.listaRegras.appendChild(li);
          });
      }
      
      // --- Atualiza o placeholder se NENHUMA regra existir ---
      if (regras.length === 0 && exclusionRules.length === 0) {
          DOM.regrasModalPlaceholder.classList.remove('hidden');
      } else {
          DOM.regrasModalPlaceholder.classList.add('hidden');
      }
  });

  DOM.regrasModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
          DOM.regrasModal.classList.add('hidden');
      }
      
      if (e.target.classList.contains('btn-delete-rule')) {
          const { banco, orc } = e.target.dataset;
          deleteRule(banco, orc);
          e.target.parentElement.remove();
          showToast('Regra de conciliação excluída.', 'success');
      }
  
      if (e.target.classList.contains('btn-delete-exclusion-rule')) {
          const description = e.target.dataset.description;
          deleteExclusionRule(description);
          e.target.parentElement.remove();
          showToast('Regra de exclusão removida. Re-processe ou re-ordene a tabela para ver o efeito.', 'warning');
      }
  
      if (getRulesObject().regras.length === 0 && getExclusionRules().length === 0) {
          DOM.regrasModalPlaceholder.classList.remove('hidden');
      }
  });

  DOM.btnExportarRegras.addEventListener('click', exportarRegras);
  DOM.btnImportarRegras.addEventListener('click', () => DOM.importFile.click());
  DOM.importFile.addEventListener('change', (e) => importarRegras(e.target.files[0]));

  DOM.btnConfirmarSalvarRegra.addEventListener('click', () => {
      const ruleType = document.querySelector('input[name="rule-type"]:checked').value;
      const { bancoDesc, orcDesc, bancoPattern, orcPattern, matchIndex } = DOM.createRuleModal.dataset;

      let ruleToSave;
      if (ruleType === 'smart') {
          ruleToSave = { type: 'smart', banco: bancoPattern, orc: orcPattern };
      } else {
          ruleToSave = { type: 'exact', banco: bancoDesc, orc: orcDesc };
      }
      saveRule(ruleToSave);

      const match = appState.possibleMatches[parseInt(matchIndex, 10)];
      if(match) {
        appState.dadosBanco = appState.dadosBanco.filter(item => item !== match.bancoItem);
        appState.dadosOrcamento = appState.dadosOrcamento.filter(item => item !== match.orcItem);
        appState.possibleMatches.splice(parseInt(matchIndex, 10), 1);
        comparar();
      }
      
      DOM.createRuleModal.classList.add('hidden');
  });

  DOM.createRuleModal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
          DOM.createRuleModal.classList.add('hidden');
      }
  });
  
  function abrirModalCopia(item) {
    if (!item) return;
    const { data, descricao, valor } = item;
    const textoFormatado = `Compra no dia ${data}, ${descricao}, Valor R$ ${valor.toFixed(2)}`;
    
    DOM.infoCopiaContainer.textContent = textoFormatado;
    DOM.modalCopia.dataset.textoParaCopiar = textoFormatado;
    DOM.modalCopia.classList.remove('hidden');
  }

  DOM.btnCopiarInfo.addEventListener('click', () => {
    const texto = DOM.modalCopia.dataset.textoParaCopiar;
    if (texto) {
        navigator.clipboard.writeText(texto).then(() => {
            showToast('Informação copiada!', 'success');
            DOM.modalCopia.classList.add('hidden');
        }, (err) => {
            showToast('Falha ao copiar.', 'error');
            console.error('Erro de cópia: ', err);
        });
    }
  });

  DOM.modalCopia.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
          DOM.modalCopia.classList.add('hidden');
      }
  });

  function toggleFocusMode(forceOff = false) {
    const body = document.body;
    const isCurrentlyActive = body.classList.contains('focus-mode-active');
    
    if (forceOff || isCurrentlyActive) {
      body.classList.remove('focus-mode-active');
      DOM.btnExitFocusMode.classList.add('hidden');
      if (isCurrentlyActive) showToast('Modo Foco Desativado.', 'info');
    } else {
      body.classList.add('focus-mode-active');
      DOM.btnExitFocusMode.classList.remove('hidden');
      showToast('Modo Foco Ativado. Pressione "Esc" ou clique no botão para sair.', 'info');
    }
  }

  DOM.btnModoFoco.addEventListener('click', () => {
    toggleFocusMode(); 
  });

  DOM.btnExitFocusMode.addEventListener('click', () => {
    toggleFocusMode(true);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('focus-mode-active')) {
      toggleFocusMode(true);
    }
  });

  resetApplication();
});
