// script.js

// --- CONFIGURACIÓN DE LA API ---
const NEWS_API_KEY = '2e8c1e5ba3784efe97e8447fd5a06c60';
const NEWS_API_URL = `https://newsapi.org/v2/everything?q=finanzas%20OR%20bolsa%20OR%20economia&language=es&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`;


// --- 1. Definición de palabras clave para el análisis de sentimiento (Paso 6.1) ---
const palabrasPositivas = {
    'fuerte': 3, 'récord': 3, 'crecimiento': 3, 'éxito': 3, 'boom': 3, 'disparo': 3, 'alza': 3,
    'ganancias': 2, 'aumento': 2, 'beneficio': 2, 'recuperación': 2, 'expansión': 2, 'mejor': 2, 'mejora': 2, 'supera': 2,
    'estable': 1, 'subida': 1, 'ascenso': 1, 'alcanza': 1, 'avanza': 1, 'impulso': 1
};
const palabrasNegativas = {
    'crisis': 3, 'quiebra': 3, 'recesión': 3, 'colapso': 3, 'desplome': 3, 'caída': 3, 'incertidumbre': 3,
    'pérdidas': 2, 'descenso': 2, 'baja': 2, 'alerta': 2, 'riesgo': 2, 'deuda': 2, 'desaceleración': 2,
    'presión': 1, 'lucha': 1, 'impacto': 1, 'preocupa': 1, 'advierte': 1
};
const palabrasNeutrales = {
    'mantiene': 0, 'decide': 0, 'informe': 0, 'según': 0, 'analistas': 0, 'datos': 0
};

// --- 2. Función para calcular el sentimiento de una noticia (Paso 6.1 - Refactorizada) ---
function calcularSentimiento(titulo, extracto) {
    let puntuacion = 0;
    const textoCompleto = (titulo + " " + extracto).toLowerCase();

    for (const palabra in palabrasPositivas) {
        if (textoCompleto.includes(palabra)) {
            puntuacion += palabrasPositivas[palabra];
        }
    }
    for (const palabra in palabrasNegativas) {
        if (textoCompleto.includes(palabra)) {
            puntuacion -= palabrasNegativas[palabra];
        }
    }
    if (puntuacion > 3) {
        return "muy positivo";
    } else if (puntuacion > 0) {
        return "positivo";
    } else if (puntuacion < -3) {
        return "muy negativo";
    } else if (puntuacion < 0) {
        return "negativo";
    } else {
        return "neutral";
    }
}

// --- Variables globales para almacenar noticias ---
let noticias = []; 
let noticiasOriginales = []; // Nueva variable para almacenar la lista completa
let sentimientoChartInstance = null;

// --- 3. Función para mostrar las noticias en el HTML ---
function mostrarNoticias(noticiasAMostrar) {
    const listaNoticiasDiv = document.getElementById('lista-noticias');
    listaNoticiasDiv.innerHTML = '';

    noticiasAMostrar.forEach(noticia => {
        const noticiaDiv = document.createElement('div');
        noticiaDiv.classList.add('noticia-item'); 
        noticiaDiv.classList.add(`sentimiento-${noticia.sentimiento.replace(' ', '-')}`); // Adaptar a los nuevos nombres (ej. muy-positivo)

        noticiaDiv.innerHTML = `
            <h3>${noticia.titulo}</h3>
            <p>${noticia.extracto}</p>
            <p>Sentimiento: <span class="badge-${noticia.sentimiento.replace(' ', '-')}">${noticia.sentimiento.toUpperCase()}</span></p>
            ${noticia.url ? `<a href="${noticia.url}" target="_blank">Leer más</a>` : ''}
            <small>Fecha: ${noticia.fecha}</small>
        `;
        listaNoticiasDiv.appendChild(noticiaDiv);
    });
}

// --- 4. Función para renderizar el gráfico de sentimiento (Actualizada) ---
function renderizarGraficoSentimiento(noticiasParaGrafico) {
    const ctx = document.getElementById('sentimientoChart').getContext('2d');

    const conteoSentimientos = {
        'muy positivo': 0,
        'positivo': 0,
        'neutral': 0,
        'negativo': 0,
        'muy negativo': 0
    };

    noticiasParaGrafico.forEach(noticia => {
        if (conteoSentimientos.hasOwnProperty(noticia.sentimiento)) {
            conteoSentimientos[noticia.sentimiento]++;
        }
    });
    
    // El gráfico ahora tiene 5 etiquetas
    const data = {
        labels: ['Muy Positivo', 'Positivo', 'Neutral', 'Negativo', 'Muy Negativo'],
        datasets: [{
            data: [
                conteoSentimientos['muy positivo'],
                conteoSentimientos['positivo'],
                conteoSentimientos['neutral'],
                conteoSentimientos['negativo'],
                conteoSentimientos['muy negativo']
            ],
            backgroundColor: [
                'rgba(46, 204, 113, 0.8)',  // Verde claro para Muy Positivo
                'rgba(39, 174, 96, 0.8)',   // Verde oscuro para Positivo
                'rgba(243, 156, 18, 0.8)',  // Naranja para Neutral
                'rgba(231, 76, 60, 0.8)',   // Rojo oscuro para Negativo
                'rgba(192, 57, 43, 0.8)'    // Rojo más oscuro para Muy Negativo
            ],
            borderColor: [
                'rgba(46, 204, 113, 1)',
                'rgba(39, 174, 96, 1)',
                'rgba(243, 156, 18, 1)',
                'rgba(231, 76, 60, 1)',
                'rgba(192, 57, 43, 1)'
            ],
            borderWidth: 1
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: 'Distribución del Sentimiento de Noticias',
                font: { size: 16 }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) { label += ': '; }
                        if (context.parsed !== null) { label += context.parsed; }
                        return label + ' noticias';
                    }
                }
            }
        }
    };

    if (sentimientoChartInstance) {
        sentimientoChartInstance.destroy();
    }
    sentimientoChartInstance = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: options
    });
}

// --- LÓGICA DE FILTROS Y BÚSQUEDA (Paso 6.3) ---
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

// --- FUNCIÓN DE FALLBACK PARA CARGAR DESDE EL JSON LOCAL ---
async function cargarNoticiasDesdeJSONLocal() {
    try {
        const response = await fetch('./noticias.json');
        const data = await response.json();

        noticias = data.map(noticia => {
            const sentimientoCalculado = calcularSentimiento(noticia.titulo, noticia.extracto);
            return { ...noticia, sentimiento: sentimientoCalculado };
        });

        noticiasOriginales = noticias; // Almacenamos para filtrar
        
        console.log("Noticias cargadas desde JSON local y sentimiento calculado:", noticias);
        mostrarNoticias(noticias);
        renderizarGraficoSentimiento(noticias);
    } catch (localError) {
        console.error("Error al cargar noticias desde el JSON local:", localError);
        alert("No se pudieron cargar las noticias. Por favor, revisa tu conexión a internet o tu API Key.");
    }
}

// --- FUNCIÓN PRINCIPAL PARA CARGAR NOTICIAS (Ahora desde la API) ---
async function cargarNoticiasYCalcularSentimiento() {
    try {
        const response = await fetch(NEWS_API_URL);
        const data = await response.json();

        if (data.status === "ok") {
            noticias = data.articles.map((article, index) => {
                const fechaFormateada = article.publishedAt ? new Date(article.publishedAt).toISOString().split('T')[0] : 'Fecha Desconocida';

                return {
                    id: index,
                    titulo: article.title || 'Sin título',
                    extracto: article.description || article.content || 'Sin descripción',
                    url: article.url,
                    fecha: fechaFormateada,
                    sentimiento: ""
                };
            });

            noticias = noticias.map(noticia => {
                const sentimientoCalculado = calcularSentimiento(noticia.titulo, noticia.extracto);
                return { ...noticia, sentimiento: sentimientoCalculado };
            });

            noticiasOriginales = noticias; // Almacenamos para filtrar

            console.log("Noticias cargadas de la API y sentimiento calculado:", noticias);
            mostrarNoticias(noticias);
            renderizarGraficoSentimiento(noticias);

        } else {
            console.error("Error de la API de NewsAPI:", data.message);
            console.log("Intentando cargar noticias desde el archivo local como fallback...");
            await cargarNoticiasDesdeJSONLocal();
        }

    } catch (error) {
        console.error("Error al cargar o procesar las noticias desde la API:", error);
        console.log("Error de red o CORS. Intentando cargar noticias desde el archivo local como fallback...");
        await cargarNoticiasDesdeJSONLocal();
    }
}


// --- 6. Llamada inicial para que la aplicación comience cuando la página cargue ---
document.addEventListener('DOMContentLoaded', () => {
    cargarNoticiasYCalcularSentimiento();
});

// --- LISTENERS PARA FILTROS Y BÚSQUEDA ---
document.addEventListener('DOMContentLoaded', () => {
    // Escucha clics en los botones del grupo de filtros
    document.querySelector('.btn-group').addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
            const sentimiento = e.target.getAttribute('data-sentimiento');
            const busqueda = document.getElementById('busqueda-input').value;
            // Desactiva todos los botones y activa el botón clicado para feedback visual
            document.querySelectorAll('.btn-group .btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            filtrarYMostrarNoticias(sentimiento, busqueda);
        }
    });

    // Escucha envíos del formulario de búsqueda
    document.getElementById('filtro-form').addEventListener('submit', e => {
        e.preventDefault();
        const busqueda = document.getElementById('busqueda-input').value;
        const sentimientoActivo = document.querySelector('.btn-group .btn.active')?.getAttribute('data-sentimiento') || 'todos';
        filtrarYMostrarNoticias(sentimientoActivo, busqueda);
    });

    cargarNoticiasYCalcularSentimiento();
});