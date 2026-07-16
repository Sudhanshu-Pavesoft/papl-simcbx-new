import { appendLineToPLCServiceLogFile, resetPLCServiceLogFile, console } from './plc/plcLogger'
import { PLC_CONFIG } from './plc/plcConfigs'
import { PLCId, PLCStatus } from './plc/plcTypes'
import { toErrorMessage } from './plc/plcUtils'
import { getNode, node } from './plc/plcNode'

resetPLCServiceLogFile()
appendLineToPLCServiceLogFile(
  'INFO',
  `========== PLC service log session started. target=${PLC_CONFIG.id} (${PLC_CONFIG.ip}:${PLC_CONFIG.port}) ==========`
)

export function getPLCConnectionStatus(): PLCStatus {
  return node.status
}

let pollingInterval: NodeJS.Timeout | null = null

export function startPolling(
  sendToRenderer: (data: Record<string, unknown>) => void,
  id: PLCId = PLC_CONFIG.id
): void {
  if (pollingInterval) return

  const plcNode = getNode(id)
  if (!plcNode.config.enabled) {
    console.warn(`[PLCService] startPolling() skipped for ${id}; PLC is disabled`)
    return
  }

  let firstDataLogged = false
  pollingInterval = setInterval(async () => {
    try {
      const started = Date.now()
      const data = await plcNode.readPLCData()
      if (data) {
        if (!firstDataLogged) {
          firstDataLogged = true
          appendLineToPLCServiceLogFile(
            'INFO',
            `[PLCService] first successful poll: ${Object.keys(data).length} group(s) in ${Date.now() - started}ms`
          )
        }
        sendToRenderer(data)
      }
    } catch (error) {
      console.error(`[PLCService] polling tick failed for ${id}:`, toErrorMessage(error))
    }
  }, plcNode.config.pollIntervalMs) as unknown as NodeJS.Timeout
}

export function stopPolling(): void {
  if (!pollingInterval) return
  clearInterval(pollingInterval)
  pollingInterval = null
}

export function stopAllPolling(): void {
  stopPolling()
}
