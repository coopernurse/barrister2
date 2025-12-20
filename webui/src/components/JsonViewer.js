// JsonViewer component - displays request/response JSON with syntax highlighting

const m = window.m;

export default {
    activeTab: 'response', // 'request' or 'response'
    parentVnode: null,
    
    view(vnode) {
        const { request, response } = vnode.attrs;
        
        // Store parent vnode for use in oncreate/onupdate
        this.parentVnode = vnode;
        
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
                                m.redraw();
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
                                m.redraw();
                            }
                        }, 'Response')
                    ])
                ])
            ]),
            m('div.card-body', [
                m('div.json-viewer-container', {
                    // Include data identifiers in key to force update when data changes
                    key: 'viewer-' + this.activeTab + '-' + (request && request.id ? request.id : 'no-req') + '-' + (response && response.id ? response.id : 'no-res'),
                    oncreate: (containerVnode) => {
                        this.containerVnode = containerVnode;
                        this.renderJsonViewer(containerVnode, vnode.attrs);
                    },
                    onupdate: (containerVnode) => {
                        this.containerVnode = containerVnode;
                        // Always use the current parent vnode attrs (updated each render)
                        this.renderJsonViewer(containerVnode, this.parentVnode.attrs);
                    }
                })
            ])
        ]);
    },
    
    renderJsonViewer(vnode, attrs) {
        if (!vnode || !vnode.dom) {
            console.warn('JsonViewer: vnode or vnode.dom is null');
            return;
        }
        
        const { request, response } = attrs || {};
        const data = this.activeTab === 'request' ? request : response;
        
        if (!data) {
            vnode.dom.innerHTML = '<p class="text-muted">No data available</p>';
            return;
        }
        
        // Use @andypf/json-viewer web component if available
        if (window.customElements && window.customElements.get('andypf-json-viewer')) {
            try {
                // Clear existing content
                while (vnode.dom.firstChild) {
                    vnode.dom.removeChild(vnode.dom.firstChild);
                }
                
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
                console.error('Error rendering json-viewer:', e);
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

