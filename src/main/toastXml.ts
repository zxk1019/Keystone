import { buildAppUrl } from '@shared/appUrl'
import type { NotificationContent } from '@core/notificationText'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * A Windows toast described in XML, used by the installed app. Clicking it, or its "Done"
 * button, opens a miestudio:// link, which works even after the app was restarted.
 * https://learn.microsoft.com/windows/apps/design/shell/tiles-and-notifications/adaptive-interactive-toasts
 */
export function toastXml(
  content: NotificationContent,
  options: { iconUrl: string; doneLabel: string }
): string {
  const open = buildAppUrl({ action: 'open', target: content.target })
  const actions = content.doneItemId
    ? `<actions><action content="${escapeXml(options.doneLabel)}" activationType="protocol" arguments="${escapeXml(
        buildAppUrl({ action: 'done', itemId: content.doneItemId })
      )}"/></actions>`
    : ''
  return [
    `<toast launch="${escapeXml(open)}" activationType="protocol">`,
    '<visual><binding template="ToastGeneric">',
    `<image placement="appLogoOverride" src="${escapeXml(options.iconUrl)}"/>`,
    `<text>${escapeXml(content.title)}</text>`,
    content.body ? `<text>${escapeXml(content.body)}</text>` : '',
    '</binding></visual>',
    actions,
    '</toast>'
  ].join('')
}
