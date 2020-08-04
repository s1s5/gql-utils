import React from 'react'

import FormContext from './form-context'

type Props = {
    children: (submit: () => Promise<any>) => React.ReactNode
}

const Submit = (props: Props) => {
    const context = React.useContext(FormContext)
    return props.children(context!.commit)
}

export default Submit
