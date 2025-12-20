// JsonViewer component - displays request/response JSON with syntax highlighting

const m = window.m;

export default {
    activeTab: 'response', // 'request' or 'response'
    
    view(vnode) {
        const { request, response } = vnode.attrs;
        
        if (!request && !response) {
            return null;
        }
        
        return m('div.card', [
            m('div.card-header', [
                m('ul.nav.nav-tabs.card-header-tabs', [
                    m('li.nav-item', [
                        m('a.nav-link', {
                            class: this.activeTab === 'request' ? 'active' : '',
                            href: '#',
                            onclick: (e) => {
                                e.preventDefault();
                                this.activeTab = 'request';
                            }
                        }, 'Request')
                    ]),
                    m('li.nav-item', [
                        m('a.nav-link', {
                            class: this.activeTab === 'response' ? 'active' : '',
                            href: '#',
                            onclick: (e) => {
                                e.preventDefault();
                                this.activeTab = 'response';
                            }
                        }, 'Response')
                    ])
                ])
            ]),
            m('div.card-body', [
                m('div.json-viewer-container', {
                    oncreate: (vnode) => {
                        this.renderJsonViewer(vnode, vnode.attrs);
                    },
                    onupdate: (vnode) => {
                        this.renderJsonViewer(vnode, vnode.attrs);
                    }
                })
            ])
        ]);
    },
    
    renderJsonViewer(vnode, attrs) {
        const { request, response } = attrs;
        const data = this.activeTab === 'request' ? request : response;
        
        if (!data) {
            vnode.dom.innerHTML = '<p class="text-muted">No data available</p>';
            return;
        }
        
        // Use @andypf/json-viewer web component if available
        if (customElements && customElements.get('andypf-json-viewer')) {
            try {
                // Clear existing content
                vnode.dom.innerHTML = '';
                
                // Create the web component
                const jsonViewer = document.createElement('andypf-json-viewer');
                jsonViewer.setAttribute('data', JSON.stringify(data));
                jsonViewer.setAttribute('expanded', '2');
                jsonViewer.setAttribute('indent', '2');
                jsonViewer.setAttribute('show-data-types', 'true');
                jsonViewer.setAttribute('show-copy', 'true');
                jsonViewer.setAttribute('show-size', 'false');
                jsonViewer.setAttribute('theme', 'default-light');
                
                vnode.dom.appendChild(jsonViewer);
            } catch (e) {
                // Fallback to pretty-printed JSON
                this.renderFallback(vnode, data);
            }
        } else {
            // Fallback to pretty-printed JSON
            this.renderFallback(vnode, data);
        }
    },
    
    renderFallback(vnode, data) {
        try {
            const jsonStr = JSON.stringify(data, null, 2);
            vnode.dom.innerHTML = '<pre class="mb-0"><code>' + 
                this.escapeHtml(jsonStr) + 
                '</code></pre>';
        } catch (e) {
            vnode.dom.innerHTML = '<p class="text-danger">Failed to format JSON: ' + 
                this.escapeHtml(e.message) + '</p>';
        }
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

