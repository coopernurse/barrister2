// Main Mithril application
import m from 'mithril'

// Import components
import EndpointList from './components/EndpointList.js';
import InterfaceBrowser from './components/InterfaceBrowser.js';
import MethodForm from './components/MethodForm.js';
import JsonViewer from './components/JsonViewer.js';

// Application state
const AppState = {
    currentEndpoint: null,
    idl: null,
    typeRegistry: null,
    selectedInterface: null,
    selectedMethod: null,
    formValues: {},
    requestJson: null,
    responseJson: null,
    loading: false,
    error: null,
    sidebarWidth: parseInt(localStorage.getItem('barrister-sidebar-width')) || 300,
    sidebarSplitterPosition: parseFloat(localStorage.getItem('barrister-sidebar-splitter-position')) || 0.4,
    draggingHorizontal: false,
    draggingVertical: false
};

// Splitter component helpers
const Splitter = {
    handleHorizontalMouseDown(e) {
        e.preventDefault();
        AppState.draggingHorizontal = true;
        document.addEventListener('mousemove', Splitter.handleHorizontalMouseMove);
        document.addEventListener('mouseup', Splitter.handleHorizontalMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    },
    
    handleHorizontalMouseMove(e) {
        if (!AppState.draggingHorizontal) return;
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        AppState.sidebarWidth = newWidth;
        localStorage.setItem('barrister-sidebar-width', newWidth.toString());
        m.redraw();
    },
    
    handleHorizontalMouseUp() {
        AppState.draggingHorizontal = false;
        document.removeEventListener('mousemove', Splitter.handleHorizontalMouseMove);
        document.removeEventListener('mouseup', Splitter.handleHorizontalMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    },
    
    handleVerticalMouseDown(e) {
        e.preventDefault();
        AppState.draggingVertical = true;
        document.addEventListener('mousemove', Splitter.handleVerticalMouseMove);
        document.addEventListener('mouseup', Splitter.handleVerticalMouseUp);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    },
    
    handleVerticalMouseMove(e) {
        if (!AppState.draggingVertical) return;
        const sidebar = document.querySelector('.sidebar-container');
        if (!sidebar) return;
        const sidebarRect = sidebar.getBoundingClientRect();
        const relativeY = e.clientY - sidebarRect.top;
        const sidebarHeight = sidebarRect.height;
        const newPosition = Math.max(0.2, Math.min(0.8, relativeY / sidebarHeight));
        AppState.sidebarSplitterPosition = newPosition;
        localStorage.setItem('barrister-sidebar-splitter-position', newPosition.toString());
        m.redraw();
    },
    
    handleVerticalMouseUp() {
        AppState.draggingVertical = false;
        document.removeEventListener('mousemove', Splitter.handleVerticalMouseMove);
        document.removeEventListener('mouseup', Splitter.handleVerticalMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
};

// Main app component
const App = {
    oninit() {
        // Initialize state
    },
    
    view() {
        const mainContentWidth = `calc(100% - ${AppState.sidebarWidth + 5}px)`;
        const endpointHeight = `${AppState.sidebarSplitterPosition * 100}%`;
        const interfaceHeight = `${(1 - AppState.sidebarSplitterPosition) * 100}%`;
        
        return m('div.container-fluid', {
            style: { height: '100vh', display: 'flex', padding: 0, overflow: 'hidden' }
        }, [
            // Sidebar container
            m('div.sidebar-container', {
                style: {
                    width: `${AppState.sidebarWidth}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#fff',
                    borderRight: '1px solid #dee2e6',
                    overflow: 'hidden'
                }
            }, [
                // Endpoints section
                m('div.sidebar-section', {
                    style: {
                        height: endpointHeight,
                        overflowY: 'auto',
                        padding: '1rem'
                    }
                }, [
                    m(EndpointList, {
                        currentEndpoint: AppState.currentEndpoint,
                        onEndpointSelect: (endpoint, idl, typeRegistry) => {
                            AppState.currentEndpoint = endpoint;
                            AppState.idl = idl;
                            AppState.typeRegistry = typeRegistry;
                            AppState.selectedInterface = null;
                            AppState.selectedMethod = null;
                            AppState.formValues = {};
                            AppState.requestJson = null;
                            AppState.responseJson = null;
                            AppState.error = null;
                        }
                    })
                ]),
                
                // Vertical splitter
                AppState.currentEndpoint && AppState.idl ? m('div.splitter-vertical', {
                    style: {
                        height: '5px',
                        backgroundColor: '#dee2e6',
                        cursor: 'row-resize',
                        flexShrink: 0
                    },
                    onmousedown: Splitter.handleVerticalMouseDown
                }) : null,
                
                // Interfaces & Methods section
                AppState.currentEndpoint && AppState.idl ? m('div.sidebar-section', {
                    style: {
                        height: interfaceHeight,
                        overflowY: 'auto',
                        padding: '1rem'
                    }
                }, [
                    m(InterfaceBrowser, {
                        idl: AppState.idl,
                        typeRegistry: AppState.typeRegistry,
                        onMethodSelect: (iface, method) => {
                            AppState.selectedInterface = iface;
                            AppState.selectedMethod = method;
                            AppState.formValues = {};
                            AppState.requestJson = null;
                            AppState.responseJson = null;
                            AppState.error = null;
                        }
                    })
                ]) : null
            ]),
            
            // Horizontal splitter
            m('div.splitter-horizontal', {
                style: {
                    width: '5px',
                    backgroundColor: '#dee2e6',
                    cursor: 'col-resize',
                    flexShrink: 0
                },
                onmousedown: Splitter.handleHorizontalMouseDown
            }),
            
            // Main content area
            m('div.main-content', {
                style: {
                    width: mainContentWidth,
                    overflowY: 'auto',
                    padding: '1rem'
                }
            }, [
                AppState.selectedMethod ? [
                    m(MethodForm, {
                        method: AppState.selectedMethod,
                        typeRegistry: AppState.typeRegistry,
                        formValues: AppState.formValues,
                        onFormChange: (values) => {
                            AppState.formValues = values;
                        },
                        onSubmit: async (values) => {
                            AppState.loading = true;
                            AppState.error = null;
                            m.redraw();
                            
                            // Convert params object to array based on method parameter order
                            const paramsArray = AppState.selectedMethod.parameters
                                ? AppState.selectedMethod.parameters.map(param => values[param.name])
                                : [];
                            
                            AppState.requestJson = {
                                jsonrpc: '2.0',
                                method: `${AppState.selectedInterface.name}.${AppState.selectedMethod.name}`,
                                params: paramsArray,
                                id: Date.now()
                            };
                            
                            try {
                                const { callMethod } = await import('./services/api.js');
                                const response = await callMethod(
                                    AppState.currentEndpoint,
                                    AppState.selectedInterface.name,
                                    AppState.selectedMethod.name,
                                    paramsArray
                                );
                                AppState.responseJson = response;
                            } catch (err) {
                                AppState.error = err.message;
                                AppState.responseJson = {
                                    error: {
                                        code: -1,
                                        message: err.message
                                    }
                                };
                            } finally {
                                AppState.loading = false;
                                m.redraw();
                            }
                        }
                    }),
                    
                    AppState.loading ? m('div.card.mt-3', [
                        m('div.card-header', 'Request / Response'),
                        m('div.card-body.text-center', [
                            m('div.spinner-border[role=status]', [
                                m('span.visually-hidden', 'Loading...')
                            ]),
                            m('p.mt-2', 'Calling method...')
                        ])
                    ]) : (AppState.requestJson || AppState.responseJson) ? m(JsonViewer, {
                        request: AppState.requestJson,
                        response: AppState.responseJson
                    }) : null,
                    
                    AppState.error && m('div.alert.alert-danger.mt-3', AppState.error)
                ] : AppState.currentEndpoint ? [
                    AppState.idl ? null : m('div.card', [
                        m('div.card-body', [
                            m('h5', 'Discovering IDL...'),
                            m('div.spinner-border.spinner-border-sm[role=status]', [
                                m('span.visually-hidden', 'Loading...')
                            ])
                        ])
                    ])
                ] : [
                    m('div.card', [
                        m('div.card-body', [
                            m('h5', 'Select an endpoint'),
                            m('p.text-muted', 'Choose an endpoint from the sidebar or add a new one to get started.')
                        ])
                    ])
                ]
            ])
        ]);
    }
};

// Export the App component
export default App;
