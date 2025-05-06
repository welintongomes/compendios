// Sistema de persistência com IndexedDB
const DB_NAME = 'fileSearchDB1';
const DB_VERSION = 1;
const STORE_NAME = 'files';
let db;
// Variáveis globais para controle de leitura
let currentSpeechUtterance = null;
let isReadingAll = false;
let currentReadingIndex = -1;
let readingQueue = [];
// Adicionar botão "Ler Todos" no topo dos resultados
function addReadAllButton() {
    // Se já existir um botão, remova-o primeiro
    const existingBtn = document.querySelector('#read-all-button');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Só adiciona o botão se houver resultados
    if (appState.searchResults.length === 0) {
        return;
    }
    
    const readAllButton = document.createElement('button');
    readAllButton.id = 'read-all-button';
    readAllButton.className = 'read-all-button';
    readAllButton.textContent = 'Ler Todos os Resultados';
    readAllButton.onclick = readAllResults;
    
    // Adiciona botão de parar leitura (inicialmente oculto)
    const stopAllButton = document.createElement('button');
    stopAllButton.id = 'stop-all-button';
    stopAllButton.className = 'stop-all-button';
    stopAllButton.textContent = 'Parar Leitura';
    stopAllButton.style.display = 'none';
    stopAllButton.onclick = stopAllReading;
    
    // Criar container para os botões
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'read-all-container';
    buttonContainer.appendChild(readAllButton);
    buttonContainer.appendChild(stopAllButton);
    
    // Adiciona antes dos resultados
    searchResultsEl.insertAdjacentElement('beforebegin', buttonContainer);
}

// Função para ler todos os resultados em sequência
function readAllResults() {
    // Verificar se a API é suportada
    if (!window.speechSynthesis) {
        alert('Desculpe, seu navegador não suporta leitura em voz alta.');
        return;
    }
    
    // Parar qualquer leitura anterior
    stopAllReading();
    
    // Preparar para leitura em sequência
    isReadingAll = true;
    currentReadingIndex = -1;
    
    // Preparar fila de leitura com todos os resultados
    readingQueue = appState.searchResults.map(result => result.paragraph);
    
    // Atualizar interface
    document.getElementById('read-all-button').style.display = 'none';
    document.getElementById('stop-all-button').style.display = 'inline-block';
    
    // Iniciar leitura do primeiro item
    readNextInQueue();
}

// Função para ler o próximo item na fila
function readNextInQueue() {
    // Se estiver no modo de leitura em sequência e ainda houver itens na fila
    if (isReadingAll && currentReadingIndex < readingQueue.length - 1) {
        currentReadingIndex++;
        
        // Remove destaque do item anterior (se houver)
        removeAllReadingHighlights();
        
        // Destaca o item atual que está sendo lido
        highlightCurrentReading(currentReadingIndex);
        
        // Configura e inicia a leitura
        const utterance = new SpeechSynthesisUtterance(readingQueue[currentReadingIndex]);
        utterance.lang = 'pt-BR';
        
        // Configura callback para quando terminar este item
        utterance.onend = function() {
            // Pequeno delay antes de ler o próximo item
            setTimeout(() => {
                readNextInQueue();
            }, 500);
        };
        
        // Salva a referência atual
        currentSpeechUtterance = utterance;
        
        // Inicia a leitura
        window.speechSynthesis.speak(utterance);
        
        // Atualiza o botão de leitura individual do resultado atual
        updateReadingButtonState(currentReadingIndex, true);
        
        // Scroll para o item atual
        scrollToCurrentReading(currentReadingIndex);
    } else {
        // Finaliza a leitura em sequência
        stopAllReading();
    }
}

// Função para parar toda a leitura em sequência
function stopAllReading() {
    // Cancelar síntese de voz
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    // Resetar estado
    isReadingAll = false;
    currentReadingIndex = -1;
    currentSpeechUtterance = null;
    
    // Remover todos os destaques
    removeAllReadingHighlights();
    
    // Resetar todos os botões de leitura individuais
    const readButtons = document.querySelectorAll('.read-button');
    readButtons.forEach(button => {
        button.textContent = 'Ler';
        button.dataset.speaking = 'false';
        button.classList.remove('speaking');
    });
    
    // Mostrar botão de ler todos / esconder botão de parar
    const readAllButton = document.getElementById('read-all-button');
    const stopAllButton = document.getElementById('stop-all-button');
    
    if (readAllButton) readAllButton.style.display = 'inline-block';
    if (stopAllButton) stopAllButton.style.display = 'none';
}

// Função para destacar o texto que está sendo lido atualmente
function highlightCurrentReading(index) {
    const resultItem = document.getElementById(`result-${index}`);
    if (resultItem) {
        const contentEl = resultItem.querySelector('.content');
        if (contentEl) {
            // Adiciona classe para destacar
            contentEl.classList.add('reading-active');
            
            // Se o conteúdo estiver colapsado, expande-o
            if (contentEl.classList.contains('collapsed')) {
                // Simula clique no botão expandir
                const expandButton = resultItem.querySelector('.expand-button');
                if (expandButton && expandButton.textContent === 'Expandir') {
                    expandButton.click();
                }
            }
        }
        
        // Marca o item todo como ativo
        resultItem.classList.add('current-reading');
    }
}

// Função para remover todos os destaques de leitura
function removeAllReadingHighlights() {
    // Remove classe de destaque de todos os conteúdos
    const activeContents = document.querySelectorAll('.content.reading-active');
    activeContents.forEach(el => el.classList.remove('reading-active'));
    
    // Remove classe de destaque de todos os itens
    const activeItems = document.querySelectorAll('.result-item.current-reading');
    activeItems.forEach(el => el.classList.remove('current-reading'));
}

// Função para fazer scroll até o item sendo lido
function scrollToCurrentReading(index) {
    const resultItem = document.getElementById(`result-${index}`);
    if (resultItem) {
        // Calcula posição para centralizar o elemento na tela
        const rect = resultItem.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Scroll suave para o elemento
        window.scrollTo({
            top: scrollTop + rect.top - (window.innerHeight / 3),
            behavior: 'smooth'
        });
    }
}

// Função para atualizar o estado do botão de leitura individual
function updateReadingButtonState(index, isSpeaking) {
    const resultItem = document.getElementById(`result-${index}`);
    if (resultItem) {
        const readButton = resultItem.querySelector('.read-button');
        if (readButton) {
            if (isSpeaking) {
                readButton.textContent = 'Parar';
                readButton.dataset.speaking = 'true';
                readButton.classList.add('speaking');
            } else {
                readButton.textContent = 'Ler';
                readButton.dataset.speaking = 'false';
                readButton.classList.remove('speaking');
            }
        }
    }
}

// Inicializa o banco de dados
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Erro ao abrir o banco de dados:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Banco de dados aberto com sucesso');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Cria o object store para armazenar os arquivos
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                console.log('Object store criado');
            }
        };
    });
}

// Salva um arquivo no IndexedDB
function saveFileToDatabase(file) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Banco de dados não inicializado'));
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Verifica se o arquivo já existe pelo nome
        const nameIndex = store.index('name');
        const getRequest = nameIndex.getAll(file.name);

        getRequest.onsuccess = (event) => {
            const existingFiles = event.target.result;

            // Se o arquivo já existir, atualiza em vez de adicionar novo
            if (existingFiles.length > 0) {
                file.id = existingFiles[0].id;
                const putRequest = store.put(file);

                putRequest.onsuccess = () => resolve(file);
                putRequest.onerror = (e) => reject(e.target.error);
            } else {
                // Adiciona novo arquivo
                const addRequest = store.add(file);

                addRequest.onsuccess = (event) => {
                    file.id = event.target.result;
                    resolve(file);
                };

                addRequest.onerror = (e) => reject(e.target.error);
            }
        };

        getRequest.onerror = (e) => reject(e.target.error);
    });
}

// Carrega todos os arquivos do IndexedDB
function loadFilesFromDatabase() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Banco de dados não inicializado'));
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Erro ao carregar arquivos:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Remove um arquivo do IndexedDB
function removeFileFromDatabase(fileId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Banco de dados não inicializado'));
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(fileId);

        request.onsuccess = () => {
            console.log(`Arquivo com ID ${fileId} removido do banco de dados`);
            resolve();
        };

        request.onerror = (event) => {
            console.error('Erro ao remover arquivo:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Limpa todos os arquivos do IndexedDB
function clearDatabase() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Banco de dados não inicializado'));
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            console.log('Todos os arquivos foram removidos do banco de dados');
            resolve();
        };

        request.onerror = (event) => {
            console.error('Erro ao limpar banco de dados:', event.target.error);
            reject(event.target.error);
        };
    });
}

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
//Inicialização do aplicativo com considerações responsivas

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializa o banco de dados
        await initDatabase();

        // Carrega os arquivos salvos
        const savedFiles = await loadFilesFromDatabase();
        if (savedFiles && savedFiles.length > 0) {
            // Verifica se já existe um arquivo de exemplo na lista carregada
            const hasDefaultSample = savedFiles.some(file => file.name === "Texto de Exemplo");
            
            // Se não existir, mantém o que foi adicionado na inicialização do appState
            if (hasDefaultSample) {
                // Se já existir um arquivo de exemplo no banco de dados, usa apenas os arquivos do banco
                appState.files = savedFiles;
            } else {
                // Adiciona os arquivos do banco de dados mantendo o exemplo
                appState.files = [...appState.files, ...savedFiles];
            }
            
            updateFileList();

            // Notificar o usuário
            const notification = document.createElement('div');
            notification.className = 'notification success';
            notification.textContent = `${savedFiles.length} arquivo(s) carregado(s) do armazenamento local.`;
            document.body.appendChild(notification);

            // Remove a notificação após alguns segundos
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);
        }
    } catch (error) {
        console.error('Erro ao inicializar a persistência:', error);

        // Mostrar erro ao usuário
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = 'Erro ao carregar arquivos salvos. Verifique se seu navegador suporta IndexedDB.';
        document.body.appendChild(notification);

        // Remove a notificação após alguns segundos
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }

    // Inicializa o restante do aplicativo
    initEventListeners();
    addTouchSupport();

    // Verifica se está em um dispositivo móvel e ajusta a UI
    if (isMobileDevice()) {
        document.body.classList.add('mobile-device');

        const limitResultsCheckbox = document.getElementById('limitResults');
        if (limitResultsCheckbox) {
            limitResultsCheckbox.checked = true;
        }
    }
    
    // Atualiza a lista de arquivos (para mostrar o arquivo de exemplo)
    updateFileList();
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

if (!appState.defaultSample) {
    appState.defaultSample = {
        name: "Texto de Exemplo",
        date: new Date().toISOString(),
        id: "default-sample",
        paragraphs: [
            "ajuda: Este é um texto de exemplo para testar a funcionalidade de busca. Você pode buscar por palavras como 'exemplo', 'teste', 'funcionalidade' ou 'busca'.",
            "ajuda: A ferramenta de busca possui diversas opções como busca sensível a maiúsculas e minúsculas, busca de palavras inteiras, e até mesmo expressões regulares.",
            "ajuda: Experimente usar diferentes termos de busca para ver como os resultados são destacados. Você também pode testar recursos como a leitura em voz alta e edição de texto.",
            "ajuda: Quando você carregar seus próprios arquivos, este texto de exemplo não será mais exibido nos resultados de busca.",
            "Boas buscas!"
        ]
    };
}

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
// Modificar a função de manipulação de upload de arquivos
async function handleFileUpload(event) {
    const files = event.target.files;

    if (files.length === 0) return;

    for (const file of files) {
        try {
            const content = await readFileContent(file);
            const paragraphs = splitIntoParagraphs(content);

            const fileObj = {
                name: file.name,
                content: content,
                paragraphs: paragraphs,
                date: new Date().toISOString()
            };

            // Adiciona ao estado local
            appState.files.push(fileObj);

            // Salva no IndexedDB
            await saveFileToDatabase(fileObj);
        } catch (error) {
            console.error(`Erro ao ler o arquivo ${file.name}:`, error);
        }
    }

    updateFileList();
    fileInput.value = ''; // Resetar o input para permitir recarregar o mesmo arquivo
}

// Modificar a função para remover arquivo
async function removeFile(index, fileId) {
    // Remove do estado local
    appState.files.splice(index, 1);

    // Remove do IndexedDB se tiver ID
    if (fileId !== undefined) {
        try {
            await removeFileFromDatabase(fileId);
        } catch (error) {
            console.error('Erro ao remover arquivo do banco de dados:', error);
        }
    }

    updateFileList();
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

/**
 * Divide conteúdo em parágrafos com detecção inteligente de blocos de código
 * @param {string} content - O conteúdo a ser dividido
 * @return {string[]} - Array com os parágrafos separados
 */
function smartSplitIntoParagraphs(content) {
    // Divide por linhas vazias (paragrafação tradicional)
    const blocks = content.split(/\n\s*\n/);
    const paragraphs = [];

    blocks.forEach(block => {
        if (!block.trim()) return; // Ignora blocos vazios
        
        // Se o bloco contém múltiplas linhas
        if (block.includes('\n')) {
            // Verifica se parece ser um bloco de código
            if (isCodeLike(block)) {
                // Processa como um único bloco de código preservando a estrutura
                paragraphs.push(block.trim());
            } else {
                // Processa como texto normal
                processTextBlock(block, paragraphs);
            }
        } else {
            // Bloco de linha única
            paragraphs.push(block.trim());
        }
    });

    return paragraphs;
}

/**
 * Processa um bloco de texto dividindo-o em parágrafos lógicos
 * @param {string} block - O bloco de texto a ser processado
 * @param {string[]} paragraphs - Array onde os parágrafos serão adicionados
 */
function processTextBlock(block, paragraphs) {
    const lines = block.split('\n');
    let currentParagraph = '';
    let lineCount = 0;
    
    // Se houver alguma indicação de código, tratamos como um único bloco
    if (containsCodeIndicators(block)) {
        paragraphs.push(block.trim());
        return;
    }

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

/**
 * Verifica se o texto contém indicadores de código
 * @param {string} text - O texto a ser analisado
 * @return {boolean} - true se contém indicadores de código
 */
function containsCodeIndicators(text) {
    const codeIndicators = /function\s+\w+|class\s+\w+|(if|for|while|switch)\s*\(|{|}|=>|\/\/\s|\/\*|\*\/|#include|#define|(var|let|const)\s+\w+\s*=|return\s+|import\s+|export\s+/;
    return codeIndicators.test(text);
}

/**
 * Verifica se um bloco de texto parece ser código
 * @param {string} block - O bloco a ser analisado
 * @return {boolean} - true se parece código, false caso contrário
 */
function isCodeLike(block) {
    // Cache de expressões regulares para melhorar performance
    const codeIndicators = /function|class|if|for|while|switch|var |let |const |import |export |return |{|}|=>|\/\/|\/\*|\*\/|#include|#define/;
    const indentationPattern = /\n\s{2,}|\n\t/;
    
    // Heurísticas para detectar código
    const hasCodeIndicators = codeIndicators.test(block);
    const hasMultipleIndentation = indentationPattern.test(block);
    const hasBraces = block.includes('{') && block.includes('}');
    
    // Verifica se o bloco tem chaves abertas
    const openBraces = (block.match(/{/g) || []).length;
    const closeBraces = (block.match(/}/g) || []).length;
    const hasUnbalancedBraces = openBraces !== closeBraces;
    
    return hasCodeIndicators || hasMultipleIndentation || hasBraces || hasUnbalancedBraces;
}

/**
 * Conta o número de chaves abertas e fechadas para verificar se estão balanceadas
 * @param {string} text - O texto a ser analisado
 * @return {Object} - Objeto com contagem de chaves e indicação de balanceamento
 */
function countBraces(text) {
    const openBraces = (text.match(/{/g) || []).length;
    const closeBraces = (text.match(/}/g) || []).length;
    
    return {
        open: openBraces,
        close: closeBraces,
        balanced: openBraces === closeBraces
    };
}

// Atualiza a lista de arquivos na UI
// Modificar a função de atualização da lista de arquivos
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
        // Adicionar data de upload se disponível
        let uploadDate = '';
        if (file.date) {
            const date = new Date(file.date);
            uploadDate = ` (${date.toLocaleDateString()})`;
        }
        nameSpan.innerHTML = `<strong>${file.name}</strong>${uploadDate} <span class="file-meta">${file.paragraphs.length} parágrafos</span>`;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remover';
        removeButton.addEventListener('click', () => {
            removeFile(index, file.id);
        });

        fileItem.appendChild(nameSpan);
        fileItem.appendChild(removeButton);
        loadedFilesEl.appendChild(fileItem);
    });
    // Adicionar botão para limpar todos os arquivos
    if (appState.files.length > 0) {
        const clearButton = document.createElement('button');
        clearButton.className = 'clear-all-button';
        clearButton.textContent = 'Limpar Todos os Arquivos';
        clearButton.addEventListener('click', async () => {
            if (confirm('Tem certeza que deseja remover todos os arquivos?')) {
                try {
                    await clearDatabase();
                    appState.files = [];
                    updateFileList();
                } catch (error) {
                    console.error('Erro ao limpar arquivos:', error);
                }
            }
        });
        loadedFilesEl.appendChild(clearButton);
    }
}


// Executa a busca
function performSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        searchResultsEl.innerHTML = '<div class="no-results">Digite algo para buscar</div>';
        statsEl.innerHTML = '';
        return;
    }

    // Remover a verificação que impede busca quando não há arquivos
    // e deixar o texto de exemplo ser usado

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
// Modificar a função de busca para incluir o texto de exemplo quando não houver arquivos
function searchInFiles(query, options) {
    const results = [];
    let searchRegex;

    // Adicione opção para ignorar acentos
    const ignoreAccents = document.getElementById('ignoreAccents') &&
        document.getElementById('ignoreAccents').checked;

    // Normaliza a query se necessário
    const normalizedQuery = ignoreAccents ? normalizeText(query) : query;

    try {
        // Criar regex baseado nas opções (código existente)
        if (options.useRegex) {
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
    const filesToSearch = appState.files.length > 0 ? appState.files : [];
    
    // Se não houver arquivos carregados, usa o texto de exemplo
    if (filesToSearch.length === 0 && appState.defaultSample) {
        appState.defaultSample.paragraphs.forEach(paragraph => {
            // Se estiver ignorando acentos, normaliza o texto do parágrafo
            const textToSearch = ignoreAccents ? normalizeText(paragraph) : paragraph;

            // Conta o número de ocorrências para determinar relevância
            const matches = textToSearch.match(searchRegex);
            const matchCount = matches ? matches.length : 0;

            if (matchCount > 0) {
                results.push({
                    file: appState.defaultSample.name,
                    paragraph: paragraph,
                    relevance: matchCount,
                    isDefaultSample: true
                });
            }
        });
    } else {
        // Busca normal nos arquivos carregados
        filesToSearch.forEach(file => {
            file.paragraphs.forEach(paragraph => {
                // Se estiver ignorando acentos, normaliza o texto do parágrafo
                const textToSearch = ignoreAccents ? normalizeText(paragraph) : paragraph;

                // Conta o número de ocorrências para determinar relevância
                const matches = textToSearch.match(searchRegex);
                const matchCount = matches ? matches.length : 0;

                if (matchCount > 0) {
                    results.push({
                        file: file.name,
                        paragraph: paragraph,
                        relevance: matchCount
                    });
                }
            });
        });
    }

    // Ordena por relevância (número de ocorrências)
    results.sort((a, b) => b.relevance - a.relevance);

    return results;
}

// Função auxiliar para escapar caracteres especiais em regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Adicionar novo recurso para expandir/colapsar resultados
// Modificar a função displayResults para incluir o novo comportamento
function displayResults(searchTime) {
    searchResultsEl.innerHTML = '';

    if (appState.searchResults.length === 0) {
        searchResultsEl.innerHTML = '<div class="no-results">Nenhum resultado encontrado</div>';
        statsEl.innerHTML = `Busca concluída em ${searchTime} segundos. Nenhum resultado encontrados.`;
        updateStats(searchTime);
        return;
    }

    // Verificar se estamos mostrando resultados do texto de exemplo
    const isShowingDefaultSample = appState.files.length === 0 && appState.searchResults.some(r => r.isDefaultSample);
    
    if (isShowingDefaultSample) {
        // Adicionar uma nota destacada na parte superior dos resultados
        const noteEl = document.createElement('div');
        noteEl.className = 'default-sample-note';
        noteEl.innerHTML = `
            <strong>Nota:</strong> Como não há arquivos carregados, estamos mostrando resultados de um texto de exemplo.
            <a href="#" onclick="document.getElementById('fileInput').click(); return false;">Clique aqui para carregar seus arquivos</a>.
        `;
        searchResultsEl.appendChild(noteEl);
    }

    // Mostra estatísticas
    statsEl.innerHTML = `Busca concluída em ${searchTime} segundos. ${appState.searchResults.length} resultados encontrados.`;
    updateStats(searchTime);

    // Verificar suporte à síntese de voz
    if (!window.speechSynthesis) {
        console.warn('Síntese de voz não suportada neste navegador');
    }

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
            expandButton.addEventListener('click', function (e) {
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
                setTimeout(() => { }, 50);
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

        // Adiciona botão de editar
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.textContent = 'Editar';
        editButton.onclick = function () {
            editResultContent(`result-${index}`, result);
        };
        buttonContainer.appendChild(editButton);
        
        // Adiciona botão de leitura em voz alta (COMPLETAMENTE REFORMULADO)
        const readButton = document.createElement('button');
        readButton.className = 'read-button';
        readButton.textContent = 'Ler';
        readButton.dataset.speaking = 'false';
        
        readButton.onclick = function () {
            // Verificar se a API é suportada
            if (!window.speechSynthesis) {
                alert('Desculpe, seu navegador não suporta leitura em voz alta.');
                return;
            }
            
            // Obtém o texto puro (sem HTML)
            const textToRead = result.paragraph;
            
            // Se estamos em modo de leitura em sequência, pare tudo
            if (isReadingAll) {
                stopAllReading();
                return;
            }
            
            // Se já estiver lendo este item específico (botão está como "Parar")
            if (readButton.dataset.speaking === 'true') {
                // Parar leitura
                if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
                
                // Remover destaque
                removeAllReadingHighlights();
                
                // Resetar estado do botão
                readButton.textContent = 'Ler';
                readButton.dataset.speaking = 'false';
                readButton.classList.remove('speaking');
                return;
            }
            
            // Se estávamos lendo outro item, pare primeiro
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                
                // Resetar todos os outros botões
                document.querySelectorAll('.read-button').forEach(btn => {
                    if (btn !== readButton) {
                        btn.textContent = 'Ler';
                        btn.dataset.speaking = 'false';
                        btn.classList.remove('speaking');
                    }
                });
                
                removeAllReadingHighlights();
            }
            
            // Destacar este resultado
            highlightCurrentReading(index);
            
            // Criar uma nova instância de SpeechSynthesisUtterance
            const utterance = new SpeechSynthesisUtterance(textToRead);
            
            // Definir idioma para português (Brasil)
            utterance.lang = 'pt-BR';
            
            // Salvar referência
            currentSpeechUtterance = utterance;
            
            // Evento quando a leitura terminar
            utterance.onend = function() {
                readButton.textContent = 'Ler';
                readButton.dataset.speaking = 'false';
                readButton.classList.remove('speaking');
                
                // Remover destaque
                if (!isReadingAll) {
                    removeAllReadingHighlights();
                }
            };
            
            // Evento em caso de erro
            utterance.onerror = function() {
                readButton.textContent = 'Ler';
                readButton.dataset.speaking = 'false';
                readButton.classList.remove('speaking');
                
                // Remover destaque
                removeAllReadingHighlights();
            };
            
            // Iniciar leitura
            window.speechSynthesis.speak(utterance);
            
            // Atualizar estado do botão
            readButton.textContent = 'Parar';
            readButton.dataset.speaking = 'true';
            readButton.classList.add('speaking');
        };
        
        buttonContainer.appendChild(readButton);
        
        // Adiciona botão de adicionar parágrafo
        const addParagraphButton = document.createElement('button');
        addParagraphButton.className = 'add-paragraph-button';
        addParagraphButton.textContent = 'Novo';
        addParagraphButton.onclick = function () {
            addNewParagraph(result.file);
        };
        buttonContainer.appendChild(addParagraphButton);

        // Adiciona botão de exportar arquivo
        const exportButton = document.createElement('button');
        exportButton.className = 'export-button';
        exportButton.textContent = 'Exportar';
        exportButton.onclick = function () {
            exportFile(result.file);
        };
        buttonContainer.appendChild(exportButton);

        // Adiciona botão de excluir parágrafo
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Excluir';
        deleteButton.onclick = function (e) {
            // Prevenir propagação do evento
            e.preventDefault();
            e.stopPropagation();

            deleteParagraph(`result-${index}`, result);
        };
        buttonContainer.appendChild(deleteButton);

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
            contextButton.onclick = function () {
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

    // Adicionar botão "Ler Todos" no topo dos resultados
    addReadAllButton();

    // Parar qualquer leitura em andamento se o usuário iniciar uma nova busca
    const searchForm = document.querySelector('#search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', stopAllReading);
    }

    filterResults();
}



// Função para mostrar estatísticas avançadas
function updateStats(searchTime = null) {
    if (searchTime === null) {
        // Se não houver tempo de busca, apenas atualiza a contagem de resultados
        const currentStats = statsEl.innerHTML;
        if (currentStats.includes('resultados encontrados')) {
            // Atualiza apenas a parte da contagem de resultados
            statsEl.innerHTML = currentStats.replace(/\d+ resultados encontrados/, `${appState.searchResults.length} resultados encontrados`);
        }
        return;
    }

    // A partir daqui, temos um tempo de busca para mostrar estatísticas completas
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
    closeButton.onclick = function () {
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
    copyContextButton.onclick = function () {
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

// Função para editar o conteúdo do resultado
function editResultContent(resultId, result) {
    const resultItem = document.getElementById(resultId);
    const contentEl = resultItem.querySelector('.content');

    // Guarda o conteúdo original para uso posterior
    const originalContent = contentEl.innerHTML;
    const originalParagraph = result.paragraph;

    // Substitui o conteúdo por um textarea editável
    const textArea = document.createElement('textarea');
    textArea.value = result.paragraph;
    textArea.className = 'edit-textarea';
    textArea.style.width = '100%';
    textArea.style.minHeight = '200px';

    // Substitui o conteúdo pelo textarea
    contentEl.innerHTML = '';
    contentEl.appendChild(textArea);

    // Cria botões de salvar e cancelar
    const actionButtons = document.createElement('div');
    actionButtons.className = 'edit-actions';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Salvar';
    saveButton.onclick = function () {
        // Obtém o arquivo completo do banco de dados
        getFileFromDatabase(result.file)
            .then(fileData => {
                // Obtém o novo conteúdo do textarea
                const newParagraphContent = textArea.value;

                // Atualiza o conteúdo do arquivo completo
                let newContent = fileData.content.replace(originalParagraph, newParagraphContent);

                // Atualiza também os parágrafos armazenados no objeto do arquivo
                if (fileData.paragraphs) {
                    const paragraphIndex = fileData.paragraphs.indexOf(originalParagraph);
                    if (paragraphIndex !== -1) {
                        fileData.paragraphs[paragraphIndex] = newParagraphContent;
                    }
                }

                // Atualiza o conteúdo completo do arquivo
                fileData.content = newContent;

                // Atualiza no banco de dados
                return updateFileInDatabase(fileData.id, newContent)
                    .then(() => fileData); // Passa o fileData adiante
            })
            .then((fileData) => {
                // Atualiza o objeto do resultado em memória
                result.paragraph = textArea.value;

                // IMPORTANTE: Atualiza também o appState.files para refletir a mudança
                const fileIndex = appState.files.findIndex(f => f.id === fileData.id);
                if (fileIndex !== -1) {
                    appState.files[fileIndex] = fileData;
                }

                // Atualiza a visualização
                const query = searchInput.value.trim();
                let highlightedText;
                try {
                    const options = {
                        caseSensitive: caseSensitiveEl.checked,
                        useRegex: useRegexEl.checked
                    };
                    highlightedText = highlightSearchTerms(textArea.value, query, options);
                } catch (error) {
                    console.error('Erro ao destacar texto:', error);
                    highlightedText = textArea.value;
                }

                contentEl.innerHTML = highlightedText;

                // Atualiza também os resultados da pesquisa para refletir a mudança
                for (let i = 0; i < appState.searchResults.length; i++) {
                    if (appState.searchResults[i].paragraph === originalParagraph &&
                        appState.searchResults[i].file === result.file) {
                        appState.searchResults[i].paragraph = textArea.value;
                    }
                }

                alert('Conteúdo atualizado com sucesso!');
            })
            .catch(error => {
                console.error('Erro ao salvar alterações:', error);
                contentEl.innerHTML = originalContent;
                alert('Erro ao salvar alterações: ' + error.message);
            });
    };

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancelar';
    cancelButton.onclick = function () {
        // Restaura o conteúdo original
        contentEl.innerHTML = originalContent;
    };

    actionButtons.appendChild(saveButton);
    actionButtons.appendChild(cancelButton);
    contentEl.appendChild(actionButtons);

    // Foca no textarea
    textArea.focus();
}

// Função para exportar o arquivo completo
function exportFile(fileName) {
    // Obtém o arquivo do banco de dados
    getFileFromDatabase(fileName)
        .then(fileData => {
            // Cria um blob com o conteúdo
            const blob = new Blob([fileData.content], { type: 'text/plain' });

            // Cria um URL para o blob
            const url = window.URL.createObjectURL(blob);

            // Cria um elemento de link para download
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;

            // Adiciona o link ao documento e clica nele
            document.body.appendChild(a);
            a.click();

            // Limpa
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
            console.error('Erro ao exportar arquivo:', error);
            alert('Erro ao exportar o arquivo: ' + error.message);
        });
}

// Função para atualizar o conteúdo de um arquivo no IndexedDB
function updateFileInDatabase(fileId, newContent) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Banco de dados não inicializado'));
            return;
        }

        // Primeiro, obtemos o arquivo atual
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(fileId);

        getRequest.onsuccess = (event) => {
            const fileData = event.target.result;
            if (!fileData) {
                reject(new Error(`Arquivo com ID ${fileId} não encontrado`));
                return;
            }

            // Atualizamos o conteúdo do arquivo
            fileData.content = newContent;

            // Atualizamos também os parágrafos
            fileData.paragraphs = splitIntoParagraphs(newContent);

            // Salvamos de volta no banco de dados
            const putRequest = store.put(fileData);

            putRequest.onsuccess = () => {
                console.log(`Arquivo com ID ${fileId} atualizado no banco de dados`);
                resolve(fileData);
            };

            putRequest.onerror = (event) => {
                console.error('Erro ao atualizar arquivo:', event.target.error);
                reject(event.target.error);
            };
        };

        getRequest.onerror = (event) => {
            console.error('Erro ao obter arquivo para atualização:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Função para obter um arquivo específico do IndexedDB
function getFileFromDatabase(fileName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Banco de dados não inicializado'));
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        // Assumindo que há um índice para o nome do arquivo
        // Se não houver, você precisará obter todos os arquivos e filtrar
        const index = store.index('name'); // Ajuste para o nome correto do seu índice
        const request = index.get(fileName);

        request.onsuccess = (event) => {
            const file = event.target.result;
            if (file) {
                resolve(file);
            } else {
                // Se não encontrar usando o índice, tente procurar manualmente
                const getAllRequest = store.getAll();
                getAllRequest.onsuccess = (event) => {
                    const files = event.target.result;
                    const foundFile = files.find(f => f.name === fileName);
                    if (foundFile) {
                        resolve(foundFile);
                    } else {
                        reject(new Error(`Arquivo "${fileName}" não encontrado`));
                    }
                };
                getAllRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            }
        };

        request.onerror = (event) => {
            console.error('Erro ao buscar arquivo:', event.target.error);
            reject(event.target.error);
        };
    });
}

function addNewParagraph(fileName, afterParagraphIndex = null) {
    // Obter o arquivo do banco de dados
    getFileFromDatabase(fileName)
        .then(fileData => {
            // Criar um modal ou popup para inserir o novo parágrafo
            const modal = document.createElement('div');
            modal.className = 'edit-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'edit-modal-content';
            
            const modalHeader = document.createElement('div');
            modalHeader.className = 'edit-modal-header';
            modalHeader.innerHTML = `<h3>Adicionar parágrafo em "${fileName}"</h3>`;
            
            const closeButton = document.createElement('span');
            closeButton.className = 'close-button';
            closeButton.innerHTML = '&times;';
            closeButton.onclick = function() {
                document.body.removeChild(modal);
            };
            modalHeader.appendChild(closeButton);
            
            // Se não houver parágrafos definidos, dividir o conteúdo
            if (!fileData.paragraphs) {
                fileData.paragraphs = splitIntoParagraphs(fileData.content);
            }
            
            // Adicionar um seletor de parágrafo se afterParagraphIndex não for fornecido
            if (afterParagraphIndex === null) {
                const paragraphSelector = document.createElement('div');
                paragraphSelector.className = 'paragraph-selector';
                
                const selectLabel = document.createElement('label');
                selectLabel.textContent = 'Inserir após o parágrafo:';
                
                const select = document.createElement('select');
                select.className = 'paragraph-select';
                
                // Opção para adicionar no início
                const startOption = document.createElement('option');
                startOption.value = '-1';
                startOption.textContent = 'Início do documento';
                select.appendChild(startOption);
                
                // Adicionar cada parágrafo como uma opção (limitado a uma prévia)
                fileData.paragraphs.forEach((paragraph, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    
                    // Limitar prévia do parágrafo a 50 caracteres
                    const preview = paragraph.length > 50 ? paragraph.substring(0, 50) + '...' : paragraph;
                    option.textContent = `Parágrafo ${index + 1}: ${preview}`;
                    
                    select.appendChild(option);
                });
                
                // Opção para adicionar no final (padrão)
                const endOption = document.createElement('option');
                endOption.value = fileData.paragraphs.length;
                endOption.textContent = 'Final do documento';
                endOption.selected = true;
                select.appendChild(endOption);
                
                paragraphSelector.appendChild(selectLabel);
                paragraphSelector.appendChild(select);
                
                modalContent.appendChild(modalHeader);
                modalContent.appendChild(paragraphSelector);
            } else {
                modalContent.appendChild(modalHeader);
            }
            
            const textArea = document.createElement('textarea');
            textArea.className = 'new-paragraph-textarea';
            textArea.placeholder = 'Digite seu novo parágrafo aqui...';
            textArea.style.width = '100%';
            textArea.style.minHeight = '200px';
            textArea.style.marginTop = '15px';
            textArea.style.marginBottom = '15px';
            
            const actionButtons = document.createElement('div');
            actionButtons.className = 'edit-actions';
            
            const saveButton = document.createElement('button');
            saveButton.textContent = 'Salvar';
            saveButton.onclick = function() {
                const newParagraphText = textArea.value.trim();
                
                if (!newParagraphText) {
                    alert('Por favor, digite algum conteúdo para o novo parágrafo.');
                    return;
                }
                
                // Determinar o índice após o qual inserir o novo parágrafo
                let insertAfterIndex;
                if (afterParagraphIndex !== null) {
                    insertAfterIndex = afterParagraphIndex;
                } else {
                    const select = document.querySelector('.paragraph-select');
                    insertAfterIndex = parseInt(select.value);
                }
                
                // Inserir o novo parágrafo na posição apropriada no array de parágrafos
                if (insertAfterIndex === -1) {
                    // Inserir no início
                    fileData.paragraphs.unshift(newParagraphText);
                } else if (insertAfterIndex >= fileData.paragraphs.length) {
                    // Inserir no final
                    fileData.paragraphs.push(newParagraphText);
                } else {
                    // Inserir após o parágrafo especificado
                    fileData.paragraphs.splice(insertAfterIndex + 1, 0, newParagraphText);
                }
                
                // Reconstruir o conteúdo do arquivo a partir dos parágrafos
                const newContent = fileData.paragraphs.join('\n\n');
                
                // Atualizar no banco de dados
                updateFileInDatabase(fileData.id, newContent)
                    .then((updatedFile) => {
                        // Atualizar o arquivo no appState
                        const fileIndex = appState.files.findIndex(f => f.id === fileData.id);
                        if (fileIndex !== -1) {
                            appState.files[fileIndex] = updatedFile;
                        }
                        
                        // Fechar o modal
                        document.body.removeChild(modal);
                        
                        // Mostrar mensagem de sucesso
                        const notification = document.createElement('div');
                        notification.className = 'notification success';
                        
                        if (insertAfterIndex === -1) {
                            notification.textContent = `Parágrafo adicionado no início do arquivo "${fileName}".`;
                        } else if (insertAfterIndex >= fileData.paragraphs.length - 1) {
                            notification.textContent = `Parágrafo adicionado no final do arquivo "${fileName}".`;
                        } else {
                            notification.textContent = `Parágrafo adicionado após o parágrafo ${insertAfterIndex + 1} no arquivo "${fileName}".`;
                        }
                        
                        document.body.appendChild(notification);
                        
                        // Remover a notificação após alguns segundos
                        setTimeout(() => {
                            document.body.removeChild(notification);
                        }, 3000);
                        
                        // Se houver uma pesquisa ativa, sugerir atualizar os resultados
                        if (appState.searchResults.length > 0) {
                            const updateButton = document.createElement('button');
                            updateButton.className = 'update-search-button';
                            updateButton.textContent = 'Atualizar resultados da pesquisa';
                            updateButton.onclick = function() {
                                performSearch();
                                document.body.removeChild(updateButton);
                            };
                            notification.appendChild(document.createElement('br'));
                            notification.appendChild(updateButton);
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao adicionar parágrafo:', error);
                        alert('Erro ao adicionar parágrafo: ' + error.message);
                    });
            };
            
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancelar';
            cancelButton.onclick = function() {
                document.body.removeChild(modal);
            };
            
            actionButtons.appendChild(saveButton);
            actionButtons.appendChild(cancelButton);
            
            modalContent.appendChild(textArea);
            modalContent.appendChild(actionButtons);
            modal.appendChild(modalContent);
            
            // Adicionar modal ao corpo do documento
            document.body.appendChild(modal);
            
            // Focar no textarea
            textArea.focus();
        })
        .catch(error => {
            console.error('Erro ao carregar arquivo para adicionar parágrafo:', error);
            alert('Erro ao carregar arquivo: ' + error.message);
        });
}
function deleteParagraph(resultId, result) {
    // Confirmar antes de excluir
    if (!confirm(`Tem certeza que deseja excluir este parágrafo do arquivo "${result.file}"?`)) {
        return;
    }

    // Obter o arquivo do banco de dados
    getFileFromDatabase(result.file)
        .then(fileData => {
            // Localizar e remover o parágrafo do conteúdo
            const paragraphToDelete = result.paragraph;

            // Verificar se o parágrafo existe no conteúdo
            if (!fileData.content.includes(paragraphToDelete)) {
                alert('Não foi possível localizar o parágrafo exato no arquivo. A operação foi cancelada.');
                return;
            }

            // Criar novo conteúdo sem o parágrafo
            let newContent = fileData.content;

            // Tratamento especial para remover o parágrafo e manter a formatação
            // Consideramos vários casos: parágrafo no início, meio ou fim do conteúdo
            if (newContent.startsWith(paragraphToDelete)) {
                // Parágrafo está no início
                newContent = newContent.substring(paragraphToDelete.length).trimStart();
                // Se há quebras de linha extras no início após remoção, removê-las
                while (newContent.startsWith('\n')) {
                    newContent = newContent.substring(1);
                }
            } else if (newContent.endsWith(paragraphToDelete)) {
                // Parágrafo está no final
                newContent = newContent.substring(0, newContent.length - paragraphToDelete.length).trimEnd();
            } else {
                // Parágrafo está no meio - temos que ser cuidadosos com a formatação
                const beforeText = newContent.substring(0, newContent.indexOf(paragraphToDelete));
                const afterText = newContent.substring(newContent.indexOf(paragraphToDelete) + paragraphToDelete.length);

                // Conectar as partes mantendo apenas uma quebra de linha dupla entre elas
                newContent = beforeText.trimEnd() + '\n\n' + afterText.trimStart();
            }

            // Atualizar os parágrafos
            if (fileData.paragraphs) {
                const paragraphIndex = fileData.paragraphs.indexOf(paragraphToDelete);
                if (paragraphIndex !== -1) {
                    fileData.paragraphs.splice(paragraphIndex, 1);
                }
            } else {
                fileData.paragraphs = splitIntoParagraphs(newContent);
            }

            // Atualizar o conteúdo do arquivo
            return updateFileInDatabase(fileData.id, newContent)
                .then(updatedFile => {
                    // Atualizar o arquivo no appState
                    const fileIndex = appState.files.findIndex(f => f.id === fileData.id);
                    if (fileIndex !== -1) {
                        appState.files[fileIndex] = updatedFile;
                    }

                    // Remover o resultado da lista de resultados
                    const resultIndex = appState.searchResults.findIndex(r =>
                        r.file === result.file && r.paragraph === paragraphToDelete);

                    if (resultIndex !== -1) {
                        appState.searchResults.splice(resultIndex, 1);
                    }

                    // Remover o elemento da interface
                    const resultElement = document.getElementById(resultId);
                    if (resultElement) {
                        resultElement.classList.add('fade-out');

                        // Após a animação terminar, remover o elemento
                        setTimeout(() => {
                            if (resultElement.parentNode) {
                                resultElement.parentNode.removeChild(resultElement);
                            }

                            // Atualizar estatísticas
                            updateStats();
                        }, 300);
                    }

                    // Mostrar mensagem de sucesso
                    const notification = document.createElement('div');
                    notification.className = 'notification success';
                    notification.textContent = `Parágrafo excluído com sucesso do arquivo "${result.file}".`;
                    document.body.appendChild(notification);

                    // Remover a notificação após alguns segundos
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 3000);
                });
        })
        .catch(error => {
            console.error('Erro ao excluir parágrafo:', error);
            alert('Erro ao excluir parágrafo: ' + error.message);
        });
}
