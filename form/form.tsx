import * as React from 'react'

import {IEnvironment, PayloadError, GraphQLTaggedNode, UploadableMap, DeclarativeMutationConfig, MutationParameters, SelectorStoreUpdater} from 'relay-runtime'
import {ReactRelayContext, commitMutation} from 'react-relay'

import {withEnvironment} from '../environment'
import FormContext from './form-context'


type Props<TOperation extends MutationParameters> = {
    id: string,
    initialVariables: TOperation['variables'],
    mutation: GraphQLTaggedNode,
    children: React.ReactNode,
    environment: IEnvironment,
    configs?: DeclarativeMutationConfig[],
    updater?: SelectorStoreUpdater<TOperation['response']> | null;
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



const Form = <TOperation extends MutationParameters>(props: Props<TOperation>) => {
    const [value, set_value] = React.useState(props.initialVariables)
    const [form_errors, set_form_errors] = React.useState<any[]>([])
    const [errors, set_errors] = React.useState<any>([])
    const [uploadables, set_uploadables] = React.useState<any>({})

//    const set_errors = (errors_: ReadonlyArray<{
//        readonly field: string;
//        readonly messages: ReadonlyArray<string>;
//    } | null> | null) => {
//        const d: any = {}
//        if (errors_) {
//            errors_.map((e: any) => {
//                const {field, messages} = e
//                if (d[field] === undefined) {
//                    d[field] = ''
//                }
//                d[field] = messages.reduce((a : string, c : string) => (a + c), d[field])
//            })
//        }
//        set_errors_(d)
//    }

    const commit_with_value = React.useCallback((value_, uploadables_, on_success, on_failure) => {
        const u: UploadableMap = {}
        console.log('uploadables_ => ', uploadables_)
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
        console.log('u = ', u)
        console.log(value_)
        commitMutation(
            props.environment,
            {
                mutation: props.mutation,
                variables: value_,
                onCompleted: (response: TOperation['response'] | null, errors: ReadonlyArray<PayloadError> | null | undefined) => {
                    if (response === null) {
                        return 
                    }
                    if (errors) {
                        set_form_errors(errors.map((e) => e.message))
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
                        on_failure && on_failure(response)
                    } else {
                        set_errors([])
                        on_success && on_success(response)
                    }

//                    const todo_update_form = response.todoUpdateForm
//                    if (errors) {
//                        set_form_errors(errors.map((e) => e.message))
//                        console.log('errors = ', errors.map((e) => e.message))
//                    } else if (todo_update_form.todo == null) {
//                        console.log('errors = ', todo_update_form.errors)
//                        if (todo_update_form.errors == null) {
//                            set_form_errors([{'messages': 'サーバー内エラーが発生しました'}])
//                        } else {
//                            set_errors(todo_update_form.errors)
//                        }
//                    } else {
//                        console.log('update completed!!!')
//                    }
                    // console.log('repsonse = ', response)
                },
                onError: (error: any) => {
                    set_form_errors(error.errors.map((e: any) => e.message))
                    // console.log('errors = ', error.errors.map((e:any) => e.message))
                    // console.log('update error!!!')
                    // console.log('error = ', error)
                },
                uploadables: u,
                updater: props.updater,
                configs: props.configs,
            }
        )
    }, [props.environment, props.mutation])

    const commit = React.useCallback(
        (on_success?, on_failure?) => commit_with_value(value, uploadables, on_success, on_failure),
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
// export default withEnvironment(Form)


const FormWithEnv = <TOperation extends MutationParameters>(props: Omit<Props<TOperation>, 'environment'>) => (
    <ReactRelayContext.Consumer>
      {(context) =>
          <Form<TOperation> environment={ context!.environment } {...props} />
      }
    </ReactRelayContext.Consumer>
)

export default FormWithEnv
