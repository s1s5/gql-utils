import * as React from 'react'
import {
    IEnvironment,
    GraphQLTaggedNode,
    Subscription,
    Observer,
    Variables,
    SelectorStoreUpdater,
    GraphQLSubscriptionConfig,
    requestSubscription
} from 'relay-runtime'

import {getId, _globals} from './environment-provider'

interface SubscriptionParameters {
    readonly response: {};
    readonly variables: {};
}


type Param<TSubscriptionPayload extends SubscriptionParameters> = {
    subscription: GraphQLTaggedNode,
    observer?: Observer<TSubscriptionPayload["response"]>,
    updater?: SelectorStoreUpdater<TSubscriptionPayload["response"]>,
    variables?: TSubscriptionPayload["variables"],
    environment: IEnvironment,
}

//// 使い方
//// useMemoにしておかないと、レンダリングのたびにgraphq``とか, variables: {}が新しいオブジェクトになる
//  const config = React.useMemo(() => ({
//      subscription: graphql`
//          subscription countSeconds_Subscription {
//              countSeconds(upTo: 5)
//          }
//      `,
//      variables: {},
//      observer: observer,
//      environment: props.environment,
//  }), [observer, props.environment])
//
//  const value = useSubscription(config)

const useSubscription = <TSubscriptionPayload extends SubscriptionParameters>(param: Param<TSubscriptionPayload>, deps: any[]) => {    
    let [value, set_value] = React.useState<TSubscriptionPayload["response"]>()
    React.useEffect(() => {
        const observer = {
            next: (value: any) => {
                if (value.errors !== undefined && value.errors !== null && value.errors.length > 0) {
                    if (param.observer && param.observer.error) {
                        param.observer.error(value.errors)
                    } else {
                        console.error('subscribe Some Error occurred!!', value.errors)
                    }
                }
                set_value(value as TSubscriptionPayload["response"])
                param.observer && param.observer.next && param.observer.next(value)
            },
            error: (error: Error) => (param.observer && param.observer.error && param.observer.error(error)),
            complete: () => (param.observer && param.observer.complete && param.observer.complete()),
            unsubscribe: (subscription: Subscription) => { param.observer && param.observer.unsubscribe && param.observer.unsubscribe(subscription) },
        }

        const current_counter = getId()

        const subscription_config : GraphQLSubscriptionConfig<TSubscriptionPayload["response"]> = {
            subscription: param.subscription,
            variables: param.variables == null ? {} : param.variables,
            updater: param.updater,
            onNext: observer.next,
            onError: observer.error,
            onCompleted: observer.complete,
        }

        const {dispose} = requestSubscription(param.environment, subscription_config)

        const subsc = {unsubscribe: dispose, closed: false}
        param.observer && param.observer.start && param.observer.start(subsc)

        const unsubscribe = _globals[current_counter]
        delete _globals[current_counter]

        return () => {
            param.observer && param.observer.unsubscribe && param.observer.unsubscribe(subsc)
            dispose()
            unsubscribe()
        }
    }, deps)

    return value
}

export {Param, SubscriptionParameters}
export default useSubscription
