# Ferramenta de Análise de Lançamentos

## 📖 Contexto
Esta ferramenta foi desenvolvida para um fluxo de trabalho altamente personalizado, servindo como um poderoso assistente para a conciliação de um orçamento doméstico. A sua finalidade principal é resolver um desafio comum no controle financeiro manual: a divergência entre os gastos registrados e o que foi efetivamente cobrado no extrato bancário.

#### O Problema a Ser Resolvido
Manter um orçamento manual, mesmo com a ajuda de plataformas online, está sujeito a falhas humanas. É comum esquecer de registrar uma despesa, lançar um valor equivocado ou não dar baixa em um pagamento. Com o tempo, essas pequenas inconsistências se acumulam, gerando um desalinhamento entre o saldo previsto no orçamento e o saldo real da conta. A verificação manual, linha por linha, entre o orçamento e o extrato do banco é um processo demorado, repetitivo e cansativo.

#### O Fluxo de Trabalho Específico
Para resolver esse problema, a ferramenta automatiza a "confrontação" de dados de duas fontes distintas, que formam a base desta análise:

1.  **A Fonte da Verdade (O Extrato do Banco):** Os dados de referência são obtidos do extrato do cartão de crédito do **Internet Banking da Caixa Econômica Federal**. Como o site não oferece uma opção de exportação estruturada, o usuário copia o texto bruto diretamente da página do navegador. A ferramenta possui uma inteligência interna para processar esse texto caótico, descartando informações irrelevantes e extraindo apenas os dados essenciais de cada transação (Data, Descrição e Valor), organizando tudo em uma tabela limpa e pronta para análise.

2.  **O Registro Manual (O Orçamento):** O controle do orçamento é realizado através de lançamentos manuais no site **Minhas Economias** (`minhaseconomias.com.br`). Ao final de um período, o usuário exporta esses lançamentos em um arquivo de planilha (formato CSV, XLSX ou XLS), que é então importado pela ferramenta.

O objetivo desta nova versão é **eliminar a dependência de soluções externas como o Google Planilhas** e oferecer um processo mais rápido e poderoso, de forma **100% local no navegador**. Assim, não há envio de dados a nenhum servidor, garantindo a **privacidade total** das suas informações financeiras.

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
- **Fluxo de Trabalho Inteligente:** O botão principal "Comparar" só aparece no topo da tela quando os dados do Banco e do Orçamento são carregados, guiando o usuário para a próxima ação.
- **Feedback Visual:** Ícones de "✓" confirmam a conclusão de cada etapa de importação, e indicadores de ordenação (▲/▼) mostram como as tabelas estão classificadas.
- **Notificações Contextuais:** Mensagens informativas (toasts) confirmam ações importantes, mantendo o usuário sempre informado.
- **Navegação Rápida:** Um **Paginador Flutuante** permite saltar instantaneamente entre as seções principais da página.

### 🎯 Visualização Otimizada para Análise
- **Layout Alinhado:** As tabelas de "Dados do Banco" e "Dados do Orçamento" são renderizadas lado a lado e com alinhamento superior, facilitando a comparação visual linha a linha.
- **Modo Foco:** Com um único clique no botão `🎯 Modo Foco` (ou pressionando `Esc`), a interface esconde todos os elementos de controle e expande a área de visualização, permitindo uma análise profunda e sem distrações das tabelas de dados.

### 🧠 Motor de Conciliação Híbrido
- **Aplicação de Regras (Etapa 1):** A ferramenta aplica regras "Inteligentes" e "Exatas" salvas pelo usuário, automatizando as conciliações mais comuns.
- **Conciliação Exata (Etapa 2):** Identifica pares perfeitos de descrição e valor restantes.
- **Análise de Similaridade (Etapa 3):** Para os itens que sobraram, busca pares com o **mesmo valor** mas descrições diferentes, calculando um score de similaridade para apresentar como sugestão.
- **Painel de Decisão Interativo:** Apresenta as sugestões em um painel onde você pode confirmar, rejeitar ou arrastar e soltar (Drag & Drop) os itens para as caixas de resumo.

### ⚙️ Motor de Regras de Conciliação
- **Dois Tipos de Regras:** Ao confirmar uma sugestão, você pode salvá-la como uma **Regra Exata** (ex: "PAG*Uber" → "Uber") ou como uma **Regra Inteligente** (ex: "UBER" → "Uber"), que funciona para qualquer lançamento que comece com o texto definido.
- **Aprendizado Contínuo:** Uma vez salva, a regra é aplicada automaticamente em todas as análises futuras.
- **Gerenciamento e Persistência Local:** Suas regras são salvas no navegador e podem ser exportadas para um arquivo `json` seguro, permitindo backup e restauração.

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
O projeto evoluiu para uma estrutura modular, separando responsabilidades para facilitar a manutenção e escalabilidade. O código-fonte está dividido em:
- `script.js`: O orquestrador principal da interface e do fluxo da aplicação.
- `motor-regras.js`: Um módulo dedicado que encapsula toda a lógica de criação, gerenciamento e aplicação de regras de conciliação.
- `paginador.js`: Um componente de UI independente para a navegação rápida.
- `index.html`, `style.css`: A estrutura e a estilização da aplicação.
