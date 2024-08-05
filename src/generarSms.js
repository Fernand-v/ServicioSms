const { https } = require('follow-redirects');
const querystring = require('querystring');
const { excluir_tildes } = require('./utils');

// Función para generar el SMS y enviar a través del API
async function generarSms(texto, datosArray, nroPrueba = null, apiKey) {
    const resultados = [];

    for (const data of datosArray) {
        try {
            // Verifica que el array tenga al menos tres elementos
            if (data.length < 3) {
                throw new Error('Cada elemento del array debe contener al menos tres elementos');
            }

            // Asigna los valores del array a variables
            const codigo = data[0];
            const telefono = nroPrueba || data[1];
            const nombre = data[2];
            const nroContrato = data.length > 3 ? data[3] : null;

            // Reemplaza la palabra -cli- por el nombre y -nro- por el número de contrato si está presente
            let textoProcesado = texto.replace(/-cli-/g, nombre);
            if (nroContrato) {
                textoProcesado = textoProcesado.replace(/-nro-/g, nroContrato);
            }

            // Excluir tildes del texto procesado
            textoProcesado = excluir_tildes(textoProcesado);

            // Preparar el mensaje para enviar
            const mensaje = {
                key: apiKey,
                message: encodeURIComponent(textoProcesado),
                msisdn: telefono
            };

            // Codificar el mensaje para la URL
            const mensajeEncoded = querystring.stringify(mensaje);

            // Log de depuración

            // Enviar el mensaje usando una solicitud GET
            const url = `https://tigob.beekun.com/pushapi?${mensajeEncoded}`;
            
            const response = await enviarMensaje(url);

            // Verificar si la respuesta es JSON
            let jsonResponse;
            try {
                jsonResponse = JSON.parse(response);
            } catch (e) {
                console.error('Error parseando JSON:', e, 'Respuesta:', response);
                jsonResponse = { error: 'La respuesta no es JSON válida', rawResponse: response };
            }

            resultados.push({
                codigo,
                telefono,
                nombre,
                textoProcesado,
                message: jsonResponse.message,
                id: jsonResponse.id
            });
        } catch (error) {
            console.error('Error enviando el mensaje:', error);
            resultados.push({
                codigo: data[0],
                telefono: nroPrueba || data[1],
                nombre: data[2],
                textoProcesado: texto.replace(/-cli-/g, data[2]),
                error: error.message
            });
        }
    }

    return resultados;
}

function enviarMensaje(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';

            // A chunk of data has been received.
            res.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received.
            res.on('end', () => {
                resolve(data);
            });

        }).on('error', (e) => {
            reject(e);
        });
    });
}

module.exports = { generarSms };
