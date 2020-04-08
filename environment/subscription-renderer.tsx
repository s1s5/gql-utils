import * as React from 'react'

import useSubscription, {Param, SubscriptionParameters} from './use-subscription'

import withEnvironment from './with-environment'


type Props<TSubscriptionPayload extends SubscriptionParameters> = {
    children?: (value: TSubscriptionPayload["response"] | undefined) => React.ReactNode | null,
    value?: TSubscriptionPayload["response"],
} & Param<TSubscriptionPayload>


const SubscriptionRenderer = <TSubscriptionPayload extends SubscriptionParameters>(props: Props<TSubscriptionPayload>) => {
    const value = useSubscription<TSubscriptionPayload>({
        subscription: props.subscription,
        observer: props.observer,
        updater: props.updater,
        variables: props.variables,
        environment: props.environment
    }, [props.subscription, props.observer, props.updater, props.variables, props.environment])

    return (props.children ? <>{ props.children(value) }</> : null)
}

export default withEnvironment(SubscriptionRenderer)
