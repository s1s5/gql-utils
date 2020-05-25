import * as React from 'react'

import {
    IEnvironment,
    GraphQLTaggedNode,
    OperationType,
    CacheConfig,
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

export function createFragmentRenderer<Props extends Object>(
    // TODO: このkeyをなくせないか・・・
    key: keyof Props, fragmentSpec: Record<string, GraphQLTaggedNode>) {
    type P = Props & {
        retry?: (() => void) | null
        children: (data: Props[typeof key] | null, retry?: (() => void) | null) => any
    }
    const D = (props: P) => props.children(props[key] as (Props[typeof key] | null), props.retry)
    // const D = (props: P) => props.children(props[key], props.retry)
    return createFragmentContainer(D, fragmentSpec)
}

export function createDetailFC<TOperation extends OperationType, Fragment extends Object>(
    query: GraphQLTaggedNode, FR: any, options?: {query_key?: keyof TOperation["response"], fragment_key?: string, default_renderer_props?: RendererProps}) {
    return <T extends any>(props: QRProps<TOperation> & {children: (data: Fragment) => T} & RendererProps) => {
        const {environment, children, onError, onLoading, ...other_props} = props
        let onError_ = onError ? onError : (options && options.default_renderer_props ? options.default_renderer_props.onError : undefined)
        let onLoading_ = onLoading ? onLoading : (options && options.default_renderer_props ? options.default_renderer_props.onLoading : undefined)

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
                          if (options && options.query_key && options.fragment_key) {
                              const props_ = {
                                  [options.fragment_key]: props[options.query_key]
                              }
                              return <FR retry={retry} {...props_}>{ children }</FR>
                          }
                          return <FR retry={retry} {...props}>{ children }</FR>
                      }
                      return onLoading_ ? onLoading_ : "読み込み中"
              } }
              { ...other_props}
              />
)

    }
}
