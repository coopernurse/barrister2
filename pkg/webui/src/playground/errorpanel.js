import m from 'mithril'

const ErrorPanel = {
  view: ({ attrs }) => {
    if (!attrs.error) {
      return null
    }

    return m('div', { class: 'error-panel' }, [
      m('strong', 'Error: '),
      attrs.error
    ])
  }
}

export default ErrorPanel
