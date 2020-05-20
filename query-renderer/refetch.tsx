import * as React from 'react'
import _clone from 'lodash/clone'

import {RendererProps} from './detail'

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
} from 'react-relay'


type QRProps<TOperation extends OperationType> = {
    environment?: IEnvironment,
    variables: TOperation['variables'],
    cacheConfig?: CacheConfig | null
    fetchPolicy?: FetchPolicy
} & RendererProps

type EdgesType<N> = ReadonlyArray<{
    readonly cursor: string,
    readonly node : {
        readonly id: string,
    } & N | null,
} | null>

export type ListType<N> = {
    readonly pageInfo: {
        readonly hasNextPage: boolean;
        readonly hasPreviousPage: boolean;
        readonly startCursor: string | null;
        readonly endCursor: string | null;
    }
    readonly edges: EdgesType<N>
}

export type ContentProps = {
    hasPreviousPage?: boolean
    hasNextPage?: boolean
    getPreviousPage?: () => Promise<number>
    getNextPage?: () => Promise<void>
    rowCount: number
}

// type ListContentProps = ContentProps
// export {ListContentProps}

type FCProps<N> = {
    batchSize?: number
    excludeKeys?: string[]
    children: (edges: ListType<N>, props: ContentProps) => any
    onQueryCompleted?: (list: ListType<N> | null, relay: RelayRefetchProp) => void
}

export type ContainerProps<N> = {
    readonly list: ListType<N>
    relay: RelayRefetchProp
//     batchSize?: number
//     excludeKeys?: string[]
//     children: (props: ContentProps<E, N>) => JSX.Element
} & Omit<FCProps<N>, "onQueryCompleted">

const RefetchContainer = <N extends Object>(props: ContainerProps<N>) => {
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
                        for (let key in props.excludeKeys) {
                            delete _r[key]
                        }
                    }
                    return { ..._r, last: batch_size, before: props_.list.pageInfo.startCursor, }
                },
                null,
                (error) => {  // Observer<void> | ((error: Error | null | undefined) => void);だから無理ゲー
                    if (error) {
                        throw error
                    }

                    resolve(batch_size)  // TODO: 読み込み数を正確に計測しないと行けない
                }
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
                            delete _r[key]
                        }
                    }
                    return { ..._r, first: batch_size, after: props_.list.pageInfo.endCursor, }
                },
                null,
                (error) => {
                    if (error) {
                        throw error
                    }
                    resolve()
                }
            )
        })
    )
    
    return props.children(props.list, {
        hasPreviousPage: props_.list.pageInfo.hasPreviousPage,
        hasNextPage: props_.list.pageInfo.hasNextPage,
        getPreviousPage: get_previous_page,
        getNextPage: get_next_page,
        rowCount: props.list.edges.length,
    })
}


export function createListFC<TOperation extends OperationType, N>(
    query: GraphQLTaggedNode, cRC: any, key0: string, key1: string, default_renderer_props?: RendererProps) {

    type P = {
        [key: string] : {
            [key: string]: ListType<N> | null,
        },
    } & {
        relay: RelayRefetchProp
    }

    const List = (props: P & FCProps<N> & RendererProps) => {
        const {onQueryCompleted, batchSize, excludeKeys, children, onError} = props
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
                excludeKeys={excludeKeys}>{(l, props) => (
                    children(l, props)
                )}</RefetchContainer>
        )
    }

    const RC = cRC(List)

    return (props: QRProps<TOperation> & FCProps<N>) => {
        const {environment, variables, onError, onLoading, ...other_props} = props
        const context = React.useContext(ReactRelayContext)

        let onError_ = onError ? onError : (default_renderer_props ? default_renderer_props.onError : undefined)
        let onLoading_ = onLoading ? onLoading : (default_renderer_props ? default_renderer_props.onLoading : undefined)
        
        return (
            <QueryRenderer_<TOperation>
              environment={environment ? environment : context!.environment}
              variables={ props.variables }
              query={query}
              render={({error, props}) => {
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
                          return <RC onError={onError} {...rc_props} { ...other_props } />
                      }
                      return onLoading_
              } }
              />
        )
    }
}
