import m from 'mithril'

const Client = {
  view: () => {
    return m('div', { class: 'client-mode' }, [
      m('h2', 'Client Mode'),
      m('p', 'This is the existing client mode for testing JSON-RPC servers.')
    ])
  }
}

export default Client
