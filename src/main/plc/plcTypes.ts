import ModbusRTU from 'modbus-serial'
import type { PLCId, PLCStatus } from '@shared/ipc.types'

export type { PLCId, PLCStatus }

/** Mitsubishi device letters used by the old SLMP address map. */
export type PLCDeviceType = 'M' | 'X' | 'Y' | 'D' | 'R'

export interface DeviceOffsetEntry {
  /** Which Modbus table the PLC maps this device type to. */
  table: 'coil' | 'discrete' | 'holding'
  /** Modbus start address of device number 0. */
  offset: number
  /** X/Y device numbers are octal in Mitsubishi notation. */
  octal?: boolean
  /** Inputs (X) cannot be written from the HMI. */
  readOnly?: boolean
}

export type DeviceOffsets = Record<PLCDeviceType, DeviceOffsetEntry>

export interface PLCConfig {
  id: PLCId
  label: string
  model: 'FX5U' | 'FX3U' | 'GENERIC'
  transport: 'tcp'
  ip: string
  port: number
  unitId: number
  deviceOffsets: DeviceOffsets
  timeoutMs: number
  pollIntervalMs: number
  reconnectIntervalMs: number
  enabled: boolean
}

export type ModbusExecutor<T> = (client: ModbusRTU) => Promise<T>
