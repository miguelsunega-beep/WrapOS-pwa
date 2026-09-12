import { useState } from 'react'
import { toast } from 'sonner'
import { Package, AlertTriangle, DollarSign, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { MovimentacaoEstoque, Produto } from '../types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export const CATEGORIAS     = ['PPF', 'Envelopamento', 'Cerâmica', 'Acessórios', 'Ferramentas', 'Outros']
export const UNIDADES        = ['rolo', 'unidade', 'frasco', 'caixa', 'litro', 'metro']
const        CATEGORIAS_ROLO = ['PPF', 'Envelopamento']

// Passos de período do histórico de movimentação — 30 dias por padrão (ver
// ITEM 5 do levantamento: a tabela só cresce, nunca é limpa, então a consulta
// padrão vem sempre com um filtro de período em vez de puxar tudo de uma vez).
// "Expandir" avança pra 90 → 365 → um teto bem alto (equivalente a "tudo").
const PASSOS_PERIODO_HISTORICO = [30, 90, 365, 36500]

export interface ProdutoForm {
  nome: string; sku: string; categoria: string; fornecedor: string
  quantidade: string; minimo: string; unidade: string; valorUnitario: string
  metragemRolo: string; valorRolo: string
}

const initForm = (p?: Produto): ProdutoForm => ({
  nome:          p?.nome          ?? '',
  sku:           p?.sku           ?? '',
  categoria:     p?.categoria     ?? CATEGORIAS[0],
  fornecedor:    p?.fornecedor    ?? '',
  quantidade:    p ? String(p.quantidade)    : '0',
  minimo:        p ? String(p.minimo)        : '0',
  unidade:       p?.unidade       ?? UNIDADES[0],
  valorUnitario: p ? String(p.valorUnitario) : '',
  metragemRolo:  p && CATEGORIAS_ROLO.includes(p.categoria) ? String(p.quantidade) : '',
  valorRolo:     '',
})

export interface KpiEstoque {
  label: string
  value: string
  color: string
  icon:  LucideIcon
  bg:    string
}

export interface ProdutoEnriquecido extends Produto {
  critico:          boolean
  valorUnitarioStr: string
}

export function useEstoque() {
  const {
    produtos, adicionarProduto, editarProduto, deletarProduto, registrarEntradaEstoque, baixarEstoque,
    buscarMovimentacoesEstoque, usuarioId, usuarioNome,
  } = useApp()

  // ── Search / filter ────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const filtrados: ProdutoEnriquecido[] = produtos
    .filter(p => {
      const q = search.toLowerCase()
      return !q
        || p.nome.toLowerCase().includes(q)
        || p.categoria.toLowerCase().includes(q)
        || p.fornecedor.toLowerCase().includes(q)
    })
    .map(p => ({
      ...p,
      critico:          p.quantidade <= p.minimo,
      valorUnitarioStr: fmt(p.valorUnitario),
    }))

  // ── KPIs ───────────────────────────────────────────────────────
  const criticosCount      = produtos.filter(p => p.quantidade <= p.minimo).length
  const valorTotal         = produtos.reduce((s, p) => s + p.quantidade * p.valorUnitario, 0)
  const fornecedoresUnicos = new Set(produtos.map(p => p.fornecedor)).size

  const kpisEstoque: KpiEstoque[] = [
    { label: 'Total de Itens',   value: String(produtos.length),    color: 'text-ui-text',     icon: Package,       bg: 'bg-surface-600'    },
    { label: 'Estoque Crítico',  value: String(criticosCount),      color: 'text-accent',      icon: AlertTriangle, bg: 'bg-accent/10'      },
    { label: 'Valor em Estoque', value: fmt(valorTotal),            color: 'text-emerald-400', icon: DollarSign,    bg: 'bg-emerald-500/10' },
    { label: 'Fornecedores',     value: String(fornecedoresUnicos), color: 'text-blue-400',    icon: Users,         bg: 'bg-blue-500/10'    },
  ]

  // ── Produto form ───────────────────────────────────────────────
  const [form,       setForm]       = useState<ProdutoForm>(initForm)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // isRolo continua vindo da categoria selecionada no form — é só o que decide QUAIS
  // campos aparecem no modal (metragem+valor do rolo vs. qtd/mínimo/unidade), e essa
  // parte do formulário não muda nesta etapa (Round 2 de UI). O que muda é o que
  // salvarProduto ESCREVE: tipoControle passa a ser o campo real persistido (não mais
  // um valor inferido a cada leitura), e minimo/unidade deixam de ser forçados.
  const isRolo = CATEGORIAS_ROLO.includes(form.categoria)
  const produtoEmEdicao = editandoId ? produtos.find(p => p.id === editandoId) : undefined

  const custoPorMetroStr: string | null = (() => {
    const m = parseFloat(form.metragemRolo)
    const v = parseFloat(form.valorRolo)
    if (!m || m <= 0 || !v || v <= 0) return null
    return `${fmt(v / m)}/m`
  })()

  const prepararNovo = () => {
    setForm(initForm())
    setEditandoId(null)
  }

  const prepararEditar = (p: Produto) => {
    setForm(initForm(p))
    setEditandoId(p.id)
  }

  const salvarProduto = (): boolean => {
    if (!form.nome.trim()) { toast.error('Informe o nome do produto.'); return false }

    let valorUnitario: number
    let quantidade: number
    let quantidadeOriginal: number | undefined

    if (isRolo) {
      const metragem  = parseFloat(form.metragemRolo)
      const valorRolo = parseFloat(form.valorRolo)
      if (!metragem  || metragem  <= 0) { toast.error('Informe a metragem total do rolo.'); return false }
      if (!valorRolo || valorRolo <= 0) { toast.error('Informe o valor pago pelo rolo.');   return false }
      valorUnitario = valorRolo / metragem
      quantidade    = metragem
      // quantidadeOriginal só é (re)definido a partir da metragem do form na CRIAÇÃO (ou na
      // 1ª vez que um produto existente vira bobina). Ao editar um produto que já é bobina,
      // preserva o quantidadeOriginal já salvo — metragemRolo, ao editar, vem pré-preenchido
      // com a metragem RESTANTE (initForm usa p.quantidade, não p.quantidadeOriginal), então
      // recalcular daqui sobrescreveria o original de verdade pelo restante em qualquer save,
      // mesmo um que só corrige nome/fornecedor sem intenção de reabastecer. Reabastecer de
      // verdade usa "Entrada de Estoque" (registrarEntradaEstoque), que não passa por aqui;
      // redefinir o original de um produto já bobina fica pro fluxo de UI do Round 2.
      const jaEraBobina = produtoEmEdicao?.tipoControle === 'bobina'
      quantidadeOriginal = jaEraBobina && produtoEmEdicao?.quantidadeOriginal != null
        ? produtoEmEdicao.quantidadeOriginal
        : metragem
    } else {
      const valor = parseFloat(form.valorUnitario)
      if (!valor || valor <= 0) { toast.error('Informe o valor unitário.'); return false }
      valorUnitario = valor
      quantidade    = Math.max(0, parseFloat(form.quantidade) || 0)
      quantidadeOriginal = undefined
    }

    // Quantidade só é definida a partir do form na CRIAÇÃO. Editar um produto já
    // existente NUNCA muda a quantidade em estoque por aqui, mesmo que os campos
    // acima (Qtd. Inicial / Metragem do rolo) tragam outro valor — esses campos
    // ficam travados/somente-leitura na UI ao editar (ver Estoque.tsx) justamente
    // por isso, mas a garantia real é esta linha: mudar quantidade depois da
    // criação é exclusivo de Entrada/Baixa de estoque (que agora geram histórico
    // em movimentacoes_estoque, ver useProdutosSupabase.ts) ou consumo em OS —
    // nunca de "editar cadastro". Achado durante o levantamento pro histórico de
    // movimentação: antes desta mudança, salvar o formulário de edição
    // recalculava e sobrescrevia quantidade silenciosamente, sem motivo nem
    // rastro nenhum, mesmo quando a intenção era só corrigir nome/fornecedor.
    if (editandoId && produtoEmEdicao) {
      quantidade = produtoEmEdicao.quantidade
    }

    // minimo/unidade não são mais forçados pra 0/'metro' em produtos rolo — o form
    // simplesmente não mostra esses campos quando isRolo (inalterado nesta etapa), então
    // pra um produto novo eles saem com o default do form (minimo '0', unidade UNIDADES[0]);
    // pra um produto existente em edição, o valor real já salvo é preservado (initForm já
    // carregava p.minimo/p.unidade corretamente — só salvarProduto sobrescrevia com 0/'metro'
    // antes desta mudança, apagando um mínimo real como o do produto "Filme PPF Xpel
    // Ultimate Plus" do seed e2e, cadastrado com minimo=5).
    const dados: Omit<Produto, 'id'> = {
      nome:          form.nome.trim(),
      sku:           form.sku.trim(),
      categoria:     form.categoria,
      fornecedor:    form.fornecedor.trim(),
      quantidade,
      minimo:        Math.max(0, parseFloat(form.minimo) || 0),
      unidade:       form.unidade,
      valorUnitario,
      tipoControle:  isRolo ? 'bobina' : 'unidade',
      quantidadeOriginal,
      isRetalho:     produtoEmEdicao?.isRetalho ?? false,
    }

    if (!editandoId) {
      adicionarProduto(dados)
      toast.success('Produto cadastrado com sucesso!')
    } else {
      editarProduto(editandoId, dados)
      toast.success('Produto atualizado com sucesso!')
    }
    return true
  }

  // ── Entrada de estoque ─────────────────────────────────────────
  const registrarEntrada = (p: Produto, qtd: string): boolean => {
    const quantidade = parseFloat(qtd)
    if (!quantidade || quantidade <= 0) { toast.error('Informe uma quantidade válida.'); return false }
    registrarEntradaEstoque(p.id, quantidade)
    toast.success(`+${quantidade} ${p.unidade}(s) adicionado(s) ao estoque.`)
    return true
  }

  // ── Baixa de estoque ───────────────────────────────────────────
  const registrarBaixa = (p: Produto, qtd: string, motivo: string): boolean => {
    const quantidade = parseFloat(qtd)
    if (!quantidade || quantidade <= 0)  { toast.error('Informe uma quantidade válida.');              return false }
    if (quantidade > p.quantidade)       { toast.error('Quantidade maior que o estoque disponível.'); return false }
    baixarEstoque(p.id, quantidade, motivo.trim() || undefined)
    toast.success(`-${quantidade} ${p.unidade}(s) baixados do estoque.`)
    return true
  }

  // ── Deletar ────────────────────────────────────────────────────
  const deletarProdutoById = (id: string) => {
    deletarProduto(id)
    toast.success('Produto excluído do estoque.')
  }

  // ── Histórico de movimentação (ver movimentacoes_estoque, migration 019) ─
  // Sempre "Ver histórico" por produto (não uma aba separada) — mesmo motivo
  // documentado na migration: exige menos reestruturação da tela atual, e já
  // cobre "filtro por produto" só por ser escopado a um produto por vez.
  const [historicoProduto, setHistoricoProduto] = useState<Produto | null>(null)
  const [historicoItens, setHistoricoItens] = useState<MovimentacaoEstoque[]>([])
  const [historicoCarregando, setHistoricoCarregando] = useState(false)
  const [historicoDias, setHistoricoDias] = useState(PASSOS_PERIODO_HISTORICO[0])

  const carregarHistorico = async (produto: Produto, dias: number) => {
    setHistoricoCarregando(true)
    const desde = new Date()
    desde.setDate(desde.getDate() - dias)
    const itens = await buscarMovimentacoesEstoque({ produtoId: produto.id, desde: desde.toLocaleDateString('sv-SE') })
    setHistoricoItens(itens)
    setHistoricoCarregando(false)
  }

  const abrirHistorico = (produto: Produto) => {
    setHistoricoProduto(produto)
    setHistoricoDias(PASSOS_PERIODO_HISTORICO[0])
    void carregarHistorico(produto, PASSOS_PERIODO_HISTORICO[0])
  }

  const fecharHistorico = () => setHistoricoProduto(null)

  const historicoPodeExpandir = historicoDias < PASSOS_PERIODO_HISTORICO[PASSOS_PERIODO_HISTORICO.length - 1]

  const expandirHistorico = () => {
    if (!historicoProduto) return
    const proximo = PASSOS_PERIODO_HISTORICO.find(d => d > historicoDias) ?? historicoDias
    setHistoricoDias(proximo)
    void carregarHistorico(historicoProduto, proximo)
  }

  // RLS de `usuarios` só permite ler a própria linha (ver policies.sql,
  // usuarios_por_loja) — não tem como resolver o nome de OUTRO usuário da
  // mesma loja a partir do client hoje. Reconhece o próprio nome; cai num
  // rótulo genérico pro resto (hoje raro: cada loja em produção tem 1
  // usuário só).
  const nomeAutor = (mov: MovimentacaoEstoque) => mov.usuarioId === usuarioId ? usuarioNome : 'Outro usuário'

  return {
    search,
    setSearch,
    filtrados,
    kpisEstoque,
    criticosCount,
    CATEGORIAS,
    UNIDADES,
    form,
    setForm,
    isRolo,
    custoPorMetroStr,
    prepararNovo,
    prepararEditar,
    salvarProduto,
    registrarEntrada,
    registrarBaixa,
    deletarProdutoById,
    historicoProduto,
    historicoItens,
    historicoCarregando,
    historicoPodeExpandir,
    abrirHistorico,
    fecharHistorico,
    expandirHistorico,
    nomeAutor,
  }
}
