import m from 'mithril'

const CodeViewer = {
  view: ({ attrs }) => {
    if (!attrs.file || !attrs.content) {
      return m('div', { class: 'codeviewer-panel' }, [
        m('h3', 'Code Viewer'),
        m('p', { class: 'empty' }, 'Select a file to view its contents.')
      ])
    }

    return m('div', { class: 'codeviewer-panel' }, [
      m('h3', attrs.file),
      m('pre', { class: 'code' }, [
        m('code', attrs.content)
      ])
    ])
  }
}

export default CodeViewer
