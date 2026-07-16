import net from 'net'
import { EventEmitter } from 'events'
import {
  BARCODE_SCANNER_DEVICE_IP,
  BARCODE_SCANNER_DEVICE_PORT,
  BARCODE_SCANNER_DEVICE_RECONNECT_INTERVAL
} from '@shared/plc.const'
import type { ScannerTriggerResult } from '@shared/ipc.types'

interface ScannerOptions {
  host: string
  port: number
  reconnectInterval?: number // ms
}

export class BarcodeScanner extends EventEmitter {
  private client: net.Socket | null = null
  private host: string
  private port: number
  private reconnectInterval: number
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnected = false
  private destroyed = false

  constructor({ host, port, reconnectInterval = 5000 }: ScannerOptions) {
    super()
    this.host = host
    this.port = port
    this.reconnectInterval = reconnectInterval

    this.connect()
  }

  private connect(): void {
    if (this.destroyed) return
    this.client = new net.Socket()

    this.client.connect(this.port, this.host, () => {
      this.isConnected = true
      this.emit('connected')
      console.log('✅ Connected to Barcode scanner at', this.host, this.port)
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    })

    this.client.on('data', (data) => this.handleData(data))
    this.client.on('close', () => this.handleDisconnect())
    this.client.on('error', (err) => {
      console.error('Scanner socket error:', err.message)
      this.handleDisconnect()
    })
  }

  private handleData(data: Buffer): void {
    const response = data.toString().trim()

    if (response.startsWith('[OK]')) {
      this.emit('scan', response.replace('[OK]', '').trim())
    } else if (response.startsWith('[ER]')) {
      this.emit('error', new Error('Scan failed or timeout'))
    } else if (response.length > 0) {
      // Assume any other non-empty response is a scanned barcode
      this.emit('scan', response)
    } else {
      this.emit('raw', response)
    }
  }

  private handleDisconnect(): void {
    if (this.isConnected) {
      this.isConnected = false
      this.emit('disconnected')
      console.warn('⚠️ Disconnected from scanner')
    }

    if (this.client) {
      this.client.destroy()
      this.client = null
    }

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.destroyed) return

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.reconnectInterval)
  }

  public triggerScan(): void {
    if (this.client && this.isConnected) {
      this.client.write('LON\r')
    }
  }

  public stopScan(): void {
    if (this.client && this.isConnected) {
      this.client.write('LOFF\r')
    }
  }

  /** One-shot scan with timeout — the old tRPC scanner.trigger flow. */
  public triggerScanOnce(timeoutMs = 5000): Promise<ScannerTriggerResult> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.stopScan()
        this.removeListener('scan', onScan)
        this.removeListener('error', onError)
        resolve({ success: false, error: 'Scan timed out' })
      }, timeoutMs)

      const onScan = (barcode: string): void => {
        clearTimeout(timeout)
        this.stopScan()
        this.removeListener('error', onError)
        resolve({ success: true, barcode })
      }
      const onError = (err: Error): void => {
        clearTimeout(timeout)
        this.stopScan()
        this.removeListener('scan', onScan)
        resolve({ success: false, error: err.message })
      }

      this.once('scan', onScan)
      this.once('error', onError)
      this.triggerScan()
    })
  }

  public disconnect(): void {
    this.destroyed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.client) this.client.destroy()
  }

  public get status(): boolean {
    return this.isConnected
  }
}

let instance: BarcodeScanner | null = null

export function getBarcodeScanner(): BarcodeScanner {
  if (!instance) {
    instance = new BarcodeScanner({
      host: process.env.SCANNER_IP ?? BARCODE_SCANNER_DEVICE_IP,
      port: Number(process.env.SCANNER_PORT ?? BARCODE_SCANNER_DEVICE_PORT),
      reconnectInterval: BARCODE_SCANNER_DEVICE_RECONNECT_INTERVAL
    })
  }
  return instance
}

export function destroyBarcodeScanner(): void {
  instance?.disconnect()
  instance = null
}
