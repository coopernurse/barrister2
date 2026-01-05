// InterfaceBrowser component - displays interfaces and methods

import m from 'mithril'

export default {
    expandedInterfaces: new Set(),
    lastIdl: null,
    
    oninit(vnode) {
        // Expand first interface by default
        this.updateExpandedInterfaces(vnode);
    },
    
    onbeforeupdate(vnode) {
        // Reinitialize when IDL changes
        if (vnode.attrs.idl !== this.lastIdl) {
            this.lastIdl = vnode.attrs.idl;
            this.updateExpandedInterfaces(vnode);
        }
        return true;
    },
    
    updateExpandedInterfaces(vnode) {
        // Reset and expand first interface by default
        this.expandedInterfaces.clear();
        if (vnode.attrs.idl && vnode.attrs.idl.interfaces && vnode.attrs.idl.interfaces.length > 0) {
            this.expandedInterfaces.add(vnode.attrs.idl.interfaces[0].name);
        }
    },
    
    view(vnode) {
        const { idl, onMethodSelect } = vnode.attrs;
        
        if (!idl || !idl.interfaces) {
            return m('div.card', [
                m('div.card-body', [
                    m('p.text-muted', 'No interfaces found in IDL')
                ])
            ]);
        }
        
        return m('div', [
            m('h5.mb-3', 'Interfaces & Methods'),
            idl.interfaces.map(iface => 
                m('div.mb-3', {
                    key: iface.name
                }, [
                    m('div.d-flex.align-items-center.mb-2', [
                        m('h6.mb-0.flex-grow-1', iface.name),
                        m('button.btn.btn-sm.btn-outline-secondary', {
                            onclick: () => {
                                if (this.expandedInterfaces.has(iface.name)) {
                                    this.expandedInterfaces.delete(iface.name);
                                } else {
                                    this.expandedInterfaces.add(iface.name);
                                }
                                m.redraw();
                            }
                        }, this.expandedInterfaces.has(iface.name) ? '−' : '+')
                    ]),
                    iface.comment && m('p.small.text-muted.mb-2', iface.comment),
                    this.expandedInterfaces.has(iface.name) && iface.methods && iface.methods.map(method =>
                        m('div.list-group-item.mb-2.method-item', {
                            key: iface.name + '.' + method.name,
                            style: { cursor: 'pointer' },
                            onclick: () => {
                                if (onMethodSelect) {
                                    onMethodSelect(iface, method);
                                }
                            }
                        }, [
                            m('div.method-content', [
                                m('div.fw-bold', method.name),
                                method.comment && m('div.small.text-muted.mt-1', method.comment),
                                m('div.small.mt-1', [
                                    m('span.text-muted', 'Params: '),
                                    method.parameters && method.parameters.length > 0
                                        ? method.parameters.map((p, i) => [
                                            i > 0 && ', ',
                                            m('code', p.name + ': ' + this.formatType(p.type))
                                        ])
                                        : m('span.text-muted', 'none')
                                ]),
                                m('div.small.mt-1', [
                                    m('span.text-muted', 'Response: '),
                                    m('code', this.formatType(method.returnType))
                                ])
                            ])
                        ])
                    )
                ])
            )
        ]);
    },
    
    formatType(type) {
        if (!type) return 'void';
        if (type.builtIn) return type.builtIn;
        if (type.array) return '[]' + this.formatType(type.array);
        if (type.mapValue) return 'map[string]' + this.formatType(type.mapValue);
        if (type.userDefined) return type.userDefined;
        return 'unknown';
    }
};

