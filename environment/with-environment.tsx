import * as React from 'react'

import { Environment, RelayContext } from 'relay-runtime';

import { ReactRelayContext } from 'react-relay';


type WithEnvironmentProps = {
    environment: Environment,
};


const withEnvironment = <P extends object>(
Component: React.ComponentType<P>,
): React.FC<Omit<P, keyof WithEnvironmentProps>> => props => (
    <ReactRelayContext.Consumer>
      {(context:RelayContext | null) => <Component {...props as P} environment={ context!.environment } />}
    </ReactRelayContext.Consumer>
);

export default withEnvironment
