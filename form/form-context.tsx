import * as React from 'react'

export type ContextType = {
    formBaseId: string,
    formGroupId?: string,
    initialVariables: any,
    variables: any,
    setVariables: any,
    setUploadables: any,
    formErrors: string [],
    errors: any,
    commit: () => Promise<any>,
    hasDifference: boolean,
    committing: boolean,
}

export default React.createContext<ContextType | null>(null)
