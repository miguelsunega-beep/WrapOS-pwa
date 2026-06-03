import type { OrdemServico } from '../types'

const ATIVAS = ['em_andamento', 'aguardando_material', 'aguardando_aprovacao'] as const

/** OS está atrasada se tem entrega prevista no passado e ainda não foi concluída/cancelada. */
export function isOSAtrasada(
  os: Pick<OrdemServico, 'status' | 'dataSaidaPrevista'>,
  hoje: Date = new Date(),
): boolean {
  if (!os.dataSaidaPrevista) return false
  if (!ATIVAS.includes(os.status as typeof ATIVAS[number])) return false
  const prazo = new Date(os.dataSaidaPrevista + 'T23:59:59')
  return hoje.getTime() > prazo.getTime()
}
