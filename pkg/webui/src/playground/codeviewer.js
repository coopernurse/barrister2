import m from 'mithril'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import csharp from 'highlight.js/lib/languages/csharp'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('go', go)
hljs.registerLanguage('java', java)
hljs.registerLanguage('python', python)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('cs', csharp)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('css', css)

// Map file extensions to highlight.js languages
const languageMap = {
  '.go': 'go',
  '.java': 'java',
  '.py': 'python',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.cs': 'csharp',
  '.xml': 'xml',
  '.html': 'xml',
  '.json': 'json',
  '.sh': 'bash',
  '.css': 'css',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.md': 'markdown'
}

// Get language for file
function getLanguageForFile(filename) {
  const ext = filename.substring(filename.lastIndexOf('.'))
  return languageMap[ext] || 'plaintext'
}

const CodeViewer = {
  oncreate: (vnode) => {
    // Apply syntax highlighting after DOM is created
    if (vnode.attrs.file && vnode.attrs.content) {
      const codeEl = vnode.dom.querySelector('code')
      if (codeEl) {
        const language = getLanguageForFile(vnode.attrs.file)
        const result = hljs.highlight(vnode.attrs.content, { language })
        codeEl.innerHTML = result.value
        codeEl.classList.add('hljs', `language-${language}`)
      }
    }
  },

  onupdate: (vnode) => {
    // Re-apply highlighting when content changes
    if (vnode.attrs.file && vnode.attrs.content) {
      const codeEl = vnode.dom.querySelector('code')
      if (codeEl) {
        const language = getLanguageForFile(vnode.attrs.file)
        const result = hljs.highlight(vnode.attrs.content, { language })
        codeEl.innerHTML = result.value
        codeEl.classList.add('hljs', `language-${language}`)
      }
    }
  },

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
