// js/motor-regras.js

// --- MOTOR DE REGRAS DE CONCILIAÇÃO (MÓDULO ISOLADO) ---

const RULE_STORAGE_KEY = 'conciliacaoRegrasObjeto';
const EXCLUSION_RULE_STORAGE_KEY = 'conciliacaoRegrasExclusao';

// Novas funções para gerenciar regras de exclusão
function getExclusionRules() {
  return JSON.parse(localStorage.getItem(EXCLUSION_RULE_STORAGE_KEY)) || [];
}

function saveExclusionRule(description) {
  const rules = getExclusionRules();
  if (!rules.includes(description)) {
    rules.push(description);
    localStorage.setItem(EXCLUSION_RULE_STORAGE_KEY, JSON.stringify(rules));
    return true; // Indica sucesso
  }
  return false; // Indica que já existia
}

function deleteExclusionRule(description) {
  let rules = getExclusionRules();
  rules = rules.filter(rule => rule !== description);
  localStorage.setItem(EXCLUSION_RULE_STORAGE_KEY, JSON.stringify(rules));
  showToast(`Regra de exclusão para "${description}" removida.`, 'info');
}

function getRulesObject() {
  return JSON.parse(localStorage.getItem(RULE_STORAGE_KEY)) || { timestamp: null, regras: [] };
}

function saveRule(rule) {
  const rulesObj = getRulesObject();
  const ruleExists = rulesObj.regras.some(r => 
      r.type === rule.type && r.banco === rule.banco && r.orc === rule.orc
  );
  if (!ruleExists) {
    rulesObj.regras.push(rule);
    localStorage.setItem(RULE_STORAGE_KEY, JSON.stringify(rulesObj));
    showToast('Regra salva com sucesso!', 'success');
  } else {
    showToast('Esta regra já existe.', 'info');
  }
}

function deleteRule(bancoDesc, orcDesc) {
  let rulesObj = getRulesObject();
  rulesObj.regras = rulesObj.regras.filter(r => r.banco !== bancoDesc || r.orc !== orcDesc);
  localStorage.setItem(RULE_STORAGE_KEY, JSON.stringify(rulesObj));
}

function getFormattedTimestamp(date = new Date()) {
    const YYYY = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const DD = String(date.getDate()).padStart(2, '0');
    return `${YYYY}${MM}${DD}`;
}

function exportarRegras() {
    const rulesObj = getRulesObject();
    if (rulesObj.regras.length === 0) {
        showToast("Nenhuma regra para exportar.", "info");
        return;
    }
    
    const timestamp = getFormattedTimestamp();
    const nomeArquivo = `${timestamp}_regras_conciliacao.json`;
    const blob = new Blob([JSON.stringify(rulesObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Arquivo ${nomeArquivo} exportado!`, "success");
}

function importarRegras(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const rulesObj = JSON.parse(e.target.result);
            if (typeof rulesObj !== 'object' || !('regras' in rulesObj) || !Array.isArray(rulesObj.regras)) {
                throw new Error("Formato de arquivo inválido. Objeto principal não encontrado.");
            }
            
            const match = file.name.match(/^(\d{8})/);
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
            showToast(`${rulesObj.regras.length} regras importadas com sucesso!`, "success");
            
            if (!DOM.regrasModal.classList.contains('hidden')) {
                DOM.btnGerenciarRegras.click(); 
                DOM.btnGerenciarRegras.click();
            }
        } catch (error) {
            showToast("Erro ao importar regras: " + error.message, "error");
        }
    };
    reader.readAsText(file);
}

function extractPattern(text) {
    return text.replace(/(\s*\(?\d+\s*\/?\s*\d+\)?\s*)$/, '').trim();
}


function aplicarRegrasDeConciliacao(bancoItens, orcamentoItens, regras) {
    const bancoConciliados = new Set();
    const orcamentoConciliados = new Set();
    const _normalizeText = (s = '') => String(s).toUpperCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    // PASSO 1: Aplicar regras de PADRÃO (Inteligentes / 'smart') - Alta Prioridade
    const smartRules = regras.filter(r => r.type === 'smart');
    if (smartRules.length > 0) {
        // Criar um mapa de lookup otimizado para os itens do orçamento
        const orcMapByPattern = new Map();
        orcamentoItens.forEach(o => {
            if (orcamentoConciliados.has(o)) return;
            const descNormalizada = _normalizeText(o.descricao);
            smartRules.forEach(rule => {
                const orcPatternNormalizado = _normalizeText(rule.orc);
                if (descNormalizada.startsWith(orcPatternNormalizado)) {
                    if (!orcMapByPattern.has(rule.orc)) orcMapByPattern.set(rule.orc, []);
                    orcMapByPattern.get(rule.orc).push(o);
                }
            });
        });

        smartRules.forEach(rule => {
            bancoItens.forEach(bancoItem => {
                if (bancoConciliados.has(bancoItem)) return;

                if (_normalizeText(bancoItem.descricao).startsWith(_normalizeText(rule.banco))) {
                    const orcCandidates = orcMapByPattern.get(rule.orc) || [];
                    if (orcCandidates.length > 0) {
                        const valorBanco = Math.round(bancoItem.valor * 100);
                        const orcItemIndex = orcCandidates.findIndex(o => 
                            !orcamentoConciliados.has(o) && Math.round(o.valor * 100) === valorBanco
                        );
                        
                        if (orcItemIndex > -1) {
                            const orcItem = orcCandidates[orcItemIndex];
                            bancoConciliados.add(bancoItem);
                            orcamentoConciliados.add(orcItem);
                            // Remove o candidato para não ser usado novamente na mesma regra
                            orcCandidates.splice(orcItemIndex, 1);
                        }
                    }
                }
            });
        });
    }

    // PASSO 2: Aplicar regras EXATAS nas sobras
    const exactRules = regras.filter(r => r.type === 'exact' || typeof r.type === 'undefined'); // Pega exatas e as antigas sem tipo
    if (exactRules.length > 0) {
        const orcMapExact = new Map();
        orcamentoItens.forEach(o => {
            if (orcamentoConciliados.has(o)) return;
            if (!orcMapExact.has(o.descricao)) orcMapExact.set(o.descricao, []);
            orcMapExact.get(o.descricao).push(o);
        });
        
        exactRules.forEach(rule => {
            bancoItens.forEach(bancoItem => {
                if (bancoConciliados.has(bancoItem) || bancoItem.descricao !== rule.banco) return;
                
                const orcCandidates = orcMapExact.get(rule.orc);
                if (orcCandidates && orcCandidates.length > 0) {
                    const valorBanco = Math.round(bancoItem.valor * 100);
                    const orcItemIndex = orcCandidates.findIndex(o => Math.round(o.valor * 100) === valorBanco);
                    
                    if (orcItemIndex > -1) {
                        const orcItem = orcCandidates.splice(orcItemIndex, 1)[0];
                        bancoConciliados.add(bancoItem);
                        orcamentoConciliados.add(orcItem);
                    }
                }
            });
        });
    }

    return { bancoConciliados, orcamentoConciliados };
}
