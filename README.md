# Ferramenta de Análise de Lançamentos

## 📖 Contexto
Esta ferramenta foi criada para substituir uma automação antiga que rodava no **Google Planilhas**. Naquela solução original, um extrato bruto do **internet banking** era colado na planilha, onde um script organizava e conciliava os dados com uma aba de orçamento.

O objetivo desta nova versão é **eliminar a dependência do Google Planilhas** e oferecer um processo mais rápido e poderoso, de forma **100% local no navegador**. Assim, não há envio de dados a nenhum servidor, garantindo a **privacidade total** das suas informações financeiras.

---

## 📌 Sobre o Projeto
A ferramenta realiza uma análise inteligente entre os dados do **Banco** e os dados do **Orçamento**. Ela recebe arquivos ou texto bruto, processa e organiza os dados e realiza uma comparação para identificar e categorizar todos os lançamentos, transformando um extrato caótico em uma análise clara.

Ela identifica:
- ✅ **Conciliações por Regra:** Itens que você já ensinou a ferramenta a associar.
- ✅ **Conciliações Exatas:** Itens que batem perfeitamente em descrição e valor.
- 💡 **Sugestões de Conciliação:** Itens com mesmo valor, mas descrições diferentes.
- ⚠️ **Discrepâncias:** Itens que só existem no banco ou no orçamento.

---

## 🛠 Funcionalidades
- **Importação Flexível de Dados:**
  - **Dados do Banco:** Via **Arquivo (CSV/XLSX/XLS)** ou colando **texto bruto** do internet banking.
  - **Dados do Orçamento:** Via **Arquivo (CSV/XLSX/XLS)** de sistemas como Organizze, Mobills, etc.

- **Motor de Análise e Conciliação em Múltiplas Etapas:**
  1.  **Aplicação de Regras Automáticas:** Antes de tudo, a ferramenta aplica as regras que você já salvou, automatizando as conciliações mais comuns.
  2.  **Conciliação Exata:** Identifica pares perfeitos de descrição e valor restantes.
  3.  **Análise de Similaridade:** Para os itens que sobraram, busca pares com o **mesmo valor** mas descrições diferentes, calculando um score de similaridade.
  4.  **Painel de Decisão Inteligente:** Apresenta as sugestões em um painel interativo para sua aprovação final.

- **Motor de Regras de Conciliação (O Coração da Ferramenta):**
  - Ao confirmar uma sugestão, você pode clicar em **✓+** para **salvar como regra**.
  - A partir desse momento, a ferramenta **aprenderá** essa associação (ex: "PAG*Uber" → "Uber") e a aplicará automaticamente em todas as análises futuras, economizando seu tempo.

- **Gerenciamento e Persistência de Regras (Seu Cofre Local):**
  - **Exportação/Importação:** Suas regras salvas podem ser exportadas para um arquivo `json` seguro em seu computador a qualquer momento.
  - **Versionamento:** O arquivo exportado é nomeado com a data (ex: `20231027_regras_conciliacao.json`), permitindo um controle de versão claro.
  - **Restauração Fácil:** Importe seu arquivo de regras em qualquer navegador ou após limpar o cache para restaurar instantaneamente todo o seu conhecimento salvo.

- **Feedback Visual e Analítico:**
  - **Contador de Repetições:** Identifica automaticamente itens com mesma descrição e valor e exibe um contador (ex: `2x`, `3x`), ajudando a visualizar despesas recorrentes.
  - **Tags Coloridas:** Painéis e contadores usam cores para diferenciar claramente a origem dos dados (Banco vs. Orçamento).

- **Controle Total sobre os Dados:**
  - Nas tabelas finais de discrepâncias, uma **caixa de seleção** permite remover permanentemente qualquer lançamento indesejado de toda a análise.

- **Exportação de Resultados:**
  - Exporte as tabelas de discrepâncias (Banco e Orçamento) em formato **CSV**.
  - Exporte a tabela de dados do banco já processada e refinada em formato **XLSX**.

- **100% Offline e Privado:**
  - Todo o processamento, incluindo o salvamento de regras, acontece no seu navegador. **Nenhum dado financeiro é enviado para servidores**.

---

## 📂 Estrutura do Projeto
O projeto é composto pelos seguintes arquivos principais:
.
├── imagens/
│ ├── favicon.ico
│ └── logo.png
├── index.html # A estrutura da página (o que você vê)
├── script.js # O cérebro da aplicação (toda a lógica)
├── style.css # A aparência e o design da página
└── README.md # Este arquivo de documentação

## 🚀 Como Usar
1.  Abra o arquivo `index.html` em seu navegador.
2.  Importe os dados do **Banco** e do **Orçamento** usando os respectivos painéis.
3.  Clique no botão central **"Comparar"**. A ferramenta aplicará automaticamente as regras que você já salvou.
4.  **Revise as Sugestões:** No painel "Possíveis Coincidências", analise cada par sugerido:
    - Clique em **✓** para confirmar a conciliação apenas desta vez.
    - Clique em **✓+** para confirmar a conciliação E **salvar como uma regra** para o futuro.
    - Clique em **✕** para ignorar a sugestão (ela será tratada como discrepância).
5.  **Revise as Discrepâncias:** As seções de discrepâncias serão preenchidas com os itens que realmente não foram conciliados.
    - Se encontrar um item incorreto, marque a **caixa de seleção** na última coluna para removê-lo de toda a análise.
6.  **Gerencie suas Regras:**
    - Clique em **"⚙️ Gerenciar Regras"** no topo da página.
    - No painel que abrir, você pode ver a data da versão das regras ativas, excluir regras individuais e, o mais importante:
    - Clique em **"Exportar Regras"** para salvar um arquivo de backup `json` em seu computador. Guarde-o em um local seguro.
    - Use **"Importar Regras"** para restaurar seu backup a qualquer momento.
7.  Use os botões **"Exportar CSV"** ou **"Exportar XLSX"** para salvar os resultados desejados.

---

## 📄 Formato esperado
- **Arquivo de Orçamento (CSV/XLSX):**
  - Deve conter uma linha de cabeçalho com, no mínimo, as colunas **"Descrição"** e **"Valor"**.

- **Texto Bruto (Fatura de Cartão):**
  - O parser é otimizado para o formato onde os dados aparecem em 3 linhas sequenciais:
    ```
    DD/MM
    Descrição do Lançamento
    Valor (ex: 1.234,56)
    ```

---

## 🔒 Privacidade
- Nenhum dado é enviado a servidores. Todo o processamento acontece localmente no seu navegador.
- O sistema de regras foi desenhado com a **privacidade como prioridade**. A escolha de um sistema de importação/exportação de arquivos `json` controlados pelo usuário, em vez de uma solução na nuvem, foi intencional para garantir que suas regras e dados financeiros **nunca saiam do seu computador**.

---

## 🌐 Publicar no GitHub Pages
1.  Faça o upload de todos os arquivos do projeto para um repositório no GitHub.
2.  No seu repositório, vá em *Settings* → *Pages*.
3.  Na seção *Branch*, selecione a branch `main` e a pasta `/ (root)`. Clique em *Save*.
4.  Aguarde alguns minutos e use o link gerado para acessar a ferramenta de qualquer lugar.
