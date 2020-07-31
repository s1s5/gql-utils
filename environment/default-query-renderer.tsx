import React from 'react'

import {
    RelayContext,
    OperationType
} from 'relay-runtime'

import {
    ReactRelayContext,
    QueryRenderer,
} from 'react-relay'


const DefaultQueryRenderer = <TOperation extends OperationType>(props: Omit<QueryRenderer<TOperation>["props"], "environment">) => (
    <ReactRelayContext.Consumer>
      {(context:RelayContext | null) => (
          <QueryRenderer<TOperation>
            environment={ context!.environment }
            {...props}
          />
      )}
    </ReactRelayContext.Consumer>
)

export default DefaultQueryRenderer
