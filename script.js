// --- ESTADO DA APLICAÇÃO ---
let dadosBanco = [], dadosOrcamento = [];
let dadosBancoOriginais = []; // Para guardar o resultado do parsing inicial
let discrepBanco = [], discrepOrc = [];

// --- SISTEMA DE NOTIFICAÇÃO ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// --- FUNÇÕES DE RESET ---
function resetApplication() {
  // Limpa variáveis de estado
  dadosBanco = [];
  dadosOrcamento = [];
  dadosBancoOriginais = [];
  discrepBanco = [];
  discrepOrc = [];

  // Limpa campos da interface
  document.getElementById('textoBanco').value = '';
  document.getElementById('fileBanco').value = '';
  document.getElementById('fileOrcamento').value = '';
  document.getElementById('filtroDataInicio').value = '';
  document.getElementById('novaDataLancamento').value = '';

  // Limpa todas as tabelas
  mostrarTabelaBanco([], 'previewBanco');
  mostrarTabela([], 'previewOrcamento', 'Nenhum orçamento importado.');
  mostrarTabela([], 'tabelaBanco', 'Nenhuma discrepância encontrada.');
  mostrarTabela([], 'tabelaOrcamento', 'Nenhuma discrepância encontrada.');
  
  // Oculta painel de refinamento
  document.getElementById('painelRefinamento').style.display = 'none';
  
  showToast('Sessão limpa. Pronto para uma nova conciliação!', 'success');
}

// --- FUNÇÕES DE PROCESSAMENTO DE DADOS ---

function lerArquivo(file, callback) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = e => {
      let linhas;
      if (ext === 'csv') {
        const text = new TextDecoder('utf-8').decode(e.target.result);
        linhas = text.split(/\r?\n/).map(l => l.split(','));
      } else {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const primeiraAba = workbook.SheetNames[0];
        const planilha = workbook.Sheets[primeiraAba];
        linhas = XLSX.utils.sheet_to_json(planilha, { header: 1 });
      }
      callback(linhas);
    };
    reader.readAsArrayBuffer(file);
  } else {
    showToast('Formato de arquivo não suportado: ' + ext, 'error');
  }
}

function importarTextoBrutoInteligente(texto) {
  const linhas = texto.split(/\r?\n/).filter(l => l.trim().length > 0);
  const regexLancamento = /^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)$/m;
  const anoCorrente = new Date().getFullYear();
  let dados = [];

  for (const linha of linhas) {
    const match = linha.trim().match(regexLancamento);
    if (match) {
      const [, dataStr, descricao, valorStr] = match;
      const dataCompleta = `${dataStr}/${anoCorrente}`;
      const valorNumerico = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
      const isCredito = /ajuste cred|estorno/i.test(descricao);
      const valorFinal = isCredito ? valorNumerico : -valorNumerico;
      dados.push({ data: dataCompleta, descricao: descricao.trim(), valor: valorFinal });
    }
  }
  return dados;
}

// --- RENDERIZAÇÃO E EXPORTAÇÃO ---

function mostrarTabelaBanco(dados, id) {
  const tbl = document.getElementById(id);
  tbl.innerHTML = '';
  let header = tbl.insertRow();
  header.innerHTML = '<th>Data</th><th>Descrição</th><th>Valor (R$)</th>';

  if (!dados || !dados.length) {
    let row = tbl.insertRow();
    let cell = row.insertCell();
    cell.colSpan = 3;
    cell.className = 'no-results';
    cell.innerText = document.getElementById('textoBanco').value ? 'Nenhum resultado encontrado.' : 'Aguardando dados...';
  } else {
    dados.forEach(l => {
      let row = tbl.insertRow();
      row.insertCell().innerText = l.data;
      row.insertCell().innerText = l.descricao;
      row.insertCell().innerText = l.valor.toFixed(2);
    });
  }
}

function mostrarTabela(dados, id, noResultsMessage = 'Nenhum dado encontrado.') {
  const tbl = document.getElementById(id);
  tbl.innerHTML = '';
  if (!dados) return;
  let header = tbl.insertRow();
  header.innerHTML = '<th>Descrição</th><th>Valor (R$)</th>';

  if (!dados.length) {
    let row = tbl.insertRow();
    let cell = row.insertCell();
    cell.colSpan = 2;
    cell.className = 'no-results';
    cell.innerText = noResultsMessage;
  } else {
    dados.forEach(l => {
      let row = tbl.insertRow();
      row.insertCell().innerText = l[0];
      row.insertCell().innerText = l[1].toFixed(2);
    });
  }
}


function exportarXLSX(dados, nomeArquivo) {
  if (!dados || !dados.length) { 
    showToast("A lista de transações está vazia ou o filtro não retornou resultados.", 'error'); 
    return; 
  }
  
  const dadosParaPlanilha = dados.map(linha => ({
    'Data Ocorrência': linha.data,
    'Descrição': linha.descricao,
    'Valor': linha.valor,
    'Categoria': 'Sem Categoria',
    'Conta': 'Não Informada'
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
  let conteudo = 'Descrição,Valor\n' + dados.map(l => `"${l[0]}",${l[1]}`).join('\n');
  let blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  let link = document.createElement("a");
  let url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Arquivo ${nomeArquivo} gerado!`, 'success');
}


// --- LÓGICA DE CONCILIAÇÃO ---

function padronizarDados(linhas) {
  return linhas.slice(1).map(l => [
    (l[0] || '').trim(),
    parseFloat(String(l[1]).replace(',', '.')) || 0
  ]).filter(l => l[0] && !isNaN(l[1]));
}

function criarChaveExata(linha) {
  const desc = String(linha[0]).toUpperCase().replace(/\s+/g,' ').trim();
  const val = (Math.round(linha[1]*100)/100).toFixed(2);
  return `${desc}_${val}`;
}

function criarChaveParcial(linha) {
  const desc = String(linha[0]).toUpperCase().replace(/\s+/g,' ').trim();
  const val = (Math.round(linha[1]*100)/100).toFixed(2);
  return `${desc.substring(0,8)}_${val}`;
}

function comparar() {
  if (!dadosBanco.length || !dadosOrcamento.length) {
    showToast("Importe os dados do banco e do orçamento antes de comparar.", 'error');
    return;
  }
  
  const dadosBancoConciliacao = dadosBanco.map(l => [l.descricao, l.valor]);

  const chBancoEx = new Set(dadosBancoConciliacao.map(criarChaveExata));
  const chOrcEx = new Set(dadosOrcamento.map(criarChaveExata));
  
  const bancoRest = dadosBancoConciliacao.filter(l => !chOrcEx.has(criarChaveExata(l)));
  const orcRest = dadosOrcamento.filter(l => !chBancoEx.has(criarChaveExata(l)));
  
  const chBancoPar = new Set(bancoRest.map(criarChaveParcial));
  const chOrcPar = new Set(orcRest.map(criarChaveParcial));
  
  discrepBanco = bancoRest.filter(l => !chOrcPar.has(criarChaveParcial(l)));
  discrepOrc = orcRest.filter(l => !chBancoPar.has(criarChaveParcial(l)));
  
  mostrarTabela(discrepBanco, 'tabelaBanco', 'Nenhuma discrepância encontrada no extrato do banco.');
  mostrarTabela(discrepOrc, 'tabelaOrcamento', 'Nenhuma discrepância encontrada no orçamento.');
  showToast('Comparação concluída!', 'success');
}


// --- EVENT LISTENERS ---

document.getElementById('btnNovaConciliacao').addEventListener('click', resetApplication);

document.getElementById('btnProcessarTexto').addEventListener('click', () => {
  const texto = document.getElementById('textoBanco').value;
  if (!texto.trim()) {
    showToast("Cole o extrato bruto antes de processar.", 'error');
    return;
  }
  dadosBancoOriginais = importarTextoBrutoInteligente(texto);
  dadosBanco = [...dadosBancoOriginais];
  mostrarTabelaBanco(dadosBanco, 'previewBanco');
  if (dadosBanco.length > 0) {
    document.getElementById('painelRefinamento').style.display = 'block';
    showToast(`Foram encontrados ${dadosBanco.length} lançamentos.`, 'info');
  } else {
    showToast(`Nenhum lançamento válido encontrado no texto. Verifique o formato.`, 'error');
  }
});

document.getElementById('btnRefinarDados').addEventListener('click', () => {
    const filtroDataInicio = document.getElementById('filtroDataInicio').value;
    const novaDataLancamentoStr = document.getElementById('novaDataLancamento').value;

    if (!filtroDataInicio) {
        showToast('Selecione a data de início para filtrar.', 'error');
        return;
    }

    const filtroDate = new Date(filtroDataInicio + 'T00:00:00');
    let dadosFiltrados = dadosBancoOriginais.filter(l => {
        const [dia, mes, ano] = l.data.split('/');
        const dataLancamento = new Date(`${ano}-${mes}-${dia}T00:00:00`);
        return dataLancamento >= filtroDate;
    });

    if (novaDataLancamentoStr) {
        const [ano, mes, dia] = novaDataLancamentoStr.split('-');
        const novaDataFormatada = `${dia}/${mes}/${ano}`;
        dadosFiltrados = dadosFiltrados.map(l => ({ ...l, data: novaDataFormatada }));
    }

    dadosBanco = dadosFiltrados;
    mostrarTabelaBanco(dadosBanco, 'previewBanco');
    showToast('Filtro aplicado com sucesso!', 'success');
});

document.getElementById('btnExportarPlanilha').addEventListener('click', () => {
  exportarXLSX(dadosBanco, 'importacao_pronta.xlsx');
});

document.getElementById('fileBanco').addEventListener('change', e => {
  lerArquivo(e.target.files[0], linhas => {
    showToast('Importação de arquivo ainda não integrada com o novo fluxo.', 'info');
    // Implementação futura: padronizar para o formato {data, descricao, valor}
  });
});

document.getElementById('fileOrcamento').addEventListener('change', e => {
  lerArquivo(e.target.files[0], linhas => {
    dadosOrcamento = padronizarDados(linhas);
    mostrarTabela(dadosOrcamento, 'previewOrcamento', 'Orçamento importado. Pronto para comparar.');
    showToast(`Orçamento com ${dadosOrcamento.length} itens importado.`, 'success');
  });
});

document.getElementById('btnComparar').addEventListener('click', comparar);

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  resetApplication();
  showToast('Bem-vindo à Ferramenta de Conciliação!', 'info');
});