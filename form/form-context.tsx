import * as React from 'react'

type ContextType = {
    formBaseId: string,
    formGroupId?: string,
    value: any,
    setValue: any,
    setUploadables: any,
    formErrors: any,
    errors: any,
    commit: () => Promise<any>,
}

export default React.createContext<ContextType | null>(null)
