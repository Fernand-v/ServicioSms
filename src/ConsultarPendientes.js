const oracledb = require('oracledb');
const { https } = require('follow-redirects');
const querystring = require('querystring');

async function consultarPendientes(apiKey) {
    let connection;

    try {
        // Conectar a la base de datos
        console.log('Conectando a la base de datos...');
        connection = await oracledb.getConnection('default');

        // Llamar a la función pk_web_sms.fp_consultar_pendientes
        console.log('Consultando pendientes...');
        const result = await connection.execute(
            `BEGIN
                :result := pk_web_sms.fp_consultar_pendientes;
             END;`,
            {
                result: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
            }
        );

        const resultSet = result.outBinds.result;

        const pendientes = [];
        let row;

        // Obtener los datos del cursor
        console.log('Obteniendo datos del cursor...');
        while ((row = await resultSet.getRow())) {
            pendientes.push(row);
        }

        await resultSet.close();
        console.log(`Total de pendientes obtenidos: ${pendientes.length}`);

        const batchUpdates = [];

        // Procesar los pendientes y actualizar la tabla FAC_SEND_SMS
        for (const pendiente of pendientes) {
            console.log(`Procesando pendiente: ${JSON.stringify(pendiente)}`);
            const v_send_sms_id = pendiente[3];

            const url_id = querystring.stringify({
                key: apiKey,
                message_id: v_send_sms_id
            });

            console.log(`Consultando estado del mensaje: ${v_send_sms_id}`);
            const response = await consultarEstadoMensaje(url_id);
            console.log(`Respuesta recibida: ${response}`);
            const statusData = JSON.parse(response);

            if (statusData && statusData.status) {
                batchUpdates.push({
                    SEND_SMS_COD: pendiente[0],
                    SEND_ITEM: pendiente[1],
                    CLI_COD: pendiente[2],
                    IDS_SMS: v_send_sms_id,
                    STATUS: statusData.status,
                    MESSAGE: statusData.message,
                    PLATFORM_STATUS: statusData.platform_status
                });
            }
        }

        console.log(`Total de actualizaciones por lotes: ${batchUpdates.length}`);
        if (batchUpdates.length > 0) {
            await actualizarEstadoLote(batchUpdates);
        }

    } catch (err) {
        console.error('Error consultando los pendientes:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Conexión a la base de datos cerrada.');
            } catch (err) {
                console.error('Error cerrando la conexión a la base de datos:', err);
            }
        }
    }
}

async function consultarEstadoMensaje(url_id) {
    return new Promise((resolve, reject) => {
        https.get(`https://tigob.beekun.com/pushapi/status?${url_id}`, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(data);
            });

        }).on('error', (e) => {
            reject(e);
        });
    });
}

async function actualizarEstadoLote(batchUpdates) {
    let connection;

    try {
        // Conectar a la base de datos
        console.log('Conectando a la base de datos para actualizar lotes...');
        connection = await oracledb.getConnection('default');

        // Ejecutar el procedimiento almacenado en lotes
        console.log('Ejecutando el procedimiento de actualización por lotes...');
        await connection.execute(
            `BEGIN
                PP_ACTUALIZAR_ESTADO_SMS_LOTE(:p_sms_updates);
             END;`,
            {
                p_sms_updates: {
                    type: 'SMS_UPDATE_TAB',
                    dir: oracledb.BIND_IN,
                    val: batchUpdates.map(update => ({
                        SEND_SMS_COD: update.SEND_SMS_COD,
                        SEND_ITEM: update.SEND_ITEM,
                        CLI_COD: update.CLI_COD,
                        IDS_SMS: update.IDS_SMS,
                        STATUS: update.STATUS,
                        MESSAGE: update.MESSAGE,
                        PLATFORM_STATUS: update.PLATFORM_STATUS
                    }))
                }
            }
        );

        // Realizar commit después de insertar los datos
        await connection.commit();
    } catch (err) {
        console.error('Error actualizando el lote de mensajes en la base de datos:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Conexión a la base de datos cerrada después de actualizar lotes.');
            } catch (err) {
                console.error('Error cerrando la conexión a la base de datos:', err);
            }
        }
    }
}

module.exports = { consultarPendientes };
