import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { Meta } from '../types'

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * Valores padrão pra uma loja nova sem linha em `metas` ainda — mesmos de
 * `initialMeta` em AppContext.tsx (duplicado aqui, não importado, mesmo
 * motivo de `e2e/global-setup.ts` não importar `AppContext.tsx`: evitar
 * import circular hook↔contexto). Diferente das outras entidades migradas
 * (que começam vazias, `[]`, pra uma loja nova — ver CLAUDE.md), `meta` é um
 * objeto singleton em `AppContextType` (`meta: Meta`, não `metas: Meta[]`):
 * a tela de Metas usa `meta.faturamento` etc. direto em cálculo de
 * percentual, então não pode começar de um objeto vazio.
 */
const META_PADRAO: Omit<Meta, 'id'> = {
  mes: 5,
  ano: 2025,
  faturamento: 40000,
  numeroOS: 30,
  ticketMedio: 6500,
  novosClientes: 15,
}

function normalizarMeta(row: Record<string, unknown>): Meta {
  return {
    id:            row.id as string,
    mes:           row.mes as number,
    ano:           row.ano as number,
    faturamento:   row.faturamento as number,
    numeroOS:      row.numeroOS as number,
    ticketMedio:   row.ticketMedio as number,
    novosClientes: row.novosClientes as number,
  }
}

function paraLinha(id: string, lojaId: string, m: Omit<Meta, 'id'>) {
  return {
    id, lojaId,
    mes: m.mes, ano: m.ano, faturamento: m.faturamento,
    numeroOS: m.numeroOS, ticketMedio: m.ticketMedio, novosClientes: m.novosClientes,
  }
}

/**
 * Fonte de dados de `metas` — nona entidade migrada de localStorage pro
 * Supabase (ver CLAUDE.md, "Migração de entidades pro Supabase"). Diferente
 * das outras (arrays), `meta` é um singleton por loja: o hook expõe um
 * objeto, não uma lista, espelhando `meta: Meta` em AppContextType. Ao
 * montar, busca a primeira linha de `metas` pra esse lojaId; se não existir
 * nenhuma ainda (loja nova), insere uma com `META_PADRAO` — garantindo que
 * toda mutação subsequente (`atualizarMeta`) sempre tenha uma linha real pra
 * atualizar (um `.update()` sobre uma tabela sem nenhuma linha correspondente
 * não retorna erro, só não persiste nada — por isso a linha é sempre criada
 * aqui, nunca só mantida em estado local).
 */
export function useMetasSupabase(lojaId: string) {
  const [meta, setMeta] = useState<Meta>({ id: '', ...META_PADRAO })

  useEffect(() => {
    let cancelado = false

    async function carregarOuCriar() {
      const { data: existente, error: erroBusca } = await supabase
        .from('metas')
        .select('*')
        .eq('lojaId', lojaId)
        .limit(1)
        .maybeSingle()

      if (cancelado) return

      if (erroBusca) {
        toast.error('Não foi possível carregar a meta do mês. Verifique sua conexão.')
        return
      }

      if (existente) {
        setMeta(normalizarMeta(existente))
        return
      }

      const valorInicial = { id: uid(), ...META_PADRAO }
      const { data: inserida, error: erroInsert } = await supabase
        .from('metas')
        .insert(paraLinha(valorInicial.id, lojaId, valorInicial))
        .select('*')
        .single()

      if (cancelado) return

      if (erroInsert || !inserida) {
        toast.error('Não foi possível criar a meta inicial da loja na nuvem.')
        setMeta(valorInicial)
        return
      }

      setMeta(normalizarMeta(inserida))
    }

    carregarOuCriar()
    return () => { cancelado = true }
  }, [lojaId])

  const atualizarMeta = (patch: Partial<Omit<Meta, 'id'>>) => {
    let anterior: Meta | undefined
    let idAtual = ''
    setMeta(prev => {
      anterior = prev
      idAtual = prev.id
      return { ...prev, ...patch }
    })

    supabase.from('metas').update(patch).eq('id', idAtual).eq('lojaId', lojaId).then(({ error }) => {
      if (error && anterior) {
        const snapshot = anterior
        setMeta(snapshot)
        toast.error('Não foi possível salvar a meta na nuvem.')
      }
    })
  }

  return { meta, atualizarMeta }
}
