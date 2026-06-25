import { Shield } from 'lucide-react'
import { Card } from '../components/Card'
import { useAvisos } from '../hooks/useAvisos'

export function Avisos() {
  const { secoes, total } = useAvisos()

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ui-text">Avisos</h1>
        <p className="text-gray-500 text-xs mt-0.5">
          {total === 0
            ? 'Nenhum alerta pendente no momento'
            : `${total} alerta${total !== 1 ? 's' : ''} pendente${total !== 1 ? 's' : ''}`}
        </p>
      </div>

      {total === 0 && (
        <Card>
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Shield size={22} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-ui-text">Tudo em ordem!</p>
            <p className="text-xs text-gray-500 mt-1">Nenhum alerta ativo no sistema.</p>
          </div>
        </Card>
      )}

      {secoes.map(({ key, label, descricao, iconCls, bgCls, badgeCls, icon: Icon, alertas }) =>
        alertas.length > 0 && (
          <div key={key} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${badgeCls}`}>
                  <Icon size={11} />
                  {label}
                </div>
                <p className="text-[11px] text-gray-500 mt-1 ml-0.5">{descricao}</p>
              </div>
              <span className="text-[11px] text-gray-600">{alertas.length} alerta{alertas.length !== 1 ? 's' : ''}</span>
            </div>

            <Card padding={false}>
              <div className="divide-y divide-ui-border">
                {alertas.map(alerta => (
                  <button
                    key={alerta.id}
                    onClick={alerta.onClick}
                    className="w-full text-left px-4 py-3.5 hover:bg-surface-600/40 transition-colors flex items-start gap-3 group"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${bgCls}`}>
                      <Icon size={14} className={iconCls} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ui-text">{alerta.titulo}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{alerta.mensagem}</p>
                    </div>
                    <span className="text-[11px] text-gray-600 group-hover:text-accent transition-colors shrink-0 mt-1">
                      Ver →
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )
      )}
    </div>
  )
}
