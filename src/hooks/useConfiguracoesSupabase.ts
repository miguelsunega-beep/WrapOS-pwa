import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Configuracoes } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * Valores padrão pra uma loja sem linha em `configuracoes` ainda — usado só
 * como fallback pro fluxo manual de "adicionar funcionário a uma loja já
 * existente" (ver CLAUDE.md), que não passa por `handle_novo_usuario()` com
 * `nome_loja` no metadata; contas criadas via `/cadastro` já ganham a linha
 * direto na trigger (migration 024). `nomeLoja` NUNCA é inventado aqui —
 * sempre herdado de `lojas.nome` (única fonte de verdade do nome real da
 * loja) pelo chamador. cidade/telefone/email ficam sempre `''` (nunca
 * `null` — as 3 colunas são NOT NULL sem default — e nunca um placeholder de
 * exemplo tipo "WrapOS Studio"/"São Paulo"/"(11) 3456-7890"/
 * "contato@wrapos.com.br", que é exatamente o bug que isto substitui —
 * investigação de 2026-09-13 achou 3 lojas reais de produção com esse
 * placeholder persistido como se fosse dado real). corPrimaria/numeroBoxes/
 * comissaoPadrao mantêm os mesmos defaults de sempre — não são dado de
 * identidade da loja.
 *
 * `configuracoes` é objeto singleton, não lista — mesmo raciocínio de
 * useMetasSupabase.ts, mas aqui ainda mais crítico: `useHome.ts` chama
 * `configuracoes.nomeLoja.split(' ')` sem nenhuma guarda — `''.split(' ')[0]`
 * retorna `''` (não quebra), então o estado inicial pré-fetch usa
 * `nomeLoja: ''` sem risco de crash na Home.
 */
function configuracoesPadrao(nomeLoja: string): Configuracoes {
  return {
    nomeLoja,
    cidade: '',
    telefone: '',
    email: '',
    corPrimaria: '#E94560',
    numeroBoxes: 6,
    comissaoPadrao: 12,
    notifEstoque: true,
    notifGarantia: true,
    notifPosVenda: true,
  }
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
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>(configuracoesPadrao(''))

  useEffect(() => {
    let cancelado = false

    async function carregarOuCriar() {
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
        return
      }

      // Sem linha ainda — só acontece hoje pro fluxo manual de funcionário
      // (ver comentário de configuracoesPadrao acima; contas de /cadastro já
      // ganham a linha na trigger). Herda o nome real da loja — nunca um
      // placeholder inventado.
      const { data: lojaRow } = await supabase
        .from('lojas')
        .select('nome')
        .eq('id', lojaId)
        .maybeSingle()

      if (cancelado) return

      const valorInicial = configuracoesPadrao(lojaRow?.nome ?? '')
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
