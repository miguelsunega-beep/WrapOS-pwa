// ── Utility types ─────────────────────────────────────────────
export type StatusOS =
  | 'checkin'
  | 'em_andamento'
  | 'aguardando_material'
  | 'aguardando_aprovacao'
  | 'concluido'
  | 'cancelado'

export type StatusPagamento = 'pago' | 'a_receber'

export type StatusAgendamento = 'agendado' | 'confirmado' | 'concluido' | 'cancelado'
export type StatusGarantia = 'ativa' | 'acionada' | 'expirada'
export type TipoLancamento = 'entrada' | 'saida'
export type TipoAlerta = 'estoque_baixo' | 'garantia' | 'pos_venda'
export type PrioridadeAlerta = 'alta' | 'media' | 'baixa'
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
export type StatusCliente = 'ativo' | 'inativo'

// ── Core entity types ──────────────────────────────────────────
export interface Cliente {
  id: string
  nome: string
  telefone: string
  email: string
  cpf: string
  comoConheceu: string
  dataCadastro: string
  totalGasto: number
  cidade?: string
  /** Ausente em registros antigos — deve ser tratado como 'ativo'. */
  status?: StatusCliente
}

export interface Veiculo {
  id: string
  clienteId: string
  marca: string
  modelo: string
  ano: number
  cor: string
  placa: string
}

export interface Servico {
  id: string
  nome: string
  preco?: number
  tempEstimado?: number
  duracaoDias?: number
}

export interface ItemOS {
  servicoId: string
  nome: string
  preco: number
}

export type OrigemMaterial = 'estoque' | 'compra' | 'retalho'

export interface MaterialUsado {
  origem: OrigemMaterial
  produtoId?: string   // usado quando origem === 'estoque', ou 'retalho' vinculado a um produto real de inventário (baixa estoque igual 'estoque')
  nome?: string        // usado quando origem === 'compra' | 'retalho' (retalho em texto livre, sem produtoId, não baixa estoque)
  quantidade: number
  custo?: number       // custo total do material; obrigatório em 'compra', opcional em 'retalho'
}

export interface OrdemServico {
  id: string
  numero: number
  clienteId: string
  veiculoId: string
  servicos: ItemOS[]
  valorTotal: number
  formaPagamento: string
  instaladorId: string
  box: number
  comissao: number
  observacoes: string
  status: StatusOS
  statusPagamento?: StatusPagamento
  dataCriacao: string
  dataFinalizacao?: string
  dataSaidaPrevista?: string
  agendamentoId?: string
  materiaisUsados?: MaterialUsado[]
  /** true quando o veículo foi entregue ao cliente (saiu fisicamente do pátio). false = concluído mas ainda não retirado. */
  entregue?: boolean
  dataSaida?: string
}

export interface Agendamento {
  id: string
  clienteId: string
  veiculoId: string
  servicoId: string
  instaladorId: string
  box: number
  data: string
  horario: string
  duracao: number
  status: StatusAgendamento
  valor?: number
  /** Quantas vezes este agendamento já teve data/horário alterados via "Reagendar". */
  reagendamentos?: number
}

export interface Instalador {
  id: string
  nome: string
  especialidades: string[]
  comissaoPadrao: number
  ativo: boolean
}

export interface LancamentoFinanceiro {
  id: string
  tipo: TipoLancamento
  categoria: string
  descricao: string
  valor: number
  data: string
  formaPagamento: string
  osId?: string
}

export type TipoControleEstoque = 'unidade' | 'bobina' | 'volume'

export interface Produto {
  id: string
  nome: string
  sku: string
  categoria: string
  fornecedor: string
  quantidade: number
  minimo: number
  unidade: string
  valorUnitario: number
  tipoControle: TipoControleEstoque
  /** Só relevante pra tipoControle === 'bobina': comprimento total no momento do cadastro/reabastecimento (a metragem restante é `quantidade`). */
  quantidadeOriginal?: number
  /** true = sobra/retalho de corte reaproveitável, não remessa comprada nova. */
  isRetalho: boolean
}

export interface Garantia {
  id: string
  osId: string
  clienteId: string
  veiculoId: string
  servico: string
  produto: string
  dataInicio: string
  dataFim: string
  status: StatusGarantia
}

export interface Meta {
  id: string
  mes: number
  ano: number
  faturamento: number
  numeroOS: number
  ticketMedio: number
  novosClientes: number
}

export interface Configuracoes {
  nomeLoja: string
  cidade: string
  telefone: string
  email: string
  corPrimaria: string
  numeroBoxes: number
  comissaoPadrao: number
  notifEstoque?: boolean
  notifGarantia?: boolean
  notifPosVenda?: boolean
}

// ── Legacy types for backward compatibility ────────────────────
export interface Alerta {
  id: string
  tipo: TipoAlerta
  titulo: string
  mensagem: string
  prioridade: PrioridadeAlerta
}

export interface FaturamentoMensal {
  mes: string
  valor: number
}

export interface Tecnico {
  id: string
  nome: string
  cargo: string
  especialidade: string
  osAbertas: number
  osMes: number
  avaliacao: number
  status: 'ativo' | 'folga' | 'ferias'
}

export type ProdutoEstoque = Omit<Produto, 'sku'> & { sku?: string }
