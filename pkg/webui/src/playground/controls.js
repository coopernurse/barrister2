import m from 'mithril'

const Controls = {
  view: ({ attrs }) => {
    return m('div', { class: 'controls' }, [
      m('label', {}, [
        'Language: ',
        m('select', {
          value: attrs.runtime,
          onchange: (e) => {
            if (attrs.onRuntimeChange) {
              attrs.onRuntimeChange(e.target.value)
            }
          }
        }, attrs.runtimes.map(runtime =>
          m('option', { value: runtime }, runtime)
        ))
      ]),
      m('button', {
        onclick: attrs.onGenerate,
        disabled: attrs.loading
      }, attrs.loading ? 'Generating...' : 'Generate'),
      attrs.sessionId ? m('button', {
        onclick: () => {
          window.location.href = `/api/playground/zip/${attrs.sessionId}`
        }
      }, 'Download ZIP') : null
    ])
  }
}

export default Controls
