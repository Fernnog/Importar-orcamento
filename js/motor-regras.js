// js/motor-regras.js

// --- MOTOR DE REGRAS DE CONCILIAÇÃO ---

export function aplicarRegrasDeConciliacao(bancoItens, orcamentoItens, regras) {
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
