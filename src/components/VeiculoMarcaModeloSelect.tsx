import { useMarcas, useModelosPorMarca } from '../hooks/useMarcasModelos'

const inputCls =
  'w-full bg-surface-700 border border-ui-border rounded-lg px-3 py-2 text-sm text-ui-text placeholder-gray-500 focus:border-accent/50 outline-none transition-colors'

interface VeiculoMarcaModeloSelectProps {
  marca:          string
  modelo:         string
  onChangeMarca:  (marca: string) => void
  onChangeModelo: (modelo: string) => void
}

/**
 * Dropdowns em cascata marca → modelo usando a API pública da FIPE
 * (Parallelum). Se a API falhar (rede fora, rate limit etc.) e não houver
 * cache local, cai para inputs de texto livre — nunca trava o formulário.
 */
export function VeiculoMarcaModeloSelect({
  marca, modelo, onChangeMarca, onChangeModelo,
}: VeiculoMarcaModeloSelectProps) {
  const { marcas, erro: erroMarcas } = useMarcas()

  const marcaSelecionada = marcas.find(m => m.nome.toLowerCase() === marca.toLowerCase())
  const { modelos, erro: erroModelos } = useModelosPorMarca(marcaSelecionada?.id ?? null)

  const handleMarcaChange = (nome: string) => {
    onChangeMarca(nome)
    onChangeModelo('')
  }

  // API de marcas fora do ar e sem cache — fallback total pra texto livre
  if (erroMarcas && marcas.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Marca</label>
          <input
            type="text"
            placeholder="Ex: Toyota"
            value={marca}
            onChange={e => onChangeMarca(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Modelo</label>
          <input
            type="text"
            placeholder="Ex: Corolla"
            value={modelo}
            onChange={e => onChangeModelo(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
    )
  }

  // Modelo cai pra texto livre se: API de modelos falhou, ou a marca atual
  // não bate com nenhuma marca da FIPE (texto livre legado / sem seleção
  // ainda) — sem brandId não tem como buscar a lista de modelos.
  const usarTextoModelo = erroModelos || !marcaSelecionada

  // Preserva o valor atual de modelo mesmo se ele não estiver na lista da
  // FIPE (dado legado digitado à mão), em vez de descartá-lo.
  const modelosParaExibir = modelo && !modelos.some(m => m.nome === modelo)
    ? [{ id: '_atual', nome: modelo }, ...modelos]
    : modelos

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Marca</label>
        <select
          value={marca}
          onChange={e => handleMarcaChange(e.target.value)}
          className={inputCls}
        >
          <option className="bg-surface-700 text-ui-text" value="">Selecione...</option>
          {marca && !marcaSelecionada && (
            <option className="bg-surface-700 text-ui-text" value={marca}>{marca}</option>
          )}
          {marcas.map(m => (
            <option className="bg-surface-700 text-ui-text" key={m.id} value={m.nome}>{m.nome}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Modelo</label>
        {usarTextoModelo ? (
          <input
            type="text"
            placeholder="Ex: Corolla"
            value={modelo}
            onChange={e => onChangeModelo(e.target.value)}
            className={inputCls}
          />
        ) : (
          <select
            value={modelo}
            onChange={e => onChangeModelo(e.target.value)}
            className={inputCls}
          >
            <option className="bg-surface-700 text-ui-text" value="">Selecione...</option>
            {modelosParaExibir.map(m => (
              <option className="bg-surface-700 text-ui-text" key={m.id} value={m.nome}>{m.nome}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
