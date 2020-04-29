import * as React from 'react'

type ContextType = {
    formBaseId: string,
    formGroupId?: string,
    initialVariables: any,
    variables: any,
    setVariables: any,
    setUploadables: any,
    formErrors: any,
    errors: any,
    commit: () => Promise<any>,
}

export default React.createContext<ContextType | null>(null)
