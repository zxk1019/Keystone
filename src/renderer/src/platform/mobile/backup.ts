import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { ExportResult } from '@shared/api'
import { toDateKey } from '@shared/dates'
import type { AppData } from '@shared/types'
import { parseAppData } from '@shared/validation'
import type { Translate } from '@core/i18n'

/** Hands a backup to the Android share menu: Drive, email, Files... */
export async function shareBackup(data: AppData, t: Translate): Promise<ExportResult> {
  const path = t('dialog.backupFileName', { date: toDateKey(new Date()) })
  // The sync bookkeeping belongs to this device, not to the copy
  const text = JSON.stringify({ ...data, sync: undefined }, null, 2)
  const { uri } = await Filesystem.writeFile({
    path,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  })
  try {
    await Share.share({
      title: t('dialog.exportTitle'),
      dialogTitle: t('dialog.exportTitle'),
      files: [uri]
    })
    return { status: 'shared' }
  } catch {
    // Closing the share menu without choosing anything
    return { status: 'canceled' }
  }
}

/** Lets the user choose a backup file. Null if the picker is closed without choosing. */
export function pickBackup(): Promise<AppData | 'invalid' | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.addEventListener('cancel', () => resolve(null))
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      try {
        resolve(parseAppData(JSON.parse(await file.text())) ?? 'invalid')
      } catch {
        resolve('invalid')
      }
    })
    input.click()
  })
}
