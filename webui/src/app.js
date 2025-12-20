// Main Mithril application

const m = window.m;

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
    error: null
};

// Main app component
const App = {
    oninit() {
        // Initialize state
    },
    
    view() {
        return m('div.container-fluid', [
            m('div.row', [
                // Sidebar with endpoint list
                m('div.col-md-3', [
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
                
                // Main content area
                m('div.col-md-9.main-content', [
                    AppState.currentEndpoint ? [
                        AppState.idl ? [
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
                            }),
                            
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
                            ] : null
                        ] : [
                            m('div.card', [
                                m('div.card-body', [
                                    m('h5', 'Discovering IDL...'),
                                    m('div.spinner-border.spinner-border-sm[role=status]', [
                                        m('span.visually-hidden', 'Loading...')
                                    ])
                                ])
                            ])
                        ]
                    ] : [
                        m('div.card', [
                            m('div.card-body', [
                                m('h5', 'Select an endpoint'),
                                m('p.text-muted', 'Choose an endpoint from the sidebar or add a new one to get started.')
                            ])
                        ])
                    ]
                ])
            ])
        ]);
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        m.mount(document.getElementById('app'), App);
    });
} else {
    m.mount(document.getElementById('app'), App);
}
