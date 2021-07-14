import React from 'react'
import {useStore} from 'effector-react'
import {
    IEnvironment,
    GraphQLTaggedNode,
    // Subscription,
    Observer,
    SelectorStoreUpdater,
    GraphQLSubscriptionConfig,
    requestSubscription,
    // OperationType,
} from 'relay-runtime'

// import {getId, _globals} from './environment-provider'
import {ws_connection_status_store} from './environment-provider'

interface SubscriptionParameters {
    readonly response: {};
    readonly variables: {};
}


type Param<TSubscriptionPayload extends SubscriptionParameters> = {
    subscription: GraphQLTaggedNode,
    observer?: Omit<Observer<TSubscriptionPayload["response"]>, "start" | "unsubscribe">,
    updater?: SelectorStoreUpdater<TSubscriptionPayload["response"]>,
    variables: TSubscriptionPayload["variables"],
    environment: IEnvironment,
}

const useSubscription = <TSubscriptionPayload extends SubscriptionParameters>(param: Param<TSubscriptionPayload>, deps: any[]) => {    
    let [value, set_value] = React.useState<TSubscriptionPayload["response"]>()
    const ws_connection_status = useStore(ws_connection_status_store)
    // console.log("ws_connection_status -> ", ws_connection_status)

    React.useEffect(() => {
        const observer = {
            next: (value: any) => {
                // console.log('next called@use-subscription', value)
                if (value.errors !== undefined && value.errors !== null && value.errors.length > 0) {
                    if (param.observer && param.observer.error) {
                        param.observer.error(value.errors)
                    } else {
                        console.error('subscribe Some Error occurred!!', value.errors)
                    }
                }
                set_value(value as TSubscriptionPayload["response"])
                // console.log('next called@use-subscription param=', param)
                param.observer && param.observer.next && param.observer.next(value)
            },
            error: (error: Error) => (param.observer && param.observer.error && param.observer.error(error)),
            complete: () => (param.observer && param.observer.complete && param.observer.complete()),
            // unsubscribe: (subscription: Subscription) => { param.observer && param.observer.unsubscribe && param.observer.unsubscribe(subscription) },
        }

        // const current_counter = getId()

        const subscription_config : GraphQLSubscriptionConfig<TSubscriptionPayload> = {
            subscription: param.subscription,
            variables: param.variables,
            updater: param.updater,
            onNext: observer.next,
            onError: observer.error,
            onCompleted: observer.complete,
        }

        const {dispose} = requestSubscription(param.environment, subscription_config)
        return dispose

        // const subsc = {unsubscribe: dispose, closed: false}
        // param.observer && param.observer.start && param.observer.start(subsc)
        // 
        // // const unsubscribe = _globals[current_counter]
        // delete _globals[current_counter]
        // 
        // return () => {
        //     param.observer && param.observer.unsubscribe && param.observer.unsubscribe(subsc)
        //     dispose && dispose()
        //     // unsubscribe && unsubscribe()
        // }
    }, [ws_connection_status, ...deps])

    return value
}

export {Param, SubscriptionParameters}
export default useSubscription
