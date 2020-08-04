import React from 'react'

import FormContext from './form-context'

type Props<T> = {
    onSuccess?: (response: T) => unknown,
    onFailure?: (response: T) => unknown,
    children: ((submit: () => Promise<any>) => React.ReactNode) | React.ReactNode
}

const CommitTrigger = <T extends Object>(props: Props<T>) => {
    return <FormContext.Consumer>
      { (context) => {
          if (props.children instanceof Function) {
              return props.children(() => context!.commit().then(props.onSuccess, props.onFailure))
          } else {
              return React.cloneElement(props.children as any, { onClick: () => context!.commit().then(props.onSuccess).catch(props.onFailure) })  // TODO: type check
          }
      }}
    </FormContext.Consumer>
}

export default CommitTrigger
