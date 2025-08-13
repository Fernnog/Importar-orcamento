// js/paginador.js

const paginador = {
    container: null,
    btnBanco: null,
    btnOrcamento: null,
    btnResumo: null,
    
    panels: {
        banco: null,
        orcamento: null,
        resumo: null,
    },

    init() {
        this.container = document.getElementById('paginador-flutuante');
        this.btnBanco = document.getElementById('paginador-banco');
        this.btnOrcamento = document.getElementById('paginador-orcamento');
        this.btnResumo = document.getElementById('paginador-resumo');
        
        this.panels.banco = document.querySelector('.panel-title--banco')?.closest('.panel');
        this.panels.orcamento = document.querySelector('.panel-title--orcamento')?.closest('.panel');
        this.panels.resumo = document.getElementById('summaryPanel');

        this.btnBanco.addEventListener('click', () => this.scrollToPanel(this.panels.banco));
        this.btnOrcamento.addEventListener('click', () => this.scrollToPanel(this.panels.orcamento));
        this.btnResumo.addEventListener('click', () => this.scrollToPanel(this.panels.resumo));
        
        window.addEventListener('scroll', () => {
            this.checkContainerVisibility();
            this.updateActiveState();
        });
        
        this.checkContainerVisibility();
        this.updateActiveState();
    },

    scrollToPanel(target) {
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    updateState(state) {
        if (state.banco) this.btnBanco.classList.remove('hidden');
        if (state.orcamento) this.btnOrcamento.classList.remove('hidden');
        if (state.resumo) this.btnResumo.classList.remove('hidden');
        this.checkContainerVisibility();
    },
    
    checkContainerVisibility() {
        const footer = document.querySelector('footer');
        if (!this.container || !footer) return;

        const hasVisibleButton = !this.btnBanco.classList.contains('hidden') || 
                                 !this.btnOrcamento.classList.contains('hidden') || 
                                 !this.btnResumo.classList.contains('hidden');

        if (!hasVisibleButton) {
            this.container.classList.add('hidden');
            return;
        }

        const footerTop = footer.getBoundingClientRect().top;
        if (footerTop < window.innerHeight) {
            this.container.classList.add('hidden');
        } else {
            this.container.classList.remove('hidden');
        }
    },
    
    updateActiveState() {
        const viewportCenter = window.innerHeight / 2;
        const buttons = [this.btnBanco, this.btnOrcamento, this.btnResumo];
        buttons.forEach(btn => btn.classList.remove('active'));

        const checkAndActivate = (panel, button) => {
            if (panel && !panel.classList.contains('hidden')) {
                const rect = panel.getBoundingClientRect();
                if (rect.top < viewportCenter && rect.bottom > viewportCenter) {
                    button.classList.add('active');
                    return true;
                }
            }
            return false;
        };

        if (checkAndActivate(this.panels.resumo, this.btnResumo)) return;
        if (checkAndActivate(this.panels.orcamento, this.btnOrcamento)) return;
        checkAndActivate(this.panels.banco, this.btnBanco);
    },

    reset() {
        if (!this.container) return; // Guard clause if not initialized
        this.btnBanco.classList.add('hidden');
        this.btnOrcamento.classList.add('hidden');
        this.btnResumo.classList.add('hidden');
        this.container.classList.add('hidden');
    }
};

export default paginador;
