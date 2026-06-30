import type { StatusOS } from '../types'

export type EtapaPatio = 'aguardando' | 'execucao' | 'concluido'

/**
 * Mapeia o status de uma OS para a etapa visual do pátio.
 * Retorna null para cancelado e para OS já entregues (saíram fisicamente do pátio).
 *
 * Semântica de `entregue`:
 *   - undefined/true → OS já saiu do pátio → null (não aparece no kanban)
 *   - false          → OS concluída mas veículo ainda aguarda retirada → 'concluido'
 */
export function getEtapaPatio(status: StatusOS, entregue?: boolean): EtapaPatio | null {
  switch (status) {
    case 'aguardando_material':
    case 'aguardando_aprovacao': return 'aguardando'
    case 'em_andamento':         return 'execucao'
    case 'concluido':            return entregue === false ? 'concluido' : null
    default:                     return null
  }
}
