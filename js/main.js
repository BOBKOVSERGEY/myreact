const api = {
    get(url) {
        switch(url) {
            case '/lots':
                return new Promise((resolve) => {
                    setTimeout(()=> {
                        resolve([
                            {
                                id: 1,
                                name: 'Apple',
                                description: 'Apple description',
                                price: 16
                            },
                            {
                                id: 2,
                                name: 'Orange',
                                description: 'Orange description',
                                price: 41
                            },
                            {
                                id: 3,
                                name: 'Berry',
                                description: 'Berry description',
                                price: 44
                            }
                        ])
                    }, 1000)
                })
            default:
                throw new Error('Unknown address')
        }
    }
}

const stream = {
    subscribe(channel, listener) {
        const match = /price-(\d+)/.exec(channel);
        if (match) {
            setInterval(()=> {
                listener({
                    id: parseInt(match[1]),
                    price: Math.round((Math.random()*10+30))
                })
            }, 400)
        }
    }
}


const initialState  = {
    time: new Date(),
    lots: null
}

class Store {
    constructor(initialState) {
        this.state = initialState;
        this.listeners = [];
    }

    subscribe (listener) {
        this.listeners.push(listener);

        return () => {
            const index = this.listeners.indexOf(listener)
            this.listeners.splice(index, 1)
        }
    }

    getState() {
        return this.state;
    }

    setState(state) {
        this.state = (typeof state === 'function' ? state(this.state) : state)
        this.listeners.forEach((listener) => listener())
    }
}

const store = new Store(initialState);

function App( { state } )
{
    return (
        <div className="app">
            <Header/>
            <Clock time={state.time} />
            <Lots lots={state.lots}/>
        </div>
    )
}


function Header() {
    return (
        <header className="header">
            <Logo />
        </header>
    )
}



function Logo() {
    return <img className="logo" src="images/logo.svg" alt="Logo" />
}

function Clock({ time })
{
    const isDay = time.getHours() >= 7 && time.getHours() <= 21;

    return (
        <div className="clock">
            <span className="value">{time.toLocaleTimeString()}</span>
            <span className={isDay ? 'icon day' : 'icon night'} />
        </div>
    )
}

function Loading() {
    return (
        <div className="loading">
            loading...
        </div>
    )
}


function Lots({ lots }) {
    
    if(lots === null) {
        return <Loading/>;
    }

    return (
        <div className="lots">
            {lots.map((lot) =><Lot lot={lot} key={lot.id}/>)}
        </div>
    )
}

function Lot({lot}) {
    return (
        <article className="lot">
            <div className="price">{lot.price}</div>
            <h1>{lot.name}</h1>
            <p>{lot.description}</p>
        </article>
    )
}

function render(virtualDom, realDomRoot) {
    const evaluateVirtualDom = evaluate(virtualDom);
    const virtualDomRoot = {
        type: realDomRoot.tagName.toLowerCase(),
        props: {
            id: realDomRoot.id,
            ...realDomRoot.attributes,
            children: [
                evaluateVirtualDom
            ]
        }
    }
    
    sync(virtualDomRoot, realDomRoot)
}

function evaluate(virtualNode) {
    if (typeof virtualNode !== 'object') {
        return virtualNode
    }

    if (typeof virtualNode.type === 'function') {
        return evaluate((virtualNode.type)(virtualNode.props))
    }

    const props = virtualNode.props || {};

    return {
        ...virtualNode,
        props: {
            ...props,
            children: Array.isArray(props.children) ? props.children.map(evaluate) : [evaluate(props.children)]
        }
    }
}

function sync(virtualNode, realNode) {

    // Sync element
    if(virtualNode.props) {
        Object.entries(virtualNode.props).forEach(([name, value]) => {
            if (name === 'children' && name === 'key') {
                return
            }

            if (realNode[name] !== value) {
                    realNode[name] = value
            }

        })
    }

    if(virtualNode.key) {
        realNode.dataset.key = virtualNode.key
    }

    if(typeof virtualNode !== 'object' && virtualNode !== realNode.nodeValue) {
        realNode.nodeValue = virtualNode
    }
    

    
    
    // Sync child nodes
    // get child elements
    const virtualChildren = virtualNode.props ? virtualNode.props.children || [] : []
    const realChildren = realNode.childNodes;
    
    for (let i = 0; i< virtualChildren.length || i< realChildren.length; i++) {
        const virtual = virtualChildren[i];
        const real = realChildren[i];
        
        // Remove
        if(virtual === undefined && real !== undefined) {
            realNode.remote(real);
        }
        // Update
        if(virtual !== undefined && real !== undefined && (virtual.type || '') === (real.tagName || '').toLowerCase()) {
            sync(virtual, real);
        }
        
        // Replace
        if(virtual !== undefined && real !== undefined && (virtual.type || '') !== (real.tagName || '').toLowerCase()) {
            const newReal = createRealNodeByVirtual(virtual);
            sync(virtual, newReal);
            realNode.replaceChild(newReal, real);
        }
        
        // add
        if(virtual !== undefined && real === undefined) {
            const newReal = createRealNodeByVirtual(virtual);
            sync(virtual, newReal);
            realNode.appendChild(newReal);
        }
        
    }
}

function createRealNodeByVirtual(virtual) {
    if(typeof virtual !== 'object') {
        return document.createTextNode('');
    }
    return document.createElement(virtual.type);
}

function renderView(state) {
    ReactDOM.render(
        <App state={state} />,
        document.getElementById('root')
    );
}

store.subscribe(() => {
    renderView(store.getState());
});



renderView(store.getState());

function appReducer(state, action, params) {
    switch (action) {
        case 'setTime':
            return {
                ...state,
                time: params.time
            }
        case 'setLots':
            return {
                ...state,
                lots: params.lots
            }
        case 'changeLotPrice':
            return {
                ...state,
                lots: state.lots.map((lot) => {
                    if (lot.id === params.id) {
                        return {
                            ...lot,
                            price: params.price
                        }
                    }
                    return lot;
                })
            }
        default:
            return state
    }
}

setInterval(()=> {
    store.setState((state) => appReducer(state, 'setTime', {time: new Date()}))
}, 1000);

api.get('/lots').then((lots) => {

    store.setState((state) => appReducer(state, 'setLots', {lots}))

    lots.forEach((lot)=> {
        stream.subscribe(`price-${lot.id}`,  (data) => {
            store.setState((state) => appReducer(state, 'changeLotPrice', {
                id: data.id,
                price: data.price
            }))
        });
    })
    
})




