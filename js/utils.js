// js/utils.js

/**
 * Converte uma string de data no formato 'DD/MM/YYYY' para um objeto Date.
 * @param {string} dateString - A data a ser convertida.
 * @returns {Date} - O objeto Date correspondente.
 */
export function parseDate(dateString) {
    if (!dateString) return new Date(0); // Retorna uma data mínima para ordenação
    const [day, month, year] = dateString.split('/');
    return new Date(year, month - 1, day);
}

/**
 * Cria uma função "debounced", que atrasa a invocação de `func` até que `delay` milissegundos
 * tenham se passado desde a última vez que foi invocada.
 * @param {Function} func - A função para "debounce".
 * @param {number} [delay=300] - O tempo de espera em milissegundos.
 * @returns {Function} - A nova função "debounced".
 */
export function debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

let xlsxLibraryLoaded = false;
/**
 * Carrega a biblioteca SheetJS (XLSX) sob demanda.
 * @returns {Promise<void>} - Uma promessa que resolve quando a biblioteca está carregada.
 */
export function loadXLSXLibrary() {
  if (xlsxLibraryLoaded) return Promise.resolve();
  if (typeof XLSX !== 'undefined') { 
      xlsxLibraryLoaded = true; 
      return Promise.resolve(); 
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
    script.onload = () => { xlsxLibraryLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Falha ao carregar a biblioteca de planilhas."));
    document.head.appendChild(script);
  });
}
