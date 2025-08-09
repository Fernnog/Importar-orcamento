# Ferramenta de Conciliação Financeira

## 📖 Contexto
Esta ferramenta foi criada para substituir uma automação antiga que rodava no **Google Planilhas**.  
Naquela solução original, você copiava e colava um extrato bruto do **internet banking** diretamente na planilha, onde um script organizava automaticamente os dados em colunas (Data, Descrição, Valor) e depois conciliava com outra aba contendo o orçamento exportado de sistemas como Minhas Economias, Organizze, Mobills, etc.  
O objetivo desta nova versão é **eliminar a dependência do Google Planilhas e do Google Apps Script** e oferecer o mesmo processo — e ainda mais rápido — de forma **100% local no navegador**. Assim, não há envio de dados a nenhum servidor, garantindo a **privacidade** das informações financeiras e mantendo a flexibilidade para futuras melhorias.

---

## 📌 Sobre o Projeto
A ferramenta compara e concilia lançamentos entre:
- Dados do **Banco**
- Dados do **Orçamento**

Ela recebe arquivos CSV/XLSX ou até texto bruto copiado do extrato online, processa e organiza internamente, e então realiza a comparação para identificar:
- Itens no Banco que não estão no Orçamento
- Itens no Orçamento que não estão no Banco

---

## 🛠 Funcionalidades
- Importa dados do Banco via:
  - **Arquivo CSV/XLSX**
  - **Texto bruto** copiado do extrato do internet banking
- Importa dados do Orçamento via **CSV/XLSX**
- Processa e padroniza automaticamente
- Compara em duas etapas:
  1. **Exata** (descrição + valor)
  2. **Parcial** (valor + primeiros caracteres da descrição)
- Exibe discrepâncias separadas por origem
- Exporta resultados em formato **CSV**
- Funciona de forma **100% offline**

---

## 📂 Estrutura do Projeto


---

## 🚀 Como Usar
1. Abra `index.html` no navegador (ou publique no GitHub Pages)
2. No painel **Banco**:
   - Importe um arquivo CSV/XLSX **ou**
   - Cole o texto do extrato bruto e clique **Processar Texto**
3. No painel **Orçamento**:
   - Importe um CSV/XLSX exportado do seu sistema de orçamento
4. Clique em **Comparar**
5. Veja as discrepâncias e use **Exportar CSV** para salvar os resultados.

---

## 📄 Formato esperado
Todos os métodos de importação resultam num formato com pelo menos:


O valor precisa estar em formato numérico, usando ponto como separador decimal.

---

## 🔒 Privacidade
- Nenhum dado é enviado a servidores
- Todo o processamento acontece no seu navegador

---

## 🌐 Publicar no GitHub Pages
1. Suba os arquivos para um repositório no GitHub
2. Vá em *Settings → Pages* e habilite para a branch principal
3. Use o link gerado para acessar de qualquer lugar
4. 
