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


let state = {
    time: new Date(),
    lots: null
}

const VDom = {
    createElement: (type, config, ...children) => {
        const key = config ? (config.key || null) : null;
        const props = config || {};

        if (children.length === 1) {
            props.children = children[0]
        } else {
            props.children = children;
        }

        return {
            type,
            key,
            props
        }
    }
}

function App( { state } )
{
    return VDom.createElement('app', { className: 'app' },
        VDom.createElement(Header),
        VDom.createElement(Clock, { time: state.time }),
        VDom.createElement(Lots, { lots: state.lots }),
    )
}


function Header() {
    return VDom.createElement('header', { className: 'header' },
            VDom.createElement(Logo)
    )
}



function Logo() {
    return VDom.createElement('img', { className: 'logo', src: 'images/logo.svg' })
}

function Clock({ time })
{
    const isDay = time.getHours() >= 7 && time.getHours() <= 21;

    return VDom.createElement('div', { className: 'clock' },
        VDom.createElement('span', { className: 'value' }, time.toLocaleTimeString()),
        VDom.createElement('span', { className: isDay ? 'icon day' : 'icon night' })
    )
}

function Loading() {
    return VDom.createElement('div', { className: 'loading' }, 'loading...')
}


function Lots({ lots }) {
    
    if(lots === null) {
        return VDom.createElement(Loading);
    }
    return VDom.createElement('div', { className: 'lots' },
        lots.map((lot) => VDom.createElement(Lot, { lot, key:lot.id }))
    );
}

function Lot({lot, key}) {
    return VDom.createElement('article', { className: 'lot', key },
        VDom.createElement('div', { className: 'price' }, lot.price),
        VDom.createElement('h1', { }, lot.name),
        VDom.createElement('p', { }, lot.description)
        );
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
    render(
        VDom.createElement(App, { state }),
        document.getElementById('root')
    );
}

renderView(state);

setInterval(()=> {
    
    state = {
        ...state,
        time: new Date()
    };
    
    renderView(state);
    
}, 1000);

api.get('/lots').then((lots) => {
    state = {
        ...state,
        lots
    }
    renderView(state);
    const onPrice = (data) => {
        state = {
            ...state,
            lots: state.lots.map((lot) => {
                if (lot.id === data.id) {
                    return {
                        ...lot,
                        price: data.price
                    }
                }
                return lot;
            })
        }
        renderView(state);
    }
    
    lots.forEach((lot)=> {
        stream.subscribe(`price-${lot.id}`, onPrice);
    })
    
})




