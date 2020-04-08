import * as React from 'react'

type ContextType = {
    formBaseId: string,
    formGroupId?: string,
    value: any,
    setValue: any,
    setUploadables: any,
    formErrors: any,
    errors: any,
    commit: (on_success?: (response: any) => unknown, on_failure?: (response: any) => unknown) => void,
}

export default React.createContext<ContextType | null>(null)
