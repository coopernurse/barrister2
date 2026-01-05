import m from 'mithril'
import Client from './client/client.js'
import Playground from './playground/playground.js'

// Current mode state
let currentMode = 'playground' // 'client' or 'playground'

const App = {
  view: () => {
    return m('div', { class: 'app' }, [
      m('nav', { class: 'mode-switcher' }, [
        m('button', {
          class: currentMode === 'client' ? 'active' : '',
          onclick: () => { currentMode = 'client'; m.redraw() }
        }, 'Client'),
        m('button', {
          class: currentMode === 'playground' ? 'active' : '',
          onclick: () => { currentMode = 'playground'; m.redraw() }
        }, 'Playground')
      ]),
      currentMode === 'client' ? m(Client) : m(Playground)
    ])
  }
}

export default App
