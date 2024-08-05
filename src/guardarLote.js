const oracledb = require('oracledb');

let connection;

async function initConnection() {
    try {
        connection = await oracledb.getConnection('default');
        console.log('Conexión a la base de datos establecida.');
    } catch (err) {
        console.error('Error estableciendo la conexión a la base de datos:', err);
        throw err;
    }
}

async function closeConnection() {
    if (connection) {
        try {
            await connection.close();
            console.log('Conexión a la base de datos cerrada.');
        } catch (err) {
            console.error('Error cerrando la conexión a la base de datos:', err);
        }
    }
}

async function generarCodEncabezadoSms(sendConfSms) {
    try {
        const result = await connection.execute(
            `BEGIN
                :result := pk_web_sms.fp_generar_cod_encabezado_sms(i_send_conf_sms => :i_send_conf_sms);
             END;`,
            {
                i_send_conf_sms: sendConfSms,
                result: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            }
        );

        const sendSmsCod = result.outBinds.result;
        console.log('Código de encabezado SMS generado:', sendSmsCod);

        await connection.commit();

        return sendSmsCod;
    } catch (err) {
        console.error('Error generando el código de encabezado SMS:', err);
        throw err;
    }
}

async function guardarSmsEnLotes(sendSmsCod, smsData) {
    try {
        const smsTableType = 'SMS_TABLE'; // Tipo definido en la base de datos

        // Iterar sobre cada smsData para imprimir en tiempo real
        for (const smsItem of smsData) {
            console.log(`Enviando mensaje al: ${smsItem.codigo}, 
                        Con numero de telefono:${smsItem.telefono}, 
                        Mensaje: ${smsItem.textoProcesado}`);
        }

        await connection.execute(
            `BEGIN
                pk_web_sms.PP_GENERAR_SMS_LOTE(
                    P_SEND_SMS_COD => :i_send_sms_cod,
                    P_SMS_ITEMS => :sms_data
                );
             END;`,
            {
                i_send_sms_cod: sendSmsCod,
                sms_data: {
                    type: smsTableType,
                    val: smsData.map(smsItem => ({
                        CLI_COD: smsItem.codigo,
                        TEXT: smsItem.textoProcesado,
                        TELEFONO: smsItem.telefono,
                        SMS_ITEM: smsItem.id,
                        ESTADO: smsItem.message
                    })),
                    dir: oracledb.BIND_IN
                }
            }
        );

        await connection.commit();

        const result = await connection.execute(
            `BEGIN
                :result := pk_web_sms.fp_terminar_cat_sms(i_sms_cod => :i_sms_cod);
             END;`,
            {
                i_sms_cod: sendSmsCod,
                result: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }
        );


        await connection.commit();

    } catch (err) {
        console.error('Error guardando el lote de mensajes en la base de datos:', err);
        throw err;
    }
}

module.exports = { initConnection, closeConnection, generarCodEncabezadoSms, guardarSmsEnLotes };
