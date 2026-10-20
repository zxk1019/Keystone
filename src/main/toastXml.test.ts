import { describe, expect, it } from 'vitest'
import { toastXml } from './toastXml'

const options = { iconUrl: 'file:///C:/app/icon.png', doneLabel: 'Hecho' }

describe('toastXml', () => {
  it('opens the task when clicked and marks it done with the button', () => {
    const xml = toastXml(
      {
        title: 'Va con retraso: Práctica 2',
        body: 'Servidor · Era para el vie, 16 oct',
        target: { section: 'tasks', itemId: 'item-1' },
        doneItemId: 'item-1'
      },
      options
    )
    expect(xml).toContain('launch="miestudio://open?section=tasks&amp;item=item-1"')
    expect(xml).toContain(
      '<action content="Hecho" activationType="protocol" arguments="miestudio://done?item=item-1"/>'
    )
    expect(xml).toContain('<text>Va con retraso: Práctica 2</text>')
  })

  it('has no button for other notifications and escapes the text', () => {
    const xml = toastXml(
      { title: 'Exam <3 & "friends"', body: '', target: { section: 'today' } },
      options
    )
    expect(xml).not.toContain('<actions>')
    expect(xml).toContain('<text>Exam &lt;3 &amp; &quot;friends&quot;</text>')
  })
})
