const oracledb = require('oracledb');

async function consultarActivos() {
    let connection;

    try {
        // Obtener una conexión del pool
        connection = await oracledb.getConnection('default');

        // Ejecutar la función FP_OBTENER_CONF_CODIGO_ACTIVOS
        const result = await connection.execute(
            `BEGIN
                :cursor := pk_web_sms.FP_OBTENER_CONF_CODIGO_ACTIVOS();
             END;`,
            {
                cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
            }
        );

        const resultSet = result.outBinds.cursor;
        const rows = await resultSet.getRows();
        await resultSet.close();

        if (rows.length === 0) {
            console.log('No existen códigos activos');
            return [];
        }

        // Extraer y retornar los códigos y valores activos
        const activos = rows.map(row => ({
            codigo: row[0],
            valor: row[1]
        }));

        return activos;

    } catch (err) {
        console.error('Error al recuperar datos activos:', err);
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

module.exports = { consultarActivos };
