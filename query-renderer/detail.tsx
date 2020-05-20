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

export function createDetailFC<TOperation extends OperationType, Fragment extends Object>(
    query: GraphQLTaggedNode, cFC:any, key: keyof TOperation["response"], default_renderer_props?: RendererProps) {
    const D = (props: any) => props.children(props[key])  // TODO: 型チェック
    const F = cFC(D)
    return <T extends any>(props: QRProps<TOperation> & {children: (data: Fragment) => T} & RendererProps) => {
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
              render={({error, props}) => {
                      if (error || (props && (props[key] == null))) {
                          const e = Error("アクセス権限がないか、予期しないエラーです")
                          if (onError_ == null) {
                              throw e
                          }
                          return onError_(error == null ? e : error)
                      } else if (props) {
                          return <F {...props}>{ children }</F>
                      }
                      return onLoading_ ? onLoading_ : "読み込み中"
              } }
              { ...other_props}
              />
)

    }
}
