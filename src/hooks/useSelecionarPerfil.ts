import { useState } from 'react'
import {
  initialClientes, initialVeiculos, initialOrdens, initialAgendamentos,
  initialInstaladores, initialLancamentos, initialProdutos, initialGarantias,
  initialMeta, initialConfiguracoes,
} from '../context/AppContext'
import type { Agendamento, Meta } from '../types'
import { todayLocal } from '../lib/dateUtils'

const addDays = (n: number): string => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * initialMeta (AppContext.tsx) tem mes/ano fixos em maio/2025. Para que novos
 * perfis tenham a meta apontando para o mês corrente, geramos dinamicamente.
 */
function metaAtualDemo(): Meta {
  const d = new Date()
  return { ...initialMeta, mes: d.getMonth() + 1, ano: d.getFullYear() }
}

/**
 * initialAgendamentos (AppContext.tsx) tem datas fixas em maio/2025, então em
 * qualquer perfil novo criado depois disso o card "Próximo agendamento" da
 * tela de Agendamento nunca tem o que exibir. Gera 2 agendamentos futuros
 * relativos a "agora" só para o seed de exemplo, sem tocar em AppContext.tsx.
 */
function agendamentosFuturosDemo(): Agendamento[] {
  return [
    { id: 'ag-demo-1', clienteId: 'c1', veiculoId: 'v1', servicoId: 's4', instaladorId: 'i2', box: 1, data: addDays(2), horario: '09:00', duracao: 4, status: 'agendado'   },
    { id: 'ag-demo-2', clienteId: 'c2', veiculoId: 'v2', servicoId: 's1', instaladorId: 'i1', box: 2, data: addDays(4), horario: '14:00', duracao: 3, status: 'confirmado' },
  ]
}

export interface Perfil {
  id: string
  nome: string
  cidade: string
  criadoEm: string
}

const PERFIS_KEY = 'wrapos_perfis'

function lerPerfis(): Perfil[] {
  try { return JSON.parse(localStorage.getItem(PERFIS_KEY) ?? '[]') } catch { return [] }
}

export function getStats(perfilId: string) {
  try {
    const ordens   = JSON.parse(localStorage.getItem(`wrapos_perfil_${perfilId}_ordens`)   ?? '[]') as unknown[]
    const clientes = JSON.parse(localStorage.getItem(`wrapos_perfil_${perfilId}_clientes`) ?? '[]') as unknown[]
    return { osCount: ordens.length, clientesCount: clientes.length }
  } catch {
    return { osCount: 0, clientesCount: 0 }
  }
}

export function initials(nome: string) {
  return nome.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

export function useSelecionarPerfil({ onSelect }: { onSelect: (id: string) => void }) {
  const [perfis,     setPerfis]     = useState<Perfil[]>(lerPerfis)
  const [nomeLoja,   setNomeLoja]   = useState('')
  const [cidade,     setCidade]     = useState('')
  const [comExemplo, setComExemplo] = useState(true)
  const [erroNome,   setErroNome]   = useState(false)

  const selecionarPerfil = (id: string) => {
    sessionStorage.setItem('wrapos_perfil_ativo', id)
    onSelect(id)
  }

  const criarPerfil = () => {
    if (!nomeLoja.trim()) { setErroNome(true); return }
    setErroNome(false)

    const id  = Math.random().toString(36).slice(2)
    const cfg = { ...initialConfiguracoes, nomeLoja: nomeLoja.trim(), cidade: cidade.trim() }

    if (comExemplo) {
      localStorage.setItem(`wrapos_perfil_${id}_clientes`,     JSON.stringify(initialClientes))
      localStorage.setItem(`wrapos_perfil_${id}_veiculos`,     JSON.stringify(initialVeiculos))
      localStorage.setItem(`wrapos_perfil_${id}_ordens`,       JSON.stringify(initialOrdens))
      localStorage.setItem(`wrapos_perfil_${id}_agendamentos`, JSON.stringify([...initialAgendamentos, ...agendamentosFuturosDemo()]))
      localStorage.setItem(`wrapos_perfil_${id}_instaladores`, JSON.stringify(initialInstaladores))
      localStorage.setItem(`wrapos_perfil_${id}_lancamentos`,  JSON.stringify(initialLancamentos))
      localStorage.setItem(`wrapos_perfil_${id}_produtos`,     JSON.stringify(initialProdutos))
      localStorage.setItem(`wrapos_perfil_${id}_garantias`,    JSON.stringify(initialGarantias))
      localStorage.setItem(`wrapos_perfil_${id}_meta`,         JSON.stringify(metaAtualDemo()))
    } else {
      localStorage.setItem(`wrapos_perfil_${id}_clientes`,     JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_veiculos`,     JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_ordens`,       JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_agendamentos`, JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_instaladores`, JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_lancamentos`,  JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_produtos`,     JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_garantias`,    JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_meta`,         JSON.stringify(metaAtualDemo()))
    }
    localStorage.setItem(`wrapos_perfil_${id}_configuracoes`, JSON.stringify(cfg))

    const novoPerfil: Perfil = {
      id,
      nome:     nomeLoja.trim(),
      cidade:   cidade.trim(),
      criadoEm: todayLocal(),
    }
    localStorage.setItem(PERFIS_KEY, JSON.stringify([...perfis, novoPerfil]))

    sessionStorage.setItem('wrapos_perfil_ativo', id)
    onSelect(id)
  }

  const deletarPerfil = (id: string) => {
    const keysToDelete: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(`wrapos_perfil_${id}_`)) keysToDelete.push(k)
    }
    keysToDelete.forEach(k => localStorage.removeItem(k))

    const novosPerfis = perfis.filter(p => p.id !== id)
    localStorage.setItem(PERFIS_KEY, JSON.stringify(novosPerfis))
    setPerfis(novosPerfis)
  }

  return {
    perfis,
    nomeLoja,   setNomeLoja,
    cidade,     setCidade,
    comExemplo, setComExemplo,
    erroNome,   setErroNome,
    selecionarPerfil,
    criarPerfil,
    deletarPerfil,
    getStats,
    initials,
  }
}
