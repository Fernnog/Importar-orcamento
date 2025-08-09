// --- ARQUITETURA (PRIORIDADE 3) ---
// Estado centralizado para toda a aplicação.
const appState = {
  banco: {
    original: [], // Dados brutos parseados, nunca modificados após o parse.
    refinado: [], // Dados filtrados e possivelmente com data alterada, mostrados na tela.
  },
  orcamento: [],
  discrepancias: {
    banco: [],
    orcamento: [],
  },
  ui: {
    isLoading: false,
  },
};

// --- CONTROLE DE UI (PRIORIDADE 2) ---

/**
 * Controla a visibilidade do spinner e o estado dos botões.
 * @param {boolean} show - True para mostrar o spinner, false para esconder.
 */
function toggleSpinner(show) {
  const overlay = document.getElementById('spinner-overlay');
  const buttons = document.querySelectorAll('button');
  
  appState.ui.isLoading = show;
  overlay.classList.toggle('hidden', !show);
  buttons.forEach(button => button.disabled = show);
}

/**
 * Mostra uma tabela de preview para os dados do banco (formato com 3 colunas).
 * @param {Array} dados - Array de objetos {data, descricao, valor}.
 * @param {string} tableId - ID da tabela onde os dados serão exibidos.
 */
function mostrarTabelaBanco(dados, tableId) {
  const tbl = document.getElementById(tableId);
  tbl.innerHTML = '';
  if (!dados || !dados.length) return;
  
  const header = tbl.insertRow();
  header.innerHTML = '<th>Data</th><th>Descrição</th><th>Valor (R$)</th>';
  
  dados.forEach(l => {
    const row = tbl.insertRow();
    row.insertCell().innerText = l.data;
    row.insertCell().innerText = l.descricao;
    const cellValor = row.insertCell();
    cellValor.innerText = l.valor.toFixed(2);
    cellValor.style.color = l.valor < 0 ? 'red' : 'green';
  });
}

/**
 * Mostra uma tabela de preview para dados do orçamento e discrepâncias (formato com 2 colunas).
 * @param {Array} dados - Array de arrays [descricao, valor].
 * @param {string} tableId - ID da tabela.
 */
function mostrarTabelaSimples(dados, tableId) {
    const tbl = document.getElementById(tableId);
    tbl.innerHTML = '';
    if (!dados || !dados.length) return;

    const header = tbl.insertRow();
    header.innerHTML = '<th>Descrição</th><th>Valor (R$)</th>';

    dados.forEach(l => {
        const row = tbl.insertRow();
        row.insertCell().innerText = l[0]; // Descrição
        const cellValor = row.insertCell();
        cellValor.innerText = parseFloat(l[1]).toFixed(2);
        cellValor.style.color = l[1] < 0 ? 'red' : 'green';
    });
}


// --- PROCESSAMENTO DE DADOS (PRIORIDADE 1) ---

/**
 * Parser inteligente para o texto bruto da fatura do cartão.
 * @param {string} texto - O texto copiado do internet banking.
 * @returns {Array} - Array de objetos {data, descricao, valor}.
 */
function importarTextoBrutoInteligente(texto) {
    const linhas = texto.split(/\r?\n/).filter(l => l.trim().length > 0);
    // Regex melhorada para capturar data (dd/mm), descrição e valor.
    const regexLancamento = /^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)$/;
    const anoCorrente = new Date().getFullYear();
    let dados = [];

    for (const linha of linhas) {
        const match = linha.trim().match(regexLancamento);
        if (match) {
            const [, dataStr, descricao, valorStr] = match;

            const dataCompleta = `${dataStr}/${anoCorrente}`;
            // Remove pontos de milhar e substitui vírgula por ponto decimal.
            const valorNumerico = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));

            // Inteligência para identificar se é crédito ou débito.
            const isCredito = /ajuste cred|estorno|pagamento/i.test(descricao);
            const valorFinal = isCredito ? valorNumerico : -valorNumerico;

            dados.push({
                data: dataCompleta,
                descricao: descricao.trim(),
                valor: valorFinal
            });
        }
    }
    return dados;
}

/**
 * Lê arquivos CSV ou Excel.
 * NOTA: Esta função foi mantida por compatibilidade.
 */
function lerArquivo(file, callback) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
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

/**
 * Padroniza dados de arquivos para o formato [descricao, valor].
 * NOTA: Usado principalmente para o arquivo de orçamento.
 */
function padronizarDados(linhas) {
  // Pula o cabeçalho (slice(1)) e mapeia para o formato esperado.
  return linhas.slice(1).map(l => [
    (l[0] || '').trim(), // Descrição
    parseFloat(l[1]) || 0 // Valor
  ]).filter(l => l[0] && !isNaN(l[1]));
}

// --- LÓGICA DE CONCILIAÇÃO ---

function criarChaveExata(linha) {
    const desc = (linha.descricao || linha[0] || '').toUpperCase().replace(/\s+/g,' ').trim();
    const val = (Math.round((linha.valor || linha[1])*100)/100).toFixed(2);
    return `${desc}_${val}`;
}

function criarChaveParcial(linha) {
    const desc = (linha.descricao || linha[0] || '').toUpperCase().replace(/\s+/g,' ').trim();
    const val = (Math.round((linha.valor || linha[1])*100)/100).toFixed(2);
    return `${desc.substring(0,8)}_${val}`;
}

function comparar() {
    if (!appState.banco.refinado.length || !appState.orcamento.length) {
        alert("Importe e processe os dados do banco e do orçamento antes de comparar.");
        return;
    }
    toggleSpinner(true);
    try {
        const chBancoEx = new Set(appState.banco.refinado.map(criarChaveExata));
        const chOrcEx = new Set(appState.orcamento.map(criarChaveExata));

        const bancoRest = appState.banco.refinado.filter(l => !chOrcEx.has(criarChaveExata(l)));
        const orcRest = appState.orcamento.filter(l => !chBancoEx.has(criarChaveExata(l)));

        const chBancoPar = new Set(bancoRest.map(criarChaveParcial));
        const chOrcPar = new Set(orcRest.map(criarChaveParcial));

        // Guarda as discrepâncias no estado central
        appState.discrepancias.banco = bancoRest
            .filter(l => !chOrcPar.has(criarChaveParcial(l)))
            .map(l => [l.descricao, l.valor]);

        appState.discrepancias.orcamento = orcRest
            .filter(l => !chBancoPar.has(criarChaveParcial(l)))
            .map(l => [l[0], l[1]]);

        mostrarTabelaSimples(appState.discrepancias.banco, 'tabelaBanco');
        mostrarTabelaSimples(appState.discrepancias.orcamento, 'tabelaOrcamento');
    } catch (error) {
        console.error("Erro durante a comparação:", error);
        alert("Ocorreu um erro durante a comparação.");
    } finally {
        toggleSpinner(false);
    }
}

// --- FUNÇÕES DE EXPORTAÇÃO ---

function exportarXLSX() {
    if (!appState.banco.refinado.length) { 
        alert("Nada para exportar. Processe os dados primeiro."); 
        return; 
    }
    toggleSpinner(true);
    setTimeout(() => {
        try {
            const dadosParaPlanilha = appState.banco.refinado.map(linha => ({
                'Data Ocorrência': linha.data,
                'Descrição': linha.descricao,
                'Valor': linha.valor,
                'Categoria': 'Sem Categoria',
                'Conta': 'Não Informada'
            }));

            const ws = XLSX.utils.json_to_sheet(dadosParaPlanilha);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
            XLSX.writeFile(wb, 'importacao_pronta.xlsx');
        } catch(e) {
            alert("Erro ao exportar XLSX.");
            console.error(e);
        } finally {
            toggleSpinner(false);
        }
    }, 100); // Pequeno timeout para o spinner aparecer
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


// --- EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {

    // Processar Texto Bruto
    document.getElementById('btnProcessarTexto').addEventListener('click', () => {
        const texto = document.getElementById('textoBanco').value;
        if (!texto.trim()) {
            alert("Por favor, cole o extrato bruto antes de processar.");
            return;
        }
        toggleSpinner(true);
        setTimeout(() => { // Timeout para garantir que a UI atualize e mostre o spinner
            try {
                appState.banco.original = importarTextoBrutoInteligente(texto);
                appState.banco.refinado = [...appState.banco.original]; // Clona para manipulação
                
                mostrarTabelaBanco(appState.banco.refinado, 'previewBanco');
                
                // Exibe o painel de refinamento
                document.getElementById('painelRefinamento').classList.remove('hidden');
            } catch (error) {
                console.error("Erro ao processar texto:", error);
                alert("Ocorreu um erro ao processar o texto. Verifique o formato.");
            } finally {
                toggleSpinner(false);
            }
        }, 100);
    });

    // Refinar Dados
    document.getElementById('btnRefinarDados').addEventListener('click', () => {
        const filtroDataInicioStr = document.getElementById('filtroDataInicio').value;
        const novaDataLancamentoStr = document.getElementById('novaDataLancamento').value;

        if (!filtroDataInicioStr) {
            alert('Por favor, selecione a data de início para filtrar.');
            return;
        }
        
        toggleSpinner(true);
        setTimeout(() => {
            try {
                // Filtra os dados originais
                const filtroDate = new Date(filtroDataInicioStr + 'T00:00:00');
                let dadosFiltrados = appState.banco.original.filter(l => {
                    const [dia, mes, ano] = l.data.split('/');
                    const dataLancamento = new Date(`${ano}-${mes}-${dia}T00:00:00`);
                    return dataLancamento >= filtroDate;
                });

                // Se uma nova data foi fornecida, aplica a todos os itens filtrados
                if (novaDataLancamentoStr) {
                    const [ano, mes, dia] = novaDataLancamentoStr.split('-');
                    const novaDataFormatada = `${dia}/${mes}/${ano}`;
                    dadosFiltrados = dadosFiltrados.map(l => ({
                        ...l,
                        data: novaDataFormatada
                    }));
                }

                // Atualiza o estado e a tabela
                appState.banco.refinado = dadosFiltrados;
                mostrarTabelaBanco(appState.banco.refinado, 'previewBanco');
            } catch (error) {
                console.error("Erro ao refinar dados:", error);
                alert("Ocorreu um erro ao refinar os dados.");
            } finally {
                toggleSpinner(false);
            }
        }, 100);
    });
    
    // Importação de arquivo do Banco
    document.getElementById('fileBanco').addEventListener('change', e => {
      // NOTE: Este fluxo precisa ser melhorado para se alinhar com a nova estrutura de dados.
      // Por ora, ele ainda usa a lógica antiga.
      alert("Função de importação de arquivo do banco ainda usa a lógica antiga. Foco no processamento de texto bruto.");
    });
    
    // Importação de arquivo do Orçamento
    document.getElementById('fileOrcamento').addEventListener('change', e => {
        toggleSpinner(true);
        lerArquivo(e.target.files[0], linhas => {
            appState.orcamento = padronizarDados(linhas);
            mostrarTabelaSimples(appState.orcamento, 'previewOrcamento');
            toggleSpinner(false);
        });
    });

    // Botões de Ação
    document.getElementById('btnComparar').addEventListener('click', comparar);
    document.getElementById('btnExportarPlanilha').addEventListener('click', exportarXLSX);
    document.getElementById('btnExportarDiscrepBanco').addEventListener('click', () => exportarCSV(appState.discrepancias.banco, 'discrepancias_banco.csv'));
    document.getElementById('btnExportarDiscrepOrc').addEventListener('click', () => exportarCSV(appState.discrepancias.orcamento, 'discrepancias_orcamento.csv'));

    // Inicia com o spinner desligado
    toggleSpinner(false);
});