// js/paginador.js
document.addEventListener('DOMContentLoaded', () => {
    const paginador = {
        container: document.getElementById('paginador-flutuante'),
        btnBanco: document.getElementById('paginador-banco'),
        btnOrcamento: document.getElementById('paginador-orcamento'),
        btnResumo: document.getElementById('paginador-resumo'),
        panels: {
            banco: document.querySelector('.panel-title--banco')?.closest('.panel'),
            orcamento: document.querySelector('.panel-title--orcamento')?.closest('.panel'),
            resumo: document.getElementById('summaryPanel'),
        },
        
        init() {
            this.btnBanco.addEventListener('click', () => this.scrollToPanel('panel-banco'));
            this.btnOrcamento.addEventListener('click', () => this.scrollToPanel('panel-orcamento'));
            this.btnResumo.addEventListener('click', () => this.scrollToPanel('summaryPanel'));
            window.addEventListener('scroll', () => {
                this.checkVisibility();
                this.updateActiveState();
            });
            this.updateActiveState(); // Chama na inicialização
        },

        scrollToPanel(panelId) {
            let target;
            if (panelId === 'panel-banco') {
                target = document.querySelector('.panel-title--banco').closest('.panel');
            } else if (panelId === 'panel-orcamento') {
                target = document.querySelector('.panel-title--orcamento').closest('.panel');
            } else {
                target = document.getElementById(panelId);
            }
            
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        updateState(state) {
            // state é um objeto como {banco: true, orcamento: false, resumo: true}
            if (state.banco) this.btnBanco.classList.remove('hidden');
            if (state.orcamento) this.btnOrcamento.classList.remove('hidden');
            if (state.resumo) this.btnResumo.classList.remove('hidden');

            this.checkVisibility();
            this.updateActiveState();
        },
        
        checkVisibility() {
            const footer = document.querySelector('footer');
            if (!this.container || !footer) return;

            const shouldShow = this.btnBanco.offsetParent !== null || 
                               this.btnOrcamento.offsetParent !== null || 
                               this.btnResumo.offsetParent !== null;

            if (!shouldShow) {
                this.container.classList.add('hidden');
                return;
            }

            const footerTop = footer.getBoundingClientRect().top;
            if (footerTop < window.innerHeight) {
                this.container.classList.add('hidden'); // Esconde se o rodapé estiver visível
            } else {
                this.container.classList.remove('hidden'); // Mostra se não estiver
            }
        },
        
        updateActiveState() {
            const viewportCenter = window.innerHeight / 2;

            this.btnBanco.classList.remove('active');
            this.btnOrcamento.classList.remove('active');
            this.btnResumo.classList.remove('active');

            if (this.panels.resumo && !this.panels.resumo.classList.contains('hidden')) {
                const resumoRect = this.panels.resumo.getBoundingClientRect();
                if (resumoRect.top < viewportCenter && resumoRect.bottom > viewportCenter) {
                    this.btnResumo.classList.add('active');
                    return;
                }
            }
            if (this.panels.orcamento && !this.panels.orcamento.classList.contains('hidden')) {
                const orcamentoRect = this.panels.orcamento.getBoundingClientRect();
                if (orcamentoRect.top < viewportCenter && orcamentoRect.bottom > viewportCenter) {
                    this.btnOrcamento.classList.add('active');
                    return;
                }
            }
            if (this.panels.banco && !this.panels.banco.classList.contains('hidden')) {
                const bancoRect = this.panels.banco.getBoundingClientRect();
                if (bancoRect.top < viewportCenter && bancoRect.bottom > viewportCenter) {
                    this.btnBanco.classList.add('active');
                }
            }
        },

        reset() {
            this.btnBanco.classList.add('hidden');
            this.btnOrcamento.classList.add('hidden');
            this.btnResumo.classList.add('hidden');
            this.container.classList.add('hidden');
            this.updateActiveState();
        }
    };
    // Expor o objeto paginador globalmente para que script.js possa acessá-lo
    window.Paginador = paginador;
    window.Paginador.init();
});