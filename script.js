let dadosBanco = [], dadosOrcamento = [];
let discrepBanco = [], discrepOrc = [];

// Ler arquivo CSV ou Excel (Função original, mantida para compatibilidade)
function lerArquivo(file, callback) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => {
      const linhas = e.target.result.split(/\r?\n/).map(l => l.split(','));
      callback(linhas);
    };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const primeiraAba = workbook.SheetNames[0];
      const planilha = workbook.Sheets[primeiraAba];
      const linhas = XLSX.utils.sheet_to_json(planilha, { header: 1 });
      callback(linhas);
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert('Formato de arquivo não suportado: ' + ext);
  }
}

// Parser do texto bruto do internet banking (MODIFICADO)
function importarTextoBruto(texto, ano, conta) {
  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const regexData = /^\d{2}\/\d{2}$/;
  const regexValor = /^-?\d+,\d{2}$/;
  let dados = [];
  let i = 0;

  while (i < linhas.length) {
    if (regexData.test(linhas[i])) {
      const data = linhas[i] + '/' + ano;
      const descricao = (linhas[i+1] || '').trim();
      const valorRaw = (linhas[i+2] || '').trim();

      if (regexValor.test(valorRaw)) {
        const valor = parseFloat(valorRaw.replace('.', '').replace(',', '.'));
        // Estrutura de dados final: [Data, Descrição, Valor, Categoria, Conta]
        dados.push([data, descricao, valor, 'Sem Categoria', conta]);
        i += 3;
        continue;
      }
    }
    i++;
  }
  return dados;
}

// Mostrar tabela de preview com o formato final (NOVA)
function mostrarTabelaCompleta(dados, id) {
  const tbl = document.getElementById(id);
  tbl.innerHTML = '';
  if (!dados.length) return;
  let header = tbl.insertRow();
  header.innerHTML = '<th>Data Ocorrência</th><th>Descrição</th><th>Valor</th><th>Categoria</th><th>Conta</th>';
  dados.forEach(l => {
    let row = tbl.insertRow();
    row.insertCell().innerText = l[0]; // Data
    row.insertCell().innerText = l[1]; // Descrição
    row.insertCell().innerText = l[2]; // Valor
    row.insertCell().innerText = l[3]; // Categoria
    row.insertCell().innerText = l[4]; // Conta
  });
}

// Exportar XLSX com formato customizado (MODIFICADO)
function exportarXLSX(dados, nomeArquivo) {
  if (!dados.length) { 
    alert("Nada para exportar. Processe os dados primeiro."); 
    return; 
  }
  
  const dadosParaPlanilha = dados.map(linha => ({
    'Data Ocorrência': linha[0],
    'Descrição': linha[1],
    'Valor': parseFloat(linha[2]),
    'Categoria': linha[3],
    'Conta': linha[4]
  }));

  const ws = XLSX.utils.json_to_sheet(dadosParaPlanilha);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transações");
  XLSX.writeFile(wb, nomeArquivo);
}

// --- Eventos da Interface ---

// Processar texto bruto (MODIFICADO)
document.getElementById('btnProcessarTexto').addEventListener('click', () => {
  const texto = document.getElementById('textoBanco').value;
  const ano = document.getElementById('anoExtrato').value;
  const conta = document.getElementById('nomeConta').value;

  if (!texto.trim() || !ano || !conta) {
    alert("Por favor, preencha o extrato, o ano e o nome da conta antes de processar.");
    return;
  }
  
  dadosBanco = importarTextoBruto(texto, ano, conta);
  mostrarTabelaCompleta(dadosBanco, 'previewBanco');
});

// Botão de exportação da planilha pronta (NOVO)
document.getElementById('btnExportarPlanilha').addEventListener('click', () => {
  if (!dadosBanco.length) {
    alert("Primeiro, clique em 'Processar Texto' para gerar os dados.");
    return;
  }
  exportarXLSX(dadosBanco, 'importacao_pronta.xlsx');
});


// --- Lógica de Conciliação Original (Mantida para não quebrar outras funcionalidades) ---

document.getElementById('fileBanco').addEventListener('change', e => {
  lerArquivo(e.target.files[0], linhas => {
    // Nota: Esta parte do fluxo precisaria de ajuste se fosse usada,
    // pois 'padronizarDados' não gera o formato completo.
    dadosBanco = padronizarDados(linhas); 
    mostrarTabela(dadosBanco, 'previewBanco');
  });
});

document.getElementById('fileOrcamento').addEventListener('change', e => {
  lerArquivo(e.target.files[0], linhas => {
    dadosOrcamento = padronizarDados(linhas);
    mostrarTabela(dadosOrcamento, 'previewOrcamento');
  });
});

document.getElementById('btnComparar').addEventListener('click', comparar);

function padronizarDados(linhas) {
  return linhas.slice(1).map(l => [
    (l[0] || '').trim(),
    parseFloat(l[1]) || 0
  ]).filter(l => l[0] && !isNaN(l[1]));
}

function criarChaveExata(linha) {
  const desc = (linha[0] || '').toUpperCase().replace(/\s+/g,' ').trim();
  const val = (Math.round(linha[1]*100)/100).toFixed(2);
  return `${desc}_${val}`;
}

function criarChaveParcial(linha) {
  const desc = (linha[0] || '').toUpperCase().replace(/\s+/g,' ').trim();
  const val = (Math.round(linha[1]*100)/100).toFixed(2);
  return `${desc.substring(0,8)}_${val}`;
}

function mostrarTabela(dados, id) {
  const tbl = document.getElementById(id);
  tbl.innerHTML = '';
  if (!dados.length) return;
  let header = tbl.insertRow();
  header.innerHTML = '<th>Descrição</th><th>Valor</th>';
  dados.forEach(l => {
    let row = tbl.insertRow();
    row.insertCell().innerText = l[0];
    row.insertCell().innerText = l[1];
  });
}

function comparar() {
  if (!dadosBanco.length || !dadosOrcamento.length) {
    alert("Importe ou cole os dados do banco e do orçamento antes de comparar.");
    return;
  }
  const chBancoEx = new Set(dadosBanco.map(criarChaveExata));
  const chOrcEx = new Set(dadosOrcamento.map(criarChaveExata));
  const bancoRest = dadosBanco.filter(l => !chOrcEx.has(criarChaveExata(l)));
  const orcRest = dadosOrcamento.filter(l => !chBancoEx.has(criarChaveExata(l)));
  const chBancoPar = new Set(bancoRest.map(criarChaveParcial));
  const chOrcPar = new Set(orcRest.map(criarChaveParcial));
  discrepBanco = bancoRest.filter(l => !chOrcPar.has(criarChaveParcial(l)));
  discrepOrc = orcRest.filter(l => !chBancoPar.has(criarChaveParcial(l)));
  mostrarTabela(discrepBanco,'tabelaBanco');
  mostrarTabela(discrepOrc,'tabelaOrcamento');
}

function exportarCSV(dados, nomeArquivo) {
  if (!dados.length) { alert("Nada para exportar."); return; }
  let conteudo = 'Descrição,Valor\n' + dados.map(l => `"${l[0]}",${l[1]}`).join('\n');
  let blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  let link = document.createElement("a");
  let url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}