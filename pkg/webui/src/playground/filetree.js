import m from 'mithril'

const FileTree = {
  view: ({ attrs }) => {
    if (!attrs.files || attrs.files.length === 0) {
      return m('div', { class: 'filetree-panel' }, [
        m('h3', 'Generated Files'),
        m('p', { class: 'empty' }, 'No files generated yet. Click "Generate" to create code.')
      ])
    }

    // Group files by directory
    const tree = buildFileTree(attrs.files)

    return m('div', { class: 'filetree-panel' }, [
      m('h3', 'Generated Files'),
      m('ul', { class: 'filetree' }, renderTree(tree, attrs.selectedFile, attrs.onSelectFile, ''))
    ])
  }
}

function buildFileTree(files) {
  const tree = {}

  files.forEach(file => {
    const parts = file.split('/')
    let current = tree

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // It's a file
        current[part] = null // null indicates a file
      } else {
        // It's a directory
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }
    })
  })

  return tree
}

function renderTree(tree, selectedFile, onSelectFile, path) {
  const items = []

  Object.keys(tree).sort().forEach(key => {
    const fullPath = path ? `${path}/${key}` : key
    const isSelected = fullPath === selectedFile

    if (tree[key] === null) {
      // It's a file
      items.push(m('li', {
        class: isSelected ? 'selected' : '',
        onclick: () => onSelectFile(fullPath)
      }, key))
    } else {
      // It's a directory
      items.push(m('li', { class: 'directory' }, [
        m('span', { class: 'directory-name' }, key + '/'),
        m('ul', renderTree(tree[key], selectedFile, onSelectFile, fullPath))
      ]))
    }
  })

  return items
}

export default FileTree
