import { app } from 'electron'
import { randomUUID } from 'crypto'
import fs from 'fs'
import nodePath from 'path'

const logsDir = nodePath.join(app.getPath('userData'), 'logs')
const MODEL_SETTING_LOG_FILE = nodePath.join(logsDir, 'modelSetting.jsonl')

export const logModelSettingUpdate = ({
  id,
  updatedFields,
  result,
  userName
}: {
  id: string
  updatedFields: Record<string, unknown>
  result: Record<string, unknown>
  userName?: string
}): void => {
  const logEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    modelSettingId: id,
    updatedFields,
    result,
    userName
  }

  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    fs.appendFileSync(MODEL_SETTING_LOG_FILE, JSON.stringify(logEntry) + '\n')
  } catch (err) {
    console.warn('Failed to write model setting log:', err)
  }
}
