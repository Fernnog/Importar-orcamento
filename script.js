let dadosBanco = [], dadosOrcamento = [];
let discrepBanco = [], discrepOrc = [];

// Ler arquivo CSV ou Excel
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

// Padronizar dados CSV/Excel
function padronizarDados(linhas) {
  return linhas.slice(1).map(l => [
    (l[0] || '').trim(),
    parseFloat(l[1]) || 0
  ]).filter(l => l[0] && !isNaN(l[1]));
}

// Parser do texto bruto do internet banking
function importarTextoBruto(texto) {
  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const regexData = /^\d{2}\/\d{2}$/;
  const regexValor = /^-?\d+,\d{2}$/;

  let dados = [];
  let i = 0;

  while (i < linhas.length) {
    if (regexData.test(linhas[i])) {
      const data = linhas[i];
      const descricao = (linhas[i+1] || '').trim();
      const valorRaw = (linhas[i+2] || '').trim();

      if (regexValor.test(valorRaw)) {
        const valor = parseFloat(valorRaw.replace('.', '').replace(',', '.'));
        dados.push([descricao, valor]);
        i += 3;
        continue;
      }
    }
    i++;
  }
  return dados;
}

// Criar chaves para comparação
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

// Mostrar dados na tabela
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

// Eventos
document.getElementById('fileBanco').addEventListener('change', e => {
  lerArquivo(e.target.files[0], linhas => {
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

// Processar texto bruto
document.getElementById('btnProcessarTexto').addEventListener('click', () => {
  const texto = document.getElementById('textoBanco').value;
  if (!texto.trim()) {
    alert("Cole o texto do internet banking primeiro.");
    return;
  }
  dadosBanco = importarTextoBruto(texto);
  mostrarTabela(dadosBanco, 'previewBanco');
});

// Comparar
function comparar() {
  if (!dadosBanco.length || !dadosOrcamento.length) {
    alert("Importe ou cole os dados do banco e do orçamento antes de comparar.");
    return;
  }

  // Etapa 1 - Exata
  const chBancoEx = new Set(dadosBanco.map(criarChaveExata));
  const chOrcEx = new Set(dadosOrcamento.map(criarChaveExata));
  const bancoRest = dadosBanco.filter(l => !chOrcEx.has(criarChaveExata(l)));
  const orcRest = dadosOrcamento.filter(l => !chBancoEx.has(criarChaveExata(l)));

  // Etapa 2 - Parcial
  const chBancoPar = new Set(bancoRest.map(criarChaveParcial));
  const chOrcPar = new Set(orcRest.map(criarChaveParcial));
  discrepBanco = bancoRest.filter(l => !chOrcPar.has(criarChaveParcial(l)));
  discrepOrc = orcRest.filter(l => !chBancoPar.has(criarChaveParcial(l)));

  mostrarTabela(discrepBanco,'tabelaBanco');
  mostrarTabela(discrepOrc,'tabelaOrcamento');
}

document.getElementById('btnComparar').addEventListener('click', comparar);

// Exportar CSV
function exportarCSV(dados, nomeArquivo) {
  if (!dados.length) { alert("Nada para exportar."); return; }
  let conteudo = 'Descrição,Valor\n' + dados.map(l => `${l[0]},${l[1]}`).join('\n');
  let blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  let link = document.createElement("a");
  let url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
