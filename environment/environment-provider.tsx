import * as React from 'react'

import {
    Environment,
    Network,
    RecordSource,
    Store,
    RequestParameters,
    Variables,
    UploadableMap,
    CacheConfig,

    Observer,
} from 'relay-runtime'

import {ReactRelayContext} from 'react-relay'

import fetchQuery from './fetch-query'
import { SubscriptionClient } from 'subscriptions-transport-ws'

type Props = {
    post_url: string,
    ws_url?: string,
    children: React.ReactNode,
}

let _global_counter = 0
let _globals:any = {}
const getId = () => {
    _global_counter += 1
    return _global_counter
}

const EnvironmentProvider = (props: Props) => {
    const [client, setClient] = React.useState<SubscriptionClient>()
    const [environment, setEnvironment] = React.useState<Environment>()

    React.useEffect(() => {
        const fetch_query = (
            request: RequestParameters,
            variables: Variables,
            cacheConfig: CacheConfig,
            uploadables?: UploadableMap | null) => fetchQuery(
                props.post_url, request, variables, cacheConfig, uploadables)

        let network
        if (props.ws_url) {
            const c = new SubscriptionClient(props.ws_url!, {
                lazy: true,  // これがないとhot-reloadで二重で接続されたりする？
                reconnect: true,
            })
            c.on('error', (error: any) => {
                console.error("client error", error)
            })
            setClient(c)

            network = Network.create(
                fetch_query,
                (request: RequestParameters,
                 variables: Variables,
                 cacheConfig: CacheConfig) => {
                     const query = request.text!
                     const observable = c.request({query, variables})
                     return {
                         subscribe: (observer: any) => {
                             const {unsubscribe} = observable.subscribe(observer)
                             _globals[_global_counter] = unsubscribe
                             return {
                                 unsubscribe: () => {},
                                 closed: false,
                             }
                         },
                         dispose: () => {},
                     }
                 })
        } else {
            network = Network.create(fetch_query)
        }
        // console.log("new environment created!!!", props.post_url, props.ws_url)
        setEnvironment(new Environment({
            network: network,
            store: new Store(new RecordSource()),  
        }))

        return () => {
            // console.log("client close", client === undefined)
            client && client.close()
        }
    }, [props.post_url, props.ws_url])
    
    if (environment === undefined) {
        return <></>
    }

    return (
        <ReactRelayContext.Provider value={ {environment} }>
          { props.children }
        </ReactRelayContext.Provider>
    )
}

export {getId, _globals}
export default EnvironmentProvider;

