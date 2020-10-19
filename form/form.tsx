import React from 'react'

import _merge from 'lodash/merge'
import _cloneDeep from 'lodash/cloneDeep'
import _isEqual from 'lodash/isEqual'
import _toPairs from 'lodash/toPairs'

type Props<Input> = {
    formId: string
    formData: Input
    formProps?: Omit<React.HTMLProps<HTMLFormElement>, "id" | "ref">
    children: (data: {
        formRef: React.RefObject<HTMLFormElement>
        value: Input
        files: FilesInput<Input>
        onChange: OnChangeField<Input>
        onUpload: OnUploadField<Input>
        editing: boolean
        copyValue2InitialValue: () => void
    }) => React.ReactNode
    onChange?: (value: Input, files: FilesInput<Input>) => unknown
}

type FilesInput<Input> = {
    [K in keyof Input]: {
        [L in keyof Input[K]]?: File[] | undefined
    }
}

type OnChangeField<Input> = {
    [K in keyof Input]: (diff_state: Partial<Input[K]>) => unknown
        // { [L in keyof Input[K]]-?: (value: Input[K][L]) => unknown }
}
type OnUploadField<Input> = {
    [K in keyof Input]: (label: keyof Input[K], files: File []) => unknown
        // { [L in keyof Input[K]]-?: (files: File []) => unknown }
}

type State<Input> = {
    initialValue: Input
    value: Input
    files: FilesInput<Input>
    onChange: OnChangeField<Input>
    onUpload: OnUploadField<Input>
    editing: boolean
    hasChangedValues: boolean
    hasUploadables: boolean
}

function on_field_change<Input extends Object>(target: Form<Input>, key0: string, diff_state: Record<string, any>) {
    const form: any = _cloneDeep(target.state.value)
    Object.assign(form[key0], diff_state)
    // form[key0] = _merge(form[key0], diff_state)
    const has_changed = !_isEqual(form, target.state.initialValue)
    target.setState({value: form, editing: has_changed || target.state.hasUploadables, hasChangedValues: has_changed}, () => {
        target.props.onChange && target.props.onChange(target.state.value, target.state.files)
    })
}

function on_field_upload<Input extends Object>(target: Form<Input>, key0: string, key1: string, files: File[]) {
    const form: any = _cloneDeep(target.state.files)
    form[key0][key1] = files

    const has_uploadables = _toPairs(form).reduce((a, c) => {
        return a || _toPairs(c[1] as any).reduce((b, d) => {
            const o: any = d[1]
            if (o.constructor === Array) {
                return b || (!!o.length)
            }
            return b
        }, false)
    }, false)
    target.setState({files: form, editing: has_uploadables || target.state.hasChangedValues, hasUploadables: has_uploadables}, () => {
        target.props.onChange && target.props.onChange(target.state.value, target.state.files)
    })
}

function get_initial_state<Input extends Object>(props: Props<Input>, target: Form<Input>): State<Input> {
    return {
        initialValue: _cloneDeep(props.formData),
        value: _cloneDeep(props.formData),
        files: _toPairs(props.formData).reduce((a, c) => {
            a[c[0]] = {}
            return a
        }, {} as any),
        onChange: _toPairs(props.formData).reduce((a, c) => {
            // a[c[0]] = _toPairs(c[1]).reduce((b, d) => {
            //     b[d[0]] = (value: any) => { on_field_change(target, c[0], d[0], value) }
            //     return b
            // }, {} as any)
            a[c[0]] = (diff_state: any) => { on_field_change(target, c[0], diff_state) }
            return a
        }, {} as any),
        onUpload: _toPairs(props.formData).reduce((a, c) => {
            // a[c[0]] = _toPairs(c[1]).reduce((b, d) => {
            //     b[d[0]] = (files: File []) => { on_field_upload(target, c[0], d[0], files) }
            //     return b
            // }, {} as any)
            a[c[0]] = (label: string, files: File []) => { on_field_upload(target, c[0], label, files) }
            return a
        }, {} as any),
        editing: false,
        hasChangedValues: false,
        hasUploadables: false,
    }
}

class Form<Input extends Object> extends React.Component<Props<Input>, State<Input>> {
    state = get_initial_state<Input>(this.props, this)
    form_ref = React.createRef<HTMLFormElement>()

    render = () => (
        <form id={this.props.formId} ref={this.form_ref} {...this.props.formProps}>{
            this.props.children({
                formRef: this.form_ref,
                value: this.state.value,
                files: this.state.files,
                onChange: this.state.onChange,
                onUpload: this.state.onUpload,
                editing: this.state.editing,
                copyValue2InitialValue: () => {
                    this.setState({
                        initialValue: _cloneDeep(this.state.value),
                        editing: false,
                        hasChangedValues: false,
                        hasUploadables: false,
                    })
                }
            })
        }</form>
    )
}

export {Form}
