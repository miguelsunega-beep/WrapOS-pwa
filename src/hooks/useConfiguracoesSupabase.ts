import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Configuracoes } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/** Chave de flag "já migrei/criei as configurações dessa loja no Supabase" — escopada por lojaId. */
const migracaoFeitaKey = (lojaId: string) => `wrapos_configuracoes_migrado_${lojaId}`

/**
 * Valores padrão pra uma loja nova sem linha em `configuracoes` ainda —
 * mesmos de `initialConfiguracoes` em AppContext.tsx (duplicado aqui, mesmo
 * motivo de `META_PADRAO` em useMetasSupabase.ts: evitar import circular
 * hook↔contexto). `configuracoes` é objeto singleton, não lista — mesmo
 * raciocínio de useMetasSupabase.ts, mas aqui ainda mais crítico: `useHome.ts`
 * chama `configuracoes.nomeLoja.split(' ')` sem nenhuma guarda, então um
 * objeto vazio quebraria a Home logo no primeiro render.
 */
const CONFIGURACOES_PADRAO: Configuracoes = {
  nomeLoja: 'WrapOS Studio',
  cidade: 'São Paulo',
  telefone: '(11) 3456-7890',
  email: 'contato@wrapos.com.br',
  corPrimaria: '#E94560',
  numeroBoxes: 6,
  comissaoPadrao: 12,
  notifEstoque: true,
  notifGarantia: true,
  notifPosVenda: true,
}

function normalizarConfiguracoes(row: Record<string, unknown>): Configuracoes {
  return {
    nomeLoja:       row.nomeLoja as string,
    cidade:         row.cidade as string,
    telefone:       row.telefone as string,
    email:          row.email as string,
    corPrimaria:    row.corPrimaria as string,
    numeroBoxes:    row.numeroBoxes as number,
    comissaoPadrao: row.comissaoPadrao as number,
    notifEstoque:   (row.notifEstoque as boolean | null) ?? undefined,
    notifGarantia:  (row.notifGarantia as boolean | null) ?? undefined,
    notifPosVenda:  (row.notifPosVenda as boolean | null) ?? undefined,
  }
}

function paraLinha(id: string, lojaId: string, c: Configuracoes) {
  return {
    id, lojaId,
    nomeLoja: c.nomeLoja, cidade: c.cidade, telefone: c.telefone, email: c.email,
    corPrimaria: c.corPrimaria, numeroBoxes: c.numeroBoxes, comissaoPadrao: c.comissaoPadrao,
    notifEstoque: c.notifEstoque ?? null, notifGarantia: c.notifGarantia ?? null, notifPosVenda: c.notifPosVenda ?? null,
  }
}

/**
 * Fonte de dados de `configuracoes` — décima entidade migrada de
 * localStorage pro Supabase (ver CLAUDE.md, "Migração de entidades pro
 * Supabase"). Objeto singleton por loja, mesmo padrão de useMetasSupabase.ts
 * — mas aqui a unicidade também é garantida no próprio banco
 * (`configuracoes_lojaId_key`, `lojaId @unique` mantido na migration 007),
 * então basta filtrar update por `lojaId`: não precisa rastrear o `id` da
 * linha (o tipo `Configuracoes` do frontend nem expõe `id`).
 */
export function useConfiguracoesSupabase(lojaId: string) {
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>(CONFIGURACOES_PADRAO)

  useEffect(() => {
    let cancelado = false

    async function carregarOuCriar() {
      const jaMigrado = localStorage.getItem(migracaoFeitaKey(lojaId)) === '1'

      let legado: Configuracoes | null = null
      if (!jaMigrado) {
        try {
          const bruto = localStorage.getItem(`wrapos_perfil_${lojaId}_configuracoes`)
          legado = bruto ? (JSON.parse(bruto) as Configuracoes) : null
        } catch {
          legado = null
        }
      }

      const { data: existente, error: erroBusca } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('lojaId', lojaId)
        .maybeSingle()

      if (cancelado) return

      if (erroBusca) {
        toast.error('Não foi possível carregar as configurações da loja. Verifique sua conexão.')
        return
      }

      if (existente) {
        setConfiguracoes(normalizarConfiguracoes(existente))
        localStorage.setItem(migracaoFeitaKey(lojaId), '1')
        return
      }

      const valorInicial = legado ?? CONFIGURACOES_PADRAO
      const { data: inserida, error: erroInsert } = await supabase
        .from('configuracoes')
        .insert(paraLinha(uid(), lojaId, valorInicial))
        .select('*')
        .single()

      if (cancelado) return

      if (erroInsert || !inserida) {
        toast.error('Não foi possível criar as configurações iniciais da loja na nuvem.')
        setConfiguracoes(valorInicial)
        return
      }

      setConfiguracoes(normalizarConfiguracoes(inserida))
      localStorage.setItem(migracaoFeitaKey(lojaId), '1')
    }

    carregarOuCriar()
    return () => { cancelado = true }
  }, [lojaId])

  const atualizarConfiguracoes = (patch: Partial<Configuracoes>) => {
    let anterior: Configuracoes | undefined
    setConfiguracoes(prev => {
      anterior = prev
      return { ...prev, ...patch }
    })

    supabase.from('configuracoes').update(patch).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setConfiguracoes(snapshot)
        toast.error('Não foi possível salvar a alteração das configurações na nuvem.')
      }
    })
  }

  return { configuracoes, atualizarConfiguracoes }
}
