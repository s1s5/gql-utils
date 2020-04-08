import * as React from 'react'

import FormContext from './form-context'

type Props = {
    name: string,
    children: React.ReactNode,
}

const FormGroup = (props: Props) => {
    return (
        <FormContext.Consumer>
          { (context) => {
                const {formGroupId, errors, ...others} = context!
                return (
                    <FormContext.Provider value={ {
                            formGroupId: props.name,
                            errors: props.name in errors ? errors[props.name].errors : undefined,
                            ...others} }>
                      { props.children }
                    </FormContext.Provider>
                )
          }}
        </FormContext.Consumer>
    )
}

export default FormGroup
