import * as React from 'react'

import _cloneDeep from 'lodash/cloneDeep'
import _isEqual from 'lodash/isEqual'

import is_callable from 'is-callable'

import {
    PayloadError,
    GraphQLTaggedNode,
    UploadableMap,
    DeclarativeMutationConfig,
    MutationParameters,
    SelectorStoreUpdater
} from 'relay-runtime'

import {ReactRelayContext, commitMutation} from 'react-relay'

import FormContext, {ContextType} from './form-context'
import {FormProps} from './form-props'

// export type FormProps<TOperation extends MutationParameters> = {
//     id: string,
//     initialVariables: TOperation['variables'],
//     mutation: GraphQLTaggedNode,
//     children: React.ReactNode | ((context: ContextType) => React.ReactNode),
//     configs?: DeclarativeMutationConfig[],
//     updater?: SelectorStoreUpdater<TOperation['response']> | null;
//     saveToStorage?: boolean,
//     onChange?: (value: TOperation['variables']) => void,
// }

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
    try {
        return errors.map((e:any) => e.message)
    } catch {
        return ["Unexpected Error"]  // TODO: 何らかの形で報告しないと
    }
}


const Form = <TOperation extends MutationParameters>(props: FormProps<TOperation>) => {
    const [initial_variables, set_initial_variables] = React.useState(props.initialVariables)
    const [variables, set_variables] = React.useState(props.initialVariables)
    const [has_difference, set_has_difference] = React.useState(false)
    const [committing, set_committing] = React.useState(false)
    const [form_errors, set_form_errors] = React.useState<string[]>([])
    const [errors, set_errors] = React.useState<any>([])
    const [uploadables, set_uploadables] = React.useState<any>({})
    const environment = React.useContext(ReactRelayContext)!.environment

    const stored_key = `form-stored-${props.id}`
    React.useLayoutEffect(() => {
        if (props.saveToStorage == null || props.saveToStorage == false) {
            return
        }
        try {
            const store = sessionStorage
            const data_json = store.getItem(stored_key)
            if (data_json) {
                const data = JSON.parse(data_json)
                const restored:any = _cloneDeep(variables)
                Object.keys(restored).map((key) => {
                    if (key in data) {
                        Object.keys(restored[key]).map((sub_key) => {
                            if (sub_key in data[key]) {
                                restored[key][sub_key] = data[key][sub_key]
                            }
                        })
                    }
                })
                set_variables(restored)
                store.removeItem(stored_key)
            }
        } catch {
        }
    }, [props.id])  // props.id, set_variables

    React.useEffect(() => {
        return () => {
            if (props.saveToStorage) {
                try {
                    sessionStorage.setItem(stored_key, JSON.stringify(variables))
                } catch {
                }
            }
        }
    }, [variables])

    const commit_with_value = React.useCallback((value_, uploadables_) => {
        const p = new Promise((resolve, reject) => {
            set_committing(true)

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
                        set_form_errors([])
                        set_errors([])

                        if (response === null) {
                            set_form_errors(["内部エラーが発生しました。"])
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
                        let error_messages: string[] = []
                        if (error instanceof Error) {
                            error_messages = [error.toString()]
                        } else {
                            error_messages = format_error_messages(error.errors)
                        }
                        set_form_errors(error_messages)
                        reject(error_messages)
                    },
                    uploadables: u,
                    updater: props.updater,
                    configs: props.configs,
                }
            )
        })

        p.then(() => {
            set_initial_variables(value_)
            set_has_difference(false)
        })
        p.finally(() =>{
            set_committing(false)
        })
        return p
    }, [environment, props.mutation])

    const commit = React.useCallback(
        () => commit_with_value(variables, uploadables),
        [variables, uploadables, commit_with_value])

    React.useEffect(() => {
        let has_uploadables = false
        Object.entries(uploadables).map((e) => {
            const [key, value]: [string, any] = e
            if (value.constructor === Array) {
                has_uploadables = true
            } else if (value) {
                has_uploadables = true
            }
        })

        set_has_difference(has_uploadables || !_isEqual(variables, initial_variables))
        props.onChange && props.onChange(variables)
    }, [variables, uploadables]);

    const context: ContextType = {
        formBaseId: props.id,
        initialVariables: props.initialVariables,
        variables: variables,
        setVariables: set_variables,
        setUploadables: set_uploadables,
        formErrors: form_errors,
        errors: errors,
        commit,
        hasDifference: has_difference,
        committing: committing,
    }

    return (
        <FormContext.Provider value={ context }>
          { is_callable(props.children) ?
            props.children(context) :
            props.children }
        </FormContext.Provider>
    )
}

export default Form
