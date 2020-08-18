import React from 'react'
import _cloneDeep from 'lodash/cloneDeep'
import _toPairs from 'lodash/toPairs'
import _includes from 'lodash/includes'
import _flatten from 'lodash/flatten'

import {PayloadError, IEnvironment, GraphQLTaggedNode, UploadableMap,  DeclarativeMutationConfig, SelectorStoreUpdater, RelayContext} from 'relay-runtime'
import {ReactRelayContext, commitMutation} from 'react-relay'

import {Form} from './form'



type FormErrorMessages = ReadonlyArray<{
    readonly field: string;
    readonly messages: ReadonlyArray<string>;
} | null>
   

export interface MutationParameters {
    readonly response: {[T in string]: {
        readonly errors: FormErrorMessages | null
    } | null}
    readonly variables: {};
    readonly rawResponse?: {};
}

type ErrorListField<Input> = {
    [K in keyof Input]?: FormErrorMessages | null
}

type ErrorsField<Input> = {
    [K in keyof Input]?: {
        [T in string]: string | null | undefined
    }
}

class ErrorHandler<TOperation extends MutationParameters> {
    error_list: ErrorListField<TOperation["response"]>

    constructor(response: TOperation["response"]) {
        this.error_list = _toPairs(response).reduce((a, e) => {
            if (e[1]?.errors) {
                a[e[0]] = e[1].errors
            } else {
                a[e[0]] = []
            }
            return a
        }, {} as any)
    }

    get_error_message = (key0: keyof TOperation["response"], key1: string, join: string = ',') => {
        const value = this.error_list[key0]
        if (value) {
            return _flatten(value.filter(e => e && e.field == key1).map(e => e!.messages)).join(join)
        }
        return undefined
    }

    get_error_message_list = (key0: keyof TOperation["response"], exclude_keys: string[]) => {
        const value = this.error_list[key0]
        if (value) {
            return value.filter(e => e && (!_includes(exclude_keys, e.field)))
        }
        return []
    }
}

type Props<TOperation extends MutationParameters> = {
    formData: TOperation["variables"]
    mutation: GraphQLTaggedNode
    configs?: DeclarativeMutationConfig[],
    updater?: SelectorStoreUpdater<TOperation['response']> | null;
    children: (data: {
        commit: () => Promise<TOperation["response"]> | null
        value: TOperation["variables"]
        files: Form<TOperation["variables"]>["state"]["files"]
        onChange: Form<TOperation["variables"]>["state"]["onChange"]
        onUpload: Form<TOperation["variables"]>["state"]["onUpload"]
        editing: boolean
        errorHandler: ErrorHandler<TOperation> | null
        error: ErrorsField<TOperation["response"]> | null
        hasError: boolean
    }) => React.ReactNode
}

type State<TOperation extends MutationParameters> = {
    errorHandler: ErrorHandler<TOperation> | null
    error: ErrorsField<TOperation["response"]> | null
    hasError: boolean
}


function get_initial_state<TOperation extends MutationParameters>(props: Props<TOperation>) : State<TOperation> {
    return {errorHandler: null, error: null, hasError: false}
}

class MutationForm<TOperation extends MutationParameters> extends React.Component<Props<TOperation>, State<TOperation>> {
    state = get_initial_state(this.props)

    commit = (environment: IEnvironment, values: TOperation["variables"], files: Form<TOperation["variables"]>["state"]["files"]) => {
        const variables: any = _cloneDeep(values)
        const uploadables: UploadableMap = {}
        _toPairs(files).map((e) => {
            const [key0, f] = e
            _toPairs(f as Object).map((g) => {
                const [key1, fs] = g
                if (fs.constructor === Array) {
                    fs.map((v: File | Blob, i: number) => {
                        uploadables[`${key0}-${key1}[${i}]`] = v
                    })
                    variables[key0].formPrefix = key0
                } else {
                    uploadables[`${key0}-${key1}`] = fs
                    variables[key0].formPrefix = key0
                }
            })
        })

        const p = new Promise<TOperation["response"]>((resolve, reject) => {
            commitMutation(
                environment,
                {
                    mutation: this.props.mutation,
                    variables: variables,
                    onCompleted: (response: TOperation['response'] | null, errors: ReadonlyArray<PayloadError> | null | undefined) => {
                        if (errors) {
                            reject(errors)
                            return
                        }

                        if (response === null) {
                            reject([Error("未知のエラーです")])
                            return 
                        }

                        // const error_list: ErrorListField<TOperation["variables"]> = _toPairs(response).reduce((a, e) => {
                        //     if (e[1]?.errors) {
                        //         a[e[0]] = e[1].errors
                        //     }
                        //     return a
                        // }, {} as any)

                        const error: ErrorsField<TOperation["variables"]> = _toPairs(response).reduce((a, e) => {
                            if (e[1]?.errors) {
                                a[e[0]] = e[1].errors.filter(i => i).map(j => j!).reduce((b, f) => {
                                    if (f.field in b) {
                                        b[f.field].push(f.messages)
                                    } else {
                                        b[f.field] = [f.messages]
                                    }
                                    return b
                                }, {} as any)
                            } else {
                                a[e[0]] = null
                            }
                            return a
                        }, {} as any)

                        let has_error = false
                        for (let form in response) {
                            const _f = response[form]
                            if ((_f?.errors != null) && (_f.errors.length > 0)) {
                                has_error = true
                            }
                        }

                        this.setState({errorHandler: new ErrorHandler(response), error, hasError: has_error}, () => {
                            resolve(response)
                        })
                    },
                    onError: (error: Error) => {
                        reject([error])
                    },
                    uploadables: uploadables,
                    updater: this.props.updater,
                    configs: this.props.configs,
                }
            )
        })
        return p
    }
    
    render = () => (
        <ReactRelayContext.Consumer>
          {(context:RelayContext | null) => (
              <Form<TOperation["variables"]> formData={this.props.formData}>{(data) => {
                      const {formRef, ...other_props} = data
                      return this.props.children({
                          commit: () => {
                              if (formRef.current && formRef.current.reportValidity()) {
                                  return this.commit(context!.environment, data.value, data.files)
                              }
                              return null
                          },
                          errorHandler: this.state.errorHandler,
                          error: this.state.error,
                          hasError: this.state.hasError,
                          ...other_props
                      })
              }}</Form>
          )}</ReactRelayContext.Consumer>
    )
}

export {MutationForm}
