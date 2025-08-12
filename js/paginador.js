// js/paginador.js
document.addEventListener('DOMContentLoaded', () => {
    const paginador = {
        container: document.getElementById('paginador-flutuante'),
        btnBanco: document.getElementById('paginador-banco'),
        btnOrcamento: document.getElementById('paginador-orcamento'),
        btnResumo: document.getElementById('paginador-resumo'),
        
        // Cache dos painéis para performance
        panels: {
            banco: document.querySelector('.panel-title--banco')?.closest('.panel'),
            orcamento: document.querySelector('.panel-title--orcamento')?.closest('.panel'),
            resumo: document.getElementById('summaryPanel'),
        },

        init() {
            this.btnBanco.addEventListener('click', () => this.scrollToPanel(this.panels.banco));
            this.btnOrcamento.addEventListener('click', () => this.scrollToPanel(this.panels.orcamento));
            this.btnResumo.addEventListener('click', () => this.scrollToPanel(this.panels.resumo));
            
            window.addEventListener('scroll', () => {
                this.checkContainerVisibility();
                this.updateActiveState();
            });
            
            // Verifica o estado inicial
            this.checkContainerVisibility();
            this.updateActiveState();
        },

        scrollToPanel(target) {
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        updateState(state) {
            // state é um objeto como {banco: true, orcamento: false, resumo: true}
            // Esta função agora APENAS controla a visibilidade dos BOTÕES
            if (state.banco) this.btnBanco.classList.remove('hidden');
            if (state.orcamento) this.btnOrcamento.classList.remove('hidden');
            if (state.resumo) this.btnResumo.classList.remove('hidden');

            // Após mudar o estado de um botão, verifica se o container deve aparecer
            this.checkContainerVisibility();
        },
        
        checkContainerVisibility() {
            const footer = document.querySelector('footer');
            if (!this.container || !footer) return;

            // O paginador deve ser mostrado se QUALQUER um dos seus botões estiver visível
            const hasVisibleButton = !this.btnBanco.classList.contains('hidden') || 
                                     !this.btnOrcamento.classList.contains('hidden') || 
                                     !this.btnResumo.classList.contains('hidden');

            if (!hasVisibleButton) {
                this.container.classList.add('hidden');
                return;
            }

            // Esconde se o rodapé estiver visível, senão mostra
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
            this.btnBanco.classList.add('hidden');
            this.btnOrcamento.classList.add('hidden');
            this.btnResumo.classList.add('hidden');
            this.container.classList.add('hidden');
        }
    };
    
    window.Paginador = paginador;
    window.Paginador.init();
});
