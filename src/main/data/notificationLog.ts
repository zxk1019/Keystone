import { existsSync, readFileSync } from 'fs'
import { pruneLog, type SentLog } from '@shared/notifications'
import { isRecord } from '@shared/validation'
import { writeJsonAtomic } from './jsonFile'

/**
 * Which reminders were already sent and when. Lives in its own file, outside the backups:
 * importing a backup should not bring back old reminders.
 */
export class NotificationLog {
  private log: SentLog

  constructor(private readonly filePath: string) {
    this.log = this.load()
  }

  get(): SentLog {
    return this.log
  }

  record(keys: string[], now: Date): void {
    const sentAt = now.toISOString()
    const updated = { ...this.log }
    for (const key of keys) updated[key] = sentAt
    this.log = pruneLog(updated, now)
    writeJsonAtomic(this.filePath, this.log)
  }

  private load(): SentLog {
    if (!existsSync(this.filePath)) return {}
    try {
      const value: unknown = JSON.parse(readFileSync(this.filePath, 'utf-8'))
      if (!isRecord(value)) return {}
      return Object.fromEntries(
        Object.entries(value).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string'
        )
      )
    } catch {
      // A broken log only means some reminders may be sent again; start from scratch
      return {}
    }
  }
}
