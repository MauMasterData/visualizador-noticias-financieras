// script.js

// -----------------------------------------------------------------------------
//  SECCIÓN 1: CONFIGURACIÓN DE APIS Y DATOS ESTÁTICOS
//  Aquí guardamos todas las "variables mágicas" que usaremos.
//  Si en el futuro necesitas cambiar una clave o el nombre de un mercado,
//  sabrás exactamente dónde venir.
// -----------------------------------------------------------------------------

const CONFIG = {
    news: {
        apiKey: '2e8c1e5ba3784efe97e8447fd5a06c60', // Mi clave para NewsAPI
        url: 'https://newsapi.org/v2/everything',
        params: 'q=finanzas%20OR%20bolsa%20OR%20economia&language=es&sortBy=publishedAt&pageSize=20',
        fallback: './noticias.json' // Por si la API falla, ¡siempre hay un plan B!
    },
    alphaVantage: {
        apiKey: 'DBWWV2A36I5I54AS', // Mi clave para Alpha Vantage
        url: 'https://www.alphavantage.co/query',
        symbols: [ // Los 5 mercados que decidimos mostrar
            { symbol: 'SPY', name: 'S&P 500' },
            { symbol: 'NDAQ', name: 'NASDAQ' },
            { symbol: 'DIA', name: 'Dow Jones' },
            { symbol: 'DAX', name: 'DAX (Alemania)' },
            { symbol: 'N225', name: 'Nikkei 225 (Japón)' }
        ],
        rateLimitDelay: 12000 // Pausamos 12s para respetar el límite de 5 llamadas/min
    }
};

// Nuestro léxico de sentimiento, pero ahora con puntuaciones para más matices.
// Un "boom" no es lo mismo que un "estable".
const SENTIMIENTO_LEXICO = {
    positivo: {
        'fuerte': 3, 'récord': 3, 'crecimiento': 3, 'éxito': 3, 'boom': 3, 'disparo': 3, 'alza': 3,
        'ganancias': 2, 'aumento': 2, 'beneficio': 2, 'recuperación': 2, 'expansión': 2, 'mejor': 2, 'mejora': 2, 'supera': 2,
        'estable': 1, 'subida': 1, 'ascenso': 1, 'alcanza': 1, 'avanza': 1, 'impulso': 1
    },
    negativo: {
        'crisis': 3, 'quiebra': 3, 'recesión': 3, 'colapso': 3, 'desplome': 3, 'caída': 3, 'incertidumbre': 3,
        'pérdidas': 2, 'descenso': 2, 'baja': 2, 'alerta': 2, 'riesgo': 2, 'deuda': 2, 'desaceleración': 2,
        'presión': 1, 'lucha': 1, 'impacto': 1, 'preocupa': 1, 'advierte': 1
    },
    neutral: {
        'mantiene': 0, 'decide': 0, 'informe': 0, 'según': 0, 'analistas': 0, 'datos': 0
    }
};

// Algunas variables de estado que vamos a necesitar en todo el script
let noticiasOriginales = []; // Aquí guardaremos todas las noticias para poder filtrarlas
let sentimientoChartInstance = null;
let mercadoChartInstances = {};

// -----------------------------------------------------------------------------
//  SECCIÓN 2: LÓGICA CENTRAL DEL PROYECTO
//  Estas son las funciones "motor" de nuestra aplicación, las que hacen los
//  cálculos y la magia con los datos.
// -----------------------------------------------------------------------------

/**
 * Funciòn para calcular el sentimiento de una noticia.
 * Busco palabras clave en el titulo y el extracto y sumo sus puntos.
 * @param {string} titulo
 * @param {string} extracto
 * @returns {string} - La etiqueta de sentimiento ('muy positivo', 'positivo', etc.).
 */
function calcularSentimiento(titulo, extracto) {
    let puntuacion = 0;
    const textoCompleto = (titulo + " " + extracto).toLowerCase();

    for (const palabra in SENTIMIENTO_LEXICO.positivo) {
        if (textoCompleto.includes(palabra)) {
            puntuacion += SENTIMIENTO_LEXICO.positivo[palabra];
        }
    }
    for (const palabra in SENTIMIENTO_LEXICO.negativo) {
        if (textoCompleto.includes(palabra)) {
            puntuacion -= SENTIMIENTO_LEXICO.negativo[palabra];
        }
    }
    
    // Devolvemos una etiqueta mas detallada segun el puntaje
    if (puntuacion > 3) { return "muy positivo"; }
    if (puntuacion > 0) { return "positivo"; }
    if (puntuacion < -3) { return "muy negativo"; }
    if (puntuacion < 0) { return "negativo"; }
    return "neutral";
}

// -----------------------------------------------------------------------------
//  SECCIÓN 3: FUNCIONES PARA DIBUJAR EN EL HTML
//  Este grupo de funciones se encarga de coger los datos y convertirlos
//  en elementos visibles en la página.
// -----------------------------------------------------------------------------

/**
 * Muestra las noticias en el feed principal.
 * @param {Array} noticiasAMostrar
 */
function mostrarNoticias(noticiasAMostrar) {
    const listaNoticiasDiv = document.getElementById('lista-noticias');
    listaNoticiasDiv.innerHTML = ''; // Limpio el contenedor para evitar duplicados

    noticiasAMostrar.forEach(noticia => {
        const noticiaDiv = document.createElement('div');
        // Añado clases dinámicas para el estilo, por ejemplo "badge-muy-positivo"
        const sentimientoClass = `sentimiento-${noticia.sentimiento.replace(' ', '-')}`;
        const badgeClass = `badge-${noticia.sentimiento.replace(' ', '-')}`;

        noticiaDiv.classList.add('noticia-item', sentimientoClass);
        noticiaDiv.innerHTML = `
            <h3>${noticia.titulo}</h3>
            <p>${noticia.extracto}</p>
            <p>Sentimiento: <span class="${badgeClass}">${noticia.sentimiento.toUpperCase()}</span></p>
            ${noticia.url ? `<a href="${noticia.url}" target="_blank">Leer más</a>` : ''}
            <small>Fecha: ${noticia.fecha}</small>
        `;
        listaNoticiasDiv.appendChild(noticiaDiv);
    });
}

/**
 * Dibuja el gráfico de sentimiento de noticias con Chart.js.
 * @param {Array} noticiasParaGrafico
 */
function renderizarGraficoSentimiento(noticiasParaGrafico) {
    const ctx = document.getElementById('sentimientoChart').getContext('2d');
    const conteoSentimientos = { 'muy positivo': 0, 'positivo': 0, 'neutral': 0, 'negativo': 0, 'muy negativo': 0 };

    noticiasParaGrafico.forEach(noticia => {
        if (conteoSentimientos.hasOwnProperty(noticia.sentimiento)) {
            conteoSentimientos[noticia.sentimiento]++;
        }
    });
    
    const data = {
        labels: ['Muy Positivo', 'Positivo', 'Neutral', 'Negativo', 'Muy Negativo'],
        datasets: [{
            data: Object.values(conteoSentimientos),
            backgroundColor: [
                'rgba(46, 204, 113, 0.8)', 'rgba(39, 174, 96, 0.8)', 'rgba(243, 156, 18, 0.8)',
                'rgba(231, 76, 60, 0.8)', 'rgba(192, 57, 43, 0.8)'
            ],
            borderColor: ['#fff', '#fff', '#fff', '#fff', '#fff'],
            borderWidth: 1
        }]
    };

    if (sentimientoChartInstance) { sentimientoChartInstance.destroy(); }
    sentimientoChartInstance = new Chart(ctx, { type: 'pie', data, options: { responsive: true, maintainAspectRatio: false } });
}

/**
 * Dibuja un gráfico de líneas para un índice de mercado específico.
 * @param {Array} fechas
 * @param {Array} valores
 * @param {string} symbol
 * @param {string} name
 */
function renderizarGraficoDeMercado(fechas, valores, symbol, name) {
    const contenedorMercado = document.getElementById('mercado-graficos-container');
    const chartContainerHTML = document.createElement('div');
    chartContainerHTML.classList.add('col-md-6', 'col-lg-4', 'mb-4');
    chartContainerHTML.innerHTML = `
        <div class="card h-100">
            <div class="card-body">
                <h5 class="card-title">${name} (${symbol})</h5>
                <div style="position: relative; height:200px;">
                    <canvas id="mercado-${symbol}-Chart"></canvas>
                </div>
            </div>
        </div>
    `;
    contenedorMercado.appendChild(chartContainerHTML);

    const ctx = document.getElementById(`mercado-${symbol}-Chart`).getContext('2d');
    const data = {
        labels: fechas,
        datasets: [{
            label: `Cierre Diario de ${name}`,
            data: valores,
            borderColor: 'rgba(52, 152, 219, 1)',
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true
        }]
    };
    if (mercadoChartInstances[symbol]) { mercadoChartInstances[symbol].destroy(); }
    mercadoChartInstances[symbol] = new Chart(ctx, { type: 'line', data, options: { responsive: true, maintainAspectRatio: false } });
}


// -----------------------------------------------------------------------------
//  SECCIÓN 4: MANEJO DE LA LÓGICA DE DATOS
//  Estas funciones se encargan de las llamadas a las APIs, el fallback y la
//  orquestación de todo el proceso.
// -----------------------------------------------------------------------------

/**
 * Función que maneja el filtrado de noticias y actualiza la UI.
 * @param {string} filtroSentimiento
 * @param {string} filtroPalabra
 */
function filtrarYMostrarNoticias(filtroSentimiento, filtroPalabra) {
    let noticiasFiltradas = noticiasOriginales;

    if (filtroSentimiento && filtroSentimiento !== 'todos') {
        noticiasFiltradas = noticiasFiltradas.filter(noticia => noticia.sentimiento === filtroSentimiento);
    }
    if (filtroPalabra) {
        const palabra = filtroPalabra.toLowerCase();
        noticiasFiltradas = noticiasFiltradas.filter(noticia =>
            (noticia.titulo && noticia.titulo.toLowerCase().includes(palabra)) ||
            (noticia.extracto && noticia.extracto.toLowerCase().includes(palabra))
        );
    }
    mostrarNoticias(noticiasFiltradas);
    renderizarGraficoSentimiento(noticiasFiltradas);
}

/**
 * Fallback para cargar noticias desde el JSON local si la API falla.
 */
async function cargarNoticiasDesdeJSONLocal() {
    try {
        const response = await fetch(CONFIG.news.fallback);
        const data = await response.json();
        const noticiasConSentimiento = data.map(noticia => ({ ...noticia, sentimiento: calcularSentimiento(noticia.titulo, noticia.extracto) }));
        noticiasOriginales = noticiasConSentimiento;
        console.log("Fallback: Noticias cargadas desde JSON local.");
        mostrarNoticias(noticiasOriginales);
        renderizarGraficoSentimiento(noticiasOriginales);
    } catch (localError) {
        console.error("Error al cargar noticias desde el JSON local:", localError);
        alert("No se pudieron cargar las noticias. Por favor, revisa tu conexión.");
    }
}

/**
 * Carga noticias de la API, las procesa y las muestra.
 */
async function cargarNoticias() {
    console.log("Iniciando carga de noticias desde la API...");
    const apiUrl = `${CONFIG.news.url}?${CONFIG.news.params}&apiKey=${CONFIG.news.apiKey}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === "ok") {
            const noticiasAPI = data.articles.map((article, index) => ({
                id: index,
                titulo: article.title || 'Sin título',
                extracto: article.description || article.content || 'Sin descripción',
                url: article.url,
                fecha: new Date(article.publishedAt).toISOString().split('T')[0] || 'Fecha Desconocida',
                sentimiento: ""
            }));
            const noticiasConSentimiento = noticiasAPI.map(noticia => ({ ...noticia, sentimiento: calcularSentimiento(noticia.titulo, noticia.extracto) }));
            noticiasOriginales = noticiasConSentimiento;
            console.log("Éxito: Noticias cargadas de la API y sentimiento calculado.");
            mostrarNoticias(noticiasOriginales);
            renderizarGraficoSentimiento(noticiasOriginales);
        } else {
            console.error("Error de la API de NewsAPI:", data.message);
            console.log("Fallback: Intentando cargar noticias desde el archivo local...");
            await cargarNoticiasDesdeJSONLocal();
        }
    } catch (error) {
        console.error("Error de red o CORS en NewsAPI:", error);
        console.log("Fallback: Intentando cargar noticias desde el archivo local...");
        await cargarNoticiasDesdeJSONLocal();
    }
}

/**
 * Carga los datos de los 5 mercados, respetando el límite de la API.
 */
async function cargarDatosDeMercado() {
    console.log("Iniciando carga de datos de los 5 mercados principales...");
    const contenedorMercado = document.getElementById('mercado-graficos-container');
    contenedorMercado.innerHTML = '';

    for (const mercado of CONFIG.alphaVantage.symbols) {
        const url = `${CONFIG.alphaVantage.url}?function=TIME_SERIES_DAILY&symbol=${mercado.symbol}&outputsize=compact&apikey=${CONFIG.alphaVantage.apiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data["Time Series (Daily)"]) {
                const timeSeries = data["Time Series (Daily)"];
                const fechas = Object.keys(timeSeries).sort();
                const valoresDeCierre = fechas.map(fecha => parseFloat(timeSeries[fecha]["4. close"]));
                console.log(`Éxito: Datos de ${mercado.name} (${mercado.symbol}) cargados.`);
                renderizarGraficoDeMercado(fechas, valoresDeCierre, mercado.symbol, mercado.name);
            } else {
                console.error(`Error al cargar datos de ${mercado.name}:`, data["Error Message"] || "Datos no disponibles");
            }
        } catch (error) {
            console.error(`Error de red o CORS para ${mercado.name}:`, error);
        }
        if (mercado.symbol !== CONFIG.alphaVantage.symbols[CONFIG.alphaVantage.symbols.length - 1].symbol) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.alphaVantage.rateLimitDelay));
        }
    }
    console.log("Carga de todos los gráficos de mercado completada.");
}

// -----------------------------------------------------------------------------
//  SECCIÓN 5: INICIALIZACIÓN DE LA APLICACIÓN
//  Este es el único punto de entrada. Aquí es donde se "arranca" todo.
// -----------------------------------------------------------------------------

function inicializarEventosUI() {
    const filtroBtnGroup = document.querySelector('.btn-group');
    if (filtroBtnGroup) {
        filtroBtnGroup.addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                const sentimiento = e.target.getAttribute('data-sentimiento');
                const busqueda = document.getElementById('busqueda-input').value;
                document.querySelectorAll('.btn-group .btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                filtrarYMostrarNoticias(sentimiento, busqueda);
            }
        });
    }

    const filtroForm = document.getElementById('filtro-form');
    if (filtroForm) {
        filtroForm.addEventListener('submit', e => {
            e.preventDefault();
            const busqueda = document.getElementById('busqueda-input').value;
            const sentimientoActivo = document.querySelector('.btn-group .btn.active')?.getAttribute('data-sentimiento') || 'todos';
            filtrarYMostrarNoticias(sentimientoActivo, busqueda);
        });
    }
}

// El punto de arranque: cargamos datos y configuramos eventos cuando el DOM esté listo.
document.addEventListener('DOMContentLoaded', () => {
    inicializarEventosUI();
    cargarNoticias();
    cargarDatosDeMercado();
});