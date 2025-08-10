# Ferramenta de Conciliação Financeira

## 📖 Contexto
Esta ferramenta foi criada para substituir uma automação antiga que rodava no **Google Planilhas**.  
Naquela solução original, você copiava e colava um extrato bruto do **internet banking** diretamente na planilha, onde um script organizava os dados e depois conciliava com outra aba de orçamento.  
O objetivo desta nova versão é **eliminar a dependência do Google Planilhas** e oferecer o mesmo processo — e ainda mais rápido — de forma **100% local no navegador**. Assim, não há envio de dados a nenhum servidor, garantindo a **privacidade** das informações financeiras.

---

## 📌 Sobre o Projeto
A ferramenta compara e concilia lançamentos entre os dados do **Banco** e os dados do **Orçamento**.

Ela recebe arquivos CSV/XLSX ou texto bruto, processa e organiza os dados e realiza uma comparação inteligente para identificar:
- ✅ **Conciliações exatas**: Itens que batem perfeitamente.
- 💡 **Sugestões de conciliação**: Itens com o mesmo valor, mas descrições diferentes (ex: "UBER TRIP" vs "Uber").
- ⚠️ **Discrepâncias**: Itens que só existem no banco ou no orçamento.

---

## 🛠 Funcionalidades
- **Importação Flexível de Dados do Banco:**
  - Via **Arquivo CSV/XLSX/XLS**.
  - Via **Texto bruto** copiado diretamente do internet banking (com parser inteligente para faturas de cartão de crédito).
- **Importação de Dados do Orçamento:**
  - Via **Arquivo CSV/XLSX/XLS** exportado de sistemas como Organizze, Mobills, etc.
- **Processamento e Refinamento de Dados:**
  - Filtre lançamentos do banco por data.
  - Atribua uma nova data em lote para todos os lançamentos, útil para conciliar a fatura inteira em um único dia de vencimento.
- **Motor de Comparação Inteligente em Múltiplas Etapas:**
  1.  **Conciliação Exata:** Identifica automaticamente pares perfeitos de descrição e valor.
  2.  **Análise de Similaridade:** Para os itens restantes, busca pares com o **mesmo valor** mas descrições diferentes, calculando um score de similaridade (usando o algoritmo de Levenshtein).
  3.  **Painel de Decisão do Usuário:** Apresenta as sugestões em um painel interativo, onde o usuário pode **confirmar (✓)** ou **rejeitar (✕)** cada conciliação sugerida.
- **Exportação de Resultados:**
  - Exporte as tabelas de discrepâncias (Banco e Orçamento) em formato **CSV**.
  - Exporte a tabela de dados do banco já processada em formato **XLSX**.
- **100% Offline e Privado:** Todo o processamento acontece no seu navegador. Nenhum dado financeiro é enviado para servidores.

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
2.  No painel **"Dados do Banco"**, escolha uma das opções:
    - Cole o texto do extrato bruto na área de texto e clique em **"Processar Texto Bruto"**.
    - (Opcional) Use o painel de refinamento para filtrar por data ou atribuir uma nova data aos lançamentos.
3.  No painel **"Dados do Orçamento"**, importe o arquivo CSV/XLSX do seu sistema de controle financeiro.
4.  Clique no botão central **"Comparar"**.
5.  **Revise as Sugestões:** Se a ferramenta encontrar pares com o mesmo valor mas descrições diferentes, um novo painel **"Possíveis Coincidências"** aparecerá.
    - Analise cada sugestão.
    - Clique em **✓** para confirmar a conciliação ou **✕** para ignorar a sugestão (ela será tratada como discrepância).
    - Use os botões no topo do painel para ações em lote.
6.  Após revisar as sugestões, as seções de **"Discrepâncias"** serão preenchidas com os itens que realmente não foram conciliados.
7.  Use os botões **"Exportar CSV"** em cada tabela de discrepância para salvar os resultados.

---

## 📄 Formato esperado
Para que a importação funcione corretamente, seus arquivos devem seguir uma estrutura mínima.

- **Arquivo de Orçamento (CSV/XLSX):**
  - Deve conter uma linha de cabeçalho.
  - Precisa ter, no mínimo, uma coluna chamada **"Descrição"** e outra chamada **"Valor"**. A ordem das colunas não importa.

- **Texto Bruto (Fatura de Cartão):**
  - O parser foi otimizado para o formato onde os dados aparecem em 3 linhas sequenciais:
    ```
    DD/MM
    Descrição do Lançamento
    Valor (ex: 1.234,56)
    ```

O valor deve estar em formato numérico, usando vírgula ou ponto como separador decimal. Valores de crédito (positivos) são identificados por palavras como "pagamento" ou "crédito".

---

## 🔒 Privacidade
- Nenhum dado é enviado a servidores.
- Todo o processamento acontece localmente no seu navegador, garantindo total privacidade das suas informações financeiras.

---

## 🌐 Publicar no GitHub Pages
1.  Faça o upload de todos os arquivos do projeto para um repositório no GitHub.
2.  No seu repositório, vá em *Settings* → *Pages*.
3.  Na seção *Branch*, selecione a branch `main` e a pasta `/ (root)`. Clique em *Save*.
4.  Aguarde alguns minutos e use o link gerado para acessar a ferramenta de qualquer lugar.
