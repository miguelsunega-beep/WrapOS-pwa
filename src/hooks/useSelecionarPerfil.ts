import { useState } from 'react'
import {
  initialClientes, initialVeiculos, initialOrdens, initialAgendamentos,
  initialInstaladores, initialLancamentos, initialProdutos, initialGarantias,
  initialMeta, initialConfiguracoes,
} from '../context/AppContext'

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
      localStorage.setItem(`wrapos_perfil_${id}_agendamentos`, JSON.stringify(initialAgendamentos))
      localStorage.setItem(`wrapos_perfil_${id}_instaladores`, JSON.stringify(initialInstaladores))
      localStorage.setItem(`wrapos_perfil_${id}_lancamentos`,  JSON.stringify(initialLancamentos))
      localStorage.setItem(`wrapos_perfil_${id}_produtos`,     JSON.stringify(initialProdutos))
      localStorage.setItem(`wrapos_perfil_${id}_garantias`,    JSON.stringify(initialGarantias))
      localStorage.setItem(`wrapos_perfil_${id}_meta`,         JSON.stringify(initialMeta))
    } else {
      localStorage.setItem(`wrapos_perfil_${id}_clientes`,     JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_veiculos`,     JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_ordens`,       JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_agendamentos`, JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_instaladores`, JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_lancamentos`,  JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_produtos`,     JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_garantias`,    JSON.stringify([]))
      localStorage.setItem(`wrapos_perfil_${id}_meta`,         JSON.stringify(initialMeta))
    }
    localStorage.setItem(`wrapos_perfil_${id}_configuracoes`, JSON.stringify(cfg))

    const novoPerfil: Perfil = {
      id,
      nome:     nomeLoja.trim(),
      cidade:   cidade.trim(),
      criadoEm: new Date().toISOString().slice(0, 10),
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
