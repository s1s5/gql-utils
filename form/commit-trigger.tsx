import * as React from 'react'

import FormContext from './form-context'

type Props<T> = {
    onSuccess?: (response: T) => unknown,
    onFailure?: (response: T) => unknown,
    children: ((commit: (on_success?: (response: T) => unknown, on_failure?: (response: T) => unknown) => void) => JSX.Element) | React.ReactNode
}

const CommitTrigger = <T extends Object>(props: Props<T>) => {
    return <FormContext.Consumer>
      { (context) => {
          if (props.children instanceof Function) {
              return props.children((on_success?: (response: T) => unknown, on_failure?: (response: T) => unknown) => context!.commit(on_success ? on_success : props.onSuccess, on_failure ? on_failure : props.onFailure))
          } else {
              return React.cloneElement(props.children as any, { onClick: () => context!.commit(props.onSuccess, props.onFailure) })  // TODO: type check
          }
      }}
    </FormContext.Consumer>
}

export default CommitTrigger
