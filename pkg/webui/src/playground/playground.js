import m from 'mithril'
import Editor from './editor.js'
import Controls from './controls.js'
import FileTree from './filetree.js'
import CodeViewer from './codeviewer.js'
import ErrorPanel from './errorpanel.js'

// State for the playground
const state = {
  idl: '',
  runtime: 'go-client-server',
  sessionId: null,
  files: [],
  selectedFile: null,
  fileContent: null,
  error: null,
  loading: false
}

// Available runtimes
const runtimes = [
  'go-client-server',
  'java-client-server',
  'python-client-server',
  'ts-client-server',
  'csharp-client-server'
]

const Playground = {
  oninit: (_vnode) => {
    // Load IDL from localStorage if available
    const savedIDL = localStorage.getItem('barrister-idl')
    if (savedIDL) {
      state.idl = savedIDL
    } else {
      // Set default example IDL
      state.idl = `namespace example

struct SaveUserRequest {
  firstName string
  lastName string
  email string [optional]
  role UserRole
}

struct SaveUserResponse {
  userId string
}

enum UserRole {
  admin
  user
  guest
}

interface UserService {
  save(input SaveUserRequest) SaveUserResponse
}`
    }

    // Load runtime from localStorage if available
    const savedRuntime = localStorage.getItem('barrister-runtime')
    if (savedRuntime) {
      state.runtime = savedRuntime
    }
  },

  view: () => {
    return m('div', { class: 'playground' }, [
      m(ErrorPanel, { error: state.error }),
      m(Controls, {
        runtimes,
        runtime: state.runtime,
        onRuntimeChange: (value) => { state.runtime = value },
        onGenerate: generateCode,
        sessionId: state.sessionId,
        loading: state.loading
      }),
      m('div', { class: 'content' }, [
        m(Editor, {
          idl: state.idl,
          onChange: (value) => {
            state.idl = value
            localStorage.setItem('barrister-idl', value)
          }
        }),
        m(FileTree, {
          files: state.files,
          selectedFile: state.selectedFile,
          onSelectFile: async (file) => {
            state.selectedFile = file
            await loadFileContent(state.sessionId, file)
          }
        }),
        m(CodeViewer, {
          file: state.selectedFile,
          content: state.fileContent
        })
      ])
    ])
  }
}

// Generate code
async function generateCode() {
  state.loading = true
  state.error = null
  m.redraw()

  try {
    const response = await fetch('/api/playground/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idl: state.idl,
        runtime: state.runtime
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }

    const data = await response.json()
    state.sessionId = data.id
    state.files = data.files
    state.selectedFile = null
    state.fileContent = null

    // Save runtime to localStorage
    localStorage.setItem('barrister-runtime', state.runtime)
  } catch (error) {
    state.error = error.message
    state.sessionId = null
    state.files = []
    state.selectedFile = null
    state.fileContent = null
  } finally {
    state.loading = false
    m.redraw()
  }
}

// Load file content
async function loadFileContent(sessionId, filePath) {
  try {
    const response = await fetch(`/api/playground/files/${sessionId}/${filePath}`)

    if (!response.ok) {
      throw new Error('Failed to load file')
    }

    const content = await response.text()
    state.fileContent = content
  } catch (error) {
    state.error = error.message
    state.fileContent = null
  }
  m.redraw()
}

export default Playground
