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
// import { createClient } from 'graphql-ws';

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
let _global_observer: any = undefined
export function set_global_observer(observer: any) {
    _global_observer = observer
}

const EnvironmentProvider = (props: Props) => {
    const [client, setClient] = React.useState<SubscriptionClient | null>()
    // const [client, setClient] = React.useState<ReturnType<typeof createClient>>()
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
            // const c = createClient({
            //     url: props.wsUrl!,
            //     lazy: true
            // })

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
                     // Important: Convert subscriptions-transport-ws observable type to Relay's
                     return Observable.from<any>({
                         subscribe: (observer: any) => {
                             // console.log("observable: ", observable)
                             const {unsubscribe} = observable.subscribe(observer)
                             // console.log("unsubscribe: ", unsubscribe)
                             _globals[_global_counter] = unsubscribe
                             return {
                                 // unsubscribe: () => {},
                                 unsubscribe: () => {unsubscribe()},  // TODO: 必要か要チェック
                                 closed: false,
                             }
                         }
                     })
// 
//                      // return {
//                      //     subscribe: (observer: any) => {
//                      //         console.log("observable: ", observable)
//                      //         const {unsubscribe} = observable.subscribe(observer)
//                      //         console.log("unsubscribe: ", unsubscribe)
//                      //         _globals[_global_counter] = unsubscribe
//                      //         return {
//                      //             unsubscribe: () => {},
//                      //             closed: false,
//                      //         }
//                      //     },
//                      //     dispose: () => {},
//                      // }
//                      console.log('@environment provider, subsc request>>', request, variables, cacheConfig, 'observer=', observer, '_global_observer=', _global_observer)
//                      const s: any = observable.subscribe
//                      const {unsubscribe} = s(_global_observer.next, _global_observer.error, _global_observer.completed, )
//                      // {
//                      //     next: (data:any) => observer?.onNext && observer.onNext(data),
//                      //     error: (error: Error) => observer?.onError && observer.onError(error),
//                      //     complete: () => observer?.onCompleted && observer.onCompleted(),
//                      // })
// 
//                      _globals[_global_counter] = unsubscribe
//                      return {
//                          // subscribe: (observer: any) => {
//                          //     console.log("subscribe called!")
//                          //     return {
//                          //         unsubscribe: () => {},
//                          //         closed: false
//                          //     }
//                          // },
//                          dispose: unsubscribe
//                      }
//                      // return {
//                      //     dispose: c.subscribe({query, variables}, {
//                      //         next: (data:any) => observer?.onNext && observer.onNext(data),
//                      //         error: (error: Error) => observer?.onError && observer.onError(error),
//                      //         complete: () => observer?.onCompleted && observer.onCompleted(),
//                      //     })
//                      // }
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

