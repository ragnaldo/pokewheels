/** Filtros da galeria — vivem fora das telas para sobreviver à navegação. */

export const filtros = {
  busca: '',
  raridade: '',
  serie: '',
  favoritos: false,
  ordem: 'recentes',
};

export function limparFiltros() {
  filtros.busca = '';
  filtros.raridade = '';
  filtros.serie = '';
  filtros.favoritos = false;
}

export function filtrosAtivos() {
  return Boolean(filtros.busca || filtros.raridade || filtros.serie || filtros.favoritos);
}
