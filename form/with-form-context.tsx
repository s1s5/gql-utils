import * as React from 'react'
// import _ from 'lodash'
import _cloneDeep from 'lodash/cloneDeep'
import _clone from 'lodash/clone'

import FormContext from './form-context'
import Props from './form-props'

type CWProps<P, T> = {
    formId: string,
    value: T,
    name: string,
    Component: React.ComponentType<P>,
    context: any,
    onChange?: (event: any, prev: T) => unknown,
} & Omit<P, keyof Props<T>>

const ContextWrapper = <P, T>(props: CWProps<P, T>) => {
    const {
        name, Component, context, onChange,
        formId, value,
        ...other_props} = props
    const key = `${context.formGroupId!}Input`
    const _on_change = React.useCallback((new_value: T) => {
        context.setValue( (prev:any) => {
            const next = _cloneDeep(prev)
            // next[props.name] = !prev[props.name]
            // nameのチェックを入れたい, Component作成時に初期値が必ずundefinedじゃないことを保証すればいい？
            if (onChange === undefined) {
                next[key][props.name] = new_value
            } else {
                next[key][props.name] = onChange(new_value, prev[key][props.name])
            }
            /* console.log(prev)
             * console.log(next) */
            return next
        })
    }, [context.setValue, context.formGroupId, props.name])

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
            next[`${context.formGroupId!}-${props.name}`] = ll
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

    const Component_ = Component as any  // TODO: なんでかうまく行かない。。どういうタイプを指定すれば？
    return <Component_
               formId={ formId }
               value={ value }
               onChange={ _on_change }
               onUpload={ _on_upload }
               errors={_errors}
               {...other_props} />
}


const withFormContext = <P, T>(
  Component: React.ComponentType<P>, on_change: (((event:any, prev:any) => any) | undefined) = undefined) => (
      (props: Omit<P, keyof Props<T>> & { name: string }) => {
          return <FormContext.Consumer>
            { (context) => {
                  // console.log('wrapper -> ', props.name, context.value[props.name])
                  return <ContextWrapper<P, T>
                    Component={Component}
                    context={context!}
                    formId={ `${context!.formBaseId}-${context!.formGroupId!}-${props.name}` }
                    value={ context!.value[`${context!.formGroupId!}Input`][props.name] }
                    onChange={ on_change }
                    { ...props } />
            }}
          </FormContext.Consumer>
      })

export default withFormContext
