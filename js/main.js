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
//########################
const clockInitialState  = {
    time: new Date(),
}
const SET_TIME = 'SET_TIME';
function clockReducer(state = clockInitialState, action) {
    switch (action.type) {
        case SET_TIME:
            return {
                ...state,
                time: action.time
            }
        default:
            return state
    }
}


const auctionInitialState  = {
    lots: null
}
const SET_LOTS = 'SET_LOTS';
const CHANGE_LOT_PRICE = 'CHANGE_LOT_PRICE';
function auctionReducer(state = auctionInitialState, action) {
    switch (action.type) {
        case SET_LOTS:
            return {
                ...state,
                lots: action.lots
            }
        case CHANGE_LOT_PRICE:
            return {
                ...state,
                lots: state.lots.map((lot) => {
                    if (lot.id === action.id) {
                        return {
                            ...lot,
                            price: action.price
                        }
                    }
                    return lot;
                })
            }
        default:
            return state
    }
}





function setTime(time) {
    return {
        type: SET_TIME,
        time
    }
}

function setLots(lots) {
    return {
        type: SET_LOTS,
        lots
    }
}

function changeLotPrice(id, price) {
    return {
        type: CHANGE_LOT_PRICE,
        id,
        price
    }
}

// Action creator



//##############################


const store = Redux.createStore(Redux.combineReducers({
    clock: clockReducer,
    auction: auctionReducer
}));

//##############################

function App( { state } )
{
    return (
        <div className="app">
            <Header/>
            <Clock time={state.clock.time} />
            <Lots lots={state.auction.lots}/>
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

// ################################


setInterval(()=> {
    store.dispatch(setTime(new Date()))
}, 1000);

api.get('/lots').then((lots) => {

    store.dispatch(setLots(lots))

    lots.forEach((lot)=> {
        stream.subscribe(`price-${lot.id}`,  (data) => {
            store.dispatch(changeLotPrice(data.id, data.price))
        });
    })
    
})




