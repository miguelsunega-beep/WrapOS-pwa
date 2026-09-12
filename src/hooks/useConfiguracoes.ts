import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Palette } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { resetarDadosTeste } from '../utils/resetDadosTeste'
import type { Servico } from '../types'

const inferirCategoria = (nome: string): string => {
  const n = nome.toLowerCase()
  if (n.includes('ppf'))           return 'PPF'
  if (n.includes('envelopamento')) return 'Envelopamento'
  if (n.includes('insulfilm'))     return 'Insulfilm'
  if (n.includes('higieni'))       return 'Higienização'
  if (n.includes('personaliz'))    return 'Personalização'
  return 'Outros'
}

const blankServico = () => ({ nome: '', preco: '', tempEstimado: '' })

interface LojaForm    { nomeLoja: string; cidade: string; telefone: string; email: string }
interface OpForm      { comissaoPadrao: string; corPrimaria: string }
interface ServicoForm { nome: string; preco: string; tempEstimado: string }

export interface ToggleItem {
  icon:   LucideIcon
  titulo: string
  ativo:  boolean
  toggle: () => void
}

export function useConfiguracoes(role: string) {
  const {
    configuracoes, atualizarConfiguracoes,
    servicos, adicionarServico, editarServico, deletarServico,
  } = useApp()
  const { theme, toggleTheme } = useTheme()

  // ── Loja form ──────────────────────────────────────────────────
  const [loja, setLoja] = useState<LojaForm>({
    nomeLoja:  configuracoes.nomeLoja,
    cidade:    configuracoes.cidade,
    telefone:  configuracoes.telefone,
    email:     configuracoes.email,
  })

  // ── Operacional form ───────────────────────────────────────────
  const [op, setOp] = useState<OpForm>({
    comissaoPadrao: String(configuracoes.comissaoPadrao),
    corPrimaria:    configuracoes.corPrimaria,
  })

  // `configuracoes` chega assíncrono do Supabase — no mount desta página ele
  // ainda pode estar no valor padrão (fetch em voo). Os useState acima só
  // capturam esse valor uma vez; sem isso os forms ficam presos no padrão
  // pra sempre quando a página monta antes do fetch resolver (refresh direto
  // em /configuracoes, ou navegação rápida logo após o login).
  useEffect(() => {
    setLoja({
      nomeLoja: configuracoes.nomeLoja,
      cidade:   configuracoes.cidade,
      telefone: configuracoes.telefone,
      email:    configuracoes.email,
    })
  }, [configuracoes.nomeLoja, configuracoes.cidade, configuracoes.telefone, configuracoes.email])

  useEffect(() => {
    setOp({
      comissaoPadrao: String(configuracoes.comissaoPadrao),
      corPrimaria:    configuracoes.corPrimaria,
    })
  }, [configuracoes.comissaoPadrao, configuracoes.corPrimaria])

  // ── Save handlers ──────────────────────────────────────────────
  const handleSalvarLoja = () => {
    atualizarConfiguracoes({
      nomeLoja:  loja.nomeLoja.trim(),
      cidade:    loja.cidade.trim(),
      telefone:  loja.telefone.trim(),
      email:     loja.email.trim(),
    })
    toast.success('Dados da loja salvos com sucesso!')
  }

  const handleSalvarOp = () => {
    atualizarConfiguracoes({
      numeroBoxes:    configuracoes.numeroBoxes ?? 1,
      comissaoPadrao: Math.max(0, Math.min(100, parseFloat(op.comissaoPadrao) || 0)),
      corPrimaria:    op.corPrimaria,
    })
    toast.success('Configurações operacionais salvas!')
  }

  // ── Toggles array ─────────────────────────────────────────────
  const toggles: ToggleItem[] = [
    { icon: Palette, titulo: 'Tema Escuro', ativo: theme === 'dark', toggle: toggleTheme },
  ]

  // ── Serviço state ──────────────────────────────────────────────
  const [servForm,   setServForm]   = useState<ServicoForm>(blankServico)
  const [servEditId, setServEditId] = useState<string | null>(null)

  const categorias = servicos.reduce((acc, s) => {
    const cat = inferirCategoria(s.nome)
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {} as Record<string, Servico[]>)

  const prepararEditarServico = (s: Servico) => {
    setServEditId(s.id)
    setServForm({
      nome:         s.nome,
      preco:        s.preco !== undefined ? String(s.preco) : '',
      tempEstimado: s.tempEstimado !== undefined ? String(s.tempEstimado) : '',
    })
  }

  const resetServico = () => {
    setServEditId(null)
    setServForm(blankServico())
  }

  const salvarServico = (): boolean => {
    if (!servForm.nome.trim()) { toast.error('Nome é obrigatório.'); return false }
    const dados = {
      nome:         servForm.nome.trim(),
      preco:        servForm.preco.trim()        === '' ? undefined : Math.max(0, parseFloat(servForm.preco)        || 0),
      tempEstimado: servForm.tempEstimado.trim() === '' ? undefined : Math.max(0, parseFloat(servForm.tempEstimado) || 0),
    }
    if (servEditId) {
      editarServico(servEditId, dados)
      toast.success('Serviço atualizado!')
    } else {
      adicionarServico(dados)
      toast.success('Serviço adicionado!')
    }
    resetServico()
    return true
  }

  const deletarServicoById = (id: string) => {
    deletarServico(id)
    toast.success('Serviço excluído.')
  }

  // ── Zona de Perigo: resetar dados de teste (só o OWNER da loja) ─
  const isOwner = role === 'OWNER'
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')

  const abrirResetModal = () => {
    if (!isOwner) return
    setResetConfirmText('')
    setResetModalOpen(true)
  }

  const cancelarReset = () => {
    setResetModalOpen(false)
    setResetConfirmText('')
  }

  const confirmarReset = async () => {
    if (!isOwner) {
      toast.error('Apenas o proprietário da loja pode executar esta ação.')
      throw new Error('Ação restrita ao OWNER')
    }

    const lojaId = sessionStorage.getItem('wrapos_perfil_ativo')
    if (!lojaId) {
      toast.error('Não foi possível identificar a loja atual.')
      throw new Error('lojaId ausente')
    }

    try {
      await resetarDadosTeste(lojaId)
      toast.success('Dados de teste apagados com sucesso! Recarregando...')
      setResetModalOpen(false)
      setResetConfirmText('')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao apagar os dados de teste.')
      throw err
    }
  }

  return {
    loja,        setLoja,       handleSalvarLoja,
    op,          setOp,         handleSalvarOp,
    toggles,
    servicos,
    servForm,    setServForm,
    servEditId,
    categorias,
    prepararEditarServico,
    resetServico,
    salvarServico,
    deletarServicoById,
    isOwner,
    resetModalOpen,     abrirResetModal, cancelarReset,
    resetConfirmText,   setResetConfirmText,
    confirmarReset,
  }
}
