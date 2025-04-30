// 1. Adicionar detecção de dispositivo móvel
function isMobileDevice() {
    return (window.innerWidth <= 768) || 
           ('ontouchstart' in document.documentElement);
}

// 2. Ajustar elementos baseado no tamanho da tela
function adjustForScreenSize() {
    const isMobile = isMobileDevice();
    
    // Ajusta o layout dos resultados
    const resultItems = document.querySelectorAll('.result-item');
    resultItems.forEach(item => {
        // Em dispositivos móveis, reestrutura os botões e layout
        if (isMobile) {
            item.classList.add('mobile-view');
        } else {
            item.classList.remove('mobile-view');
        }
    });
    
    // Ajusta tamanho dos controles de pesquisa
    const searchControls = document.getElementById('searchControls');
    if (searchControls) {
        if (isMobile) {
            searchControls.classList.add('mobile-controls');
        } else {
            searchControls.classList.remove('mobile-controls');
        }
    }
}

// 3. Modificar a função displayResults para criar layout responsivo
function displayResults(searchTime) {
    searchResultsEl.innerHTML = '';

    if (appState.searchResults.length === 0) {
        searchResultsEl.innerHTML = '<div class="no-results">Nenhum resultado encontrado</div>';
        statsEl.innerHTML = `Busca concluída em ${searchTime} segundos. Nenhum resultado encontrado.`;
        updateStats(searchTime);
        return;
    }

    // Mostra estatísticas
    statsEl.innerHTML = `Busca concluída em ${searchTime} segundos. ${appState.searchResults.length} resultados encontrados.`;
    updateStats(searchTime);
    
    // Cria elementos para cada resultado
    appState.searchResults.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.id = `result-${index}`;
        
        // Adicionar classe condicional para dispositivos móveis
        if (isMobileDevice()) {
            resultItem.classList.add('mobile-view');
        }

        const fileNameEl = document.createElement('div');
        fileNameEl.className = 'file-name';

        // Adiciona contagem de caracteres e linhas
        const lines = result.paragraph.split('\n').length;
        const chars = result.paragraph.length;
        fileNameEl.innerHTML = `<strong>${result.file}</strong> <span class="result-meta">(${lines} linhas, ${chars} caracteres)</span>`;

        const contentEl = document.createElement('div');
        contentEl.className = 'content';

        // Destaca o termo de busca no parágrafo
        const query = searchInput.value.trim();
        let highlightedText;

        try {
            const options = {
                caseSensitive: caseSensitiveEl.checked,
                useRegex: useRegexEl.checked
            };

            highlightedText = highlightSearchTerms(result.paragraph, query, options);
        } catch (error) {
            console.error('Erro ao destacar texto:', error);
            highlightedText = result.paragraph;
        }

        contentEl.innerHTML = highlightedText;

        // Criar contêiner para botões em dispositivos móveis
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        // Adiciona botão de copiar
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copiar';
        copyButton.onclick = function () {
            copyToClipboard(`result-${index}`);
        };

        buttonContainer.appendChild(copyButton);
        
        resultItem.appendChild(fileNameEl);
        resultItem.appendChild(contentEl);
        resultItem.appendChild(buttonContainer);
        searchResultsEl.appendChild(resultItem);
    });
    
    filterResults();
}

// 4. Modificar a função initEventListeners para adicionar listener de resize
function initEventListeners() {
    fileInput.addEventListener('change', handleFileUpload);
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Adiciona busca em tempo real com consideração para dispositivos móveis
    searchInput.addEventListener('input', debounce(() => {
        // Em dispositivos móveis, exigir string mais longa para evitar muitas atualizações
        const minLength = isMobileDevice() ? 4 : 3;
        if (searchInput.value.length >= minLength) {
            performSearch();
        }
    }, isMobileDevice() ? 500 : 300)); // Tempo maior em dispositivos móveis para economizar recursos

    // Adiciona listener para o botão de copiar todos
    const copyAllButton = document.getElementById('copyAllButton');
    if (copyAllButton) {
        copyAllButton.addEventListener('click', copyAllResults);
    }

    // Adiciona listener para o botão de exportar
    const exportButton = document.getElementById('exportButton');
    if (exportButton) {
        exportButton.addEventListener('click', exportResults);
    }

    // Adiciona listener para o filtro de tamanho
    const sizeFilter = document.getElementById('sizeFilter');
    if (sizeFilter) {
        sizeFilter.addEventListener('change', () => {
            if (appState.searchResults.length > 0) {
                filterResults();
            }
        });
    }
    
    // Adicionar evento de resize para ajustar a UI quando a tela mudar de tamanho
    window.addEventListener('resize', debounce(() => {
        adjustForScreenSize();
    }, 250));
    
    // Aplicar ajustes iniciais
    adjustForScreenSize();
}

// 5. Otimizar a função copyToClipboard para dispositivos móveis
function copyToClipboard(elementId) {
    const resultItem = document.getElementById(elementId);
    const contentEl = resultItem.querySelector('.content');
    const textToCopy = contentEl.innerText;

    // Usar a API Clipboard para dispositivos modernos
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showCopyFeedback(resultItem);
            })
            .catch(err => {
                console.error('Erro ao copiar texto: ', err);
                // Fallback para método antigo
                fallbackCopyToClipboard(textToCopy, resultItem);
            });
    } else {
        // Método antigo para compatibilidade
        fallbackCopyToClipboard(textToCopy, resultItem);
    }
}

// Função de fallback para o método antigo de copiar
function fallbackCopyToClipboard(text, resultItem) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Tornar o textarea invisível mas ainda presente no DOM
    textarea.style.position = 'fixed';
    textarea.style.opacity = 0;
    
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback(resultItem);
    } catch (err) {
        console.error('Fallback: Erro ao copiar texto', err);
        alert('Não foi possível copiar o texto. Por favor, tente manualmente.');
    }
    
    document.body.removeChild(textarea);
}

// Função para mostrar feedback visual após copiar
function showCopyFeedback(resultItem) {
    const button = resultItem.querySelector('.copy-button');
    const originalText = button.textContent;
    button.textContent = 'Copiado!';
    button.style.backgroundColor = '#4caf50';

    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '#007bff';
    }, 1500);
}

// 6. Otimizar função de filtragem para desempenho em dispositivos móveis
function filterResults() {
    const sizeFilter = document.getElementById('sizeFilter');
    const filterValue = sizeFilter ? sizeFilter.value : 'all';
    
    // Batch DOM updates para melhor desempenho
    // Especialmente importante em dispositivos móveis
    const updates = [];

    appState.searchResults.forEach((result, index) => {
        const resultItem = document.getElementById(`result-${index}`);
        if (!resultItem) return;

        const lines = result.paragraph.split('\n').length;

        // Aplicar filtro de tamanho
        let shouldShow = true;

        if (filterValue === 'small' && lines >= 5) {
            shouldShow = false;
        } else if (filterValue === 'medium' && (lines < 5 || lines > 15)) {
            shouldShow = false;
        } else if (filterValue === 'large' && lines <= 15) {
            shouldShow = false;
        }

        // Armazenar atualizações em um array em vez de modificar o DOM imediatamente
        updates.push({
            element: resultItem,
            display: shouldShow ? '' : 'none'
        });
    });
    
    // Aplicar todas as atualizações em um único frame
    requestAnimationFrame(() => {
        updates.forEach(update => {
            update.element.style.display = update.display;
        });
    });
}

// 7. Adicionar suporte a gestos de toque para dispositivos móveis
function addTouchSupport() {
    if (!('ontouchstart' in document.documentElement)) return;
    
    // Adicionar lógica para expandir/colapsar conteúdo com toque
    document.addEventListener('click', e => {
        // Verifica se o clique foi em um cabeçalho de resultado
        if (e.target.closest('.file-name')) {
            const resultItem = e.target.closest('.result-item');
            if (resultItem) {
                // Toggle para expandir/colapsar conteúdo
                const contentEl = resultItem.querySelector('.content');
                if (contentEl) {
                    if (contentEl.classList.contains('collapsed')) {
                        contentEl.classList.remove('collapsed');
                        // Expande com animação suave
                        contentEl.style.maxHeight = contentEl.scrollHeight + 'px';
                    } else {
                        contentEl.classList.add('collapsed');
                        // Colapsa com animação suave
                        contentEl.style.maxHeight = '100px';
                    }
                }
            }
        }
    });
}

// 8. Inicialização do aplicativo com considerações responsivas
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    addTouchSupport();
    
    // Verificar se está em um dispositivo móvel e ajustar a UI
    if (isMobileDevice()) {
        // Adicionar classe ao body para estilos CSS específicos para mobile
        document.body.classList.add('mobile-device');
        
        // Limitar o número de resultados em dispositivos móveis para melhor desempenho
        const limitResultsCheckbox = document.getElementById('limitResults');
        if (limitResultsCheckbox) {
            limitResultsCheckbox.checked = true;
        }
    }
});

// Função para limitar o número de resultados em dispositivos móveis
function limitResultsForMobile(results) {
    const limitResultsCheckbox = document.getElementById('limitResults');
    if (isMobileDevice() && limitResultsCheckbox && limitResultsCheckbox.checked) {
        // Limitar a 20 resultados em dispositivos móveis para melhor desempenho
        return results.slice(0, 20);
    }
    return results;
}

// Modificar a função searchInFiles para manter informações sobre o contexto original
function searchInFiles(query, options) {
    const results = [];
    let searchRegex;
    
    // Configuração do regex conforme já existente no código original
    // ...

    // Busca em cada arquivo e parágrafo
    appState.files.forEach(file => {
        // Para cada arquivo, mantenha um mapa de contextos maiores
        const contexts = identifyLargerContexts(file.content);
        
        file.paragraphs.forEach(paragraph => {
            // Se estiver ignorando acentos, normaliza o texto do parágrafo
            const textToSearch = ignoreAccents ? normalizeText(paragraph) : paragraph;

            // Conta o número de ocorrências para determinar relevância
            const matches = textToSearch.match(searchRegex);
            const matchCount = matches ? matches.length : 0;

            if (matchCount > 0) {
                // Verifica se este parágrafo faz parte de um contexto maior
                const originalContext = findContainingContext(paragraph, contexts);
                
                results.push({
                    file: file.name,
                    paragraph: paragraph,
                    relevance: matchCount,
                    hasOriginalContext: !!originalContext,
                    originalContext: originalContext || paragraph
                });
            }
        });
    });

    // Ordena por relevância (número de ocorrências)
    results.sort((a, b) => b.relevance - a.relevance);

    return results;
}
// Função para normalizar texto (remover acentos)
function normalizeText(text) {
    return text.normalize("NFD")               // Decompõe caracteres acentuados
        .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos (acentos)
        .toLowerCase();                  // Converte para minúsculas
}
// Função para copiar o conteúdo para o clipboard
function copyToClipboard(elementId) {
    const resultItem = document.getElementById(elementId);
    const contentEl = resultItem.querySelector('.content');
    const textToCopy = contentEl.innerText;

    // Cria um elemento temporário para copiar o texto
    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    // Feedback visual
    const button = resultItem.querySelector('.copy-button');
    const originalText = button.textContent;
    button.textContent = 'Copiado!';
    button.style.backgroundColor = '#4caf50';

    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '#007bff';
    }, 1500);
}

// Estado global para armazenar os arquivos e conteúdos
const appState = {
    files: [], // Array de objetos de arquivo {name, content, paragraphs}
    searchResults: [],
    isSearching: false
};

// Elementos DOM
const fileInput = document.getElementById('fileInput');
const loadedFilesEl = document.getElementById('loadedFiles');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchResultsEl = document.getElementById('searchResults');
const statsEl = document.getElementById('stats');

// Opções de busca
const caseSensitiveEl = document.getElementById('caseSensitive');
const wholeWordEl = document.getElementById('wholeWord');
const useRegexEl = document.getElementById('useRegex');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
});
// Função para limitar a frequência de execução
function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
// Nova função para filtrar resultados
function filterResults() {
    const sizeFilter = document.getElementById('sizeFilter');
    const filterValue = sizeFilter ? sizeFilter.value : 'all';

    // Mostrar ou esconder resultados com base no filtro
    appState.searchResults.forEach((result, index) => {
        const resultItem = document.getElementById(`result-${index}`);
        if (!resultItem) return;

        const lines = result.paragraph.split('\n').length;

        // Aplicar filtro de tamanho
        let shouldShow = true;

        if (filterValue === 'small' && lines >= 5) {
            shouldShow = false;
        } else if (filterValue === 'medium' && (lines < 5 || lines > 15)) {
            shouldShow = false;
        } else if (filterValue === 'large' && lines <= 15) {
            shouldShow = false;
        }

        resultItem.style.display = shouldShow ? '' : 'none';
    });
}
// Configuração dos event listeners
function initEventListeners() {
    fileInput.addEventListener('change', handleFileUpload);
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    // Adiciona busca em tempo real
    searchInput.addEventListener('input', debounce(() => {
        if (searchInput.value.length >= 3) {
            performSearch();
        }
    }, 300));
    // Adiciona listener para o botão de copiar todos
    const copyAllButton = document.getElementById('copyAllButton');
    if (copyAllButton) {
        copyAllButton.addEventListener('click', copyAllResults);
    }
    // Adiciona listener para o botão de exportar
    const exportButton = document.getElementById('exportButton');
    if (exportButton) {
        exportButton.addEventListener('click', exportResults);
    }
    // Adiciona listener para o filtro de tamanho
    const sizeFilter = document.getElementById('sizeFilter');
    if (sizeFilter) {
        sizeFilter.addEventListener('change', () => {
            if (appState.searchResults.length > 0) {
                filterResults();
            }
        });
    }
}

// Manipulação de upload de arquivos
async function handleFileUpload(event) {
    const files = event.target.files;

    if (files.length === 0) return;

    for (const file of files) {
        try {
            const content = await readFileContent(file);
            const paragraphs = splitIntoParagraphs(content);

            appState.files.push({
                name: file.name,
                content: content,
                paragraphs: paragraphs
            });
        } catch (error) {
            console.error(`Erro ao ler o arquivo ${file.name}:`, error);
        }
    }

    updateFileList();
    fileInput.value = ''; // Resetar o input para permitir recarregar o mesmo arquivo
}

// Leitura do conteúdo do arquivo
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error(`Erro ao ler arquivo: ${e.target.error}`));

        reader.readAsText(file);
    });
}

// Função melhorada para dividir conteúdo em parágrafos com melhor detecção de blocos de código
function smartSplitIntoParagraphs(content) {
    // Identifica parágrafos com detecção mais inteligente
    const paragraphs = [];
    
    // Primeiro divide por linhas vazias (paragrafação tradicional)
    const blocks = content.split(/\n\s*\n/);
    
    blocks.forEach(block => {
        // Se o bloco contém múltiplas linhas
        if (block.includes('\n')) {
            // Verifica se parece ser um bloco de código
            if (isCodeLike(block)) {
                // Análise mais detalhada para preservar blocos de código inteiros
                const codeBlocks = extractCodeBlocks(block);
                codeBlocks.forEach(codeBlock => {
                    if (codeBlock.trim()) {
                        paragraphs.push(codeBlock.trim());
                    }
                });
            } else {
                // Para texto normal, divide conforme o padrão anterior
                const lines = block.split('\n');
                
                let currentParagraph = '';
                let lineCount = 0;
                
                lines.forEach(line => {
                    currentParagraph += line + '\n';
                    lineCount++;
                    
                    // Divide após frases completas ou muitas linhas acumuladas
                    const isEndOfStatement = /[.!?]\s*$/.test(line);
                    
                    if (lineCount >= 10 || isEndOfStatement) {
                        if (currentParagraph.trim()) {
                            paragraphs.push(currentParagraph.trim());
                        }
                        currentParagraph = '';
                        lineCount = 0;
                    }
                });
                
                // Adiciona qualquer conteúdo restante
                if (currentParagraph.trim()) {
                    paragraphs.push(currentParagraph.trim());
                }
            }
        } else if (block.trim()) {
            // Bloco de linha única
            paragraphs.push(block.trim());
        }
    });
    
    return paragraphs;
}

// Função para verificar se um bloco parece código
function isCodeLike(block) {
    // Heurísticas para detectar se o conteúdo parece código
    const hasCodeIndicators = /function|class|if|for|while|switch|var |let |const |import |export |return |{|}|=>/.test(block);
    const hasMultipleIndentation = /\n\s{2,}|\n\t/.test(block);
    
    return hasCodeIndicators || hasMultipleIndentation;
}

// Função crítica para extrair blocos de código respeitando a estrutura de chaves
function extractCodeBlocks(code) {
    const codeBlocks = [];
    const lines = code.split('\n');
    
    let currentBlock = '';
    let braceBalance = 0;
    let inFunction = false;
    let inClass = false;
    let inControlBlock = false;
    let lastSignificantLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Verificar aberturas e fechamentos de contextos importantes
        const startsFunction = /function\s+\w+\s*\([^)]*\)\s*{/.test(line);
        const startsClass = /class\s+\w+/.test(line);
        const startsControlBlock = /(if|for|while|switch)\s*\([^)]*\)\s*{/.test(line);
        
        // Contar chaves abertas e fechadas na linha atual
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        
        // Atualizar o balanço de chaves
        braceBalance += openBraces - closeBraces;
        
        // Iniciar novos contextos se necessário
        if (startsFunction && !inFunction && !inClass && !inControlBlock && braceBalance > 0) {
            inFunction = true;
            // Se já tivermos algum texto acumulado não relacionado, quebra aqui
            if (currentBlock.trim() && !currentBlock.includes('function')) {
                codeBlocks.push(currentBlock);
                currentBlock = '';
            }
        } else if (startsClass && !inClass && !inFunction && !inControlBlock && braceBalance > 0) {
            inClass = true;
            if (currentBlock.trim() && !currentBlock.includes('class')) {
                codeBlocks.push(currentBlock);
                currentBlock = '';
            }
        } else if (startsControlBlock && !inControlBlock && !inFunction && !inClass && braceBalance > 0) {
            inControlBlock = true;
            if (currentBlock.trim() && !/(if|for|while|switch)/.test(currentBlock)) {
                codeBlocks.push(currentBlock);
                currentBlock = '';
            }
        }
        
        // Adicionar a linha atual ao bloco
        currentBlock += line + '\n';
        
        // Se a linha não é vazia, atualize o contador de última linha significativa
        if (line.trim()) {
            lastSignificantLine = i;
        }
        
        // Verificar se um contexto acabou (fechamento de chaves equilibrado)
        if ((inFunction || inClass || inControlBlock) && braceBalance === 0) {
            // Contexto fechado, adiciona o bloco completo
            codeBlocks.push(currentBlock);
            currentBlock = '';
            inFunction = false;
            inClass = false;
            inControlBlock = false;
        } 
        // Ou se estamos no final de um bloco lógico sem estar em função/classe/controle
        else if (!inFunction && !inClass && !inControlBlock && 
                (i === lines.length - 1 || 
                 (i < lines.length - 1 && lines[i+1].trim() === '' && line.trim() !== ''))) {
            // Final de um bloco lógico comum
            if (currentBlock.trim()) {
                codeBlocks.push(currentBlock);
                currentBlock = '';
            }
        }
    }
    
    // Adicionar qualquer conteúdo restante
    if (currentBlock.trim()) {
        codeBlocks.push(currentBlock);
    }
    
    return codeBlocks;
}

// Função auxiliar para verificar se um bloco provavelmente é código completo
function isLikelyCompleteCode(block) {
    // Verifica se parece ser uma função ou método completo
    const isFunctionLike = /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*}$/.test(block);
    
    // Verifica se é um bloco de declaração de classe
    const isClassLike = /class\s+\w+[\s\S]*{[\s\S]*}$/.test(block);
    
    // Verifica blocos if/else, switch, etc. completos
    const isControlBlock = /(?:if|for|while|switch)\s*\([^)]*\)\s*{[\s\S]*}$/.test(block);
    
    // Verifica paridade de chaves (quantidade igual de { e })
    const openBraces = (block.match(/{/g) || []).length;
    const closeBraces = (block.match(/}/g) || []).length;
    const hasBalancedBraces = openBraces > 0 && openBraces === closeBraces;
    
    // Se qualquer uma das condições for verdadeira, consideramos um bloco completo
    return (isFunctionLike || isClassLike || isControlBlock || hasBalancedBraces) && block.length > 50;
}

// Atualiza a lista de arquivos na UI
function updateFileList() {
    loadedFilesEl.innerHTML = '';

    if (appState.files.length === 0) {
        loadedFilesEl.innerHTML = '<div class="no-results">Nenhum arquivo carregado</div>';
        return;
    }

    appState.files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${file.name} (${file.paragraphs.length} parágrafos)`;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remover';
        removeButton.addEventListener('click', () => {
            appState.files.splice(index, 1);
            updateFileList();
        });

        fileItem.appendChild(nameSpan);
        fileItem.appendChild(removeButton);
        loadedFilesEl.appendChild(fileItem);
    });
}

// Executa a busca
function performSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        searchResultsEl.innerHTML = '<div class="no-results">Digite algo para buscar</div>';
        statsEl.innerHTML = '';
        return;
    }

    if (appState.files.length === 0) {
        searchResultsEl.innerHTML = '<div class="no-results">Nenhum arquivo carregado para buscar</div>';
        statsEl.innerHTML = '';
        return;
    }

    // Mostra loading
    searchResultsEl.innerHTML = '<div class="loading">Buscando...</div>';
    appState.isSearching = true;

    // Executa a busca após um pequeno delay para permitir que a UI atualize
    setTimeout(() => {
        const startTime = performance.now();
        const searchOptions = {
            caseSensitive: caseSensitiveEl.checked,
            wholeWord: wholeWordEl.checked,
            useRegex: useRegexEl.checked
        };

        appState.searchResults = searchInFiles(query, searchOptions);

        const endTime = performance.now();
        const searchTime = ((endTime - startTime) / 1000).toFixed(3);

        displayResults(searchTime);
        appState.isSearching = false;
    }, 50);
}

// Função de busca
function searchInFiles(query, options) {
    const results = [];
    let searchRegex;

    // Adicione opção para ignorar acentos (assume que o checkbox existe)
    const ignoreAccents = document.getElementById('ignoreAccents') &&
        document.getElementById('ignoreAccents').checked;

    // Normaliza a query se necessário
    const normalizedQuery = ignoreAccents ? normalizeText(query) : query;

    try {
        if (options.useRegex) {
            // Usa a query diretamente como regex
            const flags = options.caseSensitive ? 'g' : 'gi';
            searchRegex = new RegExp(normalizedQuery, flags);
        } else {
            // Verifica se é uma busca de frase com aspas
            const isExactPhrase = /^"(.+)"$/.test(normalizedQuery);

            if (isExactPhrase) {
                // Remove as aspas para busca de frase exata
                const phrase = normalizedQuery.substring(1, normalizedQuery.length - 1);
                let pattern = escapeRegExp(phrase);

                if (options.wholeWord) {
                    pattern = `\\b${pattern}\\b`;
                }

                const flags = options.caseSensitive ? 'g' : 'gi';
                searchRegex = new RegExp(pattern, flags);
            } else {
                // Busca por palavras individuais
                const terms = normalizedQuery.split(/\s+/);
                const patterns = terms.map(term => {
                    let pattern = escapeRegExp(term);
                    if (options.wholeWord) {
                        pattern = `\\b${pattern}\\b`;
                    }
                    return pattern;
                });

                const combinedPattern = patterns.join('|');
                const flags = options.caseSensitive ? 'g' : 'gi';
                searchRegex = new RegExp(combinedPattern, flags);
            }
        }
    } catch (error) {
        console.error('Erro ao criar expressão regular:', error);
        return [{
            file: null,
            paragraph: `Erro na expressão de busca: ${error.message}`,
            relevance: 0
        }];
    }

    // Busca em cada arquivo e parágrafo
    appState.files.forEach(file => {
        file.paragraphs.forEach(paragraph => {
            // Se estiver ignorando acentos, normaliza o texto do parágrafo
            const textToSearch = ignoreAccents ? normalizeText(paragraph) : paragraph;

            // Conta o número de ocorrências para determinar relevância
            const matches = textToSearch.match(searchRegex);
            const matchCount = matches ? matches.length : 0;

            if (matchCount > 0) {
                results.push({
                    file: file.name,
                    paragraph: paragraph, // Mantém o parágrafo original para exibição
                    relevance: matchCount
                });
            }
        });
    });

    // Ordena por relevância (número de ocorrências)
    results.sort((a, b) => b.relevance - a.relevance);

    return results;
}

// Função auxiliar para escapar caracteres especiais em regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Adicionar novo recurso para expandir/colapsar resultados
function displayResults(searchTime) {
    searchResultsEl.innerHTML = '';

    if (appState.searchResults.length === 0) {
        searchResultsEl.innerHTML = '<div class="no-results">Nenhum resultado encontrado</div>';
        statsEl.innerHTML = `Busca concluída em ${searchTime} segundos. Nenhum resultado encontrado.`;
        updateStats(searchTime);
        return;
    }

    // Mostra estatísticas
    statsEl.innerHTML = `Busca concluída em ${searchTime} segundos. ${appState.searchResults.length} resultados encontrados.`;
    updateStats(searchTime);
    
    // Cria elementos para cada resultado
    appState.searchResults.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.id = `result-${index}`;
        
        // Adicionar classe condicional para dispositivos móveis
        if (isMobileDevice()) {
            resultItem.classList.add('mobile-view');
        }

        const fileNameEl = document.createElement('div');
        fileNameEl.className = 'file-name';

        // Adiciona contagem de caracteres e linhas
        const lines = result.paragraph.split('\n').length;
        const chars = result.paragraph.length;
        
        // Flag para marcar resultados grandes com opção de expandir
        const isLargeResult = lines > 10 || chars > 500;
        const resultSizeClass = isLargeResult ? 'large-result' : '';
        
        fileNameEl.innerHTML = `<strong>${result.file}</strong> <span class="result-meta">(${lines} linhas, ${chars} caracteres)</span>`;
        
        // Para resultados grandes, adiciona botão expandir/colapsar
        if (isLargeResult) {
            const expandButton = document.createElement('button');
            expandButton.className = 'expand-button';
            expandButton.textContent = 'Expandir';
            expandButton.addEventListener('click', function(e) {
                // Impede a propagação do evento para outros elementos
                e.preventDefault();
                e.stopPropagation();
                
                const contentEl = resultItem.querySelector('.content');
                if (contentEl.classList.contains('collapsed')) {
                    // Expande - primeiro remove a classe collapsed
                    contentEl.classList.remove('collapsed');
                    // Em dispositivos móveis, não use animações com maxHeight
                    if (isMobileDevice()) {
                        contentEl.style.maxHeight = 'none';
                    } else {
                        contentEl.style.maxHeight = contentEl.scrollHeight + 'px';
                    }
                    this.textContent = 'Colapsar';
                } else {
                    // Colapsa
                    contentEl.classList.add('collapsed');
                    // Reset imediato em dispositivos móveis
                    if (isMobileDevice()) {
                        contentEl.style.maxHeight = '200px';
                    } else {
                        contentEl.style.maxHeight = '200px';
                    }
                    this.textContent = 'Expandir';
                }
                // Pequeno atraso para garantir que o evento foi processado completamente
                setTimeout(() => {}, 50);  
            }, { passive: false });
            fileNameEl.appendChild(expandButton);
        }

        const contentEl = document.createElement('div');
        contentEl.className = `content ${isLargeResult ? 'collapsed' : ''} ${resultSizeClass}`;

        // Destaca o termo de busca no parágrafo
        const query = searchInput.value.trim();
        let highlightedText;

        try {
            const options = {
                caseSensitive: caseSensitiveEl.checked,
                useRegex: useRegexEl.checked
            };

            highlightedText = highlightSearchTerms(result.paragraph, query, options);
        } catch (error) {
            console.error('Erro ao destacar texto:', error);
            highlightedText = result.paragraph;
        }

        contentEl.innerHTML = highlightedText;

        // Criar contêiner para botões em dispositivos móveis
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        // Adiciona botão de copiar
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copiar';
        copyButton.onclick = function () {
            copyToClipboard(`result-${index}`);
        };
        
        // Adiciona botão para mostrar contexto completo (quando aplicável)
        if (result.hasOriginalContext) {
            const contextButton = document.createElement('button');
            contextButton.className = 'context-button';
            contextButton.textContent = 'Ver Contexto Completo';
            contextButton.onclick = function() {
                showCompleteContext(result.file, result.paragraph, result.originalContext);
            };
            buttonContainer.appendChild(contextButton);
        }

        buttonContainer.appendChild(copyButton);
        
        resultItem.appendChild(fileNameEl);
        resultItem.appendChild(contentEl);
        resultItem.appendChild(buttonContainer);
        searchResultsEl.appendChild(resultItem);
    });
    
    filterResults();
}

// Função para mostrar estatísticas avançadas
function updateStats(searchTime) {
    if (appState.searchResults.length === 0) {
        statsEl.innerHTML = `Busca concluída em ${searchTime} segundos. Nenhum resultado encontrado.`;
        return;
    }

    const query = searchInput.value.trim();
    let totalMatches = 0;
    const fileStats = {};

    // Conta ocorrências por arquivo
    appState.searchResults.forEach(result => {
        totalMatches += result.relevance;

        if (!fileStats[result.file]) {
            fileStats[result.file] = {
                matches: result.relevance,
                paragraphs: 1
            };
        } else {
            fileStats[result.file].matches += result.relevance;
            fileStats[result.file].paragraphs += 1;
        }
    });

    // Estatísticas básicas
    let statsHTML = `Busca concluída em ${searchTime} segundos. ${appState.searchResults.length} resultados encontrados.`;

    // Estatísticas avançadas
    statsHTML += `<div class="advanced-stats">`;
    statsHTML += `<h3>Estatísticas da Busca por "${query}"</h3>`;
    statsHTML += `<p>Total de ocorrências: ${totalMatches}</p>`;
    statsHTML += `<p>Total de parágrafos: ${appState.searchResults.length}</p>`;
    statsHTML += `<h4>Por arquivo:</h4><ul>`;

    Object.keys(fileStats).forEach(file => {
        statsHTML += `<li><strong>${file}</strong>: ${fileStats[file].matches} ocorrências em ${fileStats[file].paragraphs} parágrafos</li>`;
    });

    statsHTML += `</ul></div>`;

    // Adiciona ao elemento de estatísticas
    statsEl.innerHTML = statsHTML;
}


// Função para exportar resultados
function exportResults() {
    if (appState.searchResults.length === 0) {
        alert('Não há resultados para exportar');
        return;
    }

    let content = `Resultados da busca por: "${searchInput.value}"\n`;
    content += `Data: ${new Date().toLocaleDateString()}\n`;
    content += `Total de resultados: ${appState.searchResults.length}\n\n`;

    appState.searchResults.forEach((result, index) => {
        content += `--- Resultado #${index + 1} ---\n`;
        content += `Arquivo: ${result.file}\n`;
        content += `Relevância: ${result.relevance} ocorrências\n`;
        content += `Conteúdo:\n${result.paragraph}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `busca-${searchInput.value.replace(/[^a-z0-9]/gi, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Destaca os termos de busca no texto
function highlightSearchTerms(text, query, options) {
    let searchRegex;

    // Verifica se deve ignorar acentos
    const ignoreAccents = document.getElementById('ignoreAccents') &&
        document.getElementById('ignoreAccents').checked;

    try {
        if (ignoreAccents) {
            // Quando ignorando acentos, precisamos de uma abordagem especial para destacar
            // Primeiro vamos escapar o HTML para evitar problemas
            const escapedText = escapeHtml(text);

            // Normaliza a query
            const normalizedQuery = normalizeText(query);

            // Cria um mapa para rastrear as posições de destaque
            const highlights = [];

            // Primeiro, normaliza o texto para encontrar as correspondências
            const normalizedText = normalizeText(text);

            // Determina o padrão de busca baseado nas opções
            let searchPattern;
            if (options.useRegex) {
                const flags = options.caseSensitive ? 'g' : 'gi';
                searchPattern = new RegExp(normalizedQuery, flags);
            } else {
                // Verifica se é uma busca de frase com aspas
                const isExactPhrase = /^"(.+)"$/.test(normalizedQuery);

                if (isExactPhrase) {
                    // Remove as aspas para busca de frase exata
                    const phrase = normalizedQuery.substring(1, normalizedQuery.length - 1);
                    const pattern = escapeRegExp(phrase);
                    const flags = options.caseSensitive ? 'g' : 'gi';
                    searchPattern = new RegExp(pattern, flags);
                } else {
                    // Busca por palavras individuais
                    const terms = normalizedQuery.split(/\s+/);
                    const patterns = terms.map(term => escapeRegExp(term));
                    const combinedPattern = patterns.join('|');
                    const flags = options.caseSensitive ? 'g' : 'gi';
                    searchPattern = new RegExp(combinedPattern, flags);
                }
            }

            // Encontra todas as correspondências no texto normalizado
            let match;
            while ((match = searchPattern.exec(normalizedText)) !== null) {
                highlights.push({
                    start: match.index,
                    end: match.index + match[0].length
                });
            }

            // Destaca as correspondências no texto original
            // Precisamos fazer isso de trás para frente para não afetar os índices
            if (highlights.length > 0) {
                // Ordena de trás para frente
                highlights.sort((a, b) => b.start - a.start);

                let resultText = escapedText;
                highlights.forEach(highlight => {
                    const before = resultText.substring(0, highlight.start);
                    const matched = resultText.substring(highlight.start, highlight.end);
                    const after = resultText.substring(highlight.end);

                    resultText = before + `<span class="highlight">${matched}</span>` + after;
                });

                return resultText;
            }

            return escapedText;
        } else {
            // Código original para quando não estamos ignorando acentos
            if (options.useRegex) {
                const flags = options.caseSensitive ? 'g' : 'gi';
                searchRegex = new RegExp(`(${query})`, flags);
            } else {
                // Verifica se é uma busca de frase com aspas
                const isExactPhrase = /^"(.+)"$/.test(query);

                if (isExactPhrase) {
                    // Remove as aspas para busca de frase exata
                    const phrase = query.substring(1, query.length - 1);
                    const pattern = escapeRegExp(phrase);
                    const flags = options.caseSensitive ? 'g' : 'gi';
                    searchRegex = new RegExp(`(${pattern})`, flags);
                } else {
                    // Busca por palavras individuais
                    const terms = query.split(/\s+/);
                    const patterns = terms.map(term => escapeRegExp(term));
                    const combinedPattern = `(${patterns.join('|')})`;
                    const flags = options.caseSensitive ? 'g' : 'gi';
                    searchRegex = new RegExp(combinedPattern, flags);
                }
            }

            // Primeiro escapa as tags HTML para evitar problemas
            const escapedText = escapeHtml(text);

            // Substitui as ocorrências com tag de destaque
            return escapedText.replace(searchRegex, '<span class="highlight">$1</span>');
        }
    } catch (error) {
        console.error('Erro ao criar regex para destaque:', error);
        return escapeHtml(text);
    }
}

// Escapa caracteres HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyAllResults() {
    if (appState.searchResults.length === 0) {
        alert('Não há resultados para copiar');
        return;
    }

    let content = '';
    appState.searchResults.forEach((result, index) => {
        content += `// Resultado #${index + 1} do arquivo: ${result.file}\n`;
        content += result.paragraph + '\n\n';
    });

    const textarea = document.createElement('textarea');
    textarea.value = content;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    alert('Todos os resultados foram copiados para a área de transferência!');
}


// Função para mostrar o contexto completo de um resultado
function showCompleteContext(fileName, snippet, fullContext) {
    // Cria um modal para mostrar o contexto completo
    const modal = document.createElement('div');
    modal.className = 'context-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const closeButton = document.createElement('span');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = function() {
        document.body.removeChild(modal);
    };
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h3>Contexto Completo - ${fileName}</h3>`;
    
    const codeContent = document.createElement('div');
    codeContent.className = 'code-context';
    
    // Destaca o snippet original dentro do contexto completo
    const highlightedContext = fullContext.replace(
        snippet, 
        `<span class="context-highlight">${snippet}</span>`
    );
    
    codeContent.innerHTML = `<pre><code>${highlightedContext}</code></pre>`;
    
    const copyContextButton = document.createElement('button');
    copyContextButton.className = 'copy-context-button';
    copyContextButton.textContent = 'Copiar Contexto Completo';
    copyContextButton.onclick = function() {
        navigator.clipboard.writeText(fullContext)
            .then(() => {
                this.textContent = 'Copiado!';
                setTimeout(() => {
                    this.textContent = 'Copiar Contexto Completo';
                }, 1500);
            });
    };
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(header);
    modalContent.appendChild(codeContent);
    modalContent.appendChild(copyContextButton);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
}



// Função para identificar contextos maiores no arquivo
function identifyLargerContexts(fileContent) {
    const contexts = [];
    
    // Identifica funções completas
    const functionMatches = fileContent.match(/function\s+\w+\s*\([^{]*\)\s*{[\s\S]*?(?=function|\n\s*\n|$)/g);
    if (functionMatches) {
        functionMatches.forEach(match => {
            contexts.push(match.trim());
        });
    }
    
    // Identifica classes completas
    const classMatches = fileContent.match(/class\s+\w+[\s\S]*?{[\s\S]*?}(?=class|\n\s*\n|$)/g);
    if (classMatches) {
        classMatches.forEach(match => {
            contexts.push(match.trim());
        });
    }
    
    // Adicione outros padrões conforme necessário
    
    return contexts;
}

// Função para encontrar o contexto que contém um parágrafo
function findContainingContext(paragraph, contexts) {
    for (const context of contexts) {
        if (context.includes(paragraph) && context.length > paragraph.length) {
            return context;
        }
    }
    return null;
}

// Substituir a função splitIntoParagraphs pela nova implementação
function splitIntoParagraphs(content) {
    return smartSplitIntoParagraphs(content);
}

