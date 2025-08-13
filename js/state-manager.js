// js/state-manager.js

// --- ESTADO DA APLICAÇÃO ---
export const appState = {
  dadosBanco: [],
  dadosOrcamento: [],
  dadosBancoOriginais: [],
  discrepBanco: [],
  discrepOrc: [],
  possibleMatches: [],
};

// --- ESTADO DA INTERFACE ---
export let sortState = {};
export let filterState = {};

// --- GERENCIAMENTO DE REGRAS (ESTADO PERSISTENTE) ---
const RULE_STORAGE_KEY = 'conciliacaoRegrasObjeto';

export function getRulesObject() {
  return JSON.parse(localStorage.getItem(RULE_STORAGE_KEY)) || { timestamp: null, regras: [] };
}

export function saveRule(rule) {
  const rulesObj = getRulesObject();
  const ruleExists = rulesObj.regras.some(r => 
      r.type === rule.type && r.banco === rule.banco && r.orc === rule.orc
  );
  if (!ruleExists) {
    rulesObj.regras.push(rule);
    localStorage.setItem(RULE_STORAGE_KEY, JSON.stringify(rulesObj));
    return true; // Sucesso
  }
  return false; // Regra já existia
}

export function deleteRule(bancoDesc, orcDesc) {
  let rulesObj = getRulesObject();
  rulesObj.regras = rulesObj.regras.filter(r => r.banco !== bancoDesc || r.orc !== orcDesc);
  localStorage.setItem(RULE_STORAGE_KEY, JSON.stringify(rulesObj));
}

export function getFormattedTimestamp(date = new Date()) {
    const YYYY = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    return `${YYYY}${MM}${DD}`;
}

export function exportarRegras() {
    const rulesObj = getRulesObject();
    if (rulesObj.regras.length === 0) {
        return { success: false, message: "Nenhuma regra para exportar." };
    }
    
    const timestamp = getFormattedTimestamp();
    const nomeArquivo = `${timestamp}_regras_conciliacao.json`;
    const blob = new Blob([JSON.stringify(rulesObj, null, 2)], { type: 'application/json' });
    
    return { success: true, blob, nomeArquivo, message: `Arquivo ${nomeArquivo} pronto para exportar!` };
}

export function importarRegras(fileContent, fileName) {
    try {
        const rulesObj = JSON.parse(fileContent);
        if (typeof rulesObj !== 'object' || !('regras' in rulesObj) || !Array.isArray(rulesObj.regras)) {
            throw new Error("Formato de arquivo inválido. Objeto principal não encontrado.");
        }
        
        const match = fileName.match(/^(\d{8})/);
        if (match) {
            const [ , dataStr] = match;
            const YYYY = dataStr.substring(0, 4);
            const MM = dataStr.substring(4, 6);
            const DD = dataStr.substring(6, 8);
            rulesObj.timestamp = `${DD}/${MM}/${YYYY}`;
        } else {
            rulesObj.timestamp = 'Data desconhecida';
        }

        localStorage.setItem(RULE_STORAGE_KEY, JSON.stringify(rulesObj));
        return { success: true, count: rulesObj.regras.length, message: `${rulesObj.regras.length} regras importadas com sucesso!` };
    } catch (error) {
        return { success: false, message: "Erro ao importar regras: " + error.message };
    }
}

export function resetAppState() {
  Object.assign(appState, {
    dadosBanco: [], dadosOrcamento: [], dadosBancoOriginais: [],
    discrepBanco: [], discrepOrc: [], possibleMatches: []
  });
  sortState = {};
  filterState = {};
}