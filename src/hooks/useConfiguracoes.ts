import { useState } from 'react'
import { toast } from 'sonner'
import { Bell, Shield, Palette } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
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

const blankServico = () => ({ nome: '' })

interface LojaForm    { nomeLoja: string; cidade: string; telefone: string; email: string }
interface OpForm      { comissaoPadrao: string; corPrimaria: string }
interface ServicoForm { nome: string }

export interface ToggleItem {
  icon:   LucideIcon
  titulo: string
  ativo:  boolean
  toggle: () => void
}

export function useConfiguracoes() {
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

  // ── Notification values ────────────────────────────────────────
  const notifEstoque  = configuracoes.notifEstoque  ?? true
  const notifGarantia = configuracoes.notifGarantia ?? true
  const notifPosVenda = configuracoes.notifPosVenda ?? true

  // ── Auth 2FA (local, não persistido) ──────────────────────────
  const [auth2fa, setAuth2fa] = useState(false)

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
    { icon: Bell,    titulo: 'Notificações de Estoque Crítico', ativo: notifEstoque,     toggle: () => atualizarConfiguracoes({ notifEstoque:  !notifEstoque  }) },
    { icon: Bell,    titulo: 'Alertas de Garantia Vencendo',    ativo: notifGarantia,    toggle: () => atualizarConfiguracoes({ notifGarantia: !notifGarantia }) },
    { icon: Bell,    titulo: 'Lembretes de Pós-venda',          ativo: notifPosVenda,    toggle: () => atualizarConfiguracoes({ notifPosVenda: !notifPosVenda }) },
    { icon: Shield,  titulo: 'Autenticação em Dois Fatores',    ativo: auth2fa,          toggle: () => setAuth2fa(p => !p)                                       },
    { icon: Palette, titulo: 'Tema Escuro',                     ativo: theme === 'dark', toggle: toggleTheme                                                     },
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
    setServForm({ nome: s.nome })
  }

  const resetServico = () => {
    setServEditId(null)
    setServForm(blankServico())
  }

  const salvarServico = (): boolean => {
    if (!servForm.nome.trim()) { toast.error('Nome é obrigatório.'); return false }
    if (servEditId) {
      editarServico(servEditId, { nome: servForm.nome.trim() })
      toast.success('Serviço atualizado!')
    } else {
      adicionarServico({ nome: servForm.nome.trim() })
      toast.success('Serviço adicionado!')
    }
    resetServico()
    return true
  }

  const deletarServicoById = (id: string) => {
    deletarServico(id)
    toast.success('Serviço excluído.')
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
  }
}
