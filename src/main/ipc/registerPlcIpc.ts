import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc.types'
import { node } from '../plc/plcNode'
import { getPLCConnectionStatus } from '../plcService'

export function registerPlcIpc(): void {
  ipcMain.handle(IPC.PLC_CONNECT, () => node.connect())
  ipcMain.handle(IPC.PLC_DISCONNECT, () => node.disconnect())
  ipcMain.handle(IPC.PLC_GET_STATUS, () => getPLCConnectionStatus())
  ipcMain.handle(IPC.PLC_READ, (_e, address: string) => node.read(address))
  ipcMain.handle(IPC.PLC_WRITE, (_e, address: string, value: unknown) => node.write(address, value))
  ipcMain.handle(IPC.PLC_READ_MULTIPLE, (_e, address: string, length: number) =>
    node.readMultiple(address, length)
  )
  ipcMain.handle(IPC.PLC_WRITE_MULTIPLE, (_e, address: string, values: unknown[] | unknown) =>
    Array.isArray(values) ? node.writeMultiple(address, values) : node.write(address, values)
  )
}
