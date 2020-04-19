import * as React from 'react'

import FormContext from './form-context'

type Props = {
    children: (submit: () => Promise<void>) => JSX.Element
}

const Submit = (props: Props) => {
    const context = React.useContext(FormContext)
    return props.children(context!.commit)
}

export default Submit
