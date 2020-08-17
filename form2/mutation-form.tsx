import React from 'react'
import _toPairs from 'lodash/toPairs'

import {PayloadError, Environment, GraphQLTaggedNode, UploadableMap,  DeclarativeMutationConfig, SelectorStoreUpdater} from 'relay-runtime'
import {commitMutation} from 'react-relay'

import withEnvironment from '../environment/with-environment'
import {Form} from './form'


type FormErrorMessages = ReadonlyArray<{
    readonly field: string;
    readonly messages: ReadonlyArray<string>;
} | null>
   

export interface MutationParameters {
    readonly response: {[T in string]: {
        readonly errors: FormErrorMessages | null
    }}
    readonly variables: {};
    readonly rawResponse?: {};
}

type ErrorListField<Input> = {
    [K in keyof Input]?: FormErrorMessages | null
}

type ErrorsField<Input> = {
    [K in keyof Input]?: {
        [L in keyof Input[K]]: string | null | undefined
    }
}

type Props<TOperation extends MutationParameters> = {
    environment: Environment
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
    }) => React.ReactNode
}

type State<TOperation extends MutationParameters> = {
    errorList: ErrorListField<TOperation["variables"]>
    errors: ErrorsField<TOperation["variables"]>
    hasError: boolean
}

class MutationForm_<TOperation extends MutationParameters> extends React.Component<Props<TOperation>, State<TOperation>> {

    commit = (variables: TOperation["variables"], files: Form<TOperation["variables"]>["state"]["files"]) => {
        const uploadables: UploadableMap = {}
        _toPairs(files).map((e) => {
            const [key0, f] = e
            _toPairs(f as Object).map((g) => {
                const [key1, fs] = g
                if (fs.constructor === Array) {
                    fs.map((v: File | Blob, i: number) => {
                        uploadables[`${key0}-${key1}[${i}]`] = v
                    })
                } else {
                    uploadables[`${key0}-${key1}`] = fs
                }                
            })
        })

        const p = new Promise<TOperation["response"]>((resolve, reject) => {
            commitMutation(
                this.props.environment,
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

                        const error_list: ErrorListField<TOperation["variables"]> = _toPairs(response).reduce((a, e) => {
                            a[e[0]] = e[1].errors
                            return a
                        }, {} as any)
                        const error: ErrorsField<TOperation["variables"]> = _toPairs(response).reduce((a, e) => {
                            if (e[1].errors) {
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
                            if ((_f.errors != null) && (_f.errors.length > 0)) {
                                has_error = true
                            }
                        }

                        this.setState({errorList: error_list, errors: error, hasError: has_error}, () => {
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
        <Form<TOperation["variables"]> formData={this.props.formData}>{(data) => {
                const {formRef, ...other_props} = data
                return this.props.children({
                    commit: () => {
                        if (formRef.current && formRef.current.reportValidity()) {
                            return this.commit(data.value, data.files)
                        }
                        return null
                    },
                    ...other_props
                })
          }}</Form>
    )
}

const MutationForm = withEnvironment(MutationForm_)

export {MutationForm}
