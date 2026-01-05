import m from 'mithril'

const Editor = {
  oncreate: (vnode) => {
    // Store the textarea element
    vnode.dom.textarea = vnode.dom
  },

  view: ({ attrs }) => {
    return m('div', { class: 'editor-panel' }, [
      m('h3', 'IDL Editor'),
      m('textarea', {
        value: attrs.idl,
        oninput: (e) => {
          if (attrs.onChange) {
            attrs.onChange(e.target.value)
          }
        },
        placeholder: 'Enter your IDL here...',
        spellcheck: false
      })
    ])
  }
}

export default Editor
