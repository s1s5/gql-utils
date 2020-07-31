import React from 'react'
// import _ from 'lodash'
import _cloneDeep from 'lodash/cloneDeep'
import _clone from 'lodash/clone'

import FormContext from './form-context'
import {FormFieldProps} from './form-field-props'

type CWProps<P, T> = {
    formId: string,
    value: T,
    name: string,
    Component: React.ComponentType<P>,
    context: any,
    onChange?: (event: any, prev: T) => T,
    valueToField?: (value: any) => T,
    fieldToValue?: (prev_value: any, new_value: T) => any
} & Omit<P, keyof FormFieldProps<T>>

const ContextWrapper = <P, T>(props: CWProps<P, T>) => {
    const {
        name, Component, context, onChange,
        formId, value, valueToField, fieldToValue,
        ...other_props} = props
    let key: undefined | string = undefined
    if (context.formGroupId == null) {
        key = undefined
    } else {
        key = `${context.formGroupId!}Input`
    }
    const _on_change = React.useCallback((new_value: T) => {
        context.setVariables( (prev:any) => {
            const next = _cloneDeep(prev)
            // next[props.name] = !prev[props.name]
            // nameのチェックを入れたい, Component作成時に初期値が必ずundefinedじゃないことを保証すればいい？
            if (key == null) {
                if (fieldToValue === undefined) {
                    next[props.name] = new_value
                } else {
                    // next[props.name] = onChange(new_value, prev[props.name])
                    next[props.name] = fieldToValue(prev[props.name], new_value)
                }
            } else {
                if (fieldToValue === undefined) {
                    next[key][props.name] = new_value
                } else {
                    // next[key][props.name] = onChange(new_value, prev[key][props.name])
                    next[key][props.name] = fieldToValue(prev[key][props.name], new_value)
                }
            }
            /* console.log(prev)
             * console.log(next) */
            return next
        })
    }, [context.setVariables, context.formGroupId, props.name])

    const _on_upload = React.useCallback((event: any) => {
        // (e) => e.target.files &&  (e.target.files.item(0)!)
//        context.setValue( (prev:any) => {
//            const next = _.cloneDeep(prev)
//            next[key][props.name] = 'files'
//            return next
        //        })
        const files = event.target.files
        // console.log("_on_upload => ", files)
        const ll: File [] = []
        for (let i = 0; i < files.length; i++) {
            ll.push(files.item(i))
        }
        context.setUploadables( (prev:any) => {
            const next = _clone(prev)
            if (context.formGroupId == null) {
                next[`${props.name}`] = ll
            } else {
                next[`${context.formGroupId!}-${props.name}`] = ll
            }
            return next
        })
    }, [context.setUploadables, context.formGroupId, props.name])
    // console.log(other_props)

    const _errors = React.useMemo(() => {
        if (context.errors == null) {
            return undefined
        }

        const e: string [] = context.errors.filter((x:any) => x.field == props.name).map(
            (x:any) => x.messages).reduce((a: string[], x: string []) => a.concat(x), [])

        if (e.length == 0) {
            return undefined
        }
        return e
    }, [context.errors])

    let value_ = value
    if (valueToField) {
        value_ = valueToField(value)
    }

    const Component_ = Component as any  // TODO: なんでかうまく行かない。。どういうタイプを指定すれば？
    return <Component_
               formId={ formId }
               value={ value_ /* value_ == null ? "" : value_ */ }
               onChange={ _on_change }
               onUpload={ _on_upload }
               errors={_errors}
               {...other_props} />
}


const withFormContext = <P, T>(
  Component: React.ComponentType<P>, on_change?: (event:any, prev:T) => T) => (
      (props: Omit<P, keyof FormFieldProps<T>> & {
          name: string,
          valueToField?: (value: any) => T,
          fieldToValue?: (prev_value: any, new_value: T) => any }) => {
          return <FormContext.Consumer>
            { (context) => {
                  // console.log('wrapper -> ', props.name, context.value[props.name])
                  return <ContextWrapper<P, T>
                    Component={Component}
                    context={context!}
                    formId={ context!.formGroupId ?
                            `${context!.formBaseId}-${context!.formGroupId!}-${props.name}` :
                            `${context!.formBaseId}-${props.name}`
                    }
                    value={ context!.formGroupId ?
                           context!.variables[`${context!.formGroupId!}Input`][props.name] :
                           context!.variables[props.name]
                    }
                    onChange={ on_change}
                    valueToField={ props.valueToField }
                    fieldToValue={ props.fieldToValue }
                    { ...props } />
            }}
          </FormContext.Consumer>
      })

export default withFormContext
