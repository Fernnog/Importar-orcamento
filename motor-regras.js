// --- MOTOR DE REGRAS DE CONCILIAÇÃO ---

function aplicarRegrasDeConciliacao(bancoItens, orcamentoItens, regras) {
    const bancoConciliados = new Set();
    const orcamentoConciliados = new Set();
    const _normalizeText = (s = '') => String(s).toUpperCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    // PASSO 1: Aplicar regras de PADRÃO (Inteligentes) - Alta Prioridade
    const patternRules = regras.filter(r => r.type === 'pattern');
    if (patternRules.length > 0) {
        const orcMap = new Map();
        orcamentoItens.forEach(o => {
            if (!orcMap.has(o.descricao)) orcMap.set(o.descricao, []);
            orcMap.get(o.descricao).push(o);
        });

        patternRules.forEach(rule => {
            bancoItens.forEach(bancoItem => {
                if (bancoConciliados.has(bancoItem)) return; // Pular já conciliados

                if (_normalizeText(bancoItem.descricao).startsWith(_normalizeText(rule.banco))) {
                    const orcCandidates = orcMap.get(rule.orc);
                    if (orcCandidates && orcCandidates.length > 0) {
                        const valorBanco = Math.round(bancoItem.valor * 100);
                        const orcItemIndex = orcCandidates.findIndex(o => 
                            !orcamentoConciliados.has(o) && Math.round(o.valor * 100) === valorBanco
                        );
                        
                        if (orcItemIndex > -1) {
                            const orcItem = orcCandidates[orcItemIndex];
                            bancoConciliados.add(bancoItem);
                            orcamentoConciliados.add(orcItem);
                        }
                    }
                }
            });
        });
    }

    // PASSO 2: Aplicar regras EXATAS nas sobras
    const exactRules = regras.filter(r => r.type !== 'pattern'); // Pega exatas e as antigas sem tipo
    if (exactRules.length > 0) {
        const regrasMap = new Map(exactRules.map(r => [r.banco, r.orc]));
        const orcMapExact = new Map();
        orcamentoItens.forEach(o => {
            if (orcamentoConciliados.has(o)) return;
            if (!orcMapExact.has(o.descricao)) orcMapExact.set(o.descricao, []);
            orcMapExact.get(o.descricao).push(o);
        });
        
        bancoItens.forEach(bancoItem => {
            if (bancoConciliados.has(bancoItem)) return;
            const orcDescRegra = regrasMap.get(bancoItem.descricao);
            if (orcDescRegra && orcMapExact.has(orcDescRegra)) {
                const orcCandidates = orcMapExact.get(orcDescRegra);
                const valorBanco = Math.round(bancoItem.valor * 100);
                // Find and remove the candidate to avoid re-matching
                const orcItemIndex = orcCandidates.findIndex(o => Math.round(o.valor * 100) === valorBanco);
                
                if (orcItemIndex > -1) {
                    const orcItem = orcCandidates.splice(orcItemIndex, 1)[0];
                    bancoConciliados.add(bancoItem);
                    orcamentoConciliados.add(orcItem);
                }
            }
        });
    }

    return { bancoConciliados, orcamentoConciliados };
}