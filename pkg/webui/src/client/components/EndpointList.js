// EndpointList component - sidebar with endpoint management

import m from 'mithril'
import { getEndpoints, saveEndpoint, removeEndpoint } from '../utils/storage.js';
import { discoverIDL } from '../services/api.js';
import { buildTypeRegistry } from '../utils/types.js';

export default {
    newEndpointUrl: '',
    adding: false,
    discovering: false,
    
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
                    m('div.list-group-item', {
                        class: currentEndpoint === endpoint.url ? 'active' : '',
                        onclick: () => {
                            if (currentEndpoint !== endpoint.url) {
                                this.handleSelectEndpoint(endpoint.url, vnode);
                            }
                        }
                    }, [
                        m('div.d-flex.justify-content-between.align-items-center', [
                            m('div.flex-grow-1', [
                                m('div.fw-bold', endpoint.url),
                                m('small.text-muted', new Date(endpoint.lastUsed).toLocaleString())
                            ]),
                            m('button.btn.btn-sm.btn-outline-danger', {
                                onclick: (e) => {
                                    e.stopPropagation();
                                    this.handleRemoveEndpoint(endpoint.url, vnode);
                                }
                            }, '×')
                        ])
                    ])
                )
            )
        ]);
    },
    
    async handleAddEndpoint(vnode) {
        const url = this.newEndpointUrl.trim();
        if (!url) return;
        
        this.adding = true;
        m.redraw();
        try {
            saveEndpoint(url);
            this.endpoints = getEndpoints();
            this.newEndpointUrl = '';
            
            // Auto-select and discover
            await this.handleSelectEndpoint(url, vnode);
        } catch (error) {
            alert('Failed to add endpoint: ' + error.message);
        } finally {
            this.adding = false;
            m.redraw();
        }
    },
    
    async handleSelectEndpoint(url, vnode) {
        const { onEndpointSelect } = vnode.attrs;
        this.discovering = true;
        m.redraw();
        
        try {
            // Discover IDL
            const idl = await discoverIDL(url);
            
            // Build type registry
            const typeRegistry = buildTypeRegistry(idl);
            
            // Update app state
            if (onEndpointSelect) {
                onEndpointSelect(url, idl, typeRegistry);
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
                    onEndpointSelect(null, null, null);
                }
            }
        }
    }
};

