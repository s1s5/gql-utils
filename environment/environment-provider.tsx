import React from 'react'

import {
    Environment,
    Network,
    RecordSource,
    Store,
    RequestParameters,
    Variables,
    UploadableMap,
    CacheConfig,
    Observable,
} from 'relay-runtime'
import {LegacyObserver} from 'relay-runtime/lib/network/RelayNetworkTypes'

import {ReactRelayContext} from 'react-relay'

import fetchQuery from './fetch-query'
import { SubscriptionClient } from 'subscriptions-transport-ws'

type Props = {
    postUrl: string,
    wsUrl?: string,
    children: React.ReactNode,
    getRequestInit?: () => Omit<RequestInit, "body">,
    connectionHook?: () => void
    onSubscriptionClientError?: (error: any) => void
}

let _global_counter = 0
let _globals:any = {}
const getId = () => {
    _global_counter += 1
    return _global_counter
}

const EnvironmentProvider = (props: Props) => {
    const [client, setClient] = React.useState<SubscriptionClient | null>()
    const [environment, setEnvironment] = React.useState<Environment>()

    React.useLayoutEffect(() => {
        const fetch_query = (
            request: RequestParameters,
            variables: Variables,
            cacheConfig: CacheConfig,
            uploadables?: UploadableMap | null) => {
                if (props.connectionHook) {
                    try {props.connectionHook()} catch {}
                }
                return fetchQuery(
                    props.postUrl, request, variables, cacheConfig, uploadables,
                    props.getRequestInit)
            }

        let network
        if (props.wsUrl) {
            const c = new SubscriptionClient(props.wsUrl!, {
                lazy: true,  // これがないとhot-reloadで二重で接続されたりする？
                reconnect: true,
            })

            c.on('error', (error: any) => {
                console.error("client error", error)
                props.onSubscriptionClientError && props.onSubscriptionClientError(error)
            })
            setClient(c)

            network = Network.create(
                fetch_query,
                (request: RequestParameters,
                 variables: Variables,
                 cacheConfig: CacheConfig,
                 observer?: LegacyObserver<any>) => {
                     const query = request.text!
                     const observable = c.request({operationName: request.name, query, variables})
                     if (props.connectionHook) { try {props.connectionHook()} catch {} }

                     return Observable.from<any>({
                         subscribe: (observer: any) => {
                             const {unsubscribe} = observable.subscribe(observer)
                             return {
                                 unsubscribe,
                                 closed: false,
                             }
                         }
                     })
                 })
        } else {
            network = Network.create(fetch_query)
        }

        setEnvironment(new Environment({
            network: network,
            store: new Store(new RecordSource()),  
        }))

        return () => {
            client && client.close()
        }
    }, [props.postUrl, props.wsUrl, props.getRequestInit])
    
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

