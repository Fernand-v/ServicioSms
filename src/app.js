const express = require('express');
const http = require('http');
const conexion = require('./conexion');
const { obtenerDatos } = require('./obtenerDatos');
const { obtenerTextCategoria } = require('./categoriaTexto');
const { generarSms } = require('./generarSms');
const { initConnection, closeConnection, generarCodEncabezadoSms, guardarSmsEnLotes } = require('./guardarLote');
const { consultarActivos } = require('./consultarActivos');

const app = express();
const port = process.env.PORT || 3000;

const apiKey = '';

app.use(express.json());

app.get('/', async (req, res) => {
    try {
        console.log('Iniciando proceso continuo desde la ruta raíz...');
        await ejecutarProcesoContinuo();
        res.send('Proceso continuo ejecutado.');
    } catch (err) {
        res.status(500).json({ error: 'Error ejecutando el proceso continuo', details: err.message });
    }
});

app.get('/consultar_activos', async (req, res) => {
    try {
        const activos = await consultarActivos();
        if (activos.length === 0) {
            res.status(200).send('No existen códigos activos');
            return;
        }
        res.json(activos);
    } catch (err) {
        res.status(500).json({ error: 'Error consultando los activos', details: err.message });
    }
});

app.get('/plantilla_sms/:valor', async (req, res) => {
    try {
        const valor = req.params.valor;
        const data = await obtenerDatos(valor);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching data from plantilla_sms', details: err.message });
    }
});

app.get('/categoria/:codigo', async (req, res) => {
    try {
        const codigo = parseInt(req.params.codigo, 10);
        if (isNaN(codigo)) {
            return res.status(400).json({ error: 'El código debe ser un número válido' });
        }
        const resultado = await obtenerTextCategoria(codigo);
        res.json({ resultado });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching text category', details: err.message });
    }
});

app.get('/generar_sms/:valor/:codigo', async (req, res) => {
    try {
        const valor = req.params.valor;
        const codigo = parseInt(req.params.codigo, 10);
        const nroPrueba = req.query.nro_prueba || null;

        if (isNaN(codigo)) {
            return res.status(400).json({ error: 'El código debe ser un número válido' });
        }

        await initConnection();

        const datosArray = await obtenerDatos(valor);

        console.log(`Cantidad de datos obtenidos: ${datosArray.length}`);

        const textoCategoria = await obtenerTextCategoria(codigo);

        console.log(`Texto de la categoría ${codigo}:`, textoCategoria);

        const sendSmsCod = await generarCodEncabezadoSms(codigo);

        if (sendSmsCod === null) {
            res.status(200).send('Categoria ya enviada');
            await closeConnection();
            return;
        }

        const resultados = await generarSms(textoCategoria, datosArray, nroPrueba, apiKey);

        await guardarSmsEnLotes(sendSmsCod, resultados);

        await closeConnection();

        res.json({ resultados });
    } catch (err) {
        console.error('Error generando el SMS:', err);
        res.status(500).json({ error: 'Error generando el SMS', details: err.message });
    }
});

async function ejecutarProcesoContinuo() {
    try {
        console.log('Ejecutando proceso continuo...');
        await initConnection();

        const activos = await consultarActivos();

        if (activos.length === 0) {
            console.log('No existen códigos activos');
            await closeConnection();
            return;
        }console.log(activos);

        for (const activo of activos) {
            const valor = activo.codigo;
            const codigo = activo.valor;

            const datosArray = await obtenerDatos(valor);

            const textoCategoria = await obtenerTextCategoria(codigo);

            

            const sendSmsCod = await generarCodEncabezadoSms(codigo);

            if (sendSmsCod === null) {
                console.log('Categoria ya enviada');
                continue;
            }else {console.log(`Cantidad de datos obtenidos: ${datosArray.length}`);console.log(`Texto de la categoría ${codigo}:`, textoCategoria);}

            const resultados = await generarSms(textoCategoria, datosArray, null, apiKey);

            await guardarSmsEnLotes(sendSmsCod, resultados);
        }

        await closeConnection();
        console.log('Proceso continuo ejecutado con éxito');
    } catch (err) {
        console.error('Error en el proceso continuo:', err);
        await closeConnection();
    }
}

http.createServer(app).listen(port, async () => {
    try {
        await conexion.initialize();
        console.log(`Server is listening on port ${port}`);
    } catch (err) {
        console.error('Error initializing database connection pool:', err);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    try {
        await closeConnection();
        await conexion.close();
        console.log('Database connection pool closed');
        process.exit(0);
    } catch (err) {
        console.error('Error closing database connection pool:', err);
        process.exit(1);
    }
});
