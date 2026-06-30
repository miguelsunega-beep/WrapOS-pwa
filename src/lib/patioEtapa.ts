import type { StatusOS } from '../types'

export type EtapaPatio = 'aguardando' | 'execucao' | 'concluido'

/** Mapeia o status de uma OS para a etapa visual do pátio. Retorna null para cancelado. */
export function getEtapaPatio(status: StatusOS): EtapaPatio | null {
  switch (status) {
    case 'aguardando_material':
    case 'aguardando_aprovacao': return 'aguardando'
    case 'em_andamento':         return 'execucao'
    case 'concluido':            return 'concluido'
    default:                     return null
  }
}
