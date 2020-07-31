import React from 'react'

import {ContextType} from './form-context-type'
// type ContextType = {
//     formBaseId: string,
//     formGroupId?: string,
//     initialVariables: any,
//     variables: any,
//     setVariables: any,
//     setUploadables: any,
//     formErrors: string [],
//     errors: any,
//     commit: () => Promise<any>,
//     hasDifference: boolean,
//     committing: boolean,
// }
// 
export {ContextType}
export default React.createContext<ContextType | null>(null)
