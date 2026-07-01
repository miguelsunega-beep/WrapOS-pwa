/**
 * Retorna a data local de hoje no formato YYYY-MM-DD (timezone do dispositivo).
 *
 * Por que não usar new Date().toISOString().split('T')[0]?
 * toISOString() sempre retorna UTC. Entre 21h e meia-noite em GMT-3 o resultado
 * é a data do dia seguinte, quebrando todos os filtros que comparam com data local.
 *
 * 'sv-SE' usa o formato ISO 8601 (YYYY-MM-DD) na timezone local do browser.
 */
export function todayLocal(): string {
  return new Date().toLocaleDateString('sv-SE')
}
