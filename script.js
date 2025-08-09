// --- ESTADO CENTRALIZADO DA APLICAÇÃO (MELHORIA DE ARQUITETURA) ---
const appState = {
  dadosBanco: [],
  dadosOrcamento: [],
  dadosBancoOriginais: [],
  discrepBanco: [],
  discrepOrc: [],
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
};

// --- SPINNER E NOTIFICAÇÕES (MELHORIA UX) ---
const showSpinner = () => DOM.spinnerOverlay.classList.remove('hidden');
const hideSpinner = () => DOM.spinnerOverlay.classList.add('hidden');

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// --- FUNÇÕES DE RESET ---
function resetApplication() {
  Object.assign(appState, {
    dadosBanco: [], dadosOrcamento: [], dadosBancoOriginais: [],
    discrepBanco: [], discrepOrc: []
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
  showToast('Sessão limpa. Pronto para uma nova conciliação!', 'success');
}

// --- FUNÇÕES DE PROCESSAMENTO DE DADOS ---

function lerArquivo(file, callback) {
  showSpinner();
  const ext = file.name.split('.').pop().toLowerCase();

  // Verificação de segurança: O XLSX está disponível?
  if (['xlsx', 'xls'].includes(ext) && typeof XLSX === 'undefined') {
    showToast("Erro: A biblioteca de planilhas não pôde ser carregada. Verifique sua conexão.", 'error');
    hideSpinner();
    return;
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
  const regexLancamento = /^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)$/gm;
  const anoCorrente = new Date().getFullYear();
  let dados = [];
  let match;

  while ((match = regexLancamento.exec(texto)) !== null) {
    const [, dataStr, descricao, valorStr] = match;
    const dataCompleta = `${dataStr}/${anoCorrente}`;
    const valorNumerico = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
    const isCredito = /ajuste cred|estorno/i.test(descricao);
    const valorFinal = isCredito ? valorNumerico : -valorNumerico;
    dados.push({ data: dataCompleta, descricao: descricao.trim(), valor: valorFinal });
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

function exportarXLSX(dados, nomeArquivo) {
  if (!dados || !dados.length) {
    showToast("A lista de transações para exportar está vazia.", 'error');
    return;
  }
  const dadosParaPlanilha = dados.map(linha => ({
    'Data Ocorrência': linha.data, 'Descrição': linha.descricao, 'Valor': linha.valor
  }));
  const ws = XLSX.utils.json_to_sheet(dadosParaPlanilha);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
  XLSX.writeFile(wb, nomeArquivo);
  showToast('Planilha exportada com sucesso!', 'success');
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

const criarChaveExata = linha => `${String(linha[0]).toUpperCase().replace(/\s+/g,' ').trim()}_${(Math.round(linha[1]*100)/100).toFixed(2)}`;
const criarChaveParcial = linha => `${String(linha[0]).toUpperCase().replace(/\s+/g,' ').trim().substring(0,8)}_${(Math.round(linha[1]*100)/100).toFixed(2)}`;

function comparar() {
  if (!appState.dadosBanco.length || !appState.dadosOrcamento.length) {
    showToast("Importe os dados do banco e do orçamento antes de comparar.", 'error');
    return;
  }
  
  const dadosBancoConciliacao = appState.dadosBanco.map(l => [l.descricao, l.valor]);
  const chBancoEx = new Set(dadosBancoConciliacao.map(criarChaveExata));
  const chOrcEx = new Set(appState.dadosOrcamento.map(criarChaveExata));
  
  const bancoRest = dadosBancoConciliacao.filter(l => !chOrcEx.has(criarChaveExata(l)));
  const orcRest = appState.dadosOrcamento.filter(l => !chBancoEx.has(criarChaveExata(l)));
  
  const chBancoPar = new Set(bancoRest.map(criarChaveParcial));
  const chOrcPar = new Set(orcRest.map(criarChaveParcial));
  
  appState.discrepBanco = bancoRest.filter(l => !chOrcPar.has(criarChaveParcial(l)));
  appState.discrepOrc = orcRest.filter(l => !chBancoPar.has(criarChaveParcial(l)));
  
  mostrarTabela(appState.discrepBanco, 'tabelaBanco', 'Nenhuma discrepância encontrada.');
  mostrarTabela(appState.discrepOrc, 'tabelaOrcamento', 'Nenhuma discrepância encontrada.');
  showToast('Comparação concluída!', 'success');
}

// --- EVENT LISTENERS (CENTRALIZADOS) ---

// Usamos DOMContentLoaded com 'defer', garantindo que o DOM e os scripts estejam prontos.
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

  DOM.btnExportarPlanilha.addEventListener('click', () => exportarXLSX(appState.dadosBanco, 'importacao_pronta.xlsx'));

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

  DOM.btnComparar.addEventListener('click', comparar);
  
  DOM.btnExportarDiscrepBanco.addEventListener('click', () => exportarCSV(appState.discrepBanco, 'discrepancias_banco.csv'));
  DOM.btnExportarDiscrepOrcamento.addEventListener('click', () => exportarCSV(appState.discrepOrc, 'discrepancias_orcamento.csv'));

  // --- INICIALIZAÇÃO ---
  resetApplication();
});