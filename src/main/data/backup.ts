import { app, dialog, type BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ExportResult, ImportResult } from '@shared/api'
import { parseAppData } from '@shared/validation'
import type { Translate } from '../i18n'
import type { DataStore } from './dataStore'

function todayStamp(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export async function exportBackup(
  window: BrowserWindow,
  store: DataStore,
  t: Translate
): Promise<ExportResult> {
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: t('dialog.exportTitle'),
    defaultPath: join(app.getPath('documents'), t('dialog.backupFileName', { date: todayStamp() })),
    filters: [{ name: t('dialog.backupFileType'), extensions: ['json'] }]
  })
  if (canceled || !filePath) return { status: 'canceled' }

  // The sync bookkeeping belongs to this device, not to the copy
  const backup = { ...store.get(), sync: undefined }
  await writeFile(filePath, JSON.stringify(backup, null, 2), 'utf-8')
  return { status: 'saved', path: filePath }
}

export async function importBackup(
  window: BrowserWindow,
  store: DataStore,
  t: Translate
): Promise<ImportResult> {
  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    title: t('dialog.importTitle'),
    properties: ['openFile'],
    filters: [{ name: t('dialog.backupFileType'), extensions: ['json'] }]
  })
  if (canceled || filePaths.length === 0) return { status: 'canceled' }

  let data: ReturnType<typeof parseAppData>
  try {
    data = parseAppData(JSON.parse(await readFile(filePaths[0], 'utf-8')))
  } catch {
    data = null
  }
  if (!data) return { status: 'invalid' }

  const { response } = await dialog.showMessageBox(window, {
    type: 'warning',
    title: t('dialog.importTitle'),
    message: t('dialog.importConfirm'),
    buttons: [t('dialog.importButton'), t('dialog.cancelButton')],
    defaultId: 1,
    cancelId: 1
  })
  if (response !== 0) return { status: 'canceled' }

  store.update(() => data)
  return { status: 'imported' }
}
