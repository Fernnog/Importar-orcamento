// js/paginador.js
document.addEventListener('DOMContentLoaded', () => {
    const paginador = {
        container: document.getElementById('paginador-flutuante'),
        btnBanco: document.getElementById('paginador-banco'),
        btnOrcamento: document.getElementById('paginador-orcamento'),
        btnResumo: document.getElementById('paginador-resumo'),
        
        init() {
            this.btnBanco.addEventListener('click', () => this.scrollToPanel('panel-banco'));
            this.btnOrcamento.addEventListener('click', () => this.scrollToPanel('panel-orcamento'));
            this.btnResumo.addEventListener('click', () => this.scrollToPanel('summaryPanel'));
            window.addEventListener('scroll', () => this.checkVisibility());
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

        reset() {
            this.btnBanco.classList.add('hidden');
            this.btnOrcamento.classList.add('hidden');
            this.btnResumo.classList.add('hidden');
            this.container.classList.add('hidden');
        }
    };
    // Expor o objeto paginador globalmente para que script.js possa acessá-lo
    window.Paginador = paginador;
    window.Paginador.init();
});