import React from 'react'
import _clone from 'lodash/clone'

import {RendererProps} from './detail'
import {NodeType, ListType} from './types.d'

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
    RelayRefetchProp,
    RefetchOptions,
} from 'react-relay'


type QRProps<TOperation extends OperationType> = {
    environment?: IEnvironment,
    variables: TOperation['variables'],
    cacheConfig?: CacheConfig | null
    fetchPolicy?: FetchPolicy
    refetchOptions?: RefetchOptions
} & RendererProps

type ContentProps = {
    hasPreviousPage?: boolean
    hasNextPage?: boolean
    getPreviousPage?: () => Promise<number>
    getNextPage?: () => Promise<void>
    rowCount: number
}

type FCProps<N extends NodeType> = {
    batchSize?: number
    excludeKeys?: string[]
    children: (edges: ListType<N>, props: ContentProps, retry?: () => void) => any
    onQueryCompleted?: (list: ListType<N> | null, relay: RelayRefetchProp) => void
}

type ContainerProps<N extends NodeType> = {
    readonly list: ListType<N>
    relay: RelayRefetchProp
//     batchSize?: number
//     excludeKeys?: string[]
//     children: (props: ContentProps<E, N>) => JSX.Element
    refetchOptions?: RefetchOptions
    retry: (() => void) | undefined
} & Omit<FCProps<N>, "onQueryCompleted">

const RefetchContainer = <N extends NodeType>(props: ContainerProps<N>) => {
    const props_ = props
    // const edges = props_.list.edges!
    const batch_size = props_.batchSize ? props_.batchSize: 10
    // const [first_cursor, set_first_cursor] = React.useState<string | undefined>(
    //     (props.list.edges && props.list.edges.length > 0) ? props.list.edges[0].cursor : undefined)

    const get_previous_page = () => (
        new Promise<number>((resolve) => {
            props.relay.refetch(
                (refetchVariables) => {
                    const _r = _clone(refetchVariables)
                    if (props.excludeKeys) {
                        props.excludeKeys.map(key => {
                            _r[key] = null
                        })
                    }
                    _r['first'] = null
                    _r['after'] = null
                    return { ..._r, last: batch_size, before: props_.list.pageInfo.startCursor, }
                },
                null,
                (error) => {  // Observer<void> | ((error: Error | null | undefined) => void);だから無理ゲー
                    if (error) {
                        throw error
                    }

                    resolve(batch_size)  // TODO: 読み込み数を正確に計測しないと行けない
                },
                props.refetchOptions,
            )
        })
    )

    const get_next_page = () => (
        new Promise<void>((resolve) => {
            props.relay.refetch(
                (refetchVariables) => {
                    const _r = _clone(refetchVariables)
                    if (props.excludeKeys) {
                        for (let key in props.excludeKeys) {
                            _r[key] = null
                        }
                    }
                    _r['before'] = null
                    _r['last'] = null
                    return { ..._r, first: batch_size, after: props_.list.pageInfo.endCursor, }
                },
                null,
                (error) => {
                    if (error) {
                        throw error
                    }
                    resolve()
                },
                props.refetchOptions,
            )
        })
    )
    
    return props.children(props.list, {
        hasPreviousPage: props_.list.pageInfo.hasPreviousPage,
        hasNextPage: props_.list.pageInfo.hasNextPage,
        getPreviousPage: get_previous_page,
        getNextPage: get_next_page,
        rowCount: props.list.edges.length,
    }, props.retry)
}

function createListFC<TOperation extends OperationType, N extends NodeType>(
    query: GraphQLTaggedNode, cRC: any, key0: string, key1: string, default_renderer_props?: RendererProps) {

    type P = {
        [key: string] : {
            [key: string]: ListType<N> | null,
        },
    } & {
        relay: RelayRefetchProp
        retry: () => void
    }

    const List = (props: P & FCProps<N> & RendererProps & {refetchOptions?: RefetchOptions}) => {
        const {onQueryCompleted, batchSize, excludeKeys, children, onError, refetchOptions, retry} = props
        if (props[key0] == null || props[key0][key1] == null || props[key0][key1]!.edges == null) {
            const e = Error("アクセス権限がないか、予期しないエラーです")
            if (onError == null) {
                throw e
            }
            return onError(e)
        }

        const list = props[key0][key1]! as ListType<N>
        // console.log(props)
        React.useLayoutEffect(() => {
            onQueryCompleted && onQueryCompleted(list, props.relay)
        }, [list, props.relay])
        // console.log(children)

        return (
            <RefetchContainer
                list={list}
                relay={props.relay}
                batchSize={batchSize}
                excludeKeys={excludeKeys}
                refetchOptions={refetchOptions}
                retry={retry}
            >{(l, props, retry_) => (
                children(l, props, retry_)
            )}</RefetchContainer>
        )
    }

    const RC = cRC(List)

    return (props: QRProps<TOperation> & FCProps<N>) => {
        const {environment, variables, onError, onLoading, cacheConfig, fetchPolicy, ...other_props} = props
        const context = React.useContext(ReactRelayContext)

        let e = environment ? environment : context!.environment
        let q = query
        if (process.env.NODE_ENV == "development") {
            const [_e, _sE] = React.useState(e)
            const [_q, _sQ] = React.useState(q)
            e = _e
            q = _q
        }


        let onError_ = onError ? onError : (default_renderer_props ? default_renderer_props.onError : undefined)
        let onLoading_ = onLoading ? onLoading : (default_renderer_props ? default_renderer_props.onLoading : undefined)
        
        return (
            <QueryRenderer_<TOperation>
              environment={ e}
              variables={ props.variables }
              query={ q }
              render={({error, props, retry}) => {
                      if (error) {
                          if (onError_ == null) {
                              throw error
                          }
                          return onError_(error)
                      } else if (props) {
                          const rc_props = {
                              [key0] : props
                          }
                          // if ((query as any)[key1] == null || (query as any)[key1].edges == null) {
                          //     return onError(Error("未知のエラーです"))
                          // }
                          return <RC onError={onError} retry={retry} {...rc_props} { ...other_props } />
                      }
                      return onLoading_
              } }
              cacheConfig={ cacheConfig }
              fetchPolicy={ fetchPolicy }
              />
        )
    }
}

export {QRProps, ContentProps, FCProps, ContainerProps,
        RefetchContainer, createListFC}
