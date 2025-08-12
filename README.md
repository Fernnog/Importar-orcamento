# Ferramenta de Análise de Lançamentos

## 📖 Contexto
Esta ferramenta foi criada para substituir uma automação antiga que rodava no **Google Planilhas**. Naquela solução original, um extrato bruto do **internet banking** era colado na planilha, onde um script organizava e conciliava os dados com uma aba de orçamento.

O objetivo desta nova versão é **eliminar a dependência do Google Planilhas** e oferecer um processo mais rápido e poderoso, de forma **100% local no navegador**. Assim, não há envio de dados a nenhum servidor, garantindo a **privacidade total** das suas informações financeiras.

---

## 📌 Sobre o Projeto
A ferramenta realiza uma análise inteligente entre os dados do **Banco** e os dados do **Orçamento**, transformando um extrato caótico em uma análise clara e organizada.

Com uma interface reativa, ela guia o usuário passo a passo: ao carregar os dados necessários, a ferramenta revela as ações seguintes, simplificando o fluxo de trabalho. No final, ela identifica:
- ✅ **Conciliações por Regra:** Itens que você já ensinou a ferramenta a associar.
- ✅ **Conciliações Exatas:** Itens que batem perfeitamente em descrição e valor.
- 💡 **Sugestões de Conciliação:** Itens com mesmo valor, mas descrições diferentes.
- ⚠️ **Discrepâncias:** Itens que só existem no banco ou no orçamento.

---

## 🛠 Funcionalidades

### ✨ Interface Guiada e Reativa
- **Fluxo de Trabalho Inteligente:** O botão principal "Comparar" só aparece no topo da tela quando os dados do Banco e do Orçamento são carregados, guiando o usuário para a próxima ação de forma natural.
- **Feedback Visual Imediato:** Ícones de "✓" surgem nos painéis de importação para confirmar que cada etapa foi concluída com sucesso.
- **Notificações Contextuais:** Mensagens informativas (toasts) aparecem para confirmar ações importantes, como o carregamento de dados e a disponibilidade para comparação.
- **Paginador Flutuante:** Um menu de navegação rápido aparece após a importação, permitindo saltar facilmente entre as seções da página.

### 🧠 Motor de Conciliação Híbrido
- **Aplicação de Regras (Etapa 1):** Antes de tudo, a ferramenta aplica as regras "Inteligentes" e "Exatas" que você já salvou, automatizando as conciliações mais comuns.
- **Conciliação Exata (Etapa 2):** Identifica pares perfeitos de descrição e valor restantes.
- **Análise de Similaridade (Etapa 3):** Para os itens que sobraram, busca pares com o **mesmo valor** mas descrições diferentes, calculando um score de similaridade para apresentar como sugestão.
- **Painel de Decisão Interativo:** Apresenta as sugestões em um painel onde você pode confirmar, rejeitar ou arrastar e soltar (Drag & Drop) os itens para as caixas de resumo.

### ⚙️ Motor de Regras de Conciliação
- **Dois Tipos de Regras:** Ao confirmar uma sugestão, você pode salvá-la como uma **Regra Exata** (ex: "PAG*Uber" → "Uber") ou como uma **Regra Inteligente** (ex: "UBER" → "Uber"), que funciona para qualquer lançamento que comece com o texto definido.
- **Aprendizado Contínuo:** Uma vez salva, a regra é aplicada automaticamente em todas as análises futuras, economizando seu tempo.
- **Gerenciamento e Persistência Local:** Suas regras são salvas no navegador e podem ser exportadas para um arquivo `json` seguro, permitindo backup, versionamento e restauração em qualquer máquina.

### 📥 Importação e Exportação Flexível
- **Importação de Dados:**
  - **Banco:** Via colando **texto bruto** do internet banking.
  - **Orçamento:** Via **Arquivo (CSV/XLSX/XLS)** de sistemas como Organizze, Mobills, etc.
- **Exportação de Resultados:**
  - **Discrepâncias:** Exporte as tabelas de itens não conciliados em formato **CSV**.
  - **Dados Processados:** Exporte a tabela de dados do banco já refinada em formato **XLSX**.

### 🔒 100% Offline e Privado
- Todo o processamento, incluindo o salvamento de regras, acontece no seu navegador. **Nenhum dado financeiro é enviado para servidores externos**.

---

## 📂 Estrutura do Projeto
O projeto evoluiu para uma estrutura modular, separando responsabilidades para facilitar a manutenção e escalabilidade.
