import * as React from 'react'

import {
    IEnvironment,
    GraphQLTaggedNode,
    OperationType,
    CacheConfig,
    FragmentRefs,
} from 'relay-runtime'

import {
    ReactRelayContext,
    QueryRenderer,
    FetchPolicy,
    createFragmentContainer,
} from 'react-relay'


type QRProps<TOperation extends OperationType> = {
    environment?: IEnvironment,
    variables: TOperation['variables'],
    cacheConfig?: CacheConfig | null
    fetchPolicy?: FetchPolicy
}

export type RendererProps = {
    onError?: (error:Error) => (React.ReactNode | null | never)
    onLoading?: React.ReactNode
}

export function createFragmentRenderer<Props extends Object, FragmentName extends string>(
    // TODO: このkeyをなくせないか・・・
    key: keyof Props, fragmentSpec: Record<string, GraphQLTaggedNode>) {
    type P = Props & {
        retry?: (() => void) | null | undefined
        children: (data: Props[typeof key] | null, retry: (() => void) | null | undefined) => any
    }
    const D = (props: P) => props.children(props[key] as (Props[typeof key] | null), props.retry)
    // const D = (props: P) => props.children(props[key], props.retry)
    const FR = createFragmentContainer(D, fragmentSpec) as any // TODO: type check

    type FragmentKeyType = {
        readonly " $fragmentRefs": FragmentRefs<FragmentName>
    }
    type PF = {
        [P in keyof Props]: FragmentKeyType | null | undefined
    } & {
        retry?: (() => void) | null | undefined
        children: (data: Props[typeof key] | null, retry: (() => void) | null | undefined) => any
    }
    const T = (props: PF) => {
        if (props[key] == null) {
            return props.children(null, props.retry)
        }
        const p = {[key]: props[key]}
        return <FR {...p} retry={props.retry}>{ props.children }</FR>
    }
    return  T
    // return createFragmentContainer(D, fragmentSpec)
}

export function createDetailFC<TOperation extends OperationType>(
    query: GraphQLTaggedNode, query_key: keyof TOperation["response"], default_renderer_props?: RendererProps) {
    return <T extends React.ReactNode>(props: QRProps<TOperation> & {children: (data: TOperation["response"][typeof query_key], retry: (() => void) | null | undefined) => T} & RendererProps) => {
        const {environment, children, onError, onLoading, ...other_props} = props
        let onError_ = onError ? onError : (default_renderer_props ? default_renderer_props.onError : undefined)
        let onLoading_ = onLoading ? onLoading : (default_renderer_props ? default_renderer_props.onLoading : undefined)

        const context = React.useContext(ReactRelayContext)
        let e = environment ? environment : context!.environment
        let q = query
        if (process.env.NODE_ENV == "development") {
            const [_e, _sE] = React.useState(e)
            const [_q, _sQ] = React.useState(q)
            e = _e
            q = _q
        }

        return (
            <QueryRenderer<TOperation>
              environment={e}
              query={q}
              render={({error, props, retry}) => {
                      if (error) {
                          if (onError_ == null) {
                              throw error
                          }
                          return onError_(error)
                      } else if (props) {
                          return children(props[query_key], retry)
                      }
                      return onLoading_ ? onLoading_ : "読み込み中"
              } }
              { ...other_props}
              />
)

    }
}
