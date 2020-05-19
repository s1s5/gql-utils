import * as React from 'react'
import _clone from 'lodash/clone'

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
    onError: (error:Error) => (React.ReactNode | null)
    onLoading: React.ReactNode
}


type ListType<E, N> = {
    readonly pageInfo: {
            readonly hasNextPage: boolean;
            readonly hasPreviousPage: boolean;
            readonly startCursor: string | null;
            readonly endCursor: string | null;
        }
        readonly edges: ReadonlyArray<{
            readonly cursor: string,
            readonly node : {
                readonly id: string,
            } & N | null,
        } | null> & E
}

type FCProps<E, N> = {
    batchSize?: number
    excludeKeys?: string[]
    children: (props: ContentProps<E, N>) => JSX.Element | React.ReactNode
    onQueryCompleted?: (list: ListType<E, N> | null, relay: RelayRefetchProp) => void
}

type ContentProps<E, N> = {
    hasPreviousPage?: boolean
    hasNextPage?: boolean
    getPreviousPage?: () => Promise<number>
    getNextPage?: () => Promise<void>
    list: ListType<E, N>
}

type ContainerProps<E, N> = {
    readonly list: ListType<E, N>
    relay: RelayRefetchProp
//     batchSize?: number
//     excludeKeys?: string[]
//     children: (props: ContentProps<E, N>) => JSX.Element
} & Omit<FCProps<E, N>, "onQueryCompleted">

export {ContainerProps, ContentProps}

const RefetchContainer = <E extends any, N extends Object>(props: ContainerProps<E, N>) => {
    if (props.list.edges == null) {
        throw Error("edges is null")
    }
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
    
    return props.children({
        hasPreviousPage: props_.list.pageInfo.hasPreviousPage,
        hasNextPage: props_.list.pageInfo.hasNextPage,
        getPreviousPage: get_previous_page,
        getNextPage: get_next_page,
        list: props.list,
    })
}


export function createListFC<TOperation extends OperationType, E, N>(query: GraphQLTaggedNode, cRC: any, key0: string, key1: string) {
    type L = {
        readonly pageInfo: {
            readonly hasNextPage: boolean;
            readonly hasPreviousPage: boolean;
            readonly startCursor: string | null;
            readonly endCursor: string | null;
        }
        readonly edges: ReadonlyArray<{
            readonly cursor: string,
            readonly node : {
                readonly id: string,
            } & N | null,
        } | null> & E,
        
    }
    type P = {
        [key: string] : {
            [key: string]: L | null,
        },
    } & {
        relay: RelayRefetchProp
    }

    const List = (props: P & FCProps<E, N>) => {
        const {onQueryCompleted, batchSize, excludeKeys, children} = props
        const l = props[key0][key1]!// as L | null
        console.log(props)
        React.useLayoutEffect(() => {
            onQueryCompleted && onQueryCompleted(l, props.relay)
        }, [l, props.relay])
        console.log(children)
        return (
            <RefetchContainer
            list={l!}
            relay={props.relay}
            batchSize={batchSize}
            excludeKeys={excludeKeys}>{(props) => (
                children(props)
            )}</RefetchContainer>
        )
    }

    const RC = cRC(List)

    return (props: QRProps<TOperation> & FCProps<E, N>) => {
        const {environment, variables, onError, onLoading, ...other_props} = props
        const context = React.useContext(ReactRelayContext)
        
        return (
            <QueryRenderer_<TOperation>
              environment={environment ? environment : context!.environment}
              variables={ props.variables }
              query={query}
              render={({error, props}) => {
                      if (error) {
                          return onError(error)
                      } else if (props) {
                          const rc_props = {
                              [key0] : props
                          }
                          // if ((query as any)[key1] == null || (query as any)[key1].edges == null) {
                          //     return onError(Error("未知のエラーです"))
                          // }
                          return <RC onError={onError} {...rc_props} { ...other_props } />
                      }
                      return onLoading
              } }
              />
        )
    }
}
