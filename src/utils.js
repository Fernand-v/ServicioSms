function excluir_tildes(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/Ñ/g, 'N');
}

module.exports = {
    excluir_tildes
};