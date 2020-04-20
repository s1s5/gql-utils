import * as React from 'react'
import _cloneDeep from 'lodash/cloneDeep'

import {
    PayloadError,
    GraphQLTaggedNode,
    UploadableMap,
    DeclarativeMutationConfig,
    MutationParameters,
    SelectorStoreUpdater
} from 'relay-runtime'

import {ReactRelayContext, commitMutation} from 'react-relay'

import FormContext from './form-context'


type Props<TOperation extends MutationParameters> = {
    id: string,
    initialVariables: TOperation['variables'],
    mutation: GraphQLTaggedNode,
    children: React.ReactNode,
    configs?: DeclarativeMutationConfig[],
    updater?: SelectorStoreUpdater<TOperation['response']> | null;
    loadFromStorage?: boolean,
    saveToStorage?: boolean,
}

// !!! mutationは以下のような感じで
// !!! inputはmutationの名前「todoUpdateForm」 + 「Input」である必要がある。
// !!! errorは「errors」に返ってこないとだめ
// !!! todoUpdateFormの前に「xx: 」とかかけばaliasにすることができる。この場合mutationの名前が「xx」になる
// graphql`
//     mutation todoUpdate_Mutation($todoUpdateFormInput: TodoUpdateFormMutationInput!) {
//         todoUpdateForm(input: $todoUpdateFormInput) {
//             errors {
//                 field
//                 messages
//             }
//             todo {
//                 id
//                 completed
//                 text
//             }
//         }
//     }
// `


// mutationで新しく追加する時には以下のconfigsを追加する
// -- graphqlはこんな感じ
//    mutation todolistAddTodoButton_Mutation($input: TodoCreateMutationInput!) {
//        todoCreate(input: $input) {
//            todo {
//                id
//                completed
//                text
//            }
//            edge {
//                cursor
//                node {
//                    id
//                    ...todo_data
//                }
//            }
//        }
//    }
// 
// -- 指定するconfigs
// configs: [{
//     type: 'RANGE_ADD',
//     parentID: props.todolist__id,  // 親となる要素のglobal_id
//     connectionInfo: [{
//         key: 'todolist_todoSet',   // 下記参照
//         // rangeBehavior: 'append',   // 最後に追加
//         rangeBehavior: 'prepend',  // appendの逆で一番前に追加
//         filters: {'orderBy': '-created_at'},  // 下記参照
//     }],
//     edgeName: 'edge',  // 作成されたエッジの名前
// }],
// 
// 特定の位置に追加するとかっていうのは別のAPIを使わないと難しそう
// updaterを使うのかな？
// insertEdgeAfterとか（帰ってきたcursorがあった場合にはそのcursorの要素の直後に追加される）
// 
//
// connectionInfoのKeyは
//    todolist(id: $id) {
//        id
//        title
//        todoSet(first: 10) @connection(key: "todolist_todoSet") { ... }
// みたいな感じでkeyに指定したものを指定する
// 
// filtersを利用する場合は下記のようにorderByとか追加した場合に指定する必要がある。
// 多分同じじゃないと動かない
//  todoSet(
//      first: $first
//      last: $last
//      before: $before
//      after: $after
//      orderBy: "-created_at"
//  ) @connection(key: "todolist_todoSet") {
//      pageInfo {
//          hasNextPage
//          hasPreviousPage
//          startCursor
//          endCursor
//      }

const format_error_messages = (errors:any) => {
    return errors.map((e:any) => e.message)
}


const Form = <TOperation extends MutationParameters>(props: Props<TOperation>) => {
    const [value, set_value] = React.useState(props.initialVariables)
    const [form_errors, set_form_errors] = React.useState<any[]>([])
    const [errors, set_errors] = React.useState<any>([])
    const [uploadables, set_uploadables] = React.useState<any>({})
    const environment = React.useContext(ReactRelayContext)!.environment

    const stored_key = `form-stored-${props.id}`
    React.useLayoutEffect(() => {
        if (props.loadFromStorage == null || props.loadFromStorage == false) {
            return
        }
        try {
            const store = sessionStorage
            const data_json = store.getItem(stored_key)
            if (data_json) {
                const data = JSON.parse(data_json)
                const restored:any = _cloneDeep(value)
                Object.keys(restored).map((key) => {
                    if (key in data) {
                        Object.keys(restored[key]).map((sub_key) => {
                            if (sub_key in data[key]) {
                                restored[key][sub_key] = data[key][sub_key]
                            }
                        })
                    }
                })
                set_value(restored)
                store.removeItem(stored_key)
            }
        } catch {
        }
    }, [props.id, set_value])

    React.useEffect(() => {
        return () => {
            if (props.saveToStorage) {
                try {
                    sessionStorage.setItem(stored_key, JSON.stringify(value))
                } catch {
                }
            }
        }
    }, [value])

    const commit_with_value = React.useCallback((value_, uploadables_) => {
        return new Promise((resolve, reject) => {
            const u: UploadableMap = {}
            // console.log('uploadables_ => ', uploadables_)
            Object.entries(uploadables_).map((e) => {
                const [key, value]: [string, any] = e
                if (value.constructor === Array) {
                    value.map((v: File | Blob, i: number) => {
                        u[`${key}[${i}]`] = v
                    })
                } else {
                    u[key] = value
                }
            })
            // console.log('u = ', u)
            // console.log(value_)
            const tmp = _cloneDeep(value_)
            Object.keys(value_).map((key) => {
                tmp[key].formPrefix = key.substr(0, key.length - 5)
            })
            // console.log("value_ => ", value_)
            // console.log("tmp => ", tmp)
            commitMutation(
                environment,
                {
                    mutation: props.mutation,
                    variables: tmp,
                    onCompleted: (response: TOperation['response'] | null, errors: ReadonlyArray<PayloadError> | null | undefined) => {
                        if (response === null) {
                            reject(["internal error"])
                            return 
                        }
                        if (errors) {
                            const error_messages = format_error_messages(errors)
                            set_form_errors(error_messages)
                            reject(error_messages)
                            return
                        }

                        let has_error = false
                        for (let form in response) {
                            const _f: any = response[form]
                            if ((!(_f.errors == null)) && _f.errors.length > 0) {
                                has_error = true
                            }
                        }
                        if (has_error) {
                            set_errors(response)
                            reject(['form validation error'])
                        } else {
                            sessionStorage.removeItem(stored_key)
                            resolve(response)
                        }
                    },
                    onError: (error: any) => {
                        const error_messages = format_error_messages(error.errors)
                        set_form_errors(error_messages)
                        reject(error_messages)
                    },
                    uploadables: u,
                    updater: props.updater,
                    configs: props.configs,
                }
            )
        })
    }, [environment, props.mutation])

    const commit = React.useCallback(
        () => commit_with_value(value, uploadables),
        [value, uploadables, commit_with_value])
    
    return (
        <FormContext.Provider value={ {
                formBaseId: props.id,
                value: value,
                setValue: set_value,
                setUploadables: set_uploadables,
                formErrors: form_errors,
                errors: errors,
                commit,
        } }>
          { props.children }
        </FormContext.Provider>
    )
}

export default Form
