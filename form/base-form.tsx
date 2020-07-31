import React from 'react'

import _cloneDeep from 'lodash/cloneDeep'
import _isEqual from 'lodash/isEqual'
import is_callable from 'is-callable'

import FormContext, {ContextType} from './form-context'

type BaseFormProps = {
    id: string,
    initialVariables: any
    children: React.ReactNode | ((context: ContextType) => React.ReactNode),
    saveToStorage?: boolean,
    onChange?: (value: any) => void,
}

const BaseForm = (props: BaseFormProps) => {
    const [initial_variables, set_initial_variables] = React.useState(props.initialVariables)
    const [variables, set_variables] = React.useState(props.initialVariables)
    const [has_difference, set_has_difference] = React.useState(false)
    const [committing, set_committing] = React.useState(false)
    const [uploadables, set_uploadables] = React.useState<any>({})

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
        const p = new Promise((resolve) => {
            set_committing(true)
            resolve([value_, uploadables_])
        })

        p.then(() => {
            set_initial_variables(value_)
            set_has_difference(false)
        })
        p.finally(() =>{
            set_committing(false)
        })
        return p
    }, [])

    const commit = React.useCallback(
        () => commit_with_value(variables, uploadables),
        [variables, uploadables, commit_with_value])

    React.useEffect(() => {
        set_has_difference(!_isEqual(variables, initial_variables))
        props.onChange && props.onChange(variables)
    }, [variables]);

    const context: ContextType = {
        formBaseId: props.id,
        initialVariables: props.initialVariables,
        variables: variables,
        setVariables: set_variables,
        setUploadables: set_uploadables,
        formErrors: [],
        errors: [],
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

export default BaseForm
