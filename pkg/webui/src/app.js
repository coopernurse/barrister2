import m from 'mithril'
import Client from './client/client.js'
import Playground from './playground/playground.js'

// Current mode state
let currentMode = 'client' // 'client' or 'playground'

const App = {
  view: () => {
    return m('div', { class: 'app' }, [
      m('nav', { class: 'mode-switcher' }, [
        m('button', {
          class: currentMode === 'client' ? 'active' : '',
          onclick: () => { currentMode = 'client' }
        }, 'Client'),
        m('button', {
          class: currentMode === 'playground' ? 'active' : '',
          onclick: () => { currentMode = 'playground' }
        }, 'Playground')
      ]),
      currentMode === 'client' ? m(Client) : m(Playground)
    ])
  }
}

export default App
