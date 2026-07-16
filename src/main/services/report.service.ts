import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'
import { app, shell } from 'electron'
import { prisma } from '../db/prisma'
import type { ExportToExcelResult, PartDataListParams } from '@shared/ipc.types'

function getTemplatePath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'EOL_Report_Format.xlsx')
    : path.join(app.getAppPath(), 'resources', 'EOL_Report_Format.xlsx')
}

export async function exportPartDataToExcel({
  startDate: startInput,
  endDate: endInput,
  shift
}: PartDataListParams): Promise<ExportToExcelResult> {
  const startDate = new Date(startInput)
  const endDate = new Date(endInput)

  // Step 1: Fetch data
  const partDetails = await prisma.partData.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      },
      shift
    },
    include: {
      updatedBy: {
        select: { userName: true }
      }
    }
  })

  if (!partDetails.length) {
    throw new Error('No parts found for the given date range.')
  }

  // Step 2: Read template
  const workbook = new ExcelJS.Workbook()
  const templatePath = getTemplatePath()

  try {
    await workbook.xlsx.readFile(templatePath)
  } catch {
    throw new Error(`Failed to load Excel template: ${templatePath}`)
  }

  const worksheet = workbook.getWorksheet(1)
  if (!worksheet) {
    throw new Error('Template worksheet not found. Ensure it exists at index 1.')
  }

  // Step 3: Set header metadata
  worksheet.getCell('C2').value = `Report From-  ${startDate}`
  worksheet.getCell('C3').value = `Report To-    ${endDate}`
  worksheet.getCell('C4').value = `Total Parts- No's   ${partDetails.length}`

  const headerRow = worksheet.getRow(7)
  const headers = [
    'Sr.No',
    'Date',
    'Time',
    'Shift',
    'Operator Name',
    'Program No',
    'Model Name',
    'STAGE-1 STATUS',
    'STAGE-2 Resistance_Min(mOhm)',
    'STAGE-2 Resistance_Act(mOhm)',
    'STAGE-2 Resistance_Max(mOhm)',
    'STAGE-2 STATUS',
    'STAGE-3 Impedance_Min(microF)',
    'STAGE-3 Impedance_Act(microF)',
    'STAGE-3 Impedance_Max(microF)',
    'STAGE-3 STATUS',
    'STAGE-4 CB1 PARTIAL PRESS LOAD_Min(N)',
    'STAGE-4 CB1 PARTIAL PRESS LOAD_Act(N)',
    'STAGE-4 CB1 PARTIAL PRESS LOAD_Max(N)',
    'STAGE-4 CB1 FULL PRESS LOAD_Min(N)',
    'STAGE-4 CB1 FULL PRESS LOAD_Act(N)',
    'STAGE-4 CB1 FULL PRESS LOAD_Max(N)',
    'STAGE-4 STATUS',
    'STAGE-5 CB2 PARTIAL PRESS LOAD_Min(N)',
    'STAGE-5 CB2 PARTIAL PRESS LOAD_Act(N)',
    'STAGE-5 CB2 PARTIAL PRESS LOAD_max(N)',
    'STAGE-5 CB2 FULL PRESS LOAD_Min(N)',
    'STAGE-5 CB2 FULL PRESS LOAD_Act(N)',
    'STAGE-5 CB2 FULL PRESS LOAD_Max(N)',
    'STAGE-5 BOP STATUS',
    'STAGE-5 STATUS',
    'STAGE-6 BOP STATUS',
    'STAGE-6 STATUS',
    'STAGE-7 Print Data',
    'STAGE-7 STATUS',
    'STAGE-8 SCANNED DATA',
    'STAGE-8 STATUS',
    'Final Result'
  ]

  headers.forEach((title, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = title
    cell.alignment = { vertical: 'middle', horizontal: 'right' }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })
  headerRow.commit()

  // Step 4: Fill data
  let startRow = 8
  partDetails.forEach((item, index) => {
    const row = worksheet.getRow(startRow++)
    const dateObj = item.date ? new Date(item.date) : null

    const values = [
      index + 1,
      dateObj ? dateObj.toLocaleDateString('en-GB') : '',
      dateObj ? dateObj.toLocaleTimeString('en-GB', { hour12: false }) : '',
      item.shift,
      item.updatedBy?.userName ?? '',
      item.programNo,
      item.modelName,
      item.stage1Status,
      +item.stage2Min,
      +item.stage2Resistance,
      +item.stage2Max,
      item.stage2Status,
      +item.stage3Min,
      +item.stage3Impedance,
      +item.stage3Max,
      item.stage3Status,
      +item.stage4Cb1PartialLoadMin,
      +item.stage4Cb1PartialLoad,
      +item.stage4Cb1PartialLoadMax,
      +item.stage4Cb1FullLoadMin,
      +item.stage4Cb1FullLoad,
      +item.stage4Cb1FullLoadMax,
      item.stage4Status,
      +item.stage5Cb2PartialLoadMin,
      +item.stage5Cb2PartialLoad,
      +item.stage5Cb2PartialLoadMax,
      +item.stage5Cb2FullLoadMin,
      +item.stage5Cb2FullLoad,
      +item.stage5Cb2FullLoadMax,
      item.stage5Bop1Status,
      item.stage5Status,
      item.stage6Bop2Status,
      item.stage6BearingHeightStatus,
      item.stage7Status,
      item.stage8Status,
      item.stage8ScanResult,
      item.barcode,
      item.result
    ]

    values.forEach((value, i) => {
      const cell = row.getCell(i + 1)
      cell.value = value
      cell.alignment = { horizontal: 'right' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    row.commit()
  })

  // Step 5: Save to disk
  const dir = process.env.EOL_REPORT_DIR ?? 'D:/EOL_Reports'
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch {
    throw new Error(`Failed to create directory: ${dir}`)
  }

  // Format base filename from start/end dates
  const formatDate = (d: Date): string => d.toISOString().slice(0, 10)
  const baseName = `EOL_Report_${formatDate(startDate)}_to_${formatDate(endDate)}`

  // Generate unique filename if duplicate exists
  let fileName = `${baseName}.xlsx`
  let counter = 1
  while (fs.existsSync(path.join(dir, fileName))) {
    fileName = `${baseName}(${counter}).xlsx`
    counter++
  }

  const filePath = path.join(dir, fileName)

  try {
    await workbook.xlsx.writeFile(filePath)
  } catch {
    throw new Error(`Failed to write Excel file to ${filePath}`)
  }

  // Step 6: Open folder in Explorer (non-blocking)
  shell.openPath(dir).catch((err) => console.warn('Folder open failed:', err))

  return { filePath }
}
