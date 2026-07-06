import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { todayLocal } from '../lib/dateUtils'
import { useClientesSupabase } from '../hooks/useClientesSupabase'
import { useVeiculosSupabase } from '../hooks/useVeiculosSupabase'
import { useOrdensServicoSupabase } from '../hooks/useOrdensServicoSupabase'
import type {
  Cliente, Veiculo, OrdemServico, Servico, Agendamento, Instalador,
  LancamentoFinanceiro, Produto, Garantia, Meta, Configuracoes,
  StatusOS, StatusGarantia, StatusPagamento, MaterialUsado,
} from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * Compara os materiais de origem 'estoque' entre a lista antiga e a nova de uma OS,
 * retornando o delta de quantidade por produto (positivo = precisa baixar do estoque,
 * negativo = precisa devolver ao estoque). Soma quantidades quando o mesmo produto
 * aparece em mais de uma linha.
 */
function diffEstoqueDeltas(antigos: MaterialUsado[], novos: MaterialUsado[]): Map<string, number> {
  const somarPorProduto = (materiais: MaterialUsado[]) => {
    const mapa = new Map<string, number>()
    materiais.filter(m => m.origem === 'estoque' && m.produtoId).forEach(m => {
      mapa.set(m.produtoId!, (mapa.get(m.produtoId!) ?? 0) + m.quantidade)
    })
    return mapa
  }
  const antigoPorProduto = somarPorProduto(antigos)
  const novoPorProduto   = somarPorProduto(novos)
  const deltas = new Map<string, number>()
  new Set([...antigoPorProduto.keys(), ...novoPorProduto.keys()]).forEach(produtoId => {
    const delta = (novoPorProduto.get(produtoId) ?? 0) - (antigoPorProduto.get(produtoId) ?? 0)
    if (delta !== 0) deltas.set(produtoId, delta)
  })
  return deltas
}

function calcularPrazoMeses(nomesServicos: string[]): number {
  const all = nomesServicos.join(' ').toLowerCase()
  if (all.includes('ppf') || all.includes('película')) return 12
  if (all.includes('insulfilm')) return 24
  if (all.includes('polimento') || all.includes('higienização') || all.includes('higienizacao') ||
      all.includes('cerâmica') || all.includes('ceramica') || all.includes('coating')) return 3
  return 6
}

// ── Persistence hook ───────────────────────────────────────────
function usePersistedState<T>(key: string, initialValue: T) {
  const perfilId   = sessionStorage.getItem('wrapos_perfil_ativo') ?? '_'
  const storageKey = `wrapos_perfil_${perfilId}_${key}`

  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored !== null ? (JSON.parse(stored) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch {}
  }, [state, storageKey])

  return [state, setState] as const
}

// ── Mock data (exported for profile creation) ──────────────────

export const initialInstaladores: Instalador[] = [
  { id: 'i1', nome: 'Lucas Mota',     especialidades: ['PPF', 'Ceramic Coating'],        comissaoPadrao: 15, ativo: true },
  { id: 'i2', nome: 'Felipe Torres',  especialidades: ['Envelopamento', 'Chrome Delete'], comissaoPadrao: 12, ativo: true },
  { id: 'i3', nome: 'Matheus Vieira', especialidades: ['PPF Full Body', 'Insulfilm'],     comissaoPadrao: 13, ativo: true },
]

const initialServicos: Servico[] = [
  { id: 's1', nome: 'PPF Parcial',         preco: 1800, tempEstimado: 8  },
  { id: 's2', nome: 'PPF Full',            preco: 4500, tempEstimado: 24 },
  { id: 's3', nome: 'Envelopamento Capô',  preco:  380, tempEstimado: 3  },
  { id: 's4', nome: 'Envelopamento Full',  preco: 3200, tempEstimado: 16 },
  { id: 's5', nome: 'Chrome Delete',       preco:  890, tempEstimado: 6  },
  { id: 's6', nome: 'Teto Preto',          preco:  320, tempEstimado: 2  },
  { id: 's7', nome: 'Insulfilm',           preco:  450, tempEstimado: 3  },
  { id: 's8', nome: 'Higienização',        preco:  180, tempEstimado: 2  },
]

export const initialClientes: Cliente[] = [
  { id: 'c1',  nome: 'Carlos Oliveira',  telefone: '(11) 98432-7651', email: 'carlos.oliveira@email.com',  cpf: '329.451.870-12', comoConheceu: 'Instagram', dataCadastro: '2024-02-10', totalGasto: 19600 },
  { id: 'c2',  nome: 'Rodrigo Mendes',   telefone: '(11) 97654-3210', email: 'rodrigo.mendes@email.com',   cpf: '581.234.920-88', comoConheceu: 'Indicação', dataCadastro: '2024-03-15', totalGasto: 12400 },
  { id: 'c3',  nome: 'Amanda Costa',     telefone: '(11) 96543-8821', email: 'amanda.costa@email.com',     cpf: '102.873.456-55', comoConheceu: 'Google',    dataCadastro: '2024-05-20', totalGasto:  3200 },
  { id: 'c4',  nome: 'Felipe Santos',    telefone: '(11) 99871-4432', email: 'felipe.santos@email.com',    cpf: '745.632.180-21', comoConheceu: 'Indicação', dataCadastro: '2023-11-08', totalGasto: 28700 },
  { id: 'c5',  nome: 'Thiago Lima',      telefone: '(11) 98123-5567', email: 'thiago.lima@email.com',      cpf: '398.211.674-09', comoConheceu: 'Instagram', dataCadastro: '2024-04-03', totalGasto:  5600 },
  { id: 'c6',  nome: 'Isabela Martins',  telefone: '(11) 97890-1123', email: 'isabela.martins@email.com',  cpf: '512.904.731-44', comoConheceu: 'Google',    dataCadastro: '2024-06-12', totalGasto:  8900 },
  { id: 'c7',  nome: 'Ricardo Fonseca',  telefone: '(11) 96321-9876', email: 'ricardo.fonseca@email.com',  cpf: '234.567.890-34', comoConheceu: 'Facebook',  dataCadastro: '2024-01-20', totalGasto: 16200 },
  { id: 'c8',  nome: 'Mariana Souza',    telefone: '(11) 99234-5678', email: 'mariana.souza@email.com',    cpf: '876.543.210-98', comoConheceu: 'Indicação', dataCadastro: '2024-07-05', totalGasto:  4500 },
  { id: 'c9',  nome: 'Bruno Ferreira',   telefone: '(11) 98765-4321', email: 'bruno.ferreira@email.com',   cpf: '456.789.012-56', comoConheceu: 'TikTok',    dataCadastro: '2024-08-15', totalGasto:  1800 },
  { id: 'c10', nome: 'Gabriela Alves',   telefone: '(11) 97456-7890', email: 'gabriela.alves@email.com',   cpf: '678.901.234-78', comoConheceu: 'Instagram', dataCadastro: '2024-09-22', totalGasto:  3200 },
]

export const initialVeiculos: Veiculo[] = [
  { id: 'v1',  clienteId: 'c1',  marca: 'Audi',          modelo: 'Q5',                  ano: 2023, cor: 'Branco',    placa: 'GHT-3A21' },
  { id: 'v2',  clienteId: 'c2',  marca: 'BMW',           modelo: 'M3',                  ano: 2022, cor: 'Azul',      placa: 'PKZ-9D43' },
  { id: 'v3',  clienteId: 'c3',  marca: 'Land Rover',    modelo: 'Range Rover Evoque',  ano: 2024, cor: 'Cinza',     placa: 'MVB-2F67' },
  { id: 'v4',  clienteId: 'c4',  marca: 'Porsche',       modelo: '911 Carrera',         ano: 2023, cor: 'Amarelo',   placa: 'RLN-7E52' },
  { id: 'v5',  clienteId: 'c5',  marca: 'Mercedes-Benz', modelo: 'GLE 400d',            ano: 2024, cor: 'Preto',     placa: 'CBK-1H89' },
  { id: 'v6',  clienteId: 'c6',  marca: 'Jeep',          modelo: 'Wrangler Rubicon',    ano: 2023, cor: 'Verde',     placa: 'SDF-4J01' },
  { id: 'v7',  clienteId: 'c7',  marca: 'Tesla',         modelo: 'Model 3 Performance', ano: 2023, cor: 'Vermelho',  placa: 'WQP-6K33' },
  { id: 'v8',  clienteId: 'c8',  marca: 'Toyota',        modelo: 'Corolla Cross',       ano: 2022, cor: 'Branco',    placa: 'MTP-5L77' },
  { id: 'v9',  clienteId: 'c9',  marca: 'Honda',         modelo: 'Civic',               ano: 2023, cor: 'Preto',     placa: 'FKR-2M44' },
  { id: 'v10', clienteId: 'c10', marca: 'Volkswagen',    modelo: 'Golf GTI',            ano: 2022, cor: 'Cinza',     placa: 'NJX-8P92' },
]

export const initialOrdens: OrdemServico[] = [
  // em_andamento
  {
    id: 'os1', numero: 1087, clienteId: 'c1', veiculoId: 'v1',
    servicos: [{ servicoId: 's2', nome: 'PPF Full', preco: 4500 }],
    valorTotal: 4500, formaPagamento: 'Cartão de Crédito', instaladorId: 'i1',
    box: 1, comissao: 675, observacoes: 'Cliente VIP - Prioridade',
    status: 'em_andamento', dataCriacao: '2025-05-09',
  },
  {
    id: 'os2', numero: 1086, clienteId: 'c2', veiculoId: 'v2',
    servicos: [{ servicoId: 's4', nome: 'Envelopamento Full', preco: 3200 }],
    valorTotal: 3200, formaPagamento: 'PIX', instaladorId: 'i2',
    box: 2, comissao: 384, observacoes: '',
    status: 'em_andamento', dataCriacao: '2025-05-08',
  },
  {
    id: 'os3', numero: 1085, clienteId: 'c4', veiculoId: 'v4',
    servicos: [{ servicoId: 's2', nome: 'PPF Full', preco: 4500 }, { servicoId: 's5', nome: 'Chrome Delete', preco: 890 }],
    valorTotal: 5390, formaPagamento: 'Transferência', instaladorId: 'i3',
    box: 3, comissao: 700.7, observacoes: 'Porsche - cuidado redobrado',
    status: 'em_andamento', dataCriacao: '2025-05-05',
  },
  {
    id: 'os4', numero: 1084, clienteId: 'c5', veiculoId: 'v5',
    servicos: [{ servicoId: 's4', nome: 'Envelopamento Full', preco: 3200 }, { servicoId: 's6', nome: 'Teto Preto', preco: 320 }],
    valorTotal: 3520, formaPagamento: 'Cartão de Crédito', instaladorId: 'i2',
    box: 2, comissao: 422.4, observacoes: '',
    status: 'em_andamento', dataCriacao: '2025-05-04',
  },
  // aguardando_material
  {
    id: 'os5', numero: 1083, clienteId: 'c7', veiculoId: 'v7',
    servicos: [{ servicoId: 's2', nome: 'PPF Full', preco: 4500 }],
    valorTotal: 4500, formaPagamento: 'PIX', instaladorId: 'i1',
    box: 1, comissao: 675, observacoes: 'Aguardando rolo PPF Xpel',
    status: 'aguardando_material', dataCriacao: '2025-04-30',
  },
  {
    id: 'os6', numero: 1082, clienteId: 'c8', veiculoId: 'v8',
    servicos: [{ servicoId: 's1', nome: 'PPF Parcial', preco: 1800 }],
    valorTotal: 1800, formaPagamento: 'PIX', instaladorId: 'i3',
    box: 4, comissao: 234, observacoes: '',
    status: 'aguardando_material', dataCriacao: '2025-05-02',
  },
  // aguardando_aprovacao
  {
    id: 'os7', numero: 1081, clienteId: 'c3', veiculoId: 'v3',
    servicos: [{ servicoId: 's4', nome: 'Envelopamento Full', preco: 3200 }],
    valorTotal: 3200, formaPagamento: 'A definir', instaladorId: 'i2',
    box: 5, comissao: 384, observacoes: 'Cliente avaliando orçamento',
    status: 'aguardando_aprovacao', dataCriacao: '2025-05-07',
  },
  {
    id: 'os8', numero: 1080, clienteId: 'c9', veiculoId: 'v9',
    servicos: [{ servicoId: 's7', nome: 'Insulfilm', preco: 450 }, { servicoId: 's5', nome: 'Chrome Delete', preco: 890 }],
    valorTotal: 1340, formaPagamento: 'A definir', instaladorId: 'i2',
    box: 6, comissao: 160.8, observacoes: '',
    status: 'aguardando_aprovacao', dataCriacao: '2025-05-06',
  },
  // concluido
  {
    id: 'os9', numero: 1079, clienteId: 'c6', veiculoId: 'v6',
    servicos: [{ servicoId: 's4', nome: 'Envelopamento Full', preco: 3200 }],
    valorTotal: 3200, formaPagamento: 'Cartão de Débito', instaladorId: 'i3',
    box: 3, comissao: 416, observacoes: '',
    status: 'concluido', dataCriacao: '2025-05-02', dataFinalizacao: '2025-05-08',
  },
  {
    id: 'os10', numero: 1078, clienteId: 'c1', veiculoId: 'v1',
    servicos: [{ servicoId: 's5', nome: 'Chrome Delete', preco: 890 }],
    valorTotal: 890, formaPagamento: 'PIX', instaladorId: 'i1',
    box: 1, comissao: 133.5, observacoes: '',
    status: 'concluido', dataCriacao: '2025-04-25', dataFinalizacao: '2025-04-26',
  },
  {
    id: 'os11', numero: 1077, clienteId: 'c4', veiculoId: 'v4',
    servicos: [{ servicoId: 's1', nome: 'PPF Parcial', preco: 1800 }],
    valorTotal: 1800, formaPagamento: 'Cartão de Crédito', instaladorId: 'i3',
    box: 2, comissao: 234, observacoes: '',
    status: 'concluido', dataCriacao: '2025-04-20', dataFinalizacao: '2025-04-22',
  },
  {
    id: 'os12', numero: 1076, clienteId: 'c10', veiculoId: 'v10',
    servicos: [{ servicoId: 's3', nome: 'Envelopamento Capô', preco: 380 }, { servicoId: 's6', nome: 'Teto Preto', preco: 320 }],
    valorTotal: 700, formaPagamento: 'PIX', instaladorId: 'i2',
    box: 4, comissao: 84, observacoes: '',
    status: 'concluido', dataCriacao: '2025-04-28', dataFinalizacao: '2025-04-29',
  },
  {
    id: 'os13', numero: 1075, clienteId: 'c2', veiculoId: 'v2',
    servicos: [{ servicoId: 's8', nome: 'Higienização', preco: 180 }],
    valorTotal: 180, formaPagamento: 'PIX', instaladorId: 'i1',
    box: 5, comissao: 27, observacoes: '',
    status: 'concluido', dataCriacao: '2025-04-15', dataFinalizacao: '2025-04-15',
  },
  // cancelado
  {
    id: 'os14', numero: 1074, clienteId: 'c7', veiculoId: 'v7',
    servicos: [{ servicoId: 's2', nome: 'PPF Full', preco: 4500 }],
    valorTotal: 4500, formaPagamento: 'A definir', instaladorId: 'i1',
    box: 1, comissao: 0, observacoes: 'Cliente desistiu - mudou de cidade',
    status: 'cancelado', dataCriacao: '2025-04-10',
  },
  {
    id: 'os15', numero: 1073, clienteId: 'c5', veiculoId: 'v5',
    servicos: [{ servicoId: 's7', nome: 'Insulfilm', preco: 450 }],
    valorTotal: 450, formaPagamento: 'A definir', instaladorId: 'i2',
    box: 3, comissao: 0, observacoes: 'Veículo vendido pelo cliente',
    status: 'cancelado', dataCriacao: '2025-04-08',
  },
]

export const initialAgendamentos: Agendamento[] = [
  { id: 'ag1', clienteId: 'c1',  veiculoId: 'v1',  servicoId: 's2', instaladorId: 'i1', box: 1, data: '2025-05-12', horario: '08:00', duracao: 24, status: 'confirmado' },
  { id: 'ag2', clienteId: 'c3',  veiculoId: 'v3',  servicoId: 's4', instaladorId: 'i2', box: 2, data: '2025-05-13', horario: '09:00', duracao: 16, status: 'agendado'   },
  { id: 'ag3', clienteId: 'c8',  veiculoId: 'v8',  servicoId: 's7', instaladorId: 'i3', box: 3, data: '2025-05-14', horario: '10:00', duracao:  3, status: 'agendado'   },
  { id: 'ag4', clienteId: 'c9',  veiculoId: 'v9',  servicoId: 's5', instaladorId: 'i2', box: 4, data: '2025-05-15', horario: '08:00', duracao:  6, status: 'agendado'   },
  { id: 'ag5', clienteId: 'c10', veiculoId: 'v10', servicoId: 's3', instaladorId: 'i1', box: 5, data: '2025-05-16', horario: '11:00', duracao:  3, status: 'agendado'   },
]

export const initialLancamentos: LancamentoFinanceiro[] = [
  { id: 'l1',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1079 - Envelopamento Full - Isabela Martins',  valor: 3200, data: '2025-05-08', formaPagamento: 'Cartão de Débito', osId: 'os9'  },
  { id: 'l2',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1078 - Chrome Delete - Carlos Oliveira',       valor:  890, data: '2025-04-26', formaPagamento: 'PIX',              osId: 'os10' },
  { id: 'l3',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1077 - PPF Parcial - Felipe Santos',           valor: 1800, data: '2025-04-22', formaPagamento: 'Cartão de Crédito',osId: 'os11' },
  { id: 'l4',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1076 - Capô + Teto Preto - Gabriela Alves',   valor:  700, data: '2025-04-29', formaPagamento: 'PIX',              osId: 'os12' },
  { id: 'l5',  tipo: 'entrada', categoria: 'OS',           descricao: 'OS #1075 - Higienização - Rodrigo Mendes',         valor:  180, data: '2025-04-15', formaPagamento: 'PIX',              osId: 'os13' },
  { id: 'l6',  tipo: 'entrada', categoria: 'Adiantamento', descricao: 'Adiantamento OS #1087 - Carlos Oliveira',          valor: 2000, data: '2025-05-09', formaPagamento: 'PIX'                          },
  { id: 'l7',  tipo: 'entrada', categoria: 'Adiantamento', descricao: 'Adiantamento OS #1083 - Ricardo Fonseca',          valor: 1500, data: '2025-04-30', formaPagamento: 'Cartão de Crédito'            },
  { id: 'l8',  tipo: 'entrada', categoria: 'Outros',       descricao: 'Venda de material sobressalente',                  valor:  340, data: '2025-05-03', formaPagamento: 'PIX'                          },
  { id: 'l9',  tipo: 'entrada', categoria: 'Adiantamento', descricao: 'Adiantamento OS #1085 - Felipe Santos',            valor: 2500, data: '2025-05-05', formaPagamento: 'Transferência'               },
  { id: 'l10', tipo: 'entrada', categoria: 'Adiantamento', descricao: 'Adiantamento OS #1086 - Rodrigo Mendes',           valor: 1600, data: '2025-05-08', formaPagamento: 'PIX'                          },
  { id: 'l11', tipo: 'saida',   categoria: 'Estoque',      descricao: 'Compra 3 rolos PPF Xpel Ultimate Plus',            valor: 5550, data: '2025-05-01', formaPagamento: 'Boleto'                       },
  { id: 'l12', tipo: 'saida',   categoria: 'Folha',        descricao: 'Comissão Lucas Mota — Abril/2025',                 valor: 2100, data: '2025-05-05', formaPagamento: 'Transferência'               },
  { id: 'l13', tipo: 'saida',   categoria: 'Folha',        descricao: 'Comissão Felipe Torres — Abril/2025',              valor: 1650, data: '2025-05-05', formaPagamento: 'Transferência'               },
  { id: 'l14', tipo: 'saida',   categoria: 'Folha',        descricao: 'Comissão Matheus Vieira — Abril/2025',             valor: 1430, data: '2025-05-05', formaPagamento: 'Transferência'               },
  { id: 'l15', tipo: 'saida',   categoria: 'Aluguel',      descricao: 'Aluguel oficina — Maio/2025',                      valor: 4500, data: '2025-05-01', formaPagamento: 'Boleto'                       },
  { id: 'l16', tipo: 'saida',   categoria: 'Estoque',      descricao: 'Compra vinil Oracal 970 — 5 rolos',                valor: 1700, data: '2025-05-03', formaPagamento: 'PIX'                          },
  { id: 'l17', tipo: 'saida',   categoria: 'Marketing',    descricao: 'Impulsionamento Instagram — Maio',                 valor:  800, data: '2025-05-02', formaPagamento: 'Cartão de Crédito'            },
  { id: 'l18', tipo: 'saida',   categoria: 'Utilities',    descricao: 'Conta de energia elétrica — Abril',                valor:  680, data: '2025-05-04', formaPagamento: 'Débito automático'            },
  { id: 'l19', tipo: 'saida',   categoria: 'Manutenção',   descricao: 'Reparo ar condicionado da oficina',                valor:  450, data: '2025-05-07', formaPagamento: 'PIX'                          },
  { id: 'l20', tipo: 'saida',   categoria: 'Estoque',      descricao: 'Compra Ceramic Pro 9H — 5 frascos',                valor: 3400, data: '2025-05-06', formaPagamento: 'Boleto'                       },
]

export const initialProdutos: Produto[] = [
  { id: 'p1', nome: 'Filme PPF Xpel Ultimate Plus',  sku: 'XPEL-ULT-60',    categoria: 'PPF',          fornecedor: 'Xpel Brasil',         quantidade:  2, minimo:  5, unidade: 'rolo',    valorUnitario: 1850 },
  { id: 'p2', nome: 'Filme PPF Llumar Platinum',     sku: 'LLUM-PLT-60',    categoria: 'PPF',          fornecedor: 'Llumar',              quantidade:  7, minimo:  4, unidade: 'rolo',    valorUnitario: 1420 },
  { id: 'p3', nome: 'Vinil Oracal 970 Preto Fosco',  sku: 'ORACAL-970-070', categoria: 'Envelopamento', fornecedor: 'Oracal Distribuidora', quantidade: 12, minimo:  3, unidade: 'rolo',    valorUnitario:  340 },
  { id: 'p4', nome: 'Primer de Adesão 3M 94',        sku: '3M-94-100ML',    categoria: 'Acessórios',   fornecedor: '3M Brasil',           quantidade:  1, minimo:  4, unidade: 'unidade', valorUnitario:   89 },
  { id: 'p5', nome: 'Ceramic Pro 9H (30ml)',          sku: 'CP-9H-30',       categoria: 'Cerâmica',     fornecedor: 'Ceramic Pro Brasil',  quantidade:  6, minimo:  3, unidade: 'frasco',  valorUnitario:  680 },
  { id: 'p6', nome: 'Espátula de Plástico 15cm',     sku: 'ESP-PLAS-15',    categoria: 'Ferramentas',  fornecedor: 'Tools Auto',          quantidade: 24, minimo: 10, unidade: 'unidade', valorUnitario:   12 },
]

export const initialGarantias: Garantia[] = [
  { id: 'g1', osId: 'os9',  clienteId: 'c6',  veiculoId: 'v6',  servico: 'Envelopamento Full',             produto: 'Vinil Oracal 970 Verde Militar', dataInicio: '2025-05-08', dataFim: '2026-05-08', status: 'ativa'    },
  { id: 'g2', osId: 'os10', clienteId: 'c1',  veiculoId: 'v1',  servico: 'Chrome Delete',                  produto: 'Vinil Oracal 970 Preto Fosco',   dataInicio: '2025-04-26', dataFim: '2026-04-26', status: 'ativa'    },
  { id: 'g3', osId: 'os11', clienteId: 'c4',  veiculoId: 'v4',  servico: 'PPF Parcial',                    produto: 'Filme PPF Xpel Ultimate Plus',   dataInicio: '2025-04-22', dataFim: '2030-04-22', status: 'ativa'    },
  { id: 'g4', osId: 'os12', clienteId: 'c10', veiculoId: 'v10', servico: 'Envelopamento Capô + Teto Preto', produto: 'Vinil Oracal 970 Preto Fosco',  dataInicio: '2025-04-29', dataFim: '2026-04-29', status: 'ativa'    },
  { id: 'g5', osId: 'os9',  clienteId: 'c6',  veiculoId: 'v6',  servico: 'Envelopamento Full',             produto: 'Vinil Oracal 970 Verde Militar', dataInicio: '2024-10-01', dataFim: '2025-10-01', status: 'acionada' },
  { id: 'g6', osId: 'os13', clienteId: 'c2',  veiculoId: 'v2',  servico: 'PPF Parcial',                    produto: 'Filme PPF Llumar Platinum',      dataInicio: '2023-11-15', dataFim: '2024-11-15', status: 'expirada' },
]

export const initialMeta: Meta = {
  id: 'm1',
  mes: 5,
  ano: 2025,
  faturamento: 40000,
  numeroOS: 30,
  ticketMedio: 6500,
  novosClientes: 15,
}

export const initialConfiguracoes: Configuracoes = {
  nomeLoja: 'WrapOS Studio',
  cidade: 'São Paulo',
  telefone: '(11) 3456-7890',
  email: 'contato@wrapos.com.br',
  corPrimaria: '#E94560',
  numeroBoxes: 6,
  comissaoPadrao: 12,
  notifEstoque:  true,
  notifGarantia: true,
  notifPosVenda: true,
}

// ── Context types ──────────────────────────────────────────────

interface AppContextType {
  clientes: Cliente[]
  veiculos: Veiculo[]
  ordens: OrdemServico[]
  agendamentos: Agendamento[]
  instaladores: Instalador[]
  servicos: Servico[]
  lancamentos: LancamentoFinanceiro[]
  produtos: Produto[]
  garantias: Garantia[]
  meta: Meta
  configuracoes: Configuracoes

  // Clientes
  adicionarCliente: (c: Omit<Cliente, 'id'>) => string
  editarCliente: (id: string, c: Partial<Omit<Cliente, 'id'>>) => void
  /** Exclui de fato se o cliente não tiver OS vinculada; senão, apenas inativa. */
  deletarCliente: (id: string) => 'excluido' | 'inativado'
  reativarCliente: (id: string) => void

  // Veículos
  adicionarVeiculo: (v: Omit<Veiculo, 'id'>) => string
  editarVeiculo: (id: string, v: Partial<Omit<Veiculo, 'id'>>) => void
  deletarVeiculo: (id: string) => void

  // Ordens de Serviço
  adicionarOS: (os: Omit<OrdemServico, 'id' | 'numero' | 'dataCriacao'>) => number
  editarOS: (id: string, os: Partial<Omit<OrdemServico, 'id'>>) => void
  deletarOS: (id: string) => void
  mudarStatusOS: (id: string, status: StatusOS) => void
  /** Persiste os materiais usados de uma OS, ajustando o estoque pela diferença (delta) em relação aos materiais anteriores. */
  salvarMateriaisOS: (osId: string, novosMateriais: MaterialUsado[]) => void

  // Agendamentos
  adicionarAgendamento: (a: Omit<Agendamento, 'id'>) => void
  editarAgendamento: (id: string, a: Partial<Omit<Agendamento, 'id'>>) => void
  deletarAgendamento: (id: string) => void

  // Instaladores
  adicionarInstalador: (i: Omit<Instalador, 'id'>) => void
  editarInstalador: (id: string, i: Partial<Omit<Instalador, 'id'>>) => void
  deletarInstalador: (id: string) => void

  // Serviços
  adicionarServico: (s: Omit<Servico, 'id'>) => void
  editarServico: (id: string, s: Partial<Omit<Servico, 'id'>>) => void
  deletarServico: (id: string) => void

  // Produtos / Estoque
  adicionarProduto: (p: Omit<Produto, 'id'>) => void
  editarProduto: (id: string, p: Partial<Omit<Produto, 'id'>>) => void
  deletarProduto: (id: string) => void
  registrarEntradaEstoque: (id: string, qtd: number) => void
  baixarEstoque: (id: string, qtd: number, motivo?: string) => void

  // Lançamentos Financeiros
  adicionarLancamento: (l: Omit<LancamentoFinanceiro, 'id'>) => void
  deletarLancamento: (id: string) => void

  // Garantias
  adicionarGarantia: (g: Omit<Garantia, 'id'>) => void
  editarGarantia: (id: string, g: Partial<Omit<Garantia, 'id'>>) => void
  deletarGarantia: (id: string) => void
  registrarAcionamento: (id: string) => void

  // Eventos centrais de OS
  concluirOS: (id: string, materiaisUsados?: MaterialUsado[], pago?: boolean) => { created: string[] }
  registrarPagamentoOS: (id: string) => void
  cancelarOS: (id: string) => void
  entregarVeiculo: (id: string) => void

  // Meta & Configurações
  atualizarMeta: (m: Partial<Omit<Meta, 'id'>>) => void
  atualizarConfiguracoes: (c: Partial<Configuracoes>) => void
}

// ── Context ────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  // clientes: primeira entidade migrada de localStorage pro Supabase — ver
  // useClientesSupabase.ts e CLAUDE.md ("Migração de entidades pro Supabase").
  const lojaIdAtual = sessionStorage.getItem('wrapos_perfil_ativo') ?? '_'
  const {
    clientes,
    adicionarCliente: inserirClienteCloud,
    editarCliente:    atualizarClienteCloud,
    removerCliente:   removerClienteCloud,
  } = useClientesSupabase(lojaIdAtual)

  // veiculos: segunda entidade migrada de localStorage pro Supabase — ver
  // useVeiculosSupabase.ts e CLAUDE.md ("Migração de entidades pro Supabase").
  const {
    veiculos,
    adicionarVeiculo: inserirVeiculoCloud,
    editarVeiculo:    atualizarVeiculoCloud,
    removerVeiculo:   removerVeiculoCloud,
  } = useVeiculosSupabase(lojaIdAtual)

  // ordens: terceira entidade migrada de localStorage pro Supabase — ver
  // useOrdensServicoSupabase.ts e CLAUDE.md ("Migração de entidades pro Supabase").
  const {
    ordens,
    adicionarOrdemServico: inserirOSCloud,
    editarOrdemServico:    atualizarOSCloud,
    removerOrdemServico:   removerOSCloud,
  } = useOrdensServicoSupabase(lojaIdAtual)

  const [agendamentos,  setAgendamentos]  = usePersistedState<Agendamento[]>('agendamentos', initialAgendamentos)
  const [instaladores,  setInstaladores]  = usePersistedState<Instalador[]>('instaladores', initialInstaladores)
  const [lancamentos,   setLancamentos]   = usePersistedState<LancamentoFinanceiro[]>('lancamentos', initialLancamentos)
  const [produtos,      setProdutos]      = usePersistedState<Produto[]>('produtos', initialProdutos)
  const [garantias,     setGarantias]     = usePersistedState<Garantia[]>('garantias', initialGarantias)
  const [meta,          setMeta]          = usePersistedState<Meta>('meta', initialMeta)
  const [configuracoes, setConfiguracoes] = usePersistedState<Configuracoes>('configuracoes', initialConfiguracoes)
  const [servicos,      setServicos]      = usePersistedState<Servico[]>('servicos', initialServicos)

  // ── Clientes (Supabase — ver useClientesSupabase.ts) ──────────
  const adicionarCliente = inserirClienteCloud
  const editarCliente    = atualizarClienteCloud

  const deletarCliente = (id: string): 'excluido' | 'inativado' => {
    const temOSVinculada = ordens.some(o => o.clienteId === id)
    if (temOSVinculada) {
      atualizarClienteCloud(id, { status: 'inativo' })
      return 'inativado'
    }
    removerClienteCloud(id)
    return 'excluido'
  }

  const reativarCliente = (id: string) =>
    atualizarClienteCloud(id, { status: 'ativo' })

  // ── Veículos (Supabase — ver useVeiculosSupabase.ts) ──────────
  const adicionarVeiculo = inserirVeiculoCloud
  const editarVeiculo    = atualizarVeiculoCloud
  const deletarVeiculo   = removerVeiculoCloud

  // ── Ordens de Serviço (Supabase — ver useOrdensServicoSupabase.ts) ──
  const adicionarOS = (os: Omit<OrdemServico, 'id' | 'numero' | 'dataCriacao'>): number =>
    inserirOSCloud({ ...os, dataCriacao: todayLocal() })

  const editarOS = (id: string, os: Partial<Omit<OrdemServico, 'id'>>) =>
    atualizarOSCloud(id, os)

  const salvarMateriaisOS = (osId: string, novosMateriais: MaterialUsado[]) => {
    const os = ordens.find(x => x.id === osId)
    if (!os) return
    const deltas = diffEstoqueDeltas(os.materiaisUsados ?? [], novosMateriais)
    deltas.forEach((delta, produtoId) => {
      if (delta > 0) baixarEstoque(produtoId, delta)
      else registrarEntradaEstoque(produtoId, -delta)
    })
    atualizarOSCloud(osId, { materiaisUsados: novosMateriais })
  }

  const deletarOS = (id: string) => removerOSCloud(id)

  const mudarStatusOS = (id: string, status: StatusOS) => {
    if (status === 'concluido' || status === 'cancelado') return
    atualizarOSCloud(id, { status })
  }

  // ── Agendamentos ─────────────────────────────────────────────
  const adicionarAgendamento = (a: Omit<Agendamento, 'id'>) =>
    setAgendamentos(prev => [...prev, { ...a, id: uid() }])

  const editarAgendamento = (id: string, a: Partial<Omit<Agendamento, 'id'>>) =>
    setAgendamentos(prev => prev.map(x => x.id === id ? { ...x, ...a } : x))

  const deletarAgendamento = (id: string) =>
    setAgendamentos(prev => prev.filter(x => x.id !== id))

  // ── Instaladores ─────────────────────────────────────────────
  const adicionarInstalador = (i: Omit<Instalador, 'id'>) =>
    setInstaladores(prev => [...prev, { ...i, id: uid() }])

  const editarInstalador = (id: string, i: Partial<Omit<Instalador, 'id'>>) =>
    setInstaladores(prev => prev.map(x => x.id === id ? { ...x, ...i } : x))

  const deletarInstalador = (id: string) =>
    setInstaladores(prev => prev.filter(x => x.id !== id))

  // ── Serviços ──────────────────────────────────────────────────
  const adicionarServico = (s: Omit<Servico, 'id'>) =>
    setServicos(prev => [...prev, { ...s, id: uid() }])

  const editarServico = (id: string, s: Partial<Omit<Servico, 'id'>>) =>
    setServicos(prev => prev.map(x => x.id === id ? { ...x, ...s } : x))

  const deletarServico = (id: string) =>
    setServicos(prev => prev.filter(x => x.id !== id))

  // ── Produtos / Estoque ────────────────────────────────────────
  const adicionarProduto = (p: Omit<Produto, 'id'>) =>
    setProdutos(prev => [...prev, { ...p, id: uid() }])

  const editarProduto = (id: string, p: Partial<Omit<Produto, 'id'>>) =>
    setProdutos(prev => prev.map(x => x.id === id ? { ...x, ...p } : x))

  const registrarEntradaEstoque = (id: string, qtd: number) =>
    setProdutos(prev => prev.map(x => x.id === id ? { ...x, quantidade: x.quantidade + qtd } : x))

  const baixarEstoque = (id: string, qtd: number, _motivo?: string) =>
    setProdutos(prev => prev.map(x => x.id === id ? { ...x, quantidade: Math.max(0, x.quantidade - qtd) } : x))

  const deletarProduto = (id: string) =>
    setProdutos(prev => prev.filter(x => x.id !== id))

  // ── Lançamentos Financeiros ───────────────────────────────────
  const adicionarLancamento = (l: Omit<LancamentoFinanceiro, 'id'>) =>
    setLancamentos(prev => [...prev, { ...l, id: uid() }])

  const deletarLancamento = (id: string) =>
    setLancamentos(prev => prev.filter(x => x.id !== id))

  // ── Garantias ─────────────────────────────────────────────────
  const adicionarGarantia = (g: Omit<Garantia, 'id'>) =>
    setGarantias(prev => [...prev, { ...g, id: uid() }])

  const registrarAcionamento = (id: string) =>
    setGarantias(prev => prev.map(x =>
      x.id === id ? { ...x, status: 'acionada' as StatusGarantia } : x
    ))

  const editarGarantia = (id: string, g: Partial<Omit<Garantia, 'id'>>) =>
    setGarantias(prev => prev.map(x => x.id === id ? { ...x, ...g } : x))

  const deletarGarantia = (id: string) =>
    setGarantias(prev => prev.filter(x => x.id !== id))

  // ── Eventos centrais de OS ────────────────────────────────────
  const concluirOS = (id: string, materiaisUsados?: MaterialUsado[], pago: boolean = true): { created: string[] } => {
    const os = ordens.find(x => x.id === id)
    if (!os || os.status === 'concluido') return { created: [] }
    const today = todayLocal()
    const nomeCliente = clientes.find(c => c.id === os.clienteId)?.nome ?? ''
    const created: string[] = []

    atualizarOSCloud(id, {
      status: 'concluido' as StatusOS,
      dataFinalizacao: today,
      statusPagamento: (pago ? 'pago' : 'a_receber') as StatusPagamento,
      materiaisUsados: materiaisUsados ?? os.materiaisUsados,
      entregue: false,
    })

    if (pago && !lancamentos.some(l => l.osId === id && l.tipo === 'entrada')) {
      setLancamentos(prev => [...prev, {
        id: uid(), tipo: 'entrada' as const, categoria: 'OS',
        descricao: `OS #${os.numero} — ${nomeCliente}`,
        valor: os.valorTotal, data: today, formaPagamento: os.formaPagamento, osId: id,
      }])
      created.push('receita')
    } else if (!pago) {
      created.push('a_receber')
    }

    if (!garantias.some(g => g.osId === id)) {
      const prazo = calcularPrazoMeses(os.servicos.map(s => s.nome))
      const dataFimDate = new Date(today)
      dataFimDate.setMonth(dataFimDate.getMonth() + prazo)
      setGarantias(prev => [...prev, {
        id: uid(), osId: id, clienteId: os.clienteId, veiculoId: os.veiculoId,
        servico: os.servicos.map(s => s.nome).join(', '), produto: '',
        dataInicio: today, dataFim: dataFimDate.toISOString().slice(0, 10),
        status: 'ativa' as StatusGarantia,
      }])
      created.push('garantia')
    }

    const clienteAtual = clientes.find(c => c.id === os.clienteId)
    if (clienteAtual) {
      atualizarClienteCloud(os.clienteId, { totalGasto: clienteAtual.totalGasto + os.valorTotal })
    }
    setMeta(prev => ({ ...prev, numeroOS: prev.numeroOS + 1 }))

    if (materiaisUsados?.length) {
      // Só ajusta o estoque pela diferença em relação ao que já estava salvo em `os.materiaisUsados`
      // (que já foi baixado por salvarMateriaisOS) — evita baixa duplicada.
      const deltas = diffEstoqueDeltas(os.materiaisUsados ?? [], materiaisUsados)
      deltas.forEach((delta, produtoId) => {
        if (delta > 0) {
          setProdutos(prev => prev.map(p =>
            p.id === produtoId ? { ...p, quantidade: Math.max(0, p.quantidade - delta) } : p
          ))
        } else {
          setProdutos(prev => prev.map(p =>
            p.id === produtoId ? { ...p, quantidade: p.quantidade - delta } : p
          ))
        }
      })
      const custoCompras = materiaisUsados
        .filter(m => m.origem === 'compra')
        .reduce((s, m) => s + (m.custo ?? 0), 0)
      if (custoCompras > 0) {
        setLancamentos(prev => [...prev, {
          id: uid(), tipo: 'saida' as const, categoria: 'Material',
          descricao: `Material exclusivo OS #${os.numero} — ${nomeCliente}`,
          valor: custoCompras, data: today, formaPagamento: os.formaPagamento, osId: id,
        }])
        created.push('despesa_material')
      }
    }

    if (os.agendamentoId) {
      setAgendamentos(prev => prev.map(a =>
        a.id === os.agendamentoId ? { ...a, status: 'concluido' as const } : a
      ))
    }

    return { created }
  }

  const registrarPagamentoOS = (id: string): void => {
    const os = ordens.find(x => x.id === id)
    if (!os) return
    const today = todayLocal()
    const nomeCliente = clientes.find(c => c.id === os.clienteId)?.nome ?? ''
    if (!lancamentos.some(l => l.osId === id && l.tipo === 'entrada')) {
      setLancamentos(prev => [...prev, {
        id: uid(), tipo: 'entrada' as const, categoria: 'OS',
        descricao: `OS #${os.numero} — ${nomeCliente} (pagamento)`,
        valor: os.valorTotal, data: today, formaPagamento: os.formaPagamento, osId: id,
      }])
    }
    atualizarOSCloud(id, { statusPagamento: 'pago' as StatusPagamento })
  }

  const entregarVeiculo = (id: string): void => {
    const today = todayLocal()
    atualizarOSCloud(id, { entregue: true, dataSaida: today })
  }

  const cancelarOS = (id: string): void => {
    const os = ordens.find(x => x.id === id)
    if (!os || os.status === 'cancelado') return
    atualizarOSCloud(id, { status: 'cancelado' as StatusOS })
    if (os.agendamentoId) {
      setAgendamentos(prev => prev.map(a =>
        a.id === os.agendamentoId ? { ...a, status: 'agendado' as const } : a
      ))
    }
  }

  // ── Meta & Configurações ──────────────────────────────────────
  const atualizarMeta = (m: Partial<Omit<Meta, 'id'>>) =>
    setMeta(prev => ({ ...prev, ...m }))

  const atualizarConfiguracoes = (c: Partial<Configuracoes>) =>
    setConfiguracoes(prev => ({ ...prev, ...c }))

  return (
    <AppContext.Provider value={{
      clientes, veiculos, ordens, agendamentos, instaladores, servicos,
      lancamentos, produtos, garantias, meta, configuracoes,
      adicionarCliente, editarCliente, deletarCliente, reativarCliente,
      adicionarVeiculo, editarVeiculo, deletarVeiculo,
      adicionarOS, editarOS, deletarOS, mudarStatusOS, salvarMateriaisOS,
      adicionarAgendamento, editarAgendamento, deletarAgendamento,
      adicionarInstalador, editarInstalador, deletarInstalador,
      adicionarServico, editarServico, deletarServico,
      adicionarProduto, editarProduto, deletarProduto, registrarEntradaEstoque, baixarEstoque,
      adicionarLancamento, deletarLancamento,
      adicionarGarantia, editarGarantia, deletarGarantia, registrarAcionamento,
      concluirOS, registrarPagamentoOS, cancelarOS, entregarVeiculo,
      atualizarMeta, atualizarConfiguracoes,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
