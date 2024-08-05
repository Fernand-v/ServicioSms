const oracledb = require('oracledb');

async function obtenerTextCategoria(codigo) {
    let connection;

    try {
        // Obtén una conexión del pool
        connection = await oracledb.getConnection('default');

        // Define el objeto de resultados
        const result = await connection.execute(
            `BEGIN
                :resultado := pk_web_sms.FP_OBTENER_TEXT_CATEGORIA(:codigo);
             END;`,
            {
                codigo: { val: codigo, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
                resultado: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }
        );

        // Verifica si el resultado está definido
        if (!result.outBinds.resultado) {
            throw new Error('No se obtuvo un resultado de la función.');
        }

        // Log del resultado obtenido

        return result.outBinds.resultado;
    } catch (err) {
        console.error('Error ejecutando la función:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error cerrando la conexión:', err);
            }
        }
    }
}

module.exports = { obtenerTextCategoria };
