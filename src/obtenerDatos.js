const oracledb = require('oracledb');

async function obtenerDatos(valor) {
    let connection;

    try {
        // Conectar a la base de datos
        connection = await oracledb.getConnection('default');

        // Concatenar plantilla_sms con el valor proporcionado
        const procedureCall = `BEGIN
            plantilla_sms${valor}(:cursor);
         END;`;

        // Ejecutar la consulta y obtener el cursor
        const result = await connection.execute(
            procedureCall,
            {
                cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            }
        );

        const resultSet = result.outBinds.cursor;

        const rows = [];
        let batch;

        do {
            // Leer los datos en lotes de 50
            batch = await resultSet.getRows(50);
            if (batch.length > 0) {
                rows.push(...batch);
            }
        } while (batch.length > 0);

        await resultSet.close();

        return rows;
    } catch (err) {
        console.error('Error ejecutando el procedimiento:', err);
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

module.exports = { obtenerDatos };
