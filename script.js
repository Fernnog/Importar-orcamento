// --- ESTADO CENTRALIZADO DA APLICAÇÃO (MELHORIA DE ARQUITETURA) ---
const appState = {
  dadosBanco: [],
  dadosOrcamento: [],
  dadosBancoOriginais: [],
  discrepBanco: [],
  discrepOrc: [],
  sugestoes: [],
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
  tabelaSugestoesTbl: document.getElementById('tabelaSugestoes'),

  btnNovaConciliacao: document.getElementById('btnNovaConciliacao'),
  btnProcessarTexto: document.getElementById('btnProcessarTexto'),
  btnRefinarDados: document.getElementById('btnRefinarDados'),
  btnExportarPlanilha: document.getElementById('btnExportarPlanilha'),
  btnComparar: document.getElementById('btnComparar'),
  btnExportarDiscrepBanco: document.getElementById('btnExportarDiscrepBanco'),
  btnExportarDiscrepOrcamento: document.getElementById('btnExportarDiscrepOrcamento'),
  
  summaryPanel: document.getElementById('summaryPanel'),
  sugestoesPanel: document.getElementById('sugestoesPanel'),
  summaryReconciled: document.getElementById('summaryReconciled'),
  summaryBank: document.getElementById('summaryBank'),
  summaryBudget: document.getElementById('summaryBudget'),
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
    discrepBanco: [], discrepOrc: [], sugestoes: []
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
  DOM.sugestoesPanel.classList.add('hidden');
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
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
    script.onload = () => { xlsxLibraryLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Falha ao carregar a funcionalidade de planilhas."));
    document.head.appendChild(script);
  });
}

async function lerArquivo(file, callback) {
  showSpinner();
  const ext = file.name.split('.').pop().toLowerCase();

  if (['xlsx', 'xls'].includes(ext)) {
    try {
      await loadXLSXLibrary();
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const primeiraAba = workbook.SheetNames[0];
          const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba], { header: 1 });
          callback(linhas);
        } catch (error) {
          console.error("Erro ao processar planilha:", error);
          showToast("Ocorreu um erro ao processar o arquivo.", 'error');
        } finally {
          hideSpinner();
        }
      };
      reader.onerror = () => { showToast("Não foi possível ler o arquivo.", 'error'); hideSpinner(); };
      reader.readAsArrayBuffer(file);
      return;
    } catch (error) {
      showToast(error.message, 'error');
      hideSpinner();
      return;
    }
  }
  
  if (ext === 'csv') {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (!results.meta.fields || results.meta.fields.length < 2) {
             throw new Error("CSV não contém cabeçalho válido.");
          }
          const cabecalho = results.meta.fields.map(h => String(h).toLowerCase().trim());
          const linhasComCabecalho = [cabecalho, ...results.data.map(row => cabecalho.map(field => row[field] || ''))];
          callback(linhasComCabecalho);
        } catch (error) {
          console.error("Erro ao processar CSV com PapaParse:", error);
          showToast(error.message, 'error');
        } finally {
          hideSpinner();
        }
      },
      error: (err) => {
        console.error("PapaParse error:", err);
        showToast("Não foi possível ler o arquivo CSV.", 'error');
        hideSpinner();
      }
    });
    return;
  }
  
  showToast('Formato de arquivo não suportado: ' + ext, 'error');
  hideSpinner();
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
  const idxDescricao = cabecalho.findIndex(h => h.includes('descri')); // Flexível
  const idxValor = cabecalho.findIndex(h => h.includes('valor'));

  if (idxDescricao === -1 || idxValor === -1) {
    showToast("Erro: Arquivo deve conter colunas 'Descrição' e 'Valor'.", 'error');
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

function mostrarTabelaSugestoes(sugestoes) {
  DOM.sugestoesPanel.classList.toggle('hidden', sugestoes.length === 0);
  const tbl = DOM.tabelaSugestoesTbl;
  tbl.innerHTML = `<thead><tr><th>Item do Banco</th><th>Sugestão do Orçamento</th><th class="similarity-cell">Similaridade</th><th class="actions-cell">Ação</th></tr></thead>`;
  const tbody = document.createElement('tbody');

  if (sugestoes.length === 0) {
    tbl.appendChild(tbody);
    return;
  }
  
  sugestoes.forEach((sugestao, index) => {
    if (!sugestao) return; // Item já processado
    const { bancoItem, orcItem, score } = sugestao;
    const similarityPercent = Math.round((1 - score) * 100);
    const row = tbody.insertRow();
    
    row.innerHTML = `
      <td>${bancoItem[0]}<br><strong>R$ ${bancoItem[1].toFixed(2)}</strong></td>
      <td>${orcItem[0]}<br><strong>R$ ${orcItem[1].toFixed(2)}</strong></td>
      <td class="similarity-cell">
        ${similarityPercent}%
        <div class="similarity-bar-container">
          <div class="similarity-bar" style="width: ${similarityPercent}%;"></div>
        </div>
      </td>
      <td class="actions-cell">
        <button class="btn-confirm" data-sugestao-idx="${index}">Confirmar</button>
        <button class="btn-reject" data-sugestao-idx="${index}">Rejeitar</button>
      </td>
    `;
  });
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


// --- LÓGICA DE CONCILIAÇÃO ---
function comparar() {
  if (!appState.dadosBanco.length || !appState.dadosOrcamento.length) {
    showToast("Importe os dados do banco e do orçamento antes de comparar.", 'error');
    return;
  }
  showSpinner();

  setTimeout(() => {
    // Funções de normalização
    const normalizeDescricao = str => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
    const normalizeValor = valor => (Math.round(parseFloat(valor) * 100) / 100).toFixed(2);
    
    // Constrói um mapa de contagem para respeitar multiplicidade
    const buildCountMap = (dados) => {
        const map = new Map();
        dados.forEach(item => {
            const key = `${normalizeDescricao(item[0])}|${normalizeValor(item[1])}`;
            map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
    };

    const bancoParaConciliar = appState.dadosBanco.map(l => [l.descricao, l.valor]);
    const mapaOrcamento = buildCountMap(appState.dadosOrcamento);
    let reconciliadosCount = 0;
    
    // --- PASSO 1: CONCILIAÇÃO EXATA ---
    let bancoRestante = [];
    bancoParaConciliar.forEach(bancoItem => {
        const key = `${normalizeDescricao(bancoItem[0])}|${normalizeValor(bancoItem[1])}`;
        if (mapaOrcamento.has(key) && mapaOrcamento.get(key) > 0) {
            mapaOrcamento.set(key, mapaOrcamento.get(key) - 1);
            reconciliadosCount++;
        } else {
            bancoRestante.push(bancoItem);
        }
    });

    let orcamentoRestante = [];
    mapaOrcamento.forEach((count, key) => {
        const [desc, val] = key.split('|');
        for (let i = 0; i < count; i++) {
            orcamentoRestante.push([desc, parseFloat(val)]);
        }
    });

    // --- PASSO 2: CONCILIAÇÃO APROXIMADA (FUZZY) ---
    appState.sugestoes = [];
    if (bancoRestante.length > 0 && orcamentoRestante.length > 0) {
        const matchedOrcIndexes = new Set();
        let bancoAindaRestante = [];

        bancoRestante.forEach(bancoItem => {
            const orcComMesmoValor = orcamentoRestante.map((o,i) => ({item: o, index: i}))
                .filter(obj => normalizeValor(obj.item[1]) === normalizeValor(bancoItem[1]) && !matchedOrcIndexes.has(obj.index));

            if (orcComMesmoValor.length === 0) {
                bancoAindaRestante.push(bancoItem);
                return;
            }
            
            const fuse = new Fuse(orcComMesmoValor, { keys: ['item.0'], includeScore: true, threshold: 0.5 });
            const results = fuse.search(bancoItem[0]);

            if (results.length > 0) {
                const bestMatch = results[0];
                appState.sugestoes.push({ bancoItem, orcItem: bestMatch.item.item, score: bestMatch.score });
                matchedOrcIndexes.add(bestMatch.item.index);
            } else {
                bancoAindaRestante.push(bancoItem);
            }
        });

        bancoRestante = bancoAindaRestante;
        orcamentoRestante = orcamentoRestante.filter((_, i) => !matchedOrcIndexes.has(i));
    }

    // --- PASSO 3: FINALIZAR E ATUALIZAR ESTADO E UI ---
    appState.discrepBanco = bancoRestante;
    appState.discrepOrc = orcamentoRestante;
    
    animateCounter(DOM.summaryReconciled, 0, reconciliadosCount, 750);
    animateCounter(DOM.summaryBank, 0, appState.discrepBanco.length, 750);
    animateCounter(DOM.summaryBudget, 0, appState.discrepOrc.length, 750);

    DOM.summaryPanel.classList.remove('hidden');
    mostrarTabelaSugestoes(appState.sugestoes);
    mostrarTabela(appState.discrepBanco, 'tabelaBanco', 'Nenhuma discrepância encontrada.');
    mostrarTabela(appState.discrepOrc, 'tabelaOrcamento', 'Nenhuma discrepância encontrada.');
    showToast('Comparação inteligente concluída!', 'success');
    hideSpinner();
  }, 100);
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

  DOM.btnComparar.addEventListener('click', comparar);
  
  DOM.btnExportarDiscrepBanco.addEventListener('click', () => exportarCSV(appState.discrepBanco, 'discrepancias_banco.csv'));
  DOM.btnExportarDiscrepOrcamento.addEventListener('click', () => exportarCSV(appState.discrepOrc, 'discrepancias_orcamento.csv'));

  DOM.tabelaSugestoesTbl.addEventListener('click', (e) => {
    const target = e.target;
    const sugestaoIdx = target.dataset.sugestaoIdx;
    if (!sugestaoIdx) return;
    
    const row = target.closest('tr');
    const sugestao = appState.sugestoes[sugestaoIdx];
    if (!sugestao) return;

    if (target.classList.contains('btn-confirm')) {
      DOM.summaryReconciled.innerText = parseInt(DOM.summaryReconciled.innerText) + 1;
      showToast('Par confirmado!', 'success');
    } else if (target.classList.contains('btn-reject')) {
      appState.discrepBanco.push(sugestao.bancoItem);
      appState.discrepOrc.push(sugestao.orcItem);
      mostrarTabela(appState.discrepBanco, 'tabelaBanco');
      mostrarTabela(appState.discrepOrc, 'tabelaOrcamento');
      DOM.summaryBank.innerText = appState.discrepBanco.length;
      DOM.summaryBudget.innerText = appState.discrepOrc.length;
      showToast('Par rejeitado.', 'info');
    }
    
    row.style.opacity = '0';
    setTimeout(() => {
        row.remove();
        if (DOM.tabelaSugestoesTbl.querySelectorAll('tbody tr').length === 0) {
            DOM.sugestoesPanel.classList.add('hidden');
        }
    }, 300);
    appState.sugestoes[sugestaoIdx] = null;
  });

  resetApplication();
});