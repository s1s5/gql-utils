import * as React from 'react'

import {
    IEnvironment,
    GraphQLTaggedNode,
    OperationType,
    CacheConfig,
} from 'relay-runtime'

import {
    ReactRelayContext,
    QueryRenderer as QueryRenderer_,
    FetchPolicy,
} from 'react-relay'


type QRProps<TOperation extends OperationType> = {
    environment?: IEnvironment,
    variables: TOperation['variables'],
    cacheConfig?: CacheConfig | null
    fetchPolicy?: FetchPolicy
}

export type RendererProps = {
    onError: (error:Error) => (React.ReactNode | null)
    onLoading: React.ReactNode
}

export function createQueryRenderer<TOperation extends OperationType>(
    query: GraphQLTaggedNode, key: keyof TOperation["response"]) {
    return (props: QRProps<TOperation> & {
        children : (value: NonNullable<TOperation["response"][typeof key]>) => JSX.Element,
    } & RendererProps ) => {
        const {environment, children, onError, onLoading, ...other_props} = props
        const context = React.useContext(ReactRelayContext)
        let e = environment ? environment : context!.environment
        let q = query
        if (process.env.NODE_ENV == "development") {
            const [_e, _sE] = React.useState(e)
            const [_q, _sQ] = React.useState(q)
            e = _e
            q = _q
        }
        return <QueryRenderer_<TOperation>
          environment={e}
          query={q}
          render={({error, props}) => {
                  if (error || (props && (props[key] == null))) {
                      if (onError == null) {
                          throw error
                      }
                      return onError(error == null ? Error("アクセス権限がないか、予期しないエラーです") : error)
                  } else if (props) {
                      return children(props[key]!)
                  }
                  return onLoading
          } }
          { ...other_props}
          />
    }
}

export function createDetailFC<TOperation extends OperationType, Fragment extends Object>(Q:any, cFC:any, key: keyof TOperation["response"]) {
    const D = (props: any) => props.children(props[key])  // TODO: 型チェック
    const F = cFC(D)
    return <T extends any>(props: {variables: TOperation["variables"]} & {children: (data: Fragment) => T} & RendererProps) => {
        const {variables, children, ...other_props} = props
        return (
            <Q variables={ variables } {...other_props}>{ (data: NonNullable<TOperation["response"][typeof key]>) => {
                    const fprops = {
                        [key]: data
                    }
                    return <F {...fprops}>{ children }</F>
            }}</Q>
        )
    }
}
