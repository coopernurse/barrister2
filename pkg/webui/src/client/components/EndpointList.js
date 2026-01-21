// EndpointList component - sidebar with endpoint management

import m from 'mithril'
import { getEndpoints, saveEndpoint, removeEndpoint, updateEndpointHeaders } from '../utils/storage.js';
import { discoverIDL } from '../services/api.js';
import { buildTypeRegistry } from '../utils/types.js';

export default {
    newEndpointUrl: '',
    adding: false,
    discovering: false,
    editingHeadersUrl: null, // URL of the endpoint whose headers are being edited
    
    oninit() {
        this.endpoints = getEndpoints();
    },
    
    view(vnode) {
        const currentEndpoint = vnode.attrs.currentEndpoint;
        
        return m('div.sidebar', [
            m('h5.mb-3', 'Endpoints'),
            
            // Add new endpoint form
            m('div.mb-3', [
                m('div.input-group', [
                    m('input.form-control.form-control-sm[type=text][placeholder=Endpoint URL]', {
                        value: this.newEndpointUrl,
                        oninput: (e) => {
                            this.newEndpointUrl = e.target.value;
                        },
                        onkeypress: (e) => {
                            if (e.key === 'Enter') {
                                this.handleAddEndpoint(vnode);
                            }
                        },
                        disabled: this.adding || this.discovering
                    }),
                    m('button.btn.btn-primary.btn-sm', {
                        onclick: () => this.handleAddEndpoint(vnode),
                        disabled: this.adding || this.discovering || !this.newEndpointUrl.trim()
                    }, this.adding ? 'Adding...' : '+')
                ]),
                this.discovering && m('div.small.text-muted.mt-1', [
                    m('span.spinner-border.spinner-border-sm[role=status]', {
                        style: { width: '0.875rem', height: '0.875rem', marginRight: '0.25rem', display: 'inline-block' }
                    }),
                    'Loading...'
                ])
            ]),
            
            // Endpoint list
            m('div.list-group', 
                this.endpoints.length === 0 ? [
                    m('div.list-group-item.text-muted.text-center', 'No endpoints yet')
                ] : this.endpoints.map(endpoint => 
                    m('div', [
                        m('div.list-group-item', {
                            class: currentEndpoint === endpoint.url ? 'active' : '',
                            onclick: () => {
                                if (currentEndpoint !== endpoint.url) {
                                    this.handleSelectEndpoint(endpoint, vnode);
                                }
                            },
                            style: { cursor: 'pointer' }
                        }, [
                            m('div.d-flex.justify-content-between.align-items-center', [
                                m('div.flex-grow-1', [
                                    m('div.fw-bold', { style: { wordBreak: 'break-all' } }, endpoint.url),
                                    m('small', { class: currentEndpoint === endpoint.url ? 'text-light' : 'text-muted' }, new Date(endpoint.lastUsed).toLocaleString())
                                ]),
                                m('div.btn-group', [
                                    m('button.btn.btn-sm', {
                                        class: currentEndpoint === endpoint.url ? 'btn-outline-light' : 'btn-outline-secondary',
                                        title: 'Manage Headers',
                                        onclick: (e) => {
                                            e.stopPropagation();
                                            this.toggleHeaderEditor(endpoint.url);
                                        }
                                    }, m('i.bi.bi-list')),
                                    m('button.btn.btn-sm.btn-outline-danger', {
                                        onclick: (e) => {
                                            e.stopPropagation();
                                            this.handleRemoveEndpoint(endpoint.url, vnode);
                                        }
                                    }, '×')
                                ])
                            ])
                        ]),
                        // Inline Header Editor
                        this.editingHeadersUrl === endpoint.url ? m('div.header-editor.p-2.border.border-top-0', [
                            m('div.small.fw-bold.mb-1', 'HTTP Headers'),
                            (endpoint.headers || []).map((header, idx) => 
                                m('div.d-flex.mb-1.gap-1', [
                                    m('input.form-control.form-control-xs[placeholder=Name]', {
                                        value: header.name,
                                        oninput: (e) => {
                                            header.name = e.target.value;
                                            this.saveHeaders(endpoint);
                                        }
                                    }),
                                    m('input.form-control.form-control-xs[placeholder=Value]', {
                                        value: header.value,
                                        oninput: (e) => {
                                            header.value = e.target.value;
                                            this.saveHeaders(endpoint);
                                        }
                                    }),
                                    m('button.btn.btn-xs.btn-outline-danger', {
                                        onclick: () => {
                                            endpoint.headers.splice(idx, 1);
                                            this.saveHeaders(endpoint);
                                        }
                                    }, '×')
                                ])
                            ),
                            m('button.btn.btn-xs.btn-outline-primary.mt-1', {
                                onclick: () => {
                                    endpoint.headers = endpoint.headers || [];
                                    endpoint.headers.push({ name: '', value: '' });
                                    this.saveHeaders(endpoint);
                                }
                            }, '+ Add Header')
                        ]) : null
                    ])
                )
            )
        ]);
    },
    
    toggleHeaderEditor(url) {
        if (this.editingHeadersUrl === url) {
            this.editingHeadersUrl = null;
        } else {
            this.editingHeadersUrl = url;
        }
    },

    saveHeaders(endpoint) {
        updateEndpointHeaders(endpoint.url, endpoint.headers);
    },

    async handleAddEndpoint(vnode) {
        const url = this.newEndpointUrl.trim();
        if (!url) return;
        
        this.adding = true;
        m.redraw();
        try {
            saveEndpoint(url);
            this.endpoints = getEndpoints();
            const endpoint = this.endpoints.find(e => e.url === url);
            this.newEndpointUrl = '';
            
            // Auto-select and discover
            await this.handleSelectEndpoint(endpoint, vnode);
        } catch (error) {
            alert('Failed to add endpoint: ' + error.message);
        } finally {
            this.adding = false;
            m.redraw();
        }
    },
    
    async handleSelectEndpoint(endpoint, vnode) {
        const url = endpoint.url;
        const { onEndpointSelect } = vnode.attrs;
        this.discovering = true;
        m.redraw();
        
        try {
            // Convert headers array to map for the discover call
            const headersMap = (endpoint.headers || []).reduce((acc, h) => {
                if (h.name && h.name.trim()) {
                    acc[h.name.trim()] = h.value || '';
                }
                return acc;
            }, {});

            // Discover IDL
            const idl = await discoverIDL(url, headersMap);
            
            // Build type registry
            const typeRegistry = buildTypeRegistry(idl);
            
            // Update app state
            if (onEndpointSelect) {
                onEndpointSelect(url, idl, typeRegistry, endpoint.headers);
            }
        } catch (error) {
            alert('Failed to discover IDL: ' + error.message);
        } finally {
            this.discovering = false;
            m.redraw();
        }
    },
    
    handleRemoveEndpoint(url, vnode) {
        if (confirm('Remove this endpoint?')) {
            removeEndpoint(url);
            this.endpoints = getEndpoints();
            
            // Clear selection if this was the current endpoint
            if (vnode.attrs.currentEndpoint === url) {
                const { onEndpointSelect } = vnode.attrs;
                if (onEndpointSelect) {
                    onEndpointSelect(null, null, null, []);
                }
            }
        }
    }
};

