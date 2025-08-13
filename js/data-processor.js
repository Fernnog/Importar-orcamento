// js/data-processor.js
import { appState, getRulesObject } from './state-manager.js';
// LINHA ADICIONADA: Importa a função do motor de regras.
import { aplicarRegrasDeConciliacao } from './motor-regras.js';

// --- FUNÇÕES DE NORMALIZAÇÃO E CÁLCULO ---
export const normalizeText = (s = '') => String(s).toUpperCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
export const criarChaveItem = item => `${normalizeText(item.descricao)}_${(Math.round(item.valor*100)/100).toFixed(2)}`;
export const criarChaveParcialItem = item => `${normalizeText(item.descricao).substring(0,8)}_${(Math.round(item.valor*100)/100).toFixed(2)}`;

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

// --- FUNÇÕES DE PROCESSAMENTO DE ENTRADAS ---
export function importarTextoBrutoInteligente(texto) {
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
      if (dataLancamentoTemp > hoje) { anoLancamento = anoCorrente - 1; }
      const dataCompleta = `${dataStr}/${anoLancamento}`;
      const valorNumerico = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
      const isCredito = /ajuste cred|pagamento em|crédito/i.test(descricao);
      dados.push({ data: dataCompleta, descricao: descricao.trim(), valor: isCredito ? valorNumerico : -valorNumerico });
    }
  });
  if (dados.length === 0) {
    const regexData = /^\d{2}\/\d{2}$/;
    const regexValor = /^[\d.,]+$/;
    for (let i = 0; i < linhas.length; i++) {
      if (regexData.test(linhas[i]) && (i + 2 < linhas.length) && regexValor.test(linhas[i + 2])) {
        const [dia, mes] = linhas[i].split('/');
        let anoLancamento = anoCorrente;
        const dataLancamentoTemp = new Date(anoCorrente, mes - 1, dia);
        if (dataLancamentoTemp > hoje) { anoLancamento = anoCorrente - 1; }
        const dataCompleta = `${linhas[i]}/${anoLancamento}`;
        const valorNumerico = parseFloat(linhas[i + 2].replace(/\./g, '').replace(',', '.'));
        const isCredito = /pagamento em|crédito/i.test(linhas[i + 1]);
        dados.push({ data: dataCompleta, descricao: linhas[i + 1].trim(), valor: isCredito ? valorNumerico : -valorNumerico });
        i += 2;
      }
    }
  }
  const keyExtractor = item => `${normalizeText(item.descricao)}_${item.valor.toFixed(2)}`;
  return calculateRepetitions(dados, keyExtractor);
}

export function processarDadosOrcamento(linhas) {
  if (!linhas || linhas.length < 2) return { success: false, data: [], message: 'Arquivo de orçamento vazio.' };
  const cabecalho = linhas[0].map(h => String(h).toLowerCase().trim());
  const idxDescricao = cabecalho.indexOf('descrição');
  const idxValor = cabecalho.indexOf('valor');
  if (idxDescricao === -1 || idxValor === -1) return { success: false, data: [], message: "Arquivo deve ter colunas 'Descrição' e 'Valor'." };
  const dadosProcessados = linhas.slice(1).map(linha => {
    const descricao = linha[idxDescricao] ? String(linha[idxDescricao]).trim() : '';
    const valor = parseFloat(String(linha[idxValor] || '0').replace(',', '.'));
    return (descricao && !isNaN(valor)) ? { descricao, valor } : null;
  }).filter(Boolean);
  const keyExtractor = item => `${normalizeText(item.descricao)}_${item.valor.toFixed(2)}`;
  return { success: true, data: calculateRepetitions(dadosProcessados, keyExtractor) };
}

export const extractPattern = (text) => text.replace(/(\s*\(?\d+\s*\/?\s*\d+\)?\s*)$/, '').trim();

// --- LÓGICA DE CONCILIAÇÃO PRINCIPAL ---
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

export function comparar() {
  let logEntries = [];
  const { regras } = getRulesObject();
  // LINHA CORRIGIDA: Havia um erro de digitação (um 'a' a mais).
  const { bancoConciliados, orcamentoConciliados } = aplicarRegrasDeConciliacao(appState.dadosBanco, appState.dadosOrcamento, regras);
  if (bancoConciliados.size > 0) {
    logEntries.push(`✅ ${bancoConciliados.size} itens conciliados por regras automáticas.`);
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
      if(chavesBancoConciliadasExatas.has(chave)){ chavesBancoConciliadasExatas.delete(chave); return true; }
      return false;
  }));
  bancoConciliadosExatos.forEach(item => bancoConciliados.add(item));
  orcamentoConciliadosExatos.forEach(item => orcamentoConciliados.add(item));
  bancoRestante = appState.dadosBanco.filter(item => !bancoConciliados.has(item));
  orcRestante = appState.dadosOrcamento.filter(item => !orcamentoConciliados.has(item));

  if (!appState.possibleMatches.length) {
      appState.possibleMatches = encontrarPossiveisMatches(bancoRestante, orcRestante);
  }

  if (appState.possibleMatches.length === 0) {
      const chavesOrcamentoParciais = new Set(orcRestante.map(criarChaveParcialItem));
      const chavesBancoParciais = new Set(bancoRestante.map(criarChaveParcialItem));
      appState.discrepBanco = bancoRestante.filter(item => !chavesOrcamentoParciais.has(criarChaveParcialItem(item)));
      appState.discrepOrc = orcRestante.filter(item => !chavesBancoParciais.has(criarChaveParcialItem(item)));
  }

  return { logEntries };
}
