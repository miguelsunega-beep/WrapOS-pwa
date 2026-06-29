import type { Agendamento, OrdemServico } from '../types'

export type StatusEfetivoAgendamento = 'agendado' | 'em_andamento' | 'concluido' | 'os_cancelada'

/**
 * OS criada a partir deste agendamento, se houver. Reaproveita o back-reference
 * que já existe em OrdemServico.agendamentoId — não é necessário um campo
 * osId no Agendamento.
 */
export function getOSVinculada(agendamentoId: string, ordens: OrdemServico[]): OrdemServico | null {
  return ordens.find(o => o.agendamentoId === agendamentoId) ?? null
}

/**
 * Sem OS vinculada, o agendamento é apenas "agendado". Com OS vinculada, o
 * status exibido passa a espelhar o status da OS — o agendamento em si nunca
 * mais é editado quanto a status a partir da aprovação de entrada.
 */
export function getStatusEfetivo(ag: Agendamento, ordens: OrdemServico[]): StatusEfetivoAgendamento {
  const os = getOSVinculada(ag.id, ordens)
  if (!os) return 'agendado'
  if (os.status === 'concluido') return 'concluido'
  if (os.status === 'cancelado') return 'os_cancelada'
  return 'em_andamento' // em_andamento | aguardando_material | aguardando_aprovacao
}
