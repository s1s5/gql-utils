# custom graphene-django binding

## environment-provider
``` jsx
<EnvironmentProvider
    post_url='https://<server-domain>/graphql/'
    ws_url='wss://<server-domain>/graphql/'>
    { children }
</EnvironmentProvider>
```

## subscription

``` jsx
import * as React from 'react'

import { graphql, Observer } from 'relay-runtime'
import { SubscriptionRenderer } from '../gql-utils'

export default () => {
    const observer = {
        next: (data: any) => console.log('next', data),
        error: (error:Error) => console.log('error', error),
        complete: () => console.log("completed!!!"),
    }

    return <SubscriptionRenderer
        subscription={graphql`
            subscription todoSubsc_Subscription($id: ID!) {
                todoUpdated(parentId: $id) {
                    id
                    completed
                    text
                }
            }
            `}
        variables={ {id: props.id} }
        observer={ observer }
    />
}
```


# form
- id must be unique
- saveToStorage means save form data to SessionStorage
- input variable name must be `<mutation_name>Input`. e.g) authorCreate -> authorCreateInput
- must include `errors { field message }` for form validation error

``` jsx
const author_create_mutation = graphql`
    mutation authorCreate_Mutation($authorCreateInput: AuthorCreateInput!) {
        authorCreate(input: $authorCreateInput) {
            errors {
                field
                messages
            }
            author {
                id
                name
            }
        }
    }`

<Form id="hoge" initialVariables={ variables } mutation={ author_create_mutation } saveToStorage>
  <h3>create author</h3>
  <FormGroup name="authorCreate">
    <MyTextInput name="name" />
  </FormGroup>
  <CommitTrigger
      onSuccess={ history.goBack }
      onFailure={ () => console.log('failed...') }
  >
    { (commit) => (
        <Button onClick={ () => commit() } >commit</Button>
    )}
  </CommitTrigger>
</Form>
```
