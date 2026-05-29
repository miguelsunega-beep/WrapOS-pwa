// ── Utility types ─────────────────────────────────────────────
export type StatusOS =
  | 'em_andamento'
  | 'aguardando_material'
  | 'aguardando_aprovacao'
  | 'concluido'
  | 'cancelado'

export type StatusAgendamento = 'agendado' | 'confirmado' | 'concluido' | 'cancelado'
export type StatusGarantia = 'ativa' | 'acionada' | 'expirada'
export type TipoLancamento = 'entrada' | 'saida'
export type TipoAlerta = 'estoque_baixo' | 'garantia' | 'pos_venda'
export type PrioridadeAlerta = 'alta' | 'media' | 'baixa'
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

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
  preco: number
  tempEstimado: number
}

export interface ItemOS {
  servicoId: string
  nome: string
  preco: number
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
  dataCriacao: string
  dataFinalizacao?: string
  agendamentoId?: string
  materiaisUsados?: { produtoId: string; quantidade: number }[]
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
