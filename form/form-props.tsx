import {
    GraphQLTaggedNode,
    DeclarativeMutationConfig,
    MutationParameters,
    SelectorStoreUpdater
} from 'relay-runtime'

import {ContextType} from './form-context'


type FormProps<TOperation extends MutationParameters> = {
    id: string,
    initialVariables: TOperation['variables'],
    mutation: GraphQLTaggedNode,
    children: React.ReactNode | ((context: ContextType) => React.ReactNode),
    configs?: DeclarativeMutationConfig[],
    updater?: SelectorStoreUpdater<TOperation['response']> | null;
    saveToStorage?: boolean,
    onChange?: (value: TOperation['variables']) => void,
}

export {FormProps}
